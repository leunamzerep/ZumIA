// Solo pruebas locales: DEV_MOCK_ORIGIN redirige las llamadas a Wompi y a Brevo a un servidor simulado
// en localhost. Se ignora salvo que WOMPI_ENV sea "test" y el valor sea http://127.0.0.1:<puerto> o
// http://localhost:<puerto>. Nunca definirlo en producción (igual que ALLOW_MISSING_IP).

import type { Env } from "./types";

export const devMockOrigin = (env: Env): string | null => {
  const value = env.DEV_MOCK_ORIGIN?.trim() ?? "";
  return env.WOMPI_ENV === "test" && /^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}$/.test(value) ? value : null;
};
