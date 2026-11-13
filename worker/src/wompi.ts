// Wompi (pasarela de pagos): firma de integridad, checksum de eventos y consulta de transacciones.
// Fuente: docs.wompi.co (widget-checkout-web, eventos, seguimiento-de-transacciones, ambientes-y-llaves).
// Nunca registra llaves, secretos, cuerpos de eventos ni datos del pagador: solo status HTTP.

import { safeEqual } from "./crypto";
import { devMockOrigin } from "./devmock";
import type { Env } from "./types";

export type WompiEnv = "test" | "prod";

export type WompiConfig = {
  env: WompiEnv;
  /** https://sandbox.wompi.co/v1 o https://production.wompi.co/v1 (según WOMPI_ENV) */
  apiBase: string;
  publicKey: string;
  privateKey: string;
  eventsSecret: string;
  integritySecret: string;
};

const API_BASE: Record<WompiEnv, string> = {
  test: "https://sandbox.wompi.co/v1",
  prod: "https://production.wompi.co/v1",
};

/** Prefijo de cada llave según el ambiente (docs: ambientes-y-llaves). */
const PREFIXES: Record<WompiEnv, { pub: string; prv: string; events: string; integrity: string }> = {
  test: { pub: "pub_test_", prv: "prv_test_", events: "test_events_", integrity: "test_integrity_" },
  prod: { pub: "pub_prod_", prv: "prv_prod_", events: "prod_events_", integrity: "prod_integrity_" },
};

/**
 * Configuración de Wompi. null (falla cerrado) si falta algo, si WOMPI_ENV no es test|prod,
 * si alguna llave no tiene el prefijo de su ambiente o si dos llaves son iguales.
 */
export const loadWompiConfig = (env: Env): WompiConfig | null => {
  const mode = env.WOMPI_ENV;
  if (mode !== "test" && mode !== "prod") return null;
  const p = PREFIXES[mode];
  const publicKey = env.WOMPI_PUBLIC_KEY?.trim() ?? "";
  const privateKey = env.WOMPI_PRIVATE_KEY?.trim() ?? "";
  const eventsSecret = env.WOMPI_EVENTS_SECRET?.trim() ?? "";
  const integritySecret = env.WOMPI_INTEGRITY_SECRET?.trim() ?? "";
  const pairs: [string, string][] = [
    [publicKey, p.pub],
    [privateKey, p.prv],
    [eventsSecret, p.events],
    [integritySecret, p.integrity],
  ];
  if (pairs.some(([key, prefix]) => !key.startsWith(prefix) || key.length <= prefix.length)) return null;
  if (new Set(pairs.map(([key]) => key)).size !== pairs.length) return null;
  // Solo pruebas locales (WOMPI_ENV=test y localhost): API simulada. Ver devmock.ts.
  const mock = devMockOrigin(env);
  const apiBase = mock ? `${mock}/wompi/v1` : API_BASE[mode];
  return { env: mode, apiBase, publicKey, privateKey, eventsSecret, integritySecret };
};

const encoder = new TextEncoder();

/** SHA-256 en hexadecimal (minúsculas) con Web Crypto. */
export const sha256Hex = async (text: string): Promise<string> =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text))), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

export type IntegrityInput = {
  reference: string;
  /** Monto en centavos (entero positivo) */
  amountInCents: number;
  currency: "COP";
  /** ISO 8601 en UTC (p. ej. 2026-11-12T20:30:00.000Z); si se usa, se envía también como expiration-time */
  expirationTime?: string;
};

const REFERENCE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

/**
 * Firma de integridad (docs: widget-checkout-web, paso 3):
 * SHA-256 de referencia + monto en centavos + moneda (+ fecha de expiración) + secreto de integridad.
 * Lanza un error si los datos no tienen el formato esperado (nunca se firma algo dudoso).
 */
export const integritySignature = async (secret: string, input: IntegrityInput): Promise<string> => {
  const { reference, amountInCents, currency, expirationTime } = input;
  if (!REFERENCE_PATTERN.test(reference)) throw new Error("invalid reference");
  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) throw new Error("invalid amount");
  if (currency !== "COP") throw new Error("invalid currency");
  if (expirationTime !== undefined && !ISO_UTC_PATTERN.test(expirationTime)) throw new Error("invalid expiration");
  return sha256Hex(`${reference}${amountInCents}${currency}${expirationTime ?? ""}${secret}`);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const PROPERTY_PATTERN = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+){0,4}$/;
const MAX_PROPERTIES = 20;
const CHECKSUM_PATTERN = /^[0-9a-fA-F]{64}$/;

/** Valor de una ruta como "transaction.amount_in_cents" dentro de data; solo texto o número finito. */
const valueAt = (data: Record<string, unknown>, path: string): string | null => {
  let current: unknown = data;
  for (const part of path.split(".")) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, part)) return null;
    current = current[part];
  }
  if (typeof current === "string") return current;
  if (typeof current === "number" && Number.isFinite(current)) return String(current);
  return null;
};

/**
 * Verifica el checksum de un evento (docs: eventos). Pasos:
 * 1) valores de signature.properties (rutas dentro de data), en ese orden;
 * 2) + timestamp (entero); 3) + secreto de eventos; 4) SHA-256 y comparación en tiempo constante.
 * La documentación no dice si el hash viene en mayúsculas o minúsculas (su ejemplo está en mayúsculas):
 * se compara sin distinguirlas. Si llega la cabecera X-Event-Checksum, debe coincidir con la del cuerpo.
 * Devuelve false ante cualquier formato inesperado. Solo después de true se deben leer los datos.
 */
export const verifyEventChecksum = async (event: unknown, eventsSecret: string, headerChecksum?: string | null): Promise<boolean> => {
  if (!isRecord(event) || !isRecord(event.data) || !isRecord(event.signature)) return false;
  const { properties, checksum } = event.signature;
  const { timestamp } = event;
  if (!Array.isArray(properties) || properties.length === 0 || properties.length > MAX_PROPERTIES) return false;
  if (!properties.every((item): item is string => typeof item === "string" && PROPERTY_PATTERN.test(item))) return false;
  if (typeof checksum !== "string" || !CHECKSUM_PATTERN.test(checksum)) return false;
  if (typeof timestamp !== "number" || !Number.isSafeInteger(timestamp) || timestamp <= 0) return false;
  if (headerChecksum != null && headerChecksum.trim().toLowerCase() !== checksum.toLowerCase()) return false;

  const values: string[] = [];
  for (const path of properties) {
    const value = valueAt(event.data, path);
    if (value === null) return false;
    values.push(value);
  }
  const expected = await sha256Hex(`${values.join("")}${timestamp}${eventsSecret}`);
  return safeEqual(expected, checksum.toLowerCase());
};

export type WompiStatus = "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
const STATUSES: readonly string[] = ["PENDING", "APPROVED", "DECLINED", "VOIDED", "ERROR"];

/** Datos de la transacción que usa el Worker (no se guarda nada del medio de pago salvo su tipo). */
export type WompiTransaction = {
  id: string;
  status: WompiStatus;
  reference: string;
  amountInCents: number;
  currency: string;
  paymentMethodType: string | null;
};

/** Lee una transacción (del evento o de la API) y la valida; null si falta algo o tiene otro formato. */
export const parseTransaction = (value: unknown): WompiTransaction | null => {
  if (!isRecord(value)) return null;
  const { id, status, reference, amount_in_cents: amount, currency, payment_method_type: method } = value;
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return null;
  if (typeof status !== "string" || !STATUSES.includes(status)) return null;
  if (typeof reference !== "string" || !REFERENCE_PATTERN.test(reference)) return null;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0) return null;
  if (typeof currency !== "string" || currency.length === 0 || currency.length > 8) return null;
  const paymentMethodType = typeof method === "string" && /^[A-Z_]{1,32}$/.test(method) ? method : null;
  return { id, status: status as WompiStatus, reference, amountInCents: amount, currency, paymentMethodType };
};

/** Evento transaction.updated ya verificado: ambiente y transacción. null si es otro evento o no cuadra. */
export const readTransactionEvent = (event: unknown): { environment: string; transaction: WompiTransaction } | null => {
  if (!isRecord(event) || event.event !== "transaction.updated" || typeof event.environment !== "string" || !isRecord(event.data)) return null;
  const transaction = parseTransaction(event.data.transaction);
  return transaction ? { environment: event.environment, transaction } : null;
};

const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const TIMEOUT_MS = 8000;

export type FetchTransactionResult =
  | { status: "ok"; transaction: WompiTransaction }
  | { status: "not_found" }
  | { status: "error" };

/**
 * GET /v1/transactions/:id con la llave privada desde el servidor (docs: seguimiento-de-transacciones).
 * La cabecera "Authorization: Bearer <llave>" sigue el formato que la documentación muestra con la llave
 * pública; con la privada no aparece un ejemplo literal (NO VERIFICADO hasta probar en sandbox).
 * fetchImpl solo se cambia en las pruebas.
 */
export const fetchTransaction = async (
  config: WompiConfig,
  transactionId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchTransactionResult> => {
  if (!TRANSACTION_ID_PATTERN.test(transactionId)) return { status: "not_found" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${config.apiBase}/transactions/${encodeURIComponent(transactionId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.privateKey}`, accept: "application/json" },
      signal: controller.signal,
    });
    if (response.status === 404) return { status: "not_found" };
    if (!response.ok) {
      console.error(`wompi transaction lookup: status=${response.status}`);
      return { status: "error" };
    }
    const body: unknown = await response.json().catch(() => null);
    const transaction = isRecord(body) ? parseTransaction(body.data) : null;
    if (!transaction || transaction.id !== transactionId) {
      console.error("wompi transaction lookup: unexpected body");
      return { status: "error" };
    }
    return { status: "ok", transaction };
  } catch (error) {
    console.error(error instanceof Error && error.name === "AbortError" ? "wompi transaction lookup: timeout" : "wompi transaction lookup: network");
    return { status: "error" };
  } finally {
    clearTimeout(timer);
  }
};

export type FetchByReferenceResult = { status: "ok"; transactions: WompiTransaction[] } | { status: "error" };

/**
 * GET /v1/transactions?reference=… con la llave privada. Documentado solo en la especificación OpenAPI
 * oficial (api.swaggerhub.com/apis/waybox/wompi/1.2.0, "Buscar transacciones", BearerPrivateKey), que no
 * describe la respuesta: se acepta { data: [...] } o { data: {...} } y se descarta lo que no sea de esa
 * referencia (NO VERIFICADO hasta probar en sandbox).
 */
export const fetchTransactionsByReference = async (
  config: WompiConfig,
  reference: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchByReferenceResult> => {
  if (!REFERENCE_PATTERN.test(reference)) return { status: "error" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${config.apiBase}/transactions?reference=${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.privateKey}`, accept: "application/json" },
      signal: controller.signal,
    });
    if (response.status === 404) return { status: "ok", transactions: [] };
    if (!response.ok) {
      console.error(`wompi reference lookup: status=${response.status}`);
      return { status: "error" };
    }
    const body: unknown = await response.json().catch(() => null);
    const data = isRecord(body) ? body.data : undefined;
    const items: unknown[] = Array.isArray(data) ? data : data === undefined || data === null ? [] : [data];
    if (!isRecord(body) || items.length > 100) {
      console.error("wompi reference lookup: unexpected body");
      return { status: "error" };
    }
    const transactions = items
      .map(parseTransaction)
      .filter((tx): tx is WompiTransaction => tx !== null && tx.reference === reference);
    return { status: "ok", transactions };
  } catch (error) {
    console.error(error instanceof Error && error.name === "AbortError" ? "wompi reference lookup: timeout" : "wompi reference lookup: network");
    return { status: "error" };
  } finally {
    clearTimeout(timer);
  }
};
