// Los descuentos salen de plans.ts (misma fuente que el cotizador): no se copian aquí.

import { getPlan, type PlanId } from "../../src/data/plans";

/** Descuento (%) en herramientas extra y subpáginas/secciones adicionales del plan. No aplica al precio del plan. */
export const extrasDiscountFor = (planId: PlanId) => getPlan(planId).extrasDiscount;
