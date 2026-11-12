// Worker de verificación de clientes previos de Zumia. Este archivo solo enruta.

import { runCleanup } from "./cleanup";
import { handleVerifyConfirm, handleVerifyDiscount } from "./confirm";
import { json } from "./http";
import type { Env, ExecutionContext, ScheduledController } from "./types";
import { handleVerifyRequest } from "./verify";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/health" && request.method === "GET") return json({ ok: true });
    if (pathname === "/verify/request") return handleVerifyRequest(request, env, ctx);
    if (pathname === "/verify/confirm") return handleVerifyConfirm(request, env);
    if (pathname === "/verify/discount") return handleVerifyDiscount(request, env);
    return json({ ok: false, error: "not_found" }, 404);
  },

  // Cron diario (wrangler.toml [triggers]): limpieza de rate_limits y verification_codes
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runCleanup(env, Math.floor(Date.now() / 1000)).catch(() => console.error("cleanup failed")));
  },
};
