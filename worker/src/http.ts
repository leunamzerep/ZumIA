// Respuestas JSON y CORS (sin comodín: solo orígenes de ALLOWED_ORIGINS).

import type { Env } from "./types";

/** Cuerpos genéricos compartidos por las rutas /verify/*. */
export const RATE_LIMITED = { ok: false, error: "rate_limited" };
export const INVALID_REQUEST = { ok: false, error: "invalid_request" };
export const SERVER_ERROR = { ok: false, error: "server_error" };
export const METHOD_NOT_ALLOWED = { ok: false, error: "method_not_allowed" };

export const corsHeaders = (request: Request, env: Env): Record<string, string> => {
  const headers: Record<string, string> = { Vary: "Origin" };
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
};

/** Cabeceras de todas las respuestas (también errores y preflight): nada se guarda en caché ni se interpreta como otro tipo. */
const BASE_HEADERS = { "cache-control": "no-store", "x-content-type-options": "nosniff" };

export const json = (data: unknown, status = 200, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...BASE_HEADERS, ...extra },
  });

/** Respuesta al preflight (OPTIONS): 204 sin cuerpo; CORS solo si el Origin está permitido (ver corsHeaders). */
export const preflight = (cors: Record<string, string>): Response =>
  new Response(null, { status: 204, headers: { ...BASE_HEADERS, ...cors } });
