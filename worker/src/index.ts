// Worker de Zumia: verificación de clientes previos y pagos del anticipo. Este archivo solo enruta.

import { DAILY_CRON, runScheduled } from "./cleanup";
import { handleVerifyConfirm, handleVerifyDiscount } from "./confirm";
import { json } from "./http";
import { handlePayEvents, handlePayStatus } from "./orders";
import { handlePayCode, handlePayOrders } from "./pay";
import type { Env, ExecutionContext, ScheduledController } from "./types";
import { handleVerifyRequest } from "./verify";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/health" && request.method === "GET") return json({ ok: true });
    if (pathname === "/verify/request") return handleVerifyRequest(request, env, ctx);
    if (pathname === "/verify/confirm") return handleVerifyConfirm(request, env);
    if (pathname === "/verify/discount") return handleVerifyDiscount(request, env);
    if (pathname === "/pay/code") return handlePayCode(request, env);
    if (pathname === "/pay/orders") return handlePayOrders(request, env);
    if (pathname === "/pay/events") return handlePayEvents(request, env, ctx);
    if (pathname === "/pay/status") return handlePayStatus(request, env);
    return json({ ok: false, error: "not_found" }, 404);
  },

  // Crons (wrangler.toml [triggers]): cada 10 min vence órdenes pendientes; a diario (DAILY_CRON) además
  // limpia rate_limits y verification_codes.
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      runScheduled(env, Math.floor(Date.now() / 1000), controller.cron === DAILY_CRON).catch(() => console.error("scheduled failed")),
    );
  },
};
