// POST /verify/request: pide un código de verificación para un correo.
// La respuesta es idéntica exista o no el correo (solo cambian 400 por formato y 429 por límite).

import { hmacHex, randomCode } from "./crypto";
import { INVALID_REQUEST, METHOD_NOT_ALLOWED, RATE_LIMITED, SERVER_ERROR, corsHeaders, json, preflight } from "./http";
import { clientIp, hit } from "./ratelimit";
import { sendCode } from "./send";
import type { Env, ExecutionContext } from "./types";
import { parseEmailBody, readJsonBody } from "./validate";

const MAX_BODY_BYTES = 1024;
const CODE_TTL_SECONDS = 600;
const COOLDOWN_SECONDS = 60;
const CLEANUP_AFTER_SECONDS = 24 * 3600;
const IP_LIMIT = 10;
const EMAIL_LIMIT = 3;

const GENERIC_OK = { ok: true, message: "Si el correo tiene proyectos activos, recibirás un código." };

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

export const handleVerifyRequest = async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
  const cors = corsHeaders(request, env);
  const reply = (data: unknown, status = 200) => json(data, status, cors);

  if (request.method === "OPTIONS") return preflight(cors);
  if (request.method !== "POST") return reply(METHOD_NOT_ALLOWED, 405);

  // Falta el secreto, o TOKEN_SECRET (si existe) es igual a VERIFY_PEPPER: configuración insegura.
  const pepper = env.VERIFY_PEPPER;
  if (!pepper || env.TOKEN_SECRET === pepper) return reply(SERVER_ERROR, 500);

  const now = Math.floor(Date.now() / 1000);

  // 1) Límite por IP, antes de leer el cuerpo.
  const ip = clientIp(request, env);
  if (!ip) {
    console.error("missing client ip");
    return reply(SERVER_ERROR, 500);
  }
  if ((await hit(env, `ip:${await hmacHex(pepper, ip)}`, now)) > IP_LIMIT) return reply(RATE_LIMITED, 429);

  // 2) Limpieza oportunista de códigos con más de 24 h.
  await env.DB.prepare("DELETE FROM verification_codes WHERE created_at < ?")
    .bind(now - CLEANUP_AFTER_SECONDS)
    .run();

  // 3) Validación de la petición (estos 400 no cuentan contra el límite del correo).
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if ("error" in body) return reply(body.error === 415 ? { ok: false, error: "unsupported_media_type" } : { ok: false, error: "payload_too_large" }, body.error);
  const email = body.data ? parseEmailBody(body.data) : null;
  if (!email) return reply(INVALID_REQUEST, 400);

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
    // Sin await: el envío no puede alargar la respuesta (si no, se distinguiría un correo existente).
    ctx.waitUntil(sendCode(env, email, code));
  } else {
    await decoyWrites(env, now);
  }

  return reply(GENERIC_OK);
};
