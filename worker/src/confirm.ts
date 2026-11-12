// POST /verify/confirm (código → token) y POST /verify/discount (token + proyecto → descuento).
// Todo fallo de /confirm devuelve el mismo 400 invalid_code; todo fallo de /discount, 400 invalid_token.

import { hmacHex, safeEqual } from "./crypto";
import { extrasDiscountFor, isPlanId } from "./discounts";
import { INVALID_REQUEST, METHOD_NOT_ALLOWED, RATE_LIMITED, SERVER_ERROR, corsHeaders, json, preflight } from "./http";
import { clientIp, hit } from "./ratelimit";
import { loadSecrets, signToken, tokenTtl, verifyToken } from "./token";
import type { Env } from "./types";
import { parseConfirmBody, parseDiscountBody, readJsonBody } from "./validate";

const CONFIRM_MAX_BODY_BYTES = 1024;
const DISCOUNT_MAX_BODY_BYTES = 2048;
const CONFIRM_IP_LIMIT = 20;
const CONFIRM_EMAIL_LIMIT = 10;
const TOKEN_IP_LIMIT = 30;
const MAX_ATTEMPTS = 5;

const INVALID_CODE = { ok: false, error: "invalid_code" };
const INVALID_TOKEN = { ok: false, error: "invalid_token" };
const UNSUPPORTED_MEDIA = { ok: false, error: "unsupported_media_type" };
const TOO_LARGE = { ok: false, error: "payload_too_large" };
/** Hash de relleno (mismo largo que un HMAC en hex) para comparar aunque no haya código guardado. */
const DUMMY_HASH = "0".repeat(64);

type ProjectRow = { id: string; name: string; plan: string };

export const handleVerifyConfirm = async (request: Request, env: Env): Promise<Response> => {
  const cors = corsHeaders(request, env);
  const reply = (data: unknown, status = 200) => json(data, status, cors);

  if (request.method === "OPTIONS") return preflight(cors);
  if (request.method !== "POST") return reply(METHOD_NOT_ALLOWED, 405);

  const secrets = loadSecrets(env);
  if (!secrets) return reply(SERVER_ERROR, 500);
  const { pepper, tokenSecret } = secrets;

  const now = Math.floor(Date.now() / 1000);

  // 1) Límite por IP (bucket propio), antes de leer el cuerpo.
  const ip = clientIp(request, env);
  if (!ip) {
    console.error("missing client ip");
    return reply(SERVER_ERROR, 500);
  }
  if ((await hit(env, `confirm-ip:${await hmacHex(pepper, ip)}`, now)) > CONFIRM_IP_LIMIT) return reply(RATE_LIMITED, 429);

  // 2) Validación (los 400 de formato no cuentan contra el límite del correo).
  const body = await readJsonBody(request, CONFIRM_MAX_BODY_BYTES);
  if ("error" in body) return reply(body.error === 415 ? UNSUPPORTED_MEDIA : TOO_LARGE, body.error);
  const input = body.data ? parseConfirmBody(body.data) : null;
  if (!input) return reply(INVALID_REQUEST, 400);
  const { email, code } = input;

  // 3) Límite por correo (bucket propio), antes de consultar la base.
  if ((await hit(env, `confirm-email:${await hmacHex(pepper, email)}`, now)) > CONFIRM_EMAIL_LIMIT) return reply(RATE_LIMITED, 429);

  /** Escritura señuelo: mismo número de escrituras que el camino con código real. */
  const decoy = () =>
    env.DB.prepare(
      "INSERT INTO rate_limits (key, window_start, count) VALUES ('decoy:c', ?, 1) ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1",
    )
      .bind(now)
      .run();

  // 4) Código más reciente vigente y sin usar; el intento se cuenta de forma atómica.
  const receivedHash = await hmacHex(pepper, `${email}:${code}`);
  const latest = await env.DB.prepare(
    "SELECT id FROM verification_codes WHERE email = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
  )
    .bind(email, now)
    .first<{ id: string }>();
  const attempt = latest
    ? await env.DB.prepare(
        "UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ? AND used = 0 AND attempts < ? AND expires_at > ? RETURNING code_hash",
      )
        .bind(latest.id, MAX_ATTEMPTS, now)
        .first<{ code_hash: string }>()
    : null;
  if (!latest || !attempt) {
    await decoy();
    // Misma comparación que en el camino real, para no variar el tiempo de CPU.
    safeEqual(receivedHash, DUMMY_HASH);
    return reply(INVALID_CODE, 400);
  }

  // 5) Comparación en tiempo constante.
  if (!safeEqual(receivedHash, attempt.code_hash)) return reply(INVALID_CODE, 400);

  // 6) Proyectos activos con plan conocido (si ya no hay ninguno, es un fallo genérico).
  const rows = await env.DB.prepare("SELECT id, name, plan FROM projects WHERE email = ? AND active = 1 ORDER BY created_at, name")
    .bind(email)
    .all<ProjectRow>();
  const projects = rows.results.filter((row) => isPlanId(row.plan));
  if (projects.length === 0) return reply(INVALID_CODE, 400);

  // 7) Marcar como usado de forma atómica: si otra petición ganó, esta falla.
  const used = await env.DB.prepare("UPDATE verification_codes SET used = 1 WHERE id = ? AND used = 0 RETURNING id")
    .bind(latest.id)
    .first<{ id: string }>();
  if (!used) return reply(INVALID_CODE, 400);
  await env.DB.prepare("UPDATE verification_codes SET used = 1 WHERE email = ? AND used = 0").bind(email).run();

  // 8) Token firmado.
  const expiresIn = tokenTtl(env);
  const token = await signToken(tokenSecret, {
    sub: email,
    iat: now,
    exp: now + expiresIn,
    pids: projects.map((project) => project.id),
    jti: crypto.randomUUID(),
  });

  return reply({
    ok: true,
    token,
    expiresIn,
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      plan: project.plan,
      extrasDiscount: isPlanId(project.plan) ? extrasDiscountFor(project.plan) : 0,
    })),
  });
};

export const handleVerifyDiscount = async (request: Request, env: Env): Promise<Response> => {
  const cors = corsHeaders(request, env);
  const reply = (data: unknown, status = 200) => json(data, status, cors);

  if (request.method === "OPTIONS") return preflight(cors);
  if (request.method !== "POST") return reply(METHOD_NOT_ALLOWED, 405);

  const secrets = loadSecrets(env);
  if (!secrets) return reply(SERVER_ERROR, 500);
  const { pepper, tokenSecret } = secrets;

  const now = Math.floor(Date.now() / 1000);

  // Límite por IP (bucket propio de las rutas de token), antes de leer el cuerpo.
  const ip = clientIp(request, env);
  if (!ip) {
    console.error("missing client ip");
    return reply(SERVER_ERROR, 500);
  }
  if ((await hit(env, `token-ip:${await hmacHex(pepper, ip)}`, now)) > TOKEN_IP_LIMIT) return reply(RATE_LIMITED, 429);

  const body = await readJsonBody(request, DISCOUNT_MAX_BODY_BYTES);
  if ("error" in body) return reply(body.error === 415 ? UNSUPPORTED_MEDIA : TOO_LARGE, body.error);
  const input = body.data ? parseDiscountBody(body.data) : null;
  if (!input) return reply(INVALID_TOKEN, 400);

  const payload = await verifyToken(tokenSecret, input.token, now);
  if (!payload || !payload.pids.includes(input.projectId)) return reply(INVALID_TOKEN, 400);

  // Se relee el proyecto: sigue activo, es del cliente del token y se toma su plan actual.
  const project = await env.DB.prepare("SELECT id, plan FROM projects WHERE id = ? AND email = ? AND active = 1")
    .bind(input.projectId, payload.sub)
    .first<{ id: string; plan: string }>();
  if (!project || !isPlanId(project.plan)) return reply(INVALID_TOKEN, 400);

  return reply({ ok: true, projectId: project.id, plan: project.plan, extrasDiscount: extrasDiscountFor(project.plan) });
};
