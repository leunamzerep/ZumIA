// Limpieza programada (cron diario): borra lo que ya no sirve. No guarda ni registra datos.

import { WINDOW_SECONDS } from "./ratelimit";
import type { Env } from "./types";

const DAY_SECONDS = 24 * 3600;

export const runCleanup = async (env: Env, now: number): Promise<void> => {
  await env.DB.batch([
    // Ventanas del rate limit que ya terminaron
    env.DB.prepare("DELETE FROM rate_limits WHERE window_start + ? <= ?").bind(WINDOW_SECONDS, now),
    // Códigos vencidos hace más de 1 día, o ya consumidos (usados o reemplazados) y creados hace más de 1 día
    env.DB.prepare("DELETE FROM verification_codes WHERE expires_at < ? OR (used = 1 AND created_at < ?)").bind(
      now - DAY_SECONDS,
      now - DAY_SECONDS,
    ),
  ]);
};
