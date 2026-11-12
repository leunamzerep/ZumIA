// Los descuentos salen de plans.ts (misma fuente que el cotizador): no se copian aquí.

import { PLANS, getPlan, type PlanId } from "../../src/data/plans";

/** ¿El texto es un id de plan que existe en plans.ts? (la base de datos podría tener uno desconocido) */
export const isPlanId = (value: string): value is PlanId => PLANS.some((plan) => plan.id === value);

/** Descuento (%) en herramientas extra y subpáginas/secciones adicionales del plan. No aplica al precio del plan. */
export const extrasDiscountFor = (planId: PlanId) => getPlan(planId).extrasDiscount;
