// Utilidades criptográficas: código de 6 dígitos sin sesgo, HMAC-SHA256 y comparación en tiempo constante.

const CODE_SPACE = 1_000_000;
// Mayor múltiplo de 1.000.000 que cabe en 2^32: valores por encima se descartan (evita sesgo de módulo).
const LIMIT = Math.floor(0x1_0000_0000 / CODE_SPACE) * CODE_SPACE;

export const randomCode = (): string => {
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= LIMIT);
  return String(buffer[0] % CODE_SPACE).padStart(6, "0");
};

const encoder = new TextEncoder();

export const hmacBytes = async (secret: string, message: string): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
};

export const hmacHex = async (secret: string, message: string): Promise<string> =>
  Array.from(await hmacBytes(secret, message), (byte) => byte.toString(16).padStart(2, "0")).join("");

/** Compara dos textos en tiempo constante (recorre siempre el largo del más largo). */
export const safeEqual = (a: string, b: string): boolean => {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  const length = Math.max(x.length, y.length);
  for (let i = 0; i < length; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
};
