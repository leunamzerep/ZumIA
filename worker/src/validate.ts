// Lectura y validación de cuerpos JSON, compartidas por las rutas /verify/*.

const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;
const CODE_PATTERN = /^\d{6}$/;
const MAX_TOKEN_LENGTH = 1900;
const MAX_ID_LENGTH = 64;

/** Lee el cuerpo como texto con tope real de bytes. Devuelve null si lo excede. */
const readLimitedBody = async (request: Request, maxBytes: number): Promise<string | null> => {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};

export type BodyResult = { error: 415 | 413 } | { data: Record<string, unknown> | null };

/** Comprueba Content-Type y tamaño, y devuelve el JSON como objeto (null si no es un objeto JSON válido). */
export const readJsonBody = async (request: Request, maxBytes: number): Promise<BodyResult> => {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return { error: 415 };
  const raw = await readLimitedBody(request, maxBytes);
  if (raw === null) return { error: 413 };
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data)) return { data: null };
    return { data: data as Record<string, unknown> };
  } catch {
    return { data: null };
  }
};

/** Correo normalizado (trim + minúsculas) o null si el formato no es válido. */
export const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) return null;
  return email;
};

export const parseEmailBody = (data: Record<string, unknown>): string | null => normalizeEmail(data.email);

export const parseConfirmBody = (data: Record<string, unknown>): { email: string; code: string } | null => {
  const email = normalizeEmail(data.email);
  const code = data.code;
  if (!email || typeof code !== "string" || !CODE_PATTERN.test(code)) return null;
  return { email, code };
};

export const parseDiscountBody = (data: Record<string, unknown>): { token: string; projectId: string } | null => {
  const { token, projectId } = data;
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
  if (typeof projectId !== "string" || projectId.length === 0 || projectId.length > MAX_ID_LENGTH) return null;
  return { token, projectId };
};
