// Planes de Zumia Solutions (datos aprobados por Manuel, Fase 5).
// Los textos viven en es.json (plans.*); aquí solo van las claves, el precio y el orden.
// Precios en pesos colombianos (COP), sin IVA: Manuel no es responsable de IVA.

export type PlanId = "esencial" | "profesional" | "premium";

export type Plan = {
  id: PlanId;
  /** Precio en COP, sin IVA */
  price: number;
  /** Claves de es.json de lo que incluye, en orden */
  features: string[];
  /** Clave de es.json de la nota de mantenimiento, si el plan no lo incluye */
  maintenanceKey?: string;
  /** Plan destacado (tarjeta navy con la píldora "Recomendado") */
  featured?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "esencial",
    price: 490_000,
    features: ["plans.esencial.f1", "plans.esencial.f2", "plans.esencial.f3", "plans.esencial.f4", "plans.esencial.f5"],
    maintenanceKey: "plans.esencial.maintenance",
  },
  {
    id: "profesional",
    price: 990_000,
    features: ["plans.profesional.f1", "plans.profesional.f2", "plans.profesional.f3"],
    featured: true,
  },
  {
    id: "premium",
    price: 1_490_000,
    features: ["plans.premium.f1", "plans.premium.f2", "plans.premium.f3", "plans.premium.f4"],
  },
];

export const formatPrice = (price: number) => new Intl.NumberFormat("es-CO").format(price);
