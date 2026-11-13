// Herramientas extra de Zumia Solutions: única fuente de verdad (página /services).
// No importar nada del front: este archivo también lo usa worker/ (precio en el servidor).
// Los textos viven en es.json / en.json (extras.<id>.name y extras.<id>.desc);
// aquí solo van el id, el precio (COP, sin IVA) y los días hábiles que suma al plan.

export type ExtraId =
  | "translation"
  | "forms"
  | "logo"
  | "analytics"
  | "reviews"
  | "faq"
  | "blog"
  | "booking"
  | "paymentLinks"
  | "store"
  | "chatbot"
  | "crm";

export type Extra = {
  id: ExtraId;
  /** Precio en COP, sin IVA */
  price: number;
  /** Días hábiles que suma a la entrega del plan */
  days: number;
  /** El precio y los días son por cada idioma adicional (solo el botón de traducción) */
  perLanguage?: boolean;
};

export const EXTRAS: Extra[] = [
  { id: "booking", price: 49_000, days: 2 },
  { id: "logo", price: 49_000, days: 1 },
  { id: "translation", price: 49_000, days: 1, perLanguage: true },
  { id: "faq", price: 49_000, days: 1 },
  { id: "reviews", price: 49_000, days: 1 },
  { id: "forms", price: 49_000, days: 1 },
  { id: "analytics", price: 99_000, days: 1 },
  { id: "blog", price: 99_000, days: 2 },
  { id: "paymentLinks", price: 99_000, days: 2 },
  { id: "store", price: 199_000, days: 4 },
  { id: "chatbot", price: 199_000, days: 4 },
  { id: "crm", price: 249_000, days: 5 },
];

/**
 * Servicios del grupo "Otros" (/services y /quote). No son casillas del paso 3:
 * el cotizador los activa con sus propias preguntas. Precios en COP, sin IVA.
 */
export const OTHER_SERVICES = {
  /** Rediseño de web antigua: precio y plazo "desde" (propios, no ligados a ningún plan) */
  redesign: { price: 590_000, days: 3 },
  /** Herramientas en un sitio externo: recargo único sobre las herramientas; suma días a la entrega */
  external: { surcharge: 149_000, days: 3 },
  /** Subpáginas y secciones adicionales: precio por unidad (la subpágina incluye su enganche visual); no suman días */
  additional: { subpagePrice: 99_000, sectionPrice: 49_000 },
} as const;
