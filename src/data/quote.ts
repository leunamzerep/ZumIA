// Cálculos del cotizador (/quote). Funciones puras: leen precios, días y
// descuentos de plans.ts y extras.ts (no repiten ningún número).

import { EXTRAS, type ExtraId } from "./extras";
import { PLANS, getPlan, type Plan, type PlanId } from "./plans";

/** Opciones de las dos preguntas, leídas de los límites de cada plan. */
export const PAGE_OPTIONS = PLANS.map((plan) => plan.pages);
export const SECTION_OPTIONS = PLANS.map((plan) => plan.sections);

/** Cantidad de idiomas que se puede elegir en el botón de traducción. */
export const MAX_LANGUAGES = 5;

/**
 * Plan sugerido: el más pequeño que cubre las dos respuestas (o sea, el mayor
 * de los dos resultados). Con una sola respuesta, sugiere según esa.
 */
export const suggestPlan = (pages?: number, sections?: number): PlanId | null => {
  if (pages === undefined && sections === undefined) return null;
  const plan = PLANS.find((p) => p.pages >= (pages ?? 0) && p.sections >= (sections ?? 0));
  return (plan ?? PLANS[PLANS.length - 1]).id;
};

/** Precio con el descuento del plan, en enteros (los precios actuales dan exacto). */
export const discounted = (price: number, discountPct: number) => Math.round((price * (100 - discountPct)) / 100);

/** Herramientas elegidas: id → cantidad (1, o de 1 a 5 idiomas en la traducción). */
export type ExtrasSelection = Partial<Record<ExtraId, number>>;

export type QuoteLine = { id: ExtraId; quantity: number; price: number; days: number };

export type Quote = {
  plan: Plan;
  lines: QuoteLine[];
  total: number;
  deposit: number;
  days: number;
};

export const computeQuote = (planId: PlanId, selection: ExtrasSelection): Quote => {
  const plan = getPlan(planId);
  // Mismo orden que en /services (extras.ts)
  const lines = EXTRAS.filter((extra) => selection[extra.id]).map((extra) => {
    const quantity = extra.perLanguage ? (selection[extra.id] as number) : 1;
    return {
      id: extra.id,
      quantity,
      price: discounted(extra.price, plan.extrasDiscount) * quantity,
      days: extra.days * quantity,
    };
  });
  const total = plan.price + lines.reduce((sum, line) => sum + line.price, 0);
  return {
    plan,
    lines,
    total,
    deposit: Math.round(total / 2),
    days: plan.days + lines.reduce((sum, line) => sum + line.days, 0),
  };
};
