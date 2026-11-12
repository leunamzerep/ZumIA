// POST /verify/request: pide un código de verificación para un correo.
// La respuesta es idéntica exista o no el correo (solo cambian 400 por formato y 429 por límite).

import { hmacHex, randomCode } from "./crypto";
import { corsHeaders, json } from "./http";
import { hit } from "./ratelimit";
import { sendCode } from "./send";
import type { Env } from "./types";

const MAX_BODY_BYTES = 1024;
const MAX_EMAIL_LENGTH = 254;
const CODE_TTL_SECONDS = 600;
const COOLDOWN_SECONDS = 60;
const CLEANUP_AFTER_SECONDS = 24 * 3600;
const IP_LIMIT = 10;
const EMAIL_LIMIT = 3;

const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;

const GENERIC_OK = { ok: true, message: "Si el correo tiene proyectos activos, recibirás un código." };
const RATE_LIMITED = { ok: false, error: "rate_limited" };
const INVALID = { ok: false, error: "invalid_request" };

/** Lee el cuerpo como texto con tope real de bytes. Devuelve null si lo excede. */
const readLimitedBody = async (request: Request): Promise<string | null> => {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};

/** Devuelve el correo normalizado (trim + minúsculas) o null si el formato no es válido. */
const parseEmail = (raw: string): string | null => {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null || !("email" in data)) return null;
  const value = (data as { email: unknown }).email;
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) return null;
  return email;
};

/** Escritura "señuelo": mismo número de escrituras que el camino real, sin guardar datos del correo. */
const decoyWrites = (env: Env, now: number) =>
  env.DB.batch([
    env.DB.prepare(
      "INSERT INTO rate_limits (key, window_start, count) VALUES ('decoy:a', ?, 1) ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1",
    ).bind(now),
    env.DB.prepare(
      "INSERT INTO rate_limits (key, window_start, count) VALUES ('decoy:b', ?, 1) ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1",
    ).bind(now),
  ]);

export const handleVerifyRequest = async (request: Request, env: Env): Promise<Response> => {
  const cors = corsHeaders(request, env);
  const reply = (data: unknown, status = 200) => json(data, status, cors);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);

  const pepper = env.VERIFY_PEPPER;
  if (!pepper) return reply({ ok: false, error: "server_error" }, 500);

  const now = Math.floor(Date.now() / 1000);

  // 1) Límite por IP, antes de leer el cuerpo.
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if ((await hit(env, `ip:${await hmacHex(pepper, ip)}`, now)) > IP_LIMIT) return reply(RATE_LIMITED, 429);

  // 2) Limpieza oportunista de códigos con más de 24 h.
  await env.DB.prepare("DELETE FROM verification_codes WHERE created_at < ?")
    .bind(now - CLEANUP_AFTER_SECONDS)
    .run();

  // 3) Validación de la petición (estos 400 no cuentan contra el límite del correo).
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return reply({ ok: false, error: "unsupported_media_type" }, 415);
  }
  const body = await readLimitedBody(request);
  if (body === null) return reply({ ok: false, error: "payload_too_large" }, 413);
  const email = parseEmail(body);
  if (!email) return reply(INVALID, 400);

  // 4) Límite por correo: antes de consultar projects, así el 429 no delata si existe.
  if ((await hit(env, `email:${await hmacHex(pepper, email)}`, now)) > EMAIL_LIMIT) return reply(RATE_LIMITED, 429);

  // 5) Mismas lecturas y mismo cálculo (código + hash) exista o no el correo.
  const project = await env.DB.prepare("SELECT 1 AS found FROM projects WHERE email = ? AND active = 1 LIMIT 1")
    .bind(email)
    .first<{ found: number }>();
  const last = await env.DB.prepare("SELECT created_at FROM verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1")
    .bind(email)
    .first<{ created_at: number }>();
  const code = randomCode();
  const codeHash = await hmacHex(pepper, `${email}:${code}`);

  const inCooldown = last !== null && now - last.created_at < COOLDOWN_SECONDS;
  if (project && !inCooldown) {
    await env.DB.batch([
      env.DB.prepare("UPDATE verification_codes SET used = 1 WHERE email = ? AND used = 0").bind(email),
      env.DB.prepare("INSERT INTO verification_codes (id, email, code_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)").bind(
        crypto.randomUUID(),
        email,
        codeHash,
        now,
        now + CODE_TTL_SECONDS,
      ),
    ]);
    await sendCode(env, email, code);
  } else {
    await decoyWrites(env, now);
  }

  return reply(GENERIC_OK);
};
