// Punto de enganche del envío del código. El envío real de correo llega en el paso 4.

import type { Env } from "./types";

export const sendCode = async (env: Env, email: string, code: string): Promise<void> => {
  // Solo en desarrollo. Nunca activar DEV_LOG_CODES en producción.
  if (env.DEV_LOG_CODES === "1") {
    console.log(`[DEV] código para ${email}: ${code}`);
  }
};
