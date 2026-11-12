// Utilidades criptográficas: código de 6 dígitos sin sesgo y HMAC-SHA256 en hex.

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

export const hmacHex = async (secret: string, message: string): Promise<string> => {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
};
