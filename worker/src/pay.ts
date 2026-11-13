// POST /pay/code (valida un código y devuelve el desglose) y POST /pay/orders (crea la orden del anticipo).
// Todo el precio se recalcula aquí con computeQuote y paymentBreakdown (src/data/quote.ts): el navegador
// nunca manda montos. Nunca se registran correos, nombres, códigos, tokens ni llaves.

import { EXTRAS, type ExtraId } from "../../src/data/extras";
import { LEGAL_VERSION } from "../../src/data/legal";
import { PLANS, type PlanId } from "../../src/data/plans";
import {
  MAX_ADDITIONAL,
  MAX_LANGUAGES,
  MIN_TOTAL,
  computeQuote,
  paymentBreakdown,
  type DiscountCode,
  type ExtrasSelection,
  type Quote,
  type QuoteMode,
} from "../../src/data/quote";
import { hmacHex } from "./crypto";
import { unsafeProdConfig } from "./devmock";
import { extrasDiscountFor, isPlanId } from "./discounts";
import { INVALID_REQUEST, METHOD_NOT_ALLOWED, RATE_LIMITED, SERVER_ERROR, corsHeaders, json, preflight } from "./http";
import { clientIp, hit } from "./ratelimit";
import { loadSecrets, verifyToken } from "./token";
import type { Env } from "./types";
import { normalizeEmail, readJsonBody } from "./validate";
import { integritySignature, loadWompiConfig } from "./wompi";

const MAX_BODY_BYTES = 4096;
const CODE_IP_LIMIT = 30;
const ORDER_IP_LIMIT = 10;
const ORDER_EMAIL_LIMIT = 5;
/** La orden vence a los 30 min (mismo valor que expiration-time de Wompi); entonces se libera la reserva. */
export const ORDER_TTL_SECONDS = 30 * 60;
const MAX_NAME_LENGTH = 120;
const MAX_TOKEN_LENGTH = 1900;
const MAX_ID_LENGTH = 64;
const CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;
const CHECKOUT_URL = "https://checkout.wompi.co/p/";
const RESULT_PATH = "/payment/result/";

/** Modos con pago online. Rediseño y externo necesitan una propuesta por WhatsApp. */
const PAYABLE_MODES: readonly QuoteMode[] = ["normal", "zumiaClient"];
const ALL_MODES: readonly QuoteMode[] = ["normal", "redesign", "zumiaClient", "external"];

const INVALID_CODE = { ok: false, error: "invalid_code" };
const INVALID_TOKEN = { ok: false, error: "invalid_token" };
/** Motivo identificable: el front muestra el aviso con el enlace a WhatsApp. */
const PAYMENT_NOT_AVAILABLE = { ok: false, error: "payment_not_available" };
const TERMS_REQUIRED = { ok: false, error: "terms_required" };
const BELOW_MINIMUM = { ok: false, error: "below_minimum" };
const PAYMENTS_UNAVAILABLE = { ok: false, error: "payments_unavailable" };
const UNSUPPORTED_MEDIA = { ok: false, error: "unsupported_media_type" };
const TOO_LARGE = { ok: false, error: "payload_too_large" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every((key) => keys.includes(key));
const isIntIn = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

export type Selection = {
  mode: QuoteMode;
  planId: PlanId | null;
  extras: ExtrasSelection;
  additional: { subpages: number; sections: number };
};

/**
 * Selección del cotizador: { mode, planId, extras: { id: cantidad }, additional: { subpages, sections } }.
 * null si algo no cuadra (claves de más, ids desconocidos, cantidades fuera de rango).
 */
export const parseSelection = (value: unknown): Selection | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["mode", "planId", "extras", "additional"])) return null;
  const { mode, planId, extras, additional = { subpages: 0, sections: 0 } } = value;
  if (typeof mode !== "string" || !ALL_MODES.includes(mode as QuoteMode)) return null;
  if (planId !== null && planId !== undefined && !(typeof planId === "string" && isPlanId(planId))) return null;

  const selection: ExtrasSelection = {};
  if (extras !== undefined) {
    if (!isRecord(extras)) return null;
    for (const [id, quantity] of Object.entries(extras)) {
      const extra = EXTRAS.find((item) => item.id === id);
      if (!extra || !isIntIn(quantity, 1, extra.perLanguage ? MAX_LANGUAGES : 1)) return null;
      selection[id as ExtraId] = quantity;
    }
  }

  if (!isRecord(additional) || !hasOnlyKeys(additional, ["subpages", "sections"])) return null;
  const { subpages = 0, sections = 0 } = additional;
  if (!isIntIn(subpages, 0, MAX_ADDITIONAL) || !isIntIn(sections, 0, MAX_ADDITIONAL)) return null;

  return { mode: mode as QuoteMode, planId: (planId as PlanId | undefined) ?? null, extras: selection, additional: { subpages, sections } };
};

/** Código normalizado (trim + mayúsculas) o null si no tiene el formato de discount_codes. */
const normalizeCode = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
};

type Verification = { email: string; projectId: string; plan: PlanId } | null;

/**
 * Token de verificación (opcional). Si no viene: null. Si viene y no es válido, o el proyecto no es del
 * token, ya no está activo o tiene un plan desconocido: "invalid". El proyecto se relee de D1 (como /verify/discount).
 */
const readVerification = async (
  env: Env,
  tokenSecret: string,
  token: unknown,
  projectId: unknown,
  now: number,
): Promise<Verification | "invalid"> => {
  if (token === undefined || token === null) return projectId === undefined || projectId === null ? null : "invalid";
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return "invalid";
  if (typeof projectId !== "string" || projectId.length === 0 || projectId.length > MAX_ID_LENGTH) return "invalid";
  const payload = await verifyToken(tokenSecret, token, now);
  if (!payload || !payload.pids.includes(projectId)) return "invalid";
  const project = await env.DB.prepare("SELECT id, plan FROM projects WHERE id = ? AND email = ? AND active = 1")
    .bind(projectId, payload.sub)
    .first<{ id: string; plan: string }>();
  if (!project || !isPlanId(project.plan)) return "invalid";
  return { email: payload.sub, projectId: project.id, plan: project.plan };
};

/** Estimado del servidor. El descuento de cliente solo existe en modo cliente y con verificación válida. */
const serverQuote = (selection: Selection, verification: Verification): Quote | null => {
  const verifiedDiscount = selection.mode === "zumiaClient" && verification ? extrasDiscountFor(verification.plan) : 0;
  return computeQuote(selection.mode, selection.planId, selection.extras, selection.additional, verifiedDiscount);
};

type CodeRow = { code: string; kind: "percent" | "amount"; value: number; email: string | null };

/**
 * Código vigente con cupo (usados + reservados < máximo). Si tiene correo, solo vale si coincide con el
 * correo verificado del token. null en cualquier otro caso (mismo error para inexistente, vencido o agotado).
 */
const findUsableCode = async (env: Env, code: string, verification: Verification, now: number): Promise<CodeRow | null> => {
  const row = await env.DB.prepare(
    `SELECT code, kind, value, email FROM discount_codes
     WHERE code = ? AND active = 1 AND (expires_at IS NULL OR expires_at > ?)
       AND (max_uses IS NULL OR used_count + reserved_count < max_uses)`,
  )
    .bind(code, now)
    .first<CodeRow>();
  if (!row || (row.kind !== "percent" && row.kind !== "amount")) return null;
  if (row.email !== null && row.email !== verification?.email) return null;
  return row;
};

/** Pasos comunes: CORS, método, secretos e IP. Devuelve la respuesta de error o los datos para seguir. */
const begin = async (request: Request, env: Env, bucket: string, limit: number) => {
  const cors = corsHeaders(request, env);
  const reply = (data: unknown, status = 200) => json(data, status, cors);
  if (request.method === "OPTIONS") return { response: preflight(cors) };
  if (request.method !== "POST") return { response: reply(METHOD_NOT_ALLOWED, 405) };
  if (unsafeProdConfig(env)) return { response: reply(PAYMENTS_UNAVAILABLE, 503) };
  const secrets = loadSecrets(env);
  if (!secrets) return { response: reply(SERVER_ERROR, 500) };
  const now = Math.floor(Date.now() / 1000);
  const ip = clientIp(request, env);
  if (!ip) {
    console.error("missing client ip");
    return { response: reply(SERVER_ERROR, 500) };
  }
  if ((await hit(env, `${bucket}:${await hmacHex(secrets.pepper, ip)}`, now)) > limit) return { response: reply(RATE_LIMITED, 429) };
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if ("error" in body) return { response: reply(body.error === 415 ? UNSUPPORTED_MEDIA : TOO_LARGE, body.error) };
  if (!body.data) return { response: reply(INVALID_REQUEST, 400) };
  return { reply, secrets, now, data: body.data };
};

const breakdownView = (quote: Quote, code: CodeRow | null) => ({ ...paymentBreakdown(quote, code as DiscountCode | null), minTotal: MIN_TOTAL });

export const handlePayCode = async (request: Request, env: Env): Promise<Response> => {
  const start = await begin(request, env, "pay-code-ip", CODE_IP_LIMIT);
  if ("response" in start) return start.response as Response;
  const { reply, secrets, now, data } = start;
  if (!hasOnlyKeys(data, ["code", "selection", "token", "projectId"])) return reply(INVALID_REQUEST, 400);

  const code = normalizeCode(data.code);
  if (!code) return reply(INVALID_CODE, 400);
  const selection = parseSelection(data.selection);
  if (!selection) return reply(INVALID_REQUEST, 400);
  if (!PAYABLE_MODES.includes(selection.mode)) return reply(PAYMENT_NOT_AVAILABLE, 400);

  const verification = await readVerification(env, secrets.tokenSecret, data.token, data.projectId, now);
  if (verification === "invalid") return reply(INVALID_TOKEN, 400);
  const quote = serverQuote(selection, verification);
  if (!quote) return reply(INVALID_REQUEST, 400);

  const row = await findUsableCode(env, code, verification, now);
  if (!row) return reply(INVALID_CODE, 400);

  return reply({ ok: true, code: { code: row.code, kind: row.kind, value: row.value }, breakdown: breakdownView(quote, row) });
};

/** Referencia aleatoria de 128 bits: ZUM- + 32 caracteres hex en mayúsculas. */
const newReference = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `ZUM-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};

/** Nombre: sin espacios de más, de 1 a 120 caracteres sin contar espacios, sin caracteres de control. */
const normalizeName = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  // eslint-disable-next-line no-control-regex
  if (name.length === 0 || name.length > MAX_NAME_LENGTH || /[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
};

/** Base del sitio para redirect-url: https, o http solo en localhost (staging local). Sin barra final. */
const redirectBase = (env: Env): string | null => {
  const value = env.PAY_REDIRECT_BASE?.trim().replace(/\/+$/, "") ?? "";
  if (/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(value)) return value;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value)) return value;
  return null;
};

export const handlePayOrders = async (request: Request, env: Env): Promise<Response> => {
  const start = await begin(request, env, "pay-order-ip", ORDER_IP_LIMIT);
  if ("response" in start) return start.response as Response;
  const { reply, secrets, now, data } = start;
  if (!hasOnlyKeys(data, ["selection", "code", "token", "projectId", "name", "email", "acceptTerms", "lang"])) {
    return reply(INVALID_REQUEST, 400);
  }

  // Configuración de pagos: sin ella no se cobra (falla cerrado)
  const wompi = loadWompiConfig(env);
  const base = redirectBase(env);
  if (!wompi || !base) return reply(PAYMENTS_UNAVAILABLE, 503);

  // 1) Modo: rediseño y externo quedan bloqueados aunque el total sea exacto
  const selection = parseSelection(data.selection);
  if (!selection) return reply(INVALID_REQUEST, 400);
  if (!PAYABLE_MODES.includes(selection.mode)) return reply(PAYMENT_NOT_AVAILABLE, 400);

  // 2) Términos y datos del cliente
  if (data.acceptTerms !== true) return reply(TERMS_REQUIRED, 400);
  const name = normalizeName(data.name);
  const email = normalizeEmail(data.email);
  const lang = data.lang === undefined ? "es" : data.lang;
  if (!name || !email || (lang !== "es" && lang !== "en")) return reply(INVALID_REQUEST, 400);
  const hasCode = data.code !== undefined && data.code !== null && data.code !== "";
  const code = hasCode ? normalizeCode(data.code) : null;
  if (hasCode && !code) return reply(INVALID_CODE, 400);

  // Límite por correo (bucket propio), antes de consultar la base
  if ((await hit(env, `pay-order-email:${await hmacHex(secrets.pepper, email)}`, now)) > ORDER_EMAIL_LIMIT) {
    return reply(RATE_LIMITED, 429);
  }

  // 3) Verificación de cliente: con token válido, descuento del proyecto; sin token, precio de lista
  const verification = await readVerification(env, secrets.tokenSecret, data.token, data.projectId, now);
  if (verification === "invalid") return reply(INVALID_TOKEN, 400);
  const verified = selection.mode === "zumiaClient" && verification !== null;

  // 4) Precio en el servidor
  const quote = serverQuote(selection, verification);
  if (!quote) return reply(INVALID_REQUEST, 400);
  const row = code ? await findUsableCode(env, code, verification, now) : null;
  if (code && !row) return reply(INVALID_CODE, 400);
  const breakdown = paymentBreakdown(quote, row as DiscountCode | null);
  if (breakdown.total < MIN_TOTAL) return reply(BELOW_MINIMUM, 400);

  const reference = newReference();
  const expiresAt = now + ORDER_TTL_SECONDS;
  const selectionJson = JSON.stringify({ ...selection, projectId: verified ? verification.projectId : null });
  const insert = env.DB.prepare(
    `INSERT INTO orders (reference, status, mode, verified, project_id, selection_json, subtotal, code, discount_requested,
       discount_applied, floor_applied, total, deposit, balance, amount_in_cents, currency, code_reserved, customer_name,
       customer_email, accepted_terms_at, terms_version, lang, created_at, expires_at, updated_at)
     SELECT ?, ${row ? "CASE WHEN changes() = 1 THEN 'pending' END" : "'pending'"}, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COP', ?, ?, ?, ?, ?, ?, ?, ?, ?
     RETURNING reference`,
  ).bind(
    reference,
    selection.mode,
    verified ? 1 : 0,
    verified ? verification.projectId : null,
    selectionJson,
    breakdown.subtotal,
    row ? row.code : null,
    breakdown.discountRequested,
    breakdown.discountApplied,
    breakdown.floorApplied ? 1 : 0,
    breakdown.total,
    breakdown.deposit,
    breakdown.balance,
    breakdown.amountInCents,
    row ? 1 : 0,
    name,
    email,
    now,
    LEGAL_VERSION,
    lang,
    now,
    expiresAt,
    now,
  );

  // 5) Una sola transacción (batch): se cancelan las órdenes pending anteriores de este correo (pasan a
  //    expired y liberan su reserva), se reserva el código si hay cupo y se crea la orden. Si la reserva no
  //    afecta filas, changes() = 0, el estado queda NULL, el INSERT falla y se deshace todo el batch.
  const statements = [
    env.DB.prepare(
      `UPDATE discount_codes SET reserved_count = max(0, reserved_count - (
         SELECT count(*) FROM orders o
         WHERE o.customer_email = ?1 AND o.status = 'pending' AND o.code_reserved = 1 AND o.code = discount_codes.code))
       WHERE code IN (SELECT code FROM orders WHERE customer_email = ?1 AND status = 'pending' AND code_reserved = 1)`,
    ).bind(email),
    env.DB.prepare(
      `UPDATE orders SET status = 'expired', code_reserved = 0, updated_at = ?2, expires_at = min(expires_at, ?2)
       WHERE customer_email = ?1 AND status = 'pending'`,
    ).bind(email, now),
    ...(row
      ? [
          env.DB.prepare(
            `UPDATE discount_codes SET reserved_count = reserved_count + 1
             WHERE code = ? AND active = 1 AND (expires_at IS NULL OR expires_at > ?)
               AND (max_uses IS NULL OR used_count + reserved_count < max_uses)`,
          ).bind(row.code, now),
        ]
      : []),
    insert,
  ];
  try {
    const results = await env.DB.batch(statements);
    if (results[results.length - 1].results.length !== 1) throw new Error("not inserted");
  } catch {
    // Si el código se agotó en el último instante (otra orden ganó el cupo), es invalid_code; si no, error del servidor.
    if (row && !(await findUsableCode(env, row.code, verification, now))) return reply(INVALID_CODE, 400);
    console.error("order insert failed");
    return reply(SERVER_ERROR, 500);
  }

  // 6) Datos para el Web Checkout (sin nombre ni correo: viajarían en la URL)
  const expirationTime = new Date(expiresAt * 1000).toISOString();
  const signature = await integritySignature(wompi.integritySecret, {
    reference,
    amountInCents: breakdown.amountInCents,
    currency: "COP",
    expirationTime,
  });
  const redirectUrl = `${base}${lang === "en" ? `/en${RESULT_PATH}` : RESULT_PATH}`;

  return reply({
    ok: true,
    reference,
    expiresAt,
    mode: selection.mode,
    verified,
    breakdown: { ...breakdown, minTotal: MIN_TOTAL },
    checkout: {
      action: CHECKOUT_URL,
      fields: {
        "public-key": wompi.publicKey,
        currency: "COP",
        "amount-in-cents": String(breakdown.amountInCents),
        reference,
        "signature:integrity": signature,
        "redirect-url": redirectUrl,
        "expiration-time": expirationTime,
      },
    },
  });
};
