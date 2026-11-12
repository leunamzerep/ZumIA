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

export const json = (data: unknown, status = 200, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
