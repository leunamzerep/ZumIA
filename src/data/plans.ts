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
};

export const PLANS: Plan[] = [
  {
    id: "esencial",
    price: 590_000,
    features: ["plans.esencial.f1", "plans.esencial.f2", "plans.esencial.f3"],
  },
  {
    id: "alamedida",
    price: 990_000,
    features: ["plans.alamedida.f1", "plans.alamedida.f2", "plans.alamedida.f3", "plans.alamedida.f4"],
    featured: true,
  },
  {
    id: "profesional",
    price: 1_690_000,
    features: ["plans.profesional.f1", "plans.profesional.f2", "plans.profesional.f3", "plans.profesional.f4"],
  },
];

export const formatPrice = (price: number) => new Intl.NumberFormat("es-CO").format(price);
