// Cliente de las rutas de pago del Worker (/pay/code, /pay/orders, /pay/status). Es el mismo Worker de la
// verificación, así que usa la misma base (VITE_VERIFY_API_URL). Solo POST con cuerpo JSON; sin cookies,
// sin localStorage y sin escribir en consola. NUNCA se envían montos: el precio lo calcula el Worker.

import { VERIFY_API_URL } from "@/config/site";
import type { ExtrasSelection, QuoteMode, Additional } from "@/data/quote";
import type { PlanId } from "@/data/plans";

const TIMEOUT_MS = 15_000;

/** Lo que el cliente eligió en el cotizador. El Worker recalcula todo desde aquí. */
export type PaySelection = { mode: QuoteMode; planId: PlanId | null; extras: ExtrasSelection; additional: Additional };
/** Verificación de cliente Zumia (token solo en memoria, D-055). null = sin verificar. */
export type PayVerification = { token: string; projectId: string } | null;

/** Errores con nombre. rate_limited = 429, unavailable = 503 (pagos apagados), network = sin respuesta o error 5xx. */
export type PayError =
  | "invalid_code"
  | "invalid_token"
  | "payment_not_available"
  | "terms_required"
  | "invalid_request"
  | "below_minimum"
  | "invalid_reference"
  | "rate_limited"
  | "unavailable"
  | "network";

export type PayResult<T> = { status: "ok"; data: T } | { status: "error"; error: PayError };

/** Desglose que devuelve el Worker (mismo cálculo que paymentBreakdown, más el piso). */
export type ServerBreakdown = {
  subtotal: number;
  discountRequested: number;
  discountApplied: number;
  reducedBy: number;
  floorApplied: boolean;
  total: number;
  deposit: number;
  balance: number;
  amountInCents: number;
  minTotal: number;
};

export type AppliedCode = { code: string; kind: "percent" | "amount"; value: number };
export type CodeData = { code: AppliedCode; breakdown: ServerBreakdown };

/** Campos del Web Checkout tal como los firma el Worker. */
export type CheckoutFields = Record<string, string>;
export type OrderData = {
  reference: string;
  expiresAt: number;
  mode: QuoteMode;
  verified: boolean;
  breakdown: ServerBreakdown;
  checkout: { action: string; fields: CheckoutFields };
};

export type OrderStatus = "pending" | "approved" | "declined" | "voided" | "error" | "expired";
export type StatusData = { status: OrderStatus; expired: boolean };

export const REFERENCE_PATTERN = /^ZUM-[0-9A-F]{32}$/;
const KNOWN_ERRORS: readonly PayError[] = ["invalid_code", "invalid_token", "payment_not_available", "terms_required", "invalid_request", "below_minimum", "invalid_reference"];
const ORDER_STATUSES: readonly OrderStatus[] = ["pending", "approved", "declined", "voided", "error", "expired"];
const BREAKDOWN_NUMBERS = ["subtotal", "discountRequested", "discountApplied", "reducedBy", "total", "deposit", "balance", "amountInCents", "minTotal"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const post = async (path: string, body: unknown): Promise<{ status: number; json: unknown } | null> => {
  if (!VERIFY_API_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${VERIFY_API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return { status: response.status, json };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Traduce una respuesta que no es 200 a un error con nombre. */
const failure = (response: { status: number; json: unknown } | null): { status: "error"; error: PayError } => {
  if (!response) return { status: "error", error: "network" };
  if (response.status === 429) return { status: "error", error: "rate_limited" };
  if (response.status === 503) return { status: "error", error: "unavailable" };
  if (response.status === 400) {
    const code = isRecord(response.json) ? response.json.error : null;
    return { status: "error", error: KNOWN_ERRORS.includes(code as PayError) ? (code as PayError) : "invalid_request" };
  }
  return { status: "error", error: "network" };
};

/** Copia SOLO los campos de la selección (lista blanca): así nunca viaja un monto aunque el objeto traiga más. */
const selectionBody = (selection: PaySelection) => ({
  mode: selection.mode,
  planId: selection.planId,
  extras: { ...selection.extras },
  additional: { subpages: selection.additional.subpages, sections: selection.additional.sections },
});

const verificationBody = (verification: PayVerification) => (verification ? { token: verification.token, projectId: verification.projectId } : {});

export const parseBreakdown = (value: unknown): ServerBreakdown | null => {
  if (!isRecord(value) || typeof value.floorApplied !== "boolean") return null;
  for (const key of BREAKDOWN_NUMBERS) if (!Number.isSafeInteger(value[key]) || (value[key] as number) < 0) return null;
  const b = value as unknown as ServerBreakdown;
  if (b.deposit <= 0 || b.deposit + b.balance !== b.total || b.amountInCents !== b.deposit * 100) return null;
  return {
    subtotal: b.subtotal,
    discountRequested: b.discountRequested,
    discountApplied: b.discountApplied,
    reducedBy: b.reducedBy,
    floorApplied: b.floorApplied,
    total: b.total,
    deposit: b.deposit,
    balance: b.balance,
    amountInCents: b.amountInCents,
    minTotal: b.minTotal,
  };
};

/** POST /pay/code: valida un código de descuento para esta selección. */
export const checkCode = async (input: { code: string; selection: PaySelection; verification: PayVerification }): Promise<PayResult<CodeData>> => {
  const response = await post("/pay/code", { code: input.code, selection: selectionBody(input.selection), ...verificationBody(input.verification) });
  if (!response || response.status !== 200) return failure(response);
  const json = response.json;
  const breakdown = isRecord(json) ? parseBreakdown(json.breakdown) : null;
  const code = isRecord(json) && isRecord(json.code) ? json.code : null;
  if (!isRecord(json) || json.ok !== true || !breakdown || !code || typeof code.code !== "string" || (code.kind !== "percent" && code.kind !== "amount") || !Number.isSafeInteger(code.value)) {
    return { status: "error", error: "network" };
  }
  return { status: "ok", data: { code: { code: code.code, kind: code.kind, value: code.value as number }, breakdown } };
};

export type OrderInput = {
  selection: PaySelection;
  verification: PayVerification;
  code: string | null;
  name: string;
  email: string;
  acceptTerms: boolean;
  lang: "es" | "en";
};

/** POST /pay/orders: crea la orden (el Worker calcula el precio y firma el checkout). */
export const createOrder = async (input: OrderInput): Promise<PayResult<OrderData>> => {
  const body = {
    selection: selectionBody(input.selection),
    ...verificationBody(input.verification),
    ...(input.code ? { code: input.code } : {}),
    name: input.name,
    email: input.email,
    acceptTerms: input.acceptTerms,
    lang: input.lang,
  };
  const response = await post("/pay/orders", body);
  if (!response || response.status !== 200) return failure(response);
  const json = response.json;
  if (!isRecord(json) || json.ok !== true || typeof json.reference !== "string" || !REFERENCE_PATTERN.test(json.reference)) return { status: "error", error: "network" };
  const breakdown = parseBreakdown(json.breakdown);
  const checkout = isRecord(json.checkout) ? json.checkout : null;
  const fields = checkout && isRecord(checkout.fields) ? checkout.fields : null;
  if (!breakdown || !checkout || typeof checkout.action !== "string" || !fields || !Object.values(fields).every((v) => typeof v === "string")) {
    return { status: "error", error: "network" };
  }
  if (typeof json.expiresAt !== "number" || typeof json.verified !== "boolean" || (json.mode !== "normal" && json.mode !== "zumiaClient")) {
    return { status: "error", error: "network" };
  }
  return {
    status: "ok",
    data: { reference: json.reference, expiresAt: json.expiresAt, mode: json.mode, verified: json.verified, breakdown, checkout: { action: checkout.action, fields: fields as CheckoutFields } },
  };
};

/** Id de transacción de Wompi tal como lo acepta /pay/status. */
export const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export type StatusQuery = { reference: string } | { id: string };

/**
 * POST /pay/status: estado de una orden por su referencia o por el id de transacción de Wompi (cuerpo JSON:
 * ni la referencia ni el id viajan en la URL del Worker). Si llegan los dos, el Worker usa la referencia.
 */
export const getPayStatus = async (query: StatusQuery): Promise<PayResult<StatusData>> => {
  const body =
    "reference" in query
      ? REFERENCE_PATTERN.test(query.reference)
        ? { reference: query.reference }
        : null
      : TRANSACTION_ID_PATTERN.test(query.id)
        ? { id: query.id }
        : null;
  if (!body) return { status: "error", error: "invalid_reference" };
  const response = await post("/pay/status", body);
  if (!response || response.status !== 200) return failure(response);
  const json = response.json;
  if (!isRecord(json) || json.ok !== true || !ORDER_STATUSES.includes(json.status as OrderStatus) || typeof json.expired !== "boolean") {
    return { status: "error", error: "network" };
  }
  return { status: "ok", data: { status: json.status as OrderStatus, expired: json.expired } };
};
