// Rate limit de ventana fija sobre la tabla rate_limits (segundos desde 1970).

import type { Env } from "./types";

export const WINDOW_SECONDS = 3600;

/** IPv6 → su prefijo /64 (una persona controla todo su /64; si no, rotaría de IP para saltarse el límite). */
const ipv6Prefix = (ip: string): string => {
  const [left, right = ""] = ip.split("::");
  const head = left ? left.split(":") : [];
  const tail = right ? right.split(":") : [];
  const missing = ip.includes("::") ? Math.max(0, 8 - head.length - tail.length) : 0;
  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  return `${groups.slice(0, 4).map((group) => parseInt(group || "0", 16).toString(16)).join(":")}::/64`;
};

/**
 * IP del cliente para el límite por IP. Solo se confía en CF-Connecting-IP: la pone Cloudflare y el cliente
 * no puede falsearla (nunca X-Forwarded-For ni otras cabeceras). Devuelve null si falta, y el handler
 * responde 500 en vez de meter a todos en el mismo cubo. Solo en local (ALLOW_MISSING_IP=1 en .dev.vars)
 * se usa un valor fijo.
 */
export const clientIp = (request: Request, env: Env): string | null => {
  const header = request.headers.get("CF-Connecting-IP")?.trim();
  if (!header) return env.ALLOW_MISSING_IP === "1" ? "local" : null;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(header);
  if (mapped) return mapped[1];
  return header.includes(":") ? ipv6Prefix(header.toLowerCase()) : header;
};

/** Suma 1 al contador de la clave en su ventana actual y devuelve el nuevo valor (atómico). */
export const hit = async (env: Env, key: string, now: number): Promise<number> => {
  const windowStart = Math.floor(now / WINDOW_SECONDS) * WINDOW_SECONDS;
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN window_start < excluded.window_start THEN 1 ELSE count + 1 END,
       window_start = excluded.window_start
     RETURNING count`,
  )
    .bind(key, windowStart)
    .first<{ count: number }>();
  return row?.count ?? 1;
};
