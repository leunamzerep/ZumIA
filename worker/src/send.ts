// Envío del código por Brevo (API transaccional v3). Nunca lanza errores y nunca registra
// el correo, el código ni la clave: solo el status HTTP y el código de error de Brevo.

import type { Env } from "./types";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 8000;
const CODE_TTL_MINUTES = 10;

const buildMessage = (code: string) => {
  const subject = `Tu código de Zumia: ${code}`;
  const textContent = [
    `Tu código de verificación de Zumia es: ${code}`,
    "",
    `Vence en ${CODE_TTL_MINUTES} minutos.`,
    "",
    "Si no lo pediste, ignora este correo.",
  ].join("\n");
  const htmlContent = [
    "<p>Tu código de verificación de Zumia es:</p>",
    `<p style="font-size:24px;letter-spacing:4px"><strong>${code}</strong></p>`,
    `<p>Vence en ${CODE_TTL_MINUTES} minutos.</p>`,
    "<p>Si no lo pediste, ignora este correo.</p>",
  ].join("");
  return { subject, textContent, htmlContent };
};

/** Lee el campo `code` del error de Brevo; solo se acepta si parece un código corto (p. ej. "unauthorized"). */
const brevoErrorCode = async (response: Response): Promise<string> => {
  try {
    const body: unknown = await response.json();
    const code = typeof body === "object" && body !== null ? (body as { code?: unknown }).code : undefined;
    return typeof code === "string" && /^[a-z_]{1,64}$/.test(code) ? code : "unknown";
  } catch {
    return "unknown";
  }
};

const postToBrevo = async (apiKey: string, fromEmail: string, fromName: string, email: string, code: string): Promise<void> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(BREVO_URL, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: fromName, email: fromEmail }, to: [{ email }], ...buildMessage(code) }),
      signal: controller.signal,
    });
    if (!response.ok) console.error(`brevo error: status=${response.status} code=${await brevoErrorCode(response)}`);
  } catch (error) {
    console.error(error instanceof Error && error.name === "AbortError" ? "brevo error: timeout" : "brevo error: network");
  } finally {
    clearTimeout(timer);
  }
};

export const sendCode = async (env: Env, email: string, code: string): Promise<void> => {
  try {
    const devLog = env.DEV_LOG_CODES === "1";
    // Solo en desarrollo. Nunca activar DEV_LOG_CODES en producción.
    if (devLog) console.log(`[DEV] código para ${email}: ${code}`);

    const apiKey = env.BREVO_API_KEY;
    if (!apiKey) {
      if (!devLog) console.error("mail not configured");
      return;
    }
    if (apiKey.startsWith("xsmtpsib-")) {
      console.error("BREVO_API_KEY parece una clave SMTP; se requiere API v3 (xkeysib-)");
      return;
    }
    const fromEmail = env.MAIL_FROM_EMAIL;
    const fromName = env.MAIL_FROM_NAME;
    if (!fromEmail || !fromName) {
      console.error("mail not configured");
      return;
    }
    await postToBrevo(apiKey, fromEmail, fromName, email, code);
  } catch {
    console.error("mail send failed");
  }
};
