// Herramientas extra de Zumia Solutions: única fuente de verdad (página /services).
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
  { id: "translation", price: 49_000, days: 1, perLanguage: true },
  { id: "forms", price: 49_000, days: 1 },
  { id: "logo", price: 49_000, days: 1 },
  { id: "analytics", price: 49_000, days: 1 },
  { id: "reviews", price: 49_000, days: 1 },
  { id: "faq", price: 49_000, days: 1 },
  { id: "blog", price: 99_000, days: 2 },
  { id: "booking", price: 99_000, days: 2 },
  { id: "paymentLinks", price: 99_000, days: 2 },
  { id: "store", price: 199_000, days: 4 },
  { id: "chatbot", price: 199_000, days: 4 },
  { id: "crm", price: 249_000, days: 5 },
];
