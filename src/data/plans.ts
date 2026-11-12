// No importar nada del front: este archivo también lo usa worker/
// Planes de Zumia Solutions (esquema de Fase A: Esencial, A la Medida, Profesional).
// Los textos viven en es.json / en.json (plans.*); aquí solo van las claves, el precio y el orden.
// Precios en pesos colombianos (COP), sin IVA: Manuel no es responsable de IVA.
// El anticipo del 50 % no se muestra por plan: solo el total (ver plans.conditions).

export type PlanId = "esencial" | "alamedida" | "profesional";

export type Plan = {
  id: PlanId;
  /** Precio en COP, sin IVA */
  price: number;
  /** Claves de es.json de lo que incluye, en orden */
  features: string[];
  /** Plan destacado (tarjeta navy con la píldora "Recomendado") */
  featured?: boolean;
  /**
   * Límites y plazo en números, para el cotizador (/quote). Deben coincidir con
   * los textos de es.json / en.json (plans.<id>.f1, f2 y days): si cambias uno, cambia el otro.
   */
  pages: number;
  sections: number;
  /** Días hábiles de entrega (desde el anticipo y el material completo) */
  days: number;
  /** % de descuento en herramientas extra y en subpáginas/secciones adicionales: única fuente para /services y /quote */
  extrasDiscount: number;
};

export const PLANS: Plan[] = [
  {
    id: "esencial",
    price: 590_000,
    features: ["plans.esencial.f1", "plans.esencial.f2", "plans.esencial.f3"],
    pages: 1,
    sections: 7,
    days: 3,
    extrasDiscount: 5,
  },
  {
    id: "alamedida",
    price: 990_000,
    features: ["plans.alamedida.f1", "plans.alamedida.f2", "plans.alamedida.f3", "plans.alamedida.f4"],
    featured: true,
    pages: 3,
    sections: 15,
    days: 5,
    extrasDiscount: 10,
  },
  {
    id: "profesional",
    price: 1_690_000,
    features: ["plans.profesional.f1", "plans.profesional.f2", "plans.profesional.f3", "plans.profesional.f4"],
    pages: 5,
    sections: 32,
    days: 8,
    extrasDiscount: 20,
  },
];

export const formatPrice = (price: number) => new Intl.NumberFormat("es-CO").format(price);

/** Precio con el separador del idioma: ES 590.000, EN 590,000 (igual que en /services). */
export const formatPriceFor = (price: number, lang: string) =>
  lang === "en" ? new Intl.NumberFormat("en-US").format(price) : formatPrice(price);

export const getPlan = (id: PlanId) => PLANS.find((plan) => plan.id === id) as Plan;
