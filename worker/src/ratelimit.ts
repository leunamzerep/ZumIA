// Rate limit de ventana fija sobre la tabla rate_limits (segundos desde 1970).

import type { Env } from "./types";

export const WINDOW_SECONDS = 3600;

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
