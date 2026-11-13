// URL del Web Checkout de Wompi a partir de la respuesta de /pay/orders. Función pura.
// Lleva SOLO los 7 campos firmados por el Worker: nunca nombre ni correo del cliente (decisión del proyecto),
// aunque la respuesta trajera customer-data:* u otros campos.

import type { OrderData } from "@/lib/payApi";

export const CHECKOUT_ACTION = "https://checkout.wompi.co/p/";
export const CHECKOUT_FIELDS = ["public-key", "currency", "amount-in-cents", "reference", "signature:integrity", "expiration-time", "redirect-url"] as const;

/** URL lista para redirigir, o null si la respuesta no es coherente (entonces no se redirige). */
export const buildCheckoutUrl = (order: Pick<OrderData, "reference" | "breakdown" | "checkout">): string | null => {
  const { action, fields } = order.checkout;
  if (action !== CHECKOUT_ACTION) return null;
  for (const key of CHECKOUT_FIELDS) if (typeof fields[key] !== "string" || fields[key] === "") return null;
  // Coherencia con lo que se le mostró al cliente: misma referencia, mismo monto, pesos colombianos
  if (fields.reference !== order.reference || fields.currency !== "COP") return null;
  if (fields["amount-in-cents"] !== String(order.breakdown.amountInCents)) return null;
  if (!/^pub_(test|prod)_/.test(fields["public-key"])) return null;
  if (!/^https:\/\/|^http:\/\/localhost(:\d+)?\//.test(fields["redirect-url"])) return null;

  const params = new URLSearchParams();
  for (const key of CHECKOUT_FIELDS) params.set(key, fields[key]);
  return `${CHECKOUT_ACTION}?${params.toString()}`;
};
