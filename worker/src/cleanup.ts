// Tareas programadas (cron). No guardan ni registran datos personales.

import { expireOverdueOrders } from "./orders";
import { WINDOW_SECONDS } from "./ratelimit";
import type { Env } from "./types";

const DAY_SECONDS = 24 * 3600;
/** Debe coincidir con el cron diario de wrangler.toml [triggers]. */
export const DAILY_CRON = "17 3 * * *";

/** Limpieza diaria: borra lo que ya no sirve (no toca órdenes). */
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

/** Cada cron: vence órdenes pendientes (consultando antes a Wompi). El diario, además, limpia. */
export const runScheduled = async (env: Env, now: number, daily: boolean): Promise<void> => {
  try {
    await expireOverdueOrders(env, now);
  } catch {
    console.error("expire orders failed");
  }
  if (daily) await runCleanup(env, now);
};
