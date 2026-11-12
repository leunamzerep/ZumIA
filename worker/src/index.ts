// Worker de verificación de clientes previos de Zumia (paso 1: solo /health).
// Los descuentos salen de plans.ts (misma fuente que el cotizador): no se copian aquí.

import { getPlan, type PlanId } from "../../src/data/plans";

/** Descuento (%) en herramientas extra y subpáginas/secciones adicionales del plan. No aplica al precio del plan. */
export const extrasDiscountFor = (planId: PlanId) => getPlan(planId).extrasDiscount;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && pathname === "/health") return json({ ok: true });
    return json({ ok: false, error: "not_found" }, 404);
  },
};
