// Token firmado (sin estado): base64url(payload).base64url(HMAC-SHA256) con TOKEN_SECRET.

import { hmacBytes, safeEqual } from "./crypto";
import type { Env } from "./types";

export type TokenPayload = {
  /** Correo del cliente */
  sub: string;
  /** Vencimiento (segundos desde 1970) */
  exp: number;
  /** Emisión (segundos desde 1970) */
  iat: number;
  /** Ids de los proyectos activos al emitirlo */
  pids: string[];
  jti: string;
};

const DEFAULT_TTL_SECONDS = 1800;
const MAX_TTL_SECONDS = 86_400;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromBase64Url = (text: string): Uint8Array | null => {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
};

/** Secretos requeridos. null si falta alguno o si TOKEN_SECRET es igual a VERIFY_PEPPER. */
export const loadSecrets = (env: Env): { pepper: string; tokenSecret: string } | null => {
  const pepper = env.VERIFY_PEPPER;
  const tokenSecret = env.TOKEN_SECRET;
  if (!pepper || !tokenSecret || pepper === tokenSecret) return null;
  return { pepper, tokenSecret };
};

/** TTL en segundos: TOKEN_TTL_SECONDS si es un entero de 1 a 86400; si no, 1800. */
export const tokenTtl = (env: Env): number => {
  const value = Number(env.TOKEN_TTL_SECONDS);
  return Number.isInteger(value) && value >= 1 && value <= MAX_TTL_SECONDS ? value : DEFAULT_TTL_SECONDS;
};

export const signToken = async (secret: string, payload: TokenPayload): Promise<string> => {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = toBase64Url(await hmacBytes(secret, body));
  return `${body}.${signature}`;
};

const isPayload = (value: unknown): value is TokenPayload => {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.sub === "string" &&
    typeof p.exp === "number" &&
    typeof p.iat === "number" &&
    typeof p.jti === "string" &&
    Array.isArray(p.pids) &&
    p.pids.every((id) => typeof id === "string")
  );
};

/** Devuelve el payload si la firma es válida y no venció; si no, null. */
export const verifyToken = async (secret: string, token: string, now: number): Promise<TokenPayload | null> => {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const expected = toBase64Url(await hmacBytes(secret, body));
  if (!safeEqual(expected, signature)) return null;
  const bytes = fromBase64Url(body);
  if (!bytes) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(decoder.decode(bytes));
  } catch {
    return null;
  }
  if (!isPayload(payload) || payload.exp <= now) return null;
  return payload;
};
