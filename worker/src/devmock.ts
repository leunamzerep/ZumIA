// Solo pruebas locales: DEV_MOCK_ORIGIN redirige las llamadas a Wompi y a Brevo a un servidor simulado
// en localhost. Se ignora salvo que WOMPI_ENV sea "test" y el valor sea http://127.0.0.1:<puerto> o
// http://localhost:<puerto>. Nunca definirlo en producción (igual que ALLOW_MISSING_IP).

import type { Env } from "./types";

export const devMockOrigin = (env: Env): string | null => {
  const value = env.DEV_MOCK_ORIGIN?.trim() ?? "";
  return env.WOMPI_ENV === "test" && /^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}$/.test(value) ? value : null;
};

/** Variables que solo existen en desarrollo. */
const DEV_ONLY_VARS = ["DEV_MOCK_ORIGIN", "ALLOW_MISSING_IP", "DEV_LOG_CODES"] as const;

/**
 * Guarda de seguridad: true si WOMPI_ENV=prod y hay definida alguna variable de desarrollo.
 * Las rutas /pay/* responden 503 y se registra solo el aviso (nunca los valores).
 */
export const unsafeProdConfig = (env: Env): boolean => {
  if (env.WOMPI_ENV !== "prod") return false;
  const found = DEV_ONLY_VARS.some((name) => {
    const value = env[name];
    return typeof value === "string" && value.trim() !== "";
  });
  if (found) console.error("unsafe config: dev-only variables defined with WOMPI_ENV=prod");
  return found;
};
