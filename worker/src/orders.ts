// Estado de las órdenes de pago: webhook de Wompi (POST /pay/events), consulta (GET|POST /pay/status),
// transiciones y vencimiento (cron). Nunca se confía en el cuerpo del evento: tras validar el checksum se
// consulta la transacción a Wompi y se compara con la orden. Los logs solo llevan la referencia.

import { hmacHex } from "./crypto";
import { INVALID_REQUEST, METHOD_NOT_ALLOWED, RATE_LIMITED, SERVER_ERROR, corsHeaders, json, preflight } from "./http";
import { clientIp, hit } from "./ratelimit";
import { sendPaymentNotice, type PaymentNotice } from "./send";
import { loadSecrets } from "./token";
import type { Env, ExecutionContext } from "./types";
import { readJsonBody } from "./validate";
import {
  fetchTransaction,
  fetchTransactionsByReference,
  loadWompiConfig,
  readTransactionEvent,
  verifyEventChecksum,
  type WompiConfig,
  type WompiTransaction,
} from "./wompi";

const EVENT_MAX_BODY_BYTES = 32 * 1024;
const STATUS_MAX_BODY_BYTES = 512;
const STATUS_IP_LIMIT = 60;
const CRON_BATCH = 50;
/** Si Wompi no responde, el cron vuelve a intentar; pasado este margen, la orden vence igual. */
const LOOKUP_GRACE_SECONDS = 6 * 3600;
const REFERENCE_PATTERN = /^ZUM-[0-9A-F]{32}$/;

const OK = { ok: true };
const INVALID_REFERENCE = { ok: false, error: "invalid_reference" };

type OrderStatus = "pending" | "approved" | "declined" | "voided" | "error" | "expired";

type OrderRow = {
  reference: string;
  status: OrderStatus;
  mode: string;
  verified: number;
  code: string | null;
  code_reserved: number;
  total: number;
  deposit: number;
  balance: number;
  amount_in_cents: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  wompi_transaction_id: string | null;
  expires_at: number;
};

const loadOrder = (env: Env, reference: string) =>
  env.DB.prepare(
    `SELECT reference, status, mode, verified, code, code_reserved, total, deposit, balance, amount_in_cents, currency,
            customer_name, customer_email, wompi_transaction_id, expires_at
     FROM orders WHERE reference = ?`,
  )
    .bind(reference)
    .first<OrderRow>();

/** Estados desde los que un pago aprobado se acepta (APPROVED es final: nunca retrocede). */
const APPROVABLE = "('pending', 'expired', 'declined', 'error')";
/** Estados que todavía tienen o pueden tener una reserva activa. */
const OPEN = "('pending', 'expired')";

/**
 * Cierra la orden con otro estado (declined, voided, error o expired) y libera su reserva, en una transacción.
 * Solo actúa si la orden está en uno de los estados `from`. Devuelve true si cambió.
 */
const closeOrder = async (
  env: Env,
  reference: string,
  to: Exclude<OrderStatus, "pending" | "approved">,
  from: string,
  now: number,
  tx: WompiTransaction | null,
): Promise<boolean> => {
  const [, updated] = await env.DB.batch([
    env.DB.prepare(
      `UPDATE discount_codes SET reserved_count = max(0, reserved_count - 1)
       WHERE code = (SELECT code FROM orders WHERE reference = ?1 AND status IN ${from} AND code_reserved = 1)`,
    ).bind(reference),
    env.DB.prepare(
      `UPDATE orders SET status = ?2, code_reserved = 0, updated_at = ?3,
         wompi_transaction_id = coalesce(?4, wompi_transaction_id), wompi_status = coalesce(?5, wompi_status),
         payment_method_type = coalesce(?6, payment_method_type)
       WHERE reference = ?1 AND status IN ${from} RETURNING reference`,
    ).bind(reference, to, now, tx?.id ?? null, tx?.status ?? null, tx?.paymentMethodType ?? null),
  ]);
  return updated.results.length === 1;
};

/**
 * Aprueba la orden: used_count + 1 y, si tenía reserva, reserved_count - 1 (nunca bajo 0), en una
 * transacción. Un evento repetido o simultáneo no cambia nada (la condición de estado ya no se cumple).
 */
const approveOrder = async (env: Env, reference: string, tx: WompiTransaction, now: number): Promise<boolean> => {
  const [, updated] = await env.DB.batch([
    env.DB.prepare(
      `UPDATE discount_codes SET used_count = used_count + 1,
         reserved_count = max(0, reserved_count - (SELECT code_reserved FROM orders WHERE reference = ?1))
       WHERE code = (SELECT code FROM orders WHERE reference = ?1 AND status IN ${APPROVABLE})`,
    ).bind(reference),
    env.DB.prepare(
      `UPDATE orders SET status = 'approved', code_reserved = 0, wompi_transaction_id = ?2, wompi_status = 'APPROVED',
         payment_method_type = ?3, paid_at = ?4, updated_at = ?4
       WHERE reference = ?1 AND status IN ${APPROVABLE} RETURNING reference`,
    ).bind(reference, tx.id, tx.paymentMethodType, now),
  ]);
  return updated.results.length === 1;
};

export type Outcome = { result: "approved" | "closed" | "mismatch" | "unchanged"; notice?: PaymentNotice };

/**
 * Aplica una transacción ya confirmada con la API de Wompi. Si referencia, monto o moneda no coinciden con
 * la orden: error, se libera la reserva y no se aprueba ni se cuenta el uso.
 */
export const applyConfirmedTransaction = async (env: Env, order: OrderRow, tx: WompiTransaction, now: number): Promise<Outcome> => {
  if (tx.reference !== order.reference || tx.amountInCents !== order.amount_in_cents || tx.currency !== order.currency) {
    console.error(`wompi mismatch ref=${order.reference}`);
    await closeOrder(env, order.reference, "error", OPEN, now, null);
    return { result: "mismatch" };
  }

  if (tx.status === "APPROVED") {
    if (!(await approveOrder(env, order.reference, tx, now))) return { result: "unchanged" };
    const late = order.status !== "pending";
    if (late) console.error(`late approval ref=${order.reference} previous=${order.status}`);
    if (order.code) {
      const usage = await env.DB.prepare("SELECT used_count, max_uses FROM discount_codes WHERE code = ?")
        .bind(order.code)
        .first<{ used_count: number; max_uses: number | null }>();
      if (usage && usage.max_uses !== null && usage.used_count > usage.max_uses) console.error(`code over limit ref=${order.reference}`);
    }
    return {
      result: "approved",
      notice: {
        reference: order.reference,
        deposit: order.deposit,
        balance: order.balance,
        total: order.total,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        mode: order.mode,
        verified: order.verified === 1,
        code: order.code,
        late,
      },
    };
  }

  if (tx.status === "DECLINED" || tx.status === "ERROR") {
    const closed = await closeOrder(env, order.reference, tx.status === "DECLINED" ? "declined" : "error", OPEN, now, tx);
    return { result: closed ? "closed" : "unchanged" };
  }

  if (tx.status === "VOIDED") {
    // Anulación (solo tarjeta): sobre una aprobada no hay reserva que liberar; el uso no se devuelve.
    const closed = await closeOrder(env, order.reference, "voided", "('pending', 'expired', 'approved')", now, tx);
    return { result: closed ? "closed" : "unchanged" };
  }

  // PENDING: solo se anota la transacción (si aún no hay una)
  await env.DB.prepare(
    "UPDATE orders SET wompi_transaction_id = ?2, wompi_status = 'PENDING', updated_at = ?3 WHERE reference = ?1 AND status = 'pending' AND wompi_transaction_id IS NULL",
  )
    .bind(order.reference, tx.id, now)
    .run();
  return { result: "unchanged" };
};

/** POST /pay/events: webhook de Wompi. Sin CORS (lo llama el servidor de Wompi). */
export const handlePayEvents = async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
  if (request.method !== "POST") return json(METHOD_NOT_ALLOWED, 405);
  const config = loadWompiConfig(env);
  if (!config) {
    console.error("wompi not configured");
    return json(SERVER_ERROR, 500); // Wompi reintenta
  }

  // 1) Checksum antes de leer nada del evento
  const body = await readJsonBody(request, EVENT_MAX_BODY_BYTES);
  const event = "data" in body ? body.data : null;
  if (!event || !(await verifyEventChecksum(event, config.eventsSecret, request.headers.get("X-Event-Checksum")))) {
    return json(INVALID_REQUEST, 400);
  }

  // 2) Solo transacciones del mismo ambiente
  const parsed = readTransactionEvent(event);
  if (!parsed) return json(OK);
  if (parsed.environment !== config.env) {
    console.error("wompi event: environment mismatch");
    return json(OK);
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const order = await loadOrder(env, parsed.transaction.reference);
    if (!order) {
      console.error("wompi event: unknown reference");
      return json(OK);
    }
    // 3) No se confía en el cuerpo: la transacción se consulta a Wompi
    const fetched = await fetchTransaction(config, parsed.transaction.id);
    if (fetched.status === "error") return json(SERVER_ERROR, 500); // Wompi reintenta
    if (fetched.status === "not_found") {
      console.error(`wompi event: transaction not found ref=${order.reference}`);
      return json(OK);
    }
    const outcome = await applyConfirmedTransaction(env, order, fetched.transaction, now);
    // 8-9) El aviso por correo no retrasa la respuesta y, si falla, no revierte el pago
    if (outcome.notice) ctx.waitUntil(sendPaymentNotice(env, outcome.notice));
    return json(OK);
  } catch {
    console.error("wompi event: processing failed");
    return json(SERVER_ERROR, 500); // Wompi reintenta
  }
};

/** GET /pay/status?reference=… o POST /pay/status { reference }: solo el estado y si venció. */
export const handlePayStatus = async (request: Request, env: Env): Promise<Response> => {
  const cors = corsHeaders(request, env);
  const reply = (data: unknown, status = 200) => json(data, status, cors);
  if (request.method === "OPTIONS") return preflight(cors);
  if (request.method !== "GET" && request.method !== "POST") return reply(METHOD_NOT_ALLOWED, 405);
  const secrets = loadSecrets(env);
  if (!secrets) return reply(SERVER_ERROR, 500);
  const now = Math.floor(Date.now() / 1000);
  const ip = clientIp(request, env);
  if (!ip) {
    console.error("missing client ip");
    return reply(SERVER_ERROR, 500);
  }
  if ((await hit(env, `pay-status-ip:${await hmacHex(secrets.pepper, ip)}`, now)) > STATUS_IP_LIMIT) return reply(RATE_LIMITED, 429);

  let reference: unknown;
  if (request.method === "GET") {
    reference = new URL(request.url).searchParams.get("reference");
  } else {
    const body = await readJsonBody(request, STATUS_MAX_BODY_BYTES);
    if ("error" in body) return reply(INVALID_REFERENCE, 400);
    reference = body.data?.reference;
  }
  if (typeof reference !== "string" || !REFERENCE_PATTERN.test(reference)) return reply(INVALID_REFERENCE, 400);

  const row = await env.DB.prepare("SELECT status, expires_at FROM orders WHERE reference = ?")
    .bind(reference)
    .first<{ status: OrderStatus; expires_at: number }>();
  if (!row) return reply(INVALID_REFERENCE, 400);
  return reply({ ok: true, status: row.status, expired: row.status === "expired" || (row.status === "pending" && row.expires_at <= now) });
};

/** La transacción más relevante: una aprobada si existe; si no, la última final; si no, null (sigue pendiente). */
const pickTransaction = (transactions: WompiTransaction[]): WompiTransaction | null =>
  transactions.find((tx) => tx.status === "APPROVED") ?? [...transactions].reverse().find((tx) => tx.status !== "PENDING") ?? null;

const lookup = async (config: WompiConfig, order: OrderRow): Promise<WompiTransaction[] | "error"> => {
  if (order.wompi_transaction_id) {
    const one = await fetchTransaction(config, order.wompi_transaction_id);
    return one.status === "ok" ? [one.transaction] : one.status === "not_found" ? [] : "error";
  }
  const many = await fetchTransactionsByReference(config, order.reference);
  return many.status === "ok" ? many.transactions : "error";
};

/**
 * Cron: órdenes pending ya vencidas (30 min). Antes de expirarlas se consulta a Wompi por si el webhook se
 * retrasó; si hay un pago aprobado, se aprueba y se avisa. Si no, pasan a expired y se libera la reserva.
 * Nunca borra órdenes.
 */
export const expireOverdueOrders = async (env: Env, now: number): Promise<void> => {
  const config = loadWompiConfig(env);
  const rows = await env.DB.prepare(
    `SELECT reference, status, mode, verified, code, code_reserved, total, deposit, balance, amount_in_cents, currency,
            customer_name, customer_email, wompi_transaction_id, expires_at
     FROM orders WHERE status = 'pending' AND expires_at <= ? ORDER BY expires_at LIMIT ?`,
  )
    .bind(now, CRON_BATCH)
    .all<OrderRow>();

  for (const order of rows.results) {
    try {
      if (config) {
        const found = await lookup(config, order);
        if (found === "error" && now - order.expires_at < LOOKUP_GRACE_SECONDS) continue; // se reintenta en el próximo cron
        const tx = found === "error" ? null : pickTransaction(found);
        if (tx) {
          const outcome = await applyConfirmedTransaction(env, order, tx, now);
          if (outcome.notice) await sendPaymentNotice(env, outcome.notice);
          if (outcome.result !== "unchanged") continue;
        }
      }
      await closeOrder(env, order.reference, "expired", "('pending')", now, null);
    } catch {
      console.error(`expire failed ref=${order.reference}`);
    }
  }
};
