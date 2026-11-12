// Cálculos del cotizador (/quote). Funciones puras: leen precios, días y
// descuentos de plans.ts y extras.ts (no repiten ningún número).

import { EXTRAS, OTHER_SERVICES, type ExtraId } from "./extras";
import { PLANS, getPlan, type Plan, type PlanId } from "./plans";

/** Opciones de las dos preguntas, leídas de los límites de cada plan. */
export const PAGE_OPTIONS = PLANS.map((plan) => plan.pages);
export const SECTION_OPTIONS = PLANS.map((plan) => plan.sections);

/** Cantidad de idiomas que se puede elegir en el botón de traducción. */
export const MAX_LANGUAGES = 5;

/** Máximo de subpáginas (y de secciones) adicionales que se pueden pedir en el cotizador. */
export const MAX_ADDITIONAL = 20;

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

/** Subpáginas y secciones adicionales pedidas. */
export type Additional = { subpages: number; sections: number };
export const NO_ADDITIONAL: Additional = { subpages: 0, sections: 0 };

/**
 * Modo del estimado:
 * - normal: precio del plan.
 * - redesign: rediseño de un sitio viejo (precio base "desde"; el plan solo da el descuento y los totales).
 * - zumiaClient: ya contrató antes; no se cobra plan, solo herramientas y adicionales. El descuento
 *   solo se aplica si el correo se verificó con el Worker; si no, precio de lista.
 * - external: herramientas para un sitio externo; sin plan, sin descuento, con recargo.
 */
export type QuoteMode = "normal" | "redesign" | "zumiaClient" | "external";

/** Respuestas del bloque "Ya tengo un sitio web". */
export type SiteGoal = "redesign" | "external";
export type SiteAnswers = { hasSite: boolean; hired?: boolean; goal?: SiteGoal };

/** Mientras falte una respuesta, el modo es "normal". */
export const deriveMode = ({ hasSite, hired, goal }: SiteAnswers): QuoteMode => {
  if (!hasSite) return "normal";
  if (hired === true) return "zumiaClient";
  if (hired === false && goal === "redesign") return "redesign";
  if (hired === false && goal === "external") return "external";
  return "normal";
};

/**
 * Descuento (en %) que aplica a herramientas y adicionales según el modo:
 * - normal y rediseño: el del plan elegido.
 * - zumiaClient: solo el verificado con el Worker (verifiedDiscount); sin verificar, 0 (precio de lista).
 * - external: 0.
 *
 * TODO (diferido): este descuento es solo informativo; hoy no existe pago ni pedido que lo use. Cuando
 * exista un endpoint de pago o pedido, el precio final debe recalcularse en el servidor con el token de
 * verificación (nunca se confía en el valor del navegador).
 */
export const discountFor = (mode: QuoteMode, planId: PlanId | null, verifiedDiscount = 0) => {
  if (mode === "external") return 0;
  if (mode === "zumiaClient") return verifiedDiscount;
  return planId ? getPlan(planId).extrasDiscount : 0;
};

export type QuoteLine = { id: ExtraId; quantity: number; price: number; days: number };
export type AdditionalLine = { kind: "subpages" | "sections"; quantity: number; price: number };

export type Quote = {
  mode: QuoteMode;
  /** Plan elegido (null en modo externo). Su precio solo se cobra en modo normal. */
  plan: Plan | null;
  /** Precio base cobrado: plan (normal), rediseño (redesign) o 0 */
  basePrice: number;
  lines: QuoteLine[];
  additionalLines: AdditionalLine[];
  /** Recargo por sitio externo (0 si no aplica) */
  surcharge: number;
  /** Subpáginas y secciones en total (plan + adicionales); solo en modos normal y redesign */
  totals: { pages: number; sections: number } | null;
  /** El total, el anticipo y el plazo son "desde" (rediseño) */
  isFrom: boolean;
  total: number;
  deposit: number;
  days: number;
};

/**
 * Calcula el estimado. Devuelve null si todavía no hay nada que cotizar:
 * falta el plan (modos normal, rediseño y cliente Zumia) o no hay herramientas
 * ni adicionales (modos cliente Zumia y externo).
 */
export const computeQuote = (
  mode: QuoteMode,
  planId: PlanId | null,
  selection: ExtrasSelection,
  additional: Additional = NO_ADDITIONAL,
  verifiedDiscount = 0,
): Quote | null => {
  const external = mode === "external";
  const client = mode === "zumiaClient";
  // En modo cliente el plan elegido a mano no cuenta: el descuento viene solo de la verificación
  if (!external && !client && !planId) return null;
  const plan = external || client || !planId ? null : getPlan(planId);
  const discount = discountFor(mode, planId, verifiedDiscount);

  // Mismo orden que en /services (extras.ts)
  const lines = EXTRAS.filter((extra) => selection[extra.id]).map((extra) => {
    const quantity = extra.perLanguage ? (selection[extra.id] as number) : 1;
    return {
      id: extra.id,
      quantity,
      price: discounted(extra.price, discount) * quantity,
      days: extra.days * quantity,
    };
  });

  // En modo externo no hay adicionales
  const { subpagePrice, sectionPrice } = OTHER_SERVICES.additional;
  const subpages = external ? 0 : additional.subpages;
  const sections = external ? 0 : additional.sections;
  const additionalLines: AdditionalLine[] = [];
  if (subpages > 0) additionalLines.push({ kind: "subpages", quantity: subpages, price: discounted(subpagePrice, discount) * subpages });
  if (sections > 0) additionalLines.push({ kind: "sections", quantity: sections, price: discounted(sectionPrice, discount) * sections });

  // Recargo solo si hay al menos una herramienta
  const surcharge = external && lines.length > 0 ? OTHER_SERVICES.external.surcharge : 0;
  if ((mode === "zumiaClient" || external) && lines.length + additionalLines.length === 0) return null;

  const basePrice = mode === "normal" ? (plan as Plan).price : mode === "redesign" ? OTHER_SERVICES.redesign.price : 0;
  const baseDays = mode === "normal" ? (plan as Plan).days : mode === "redesign" ? OTHER_SERVICES.redesign.days : 0;
  const total =
    basePrice + surcharge + lines.reduce((sum, line) => sum + line.price, 0) + additionalLines.reduce((sum, line) => sum + line.price, 0);

  return {
    mode,
    plan,
    basePrice,
    lines,
    additionalLines,
    surcharge,
    totals: plan && (mode === "normal" || mode === "redesign") ? { pages: plan.pages + subpages, sections: plan.sections + sections } : null,
    isFrom: mode === "redesign",
    total,
    deposit: Math.round(total / 2),
    days: baseDays + (surcharge ? OTHER_SERVICES.external.days : 0) + lines.reduce((sum, line) => sum + line.days, 0),
  };
};
