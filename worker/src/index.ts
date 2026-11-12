// Worker de verificación de clientes previos de Zumia. Este archivo solo enruta.

import { handleVerifyConfirm, handleVerifyDiscount } from "./confirm";
import { json } from "./http";
import type { Env } from "./types";
import { handleVerifyRequest } from "./verify";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/health" && request.method === "GET") return json({ ok: true });
    if (pathname === "/verify/request") return handleVerifyRequest(request, env);
    if (pathname === "/verify/confirm") return handleVerifyConfirm(request, env);
    if (pathname === "/verify/discount") return handleVerifyDiscount(request, env);
    return json({ ok: false, error: "not_found" }, 404);
  },
};
