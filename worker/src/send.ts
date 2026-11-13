// Correos por Brevo (API transaccional v3): código de verificación y aviso de pago aprobado.
// Nunca lanzan errores y nunca registran correos, nombres, códigos ni la clave: solo el status HTTP,
// el código de error de Brevo y, en el aviso de pago, la referencia de la orden.

import { devMockOrigin } from "./devmock";
import type { Env } from "./types";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 8000;
const CODE_TTL_MINUTES = 10;

type Message = { subject: string; textContent: string; htmlContent: string };

const buildMessage = (code: string): Message => {
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

type BrevoConfig = { apiKey: string; fromEmail: string; fromName: string };

/** Clave y remitente; null (y registra el motivo) si falta algo o la clave es SMTP. */
const brevoConfig = (env: Env, quietIfMissing = false): BrevoConfig | null => {
  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    if (!quietIfMissing) console.error("mail not configured");
    return null;
  }
  if (apiKey.startsWith("xsmtpsib-")) {
    console.error("BREVO_API_KEY parece una clave SMTP; se requiere API v3 (xkeysib-)");
    return null;
  }
  const fromEmail = env.MAIL_FROM_EMAIL;
  const fromName = env.MAIL_FROM_NAME;
  if (!fromEmail || !fromName) {
    console.error("mail not configured");
    return null;
  }
  return { apiKey, fromEmail, fromName };
};

/** Envía un correo. Devuelve true si Brevo respondió 2xx. */
const postToBrevo = async (env: Env, config: BrevoConfig, email: string, message: Message): Promise<boolean> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const mock = devMockOrigin(env);
  try {
    const response = await fetch(mock ? `${mock}/brevo/v3/smtp/email` : BREVO_URL, {
      method: "POST",
      headers: { "api-key": config.apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: config.fromName, email: config.fromEmail }, to: [{ email }], ...message }),
      signal: controller.signal,
    });
    if (!response.ok) console.error(`brevo error: status=${response.status} code=${await brevoErrorCode(response)}`);
    return response.ok;
  } catch (error) {
    console.error(error instanceof Error && error.name === "AbortError" ? "brevo error: timeout" : "brevo error: network");
    return false;
  } finally {
    clearTimeout(timer);
  }
};

export const sendCode = async (env: Env, email: string, code: string): Promise<void> => {
  try {
    const devLog = env.DEV_LOG_CODES === "1";
    // Solo en desarrollo. Nunca activar DEV_LOG_CODES en producción.
    if (devLog) console.log(`[DEV] código para ${email}: ${code}`);

    const config = brevoConfig(env, devLog);
    if (!config) return;
    await postToBrevo(env, config, email, buildMessage(code));
  } catch {
    console.error("mail send failed");
  }
};

/** Datos del aviso de pago aprobado (para Manuel, no para el cliente). */
export type PaymentNotice = {
  reference: string;
  deposit: number;
  balance: number;
  total: number;
  customerName: string;
  customerEmail: string;
  mode: string;
  verified: boolean;
  code: string | null;
  /** El pago llegó con la orden ya vencida o cerrada */
  late: boolean;
};

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);

const cop = (value: number) => `${new Intl.NumberFormat("es-CO").format(value)} COP`;

/** Asunto y cuerpo del aviso. El nombre y el correo los escribió el cliente: se escapan en el HTML. */
export const buildPaymentNotice = (notice: PaymentNotice): Message => {
  const rows: [string, string][] = [
    ["Referencia", notice.reference],
    ["Anticipo pagado", cop(notice.deposit)],
    ["Saldo pendiente", cop(notice.balance)],
    ["Total", cop(notice.total)],
    ["Nombre", notice.customerName],
    ["Correo", notice.customerEmail],
    ["Modo", notice.mode],
    ["Cliente verificado", notice.verified ? "sí" : "no"],
    ["Código", notice.code ?? "ninguno"],
  ];
  const note = notice.late ? "Ojo: el pago llegó con la orden ya vencida o cerrada; revisa el uso del código." : "";
  return {
    // Solo la referencia en el asunto (los asuntos se ven en notificaciones y vistas previas)
    subject: `Pago de anticipo aprobado: ${notice.reference}`,
    textContent: ["Se aprobó un pago de anticipo en zumia.dev.", "", ...rows.map(([k, v]) => `${k}: ${v}`), ...(note ? ["", note] : [])].join("\n"),
    htmlContent: [
      "<p>Se aprobó un pago de anticipo en zumia.dev.</p><table>",
      ...rows.map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`),
      "</table>",
      note ? `<p>${escapeHtml(note)}</p>` : "",
    ].join(""),
  };
};

const NOTICE_TO_PATTERN = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * Aviso a PAY_NOTICE_TO (correo de administración) cuando se aprueba un pago. Nunca se usa MAIL_FROM_EMAIL
 * como destino. Si falta PAY_NOTICE_TO o falla el envío, solo se registra (el pago no se revierte).
 */
export const sendPaymentNotice = async (env: Env, notice: PaymentNotice): Promise<void> => {
  try {
    const to = env.PAY_NOTICE_TO?.trim().toLowerCase() ?? "";
    if (!NOTICE_TO_PATTERN.test(to) || to.length > 254) {
      console.error(`payment notice not configured ref=${notice.reference}`);
      return;
    }
    const config = brevoConfig(env);
    const ok = config ? await postToBrevo(env, config, to, buildPaymentNotice(notice)) : false;
    if (!ok) console.error(`payment notice failed ref=${notice.reference}`);
  } catch {
    console.error(`payment notice failed ref=${notice.reference}`);
  }
};
