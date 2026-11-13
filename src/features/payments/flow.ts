// Lógica pura del paso de pago (sin componentes): disponibilidad según el modo, estados del paso,
// validación del formulario y aviso del piso. La interfaz llega en la tanda 8.

import { formatPriceFor } from "@/data/plans";
import { MIN_TOTAL, type QuoteMode } from "@/data/quote";
import type { AppliedCode, PayError, ServerBreakdown } from "@/lib/payApi";

// ---------- Disponibilidad ----------

/**
 * blocked: rediseño y sitio externo no se pagan en línea (se muestra el motivo y WhatsApp, nunca un anticipo).
 * payable: modo normal o cliente Zumia. listPrice = cliente Zumia SIN verificar → paga precio de lista con aviso visible.
 */
export type PayAvailability = { kind: "blocked"; reason: "redesign" | "external" } | { kind: "payable"; listPrice: boolean };

export const payAvailability = (mode: QuoteMode, verified: boolean): PayAvailability => {
  if (mode === "redesign" || mode === "external") return { kind: "blocked", reason: mode };
  return { kind: "payable", listPrice: mode === "zumiaClient" && !verified };
};

// ---------- Estados del paso ----------

/**
 * idle            tarjeta con el desglose (sin código aplicado o con el código quitado)
 * code-checking   validando un código con /pay/code
 * ready           código aplicado: desglose del Worker
 * confirming      panel abierto: correo, nombre y casilla de Términos y Política
 * creating-order  creando la orden con /pay/orders
 * redirecting     orden creada: se guarda la referencia y se va al checkout de Wompi
 * error           falló la orden (o el checkout); `back` dice a qué paso volver al reintentar
 */
export type PayStep = "idle" | "code-checking" | "ready" | "confirming" | "creating-order" | "redirecting" | "error";

export type PayState = {
  step: PayStep;
  /** Código aplicado (solo en ready y en los pasos siguientes) */
  code: AppliedCode | null;
  /** Desglose del Worker con el código; null = usar el cálculo local sin código */
  breakdown: ServerBreakdown | null;
  /** Error del código (se muestra junto al campo; no cambia de paso) */
  codeError: PayError | null;
  /** Error de la orden (solo en step "error") */
  error: PayError | "checkout" | null;
  /** Paso al que vuelve "reintentar" */
  back: "idle" | "ready" | "confirming";
  /** Referencia de la orden creada (solo en redirecting) */
  reference: string | null;
};

export const initialPayState: PayState = { step: "idle", code: null, breakdown: null, codeError: null, error: null, back: "idle", reference: null };

export type PayEvent =
  | { type: "CODE_SUBMIT" }
  | { type: "CODE_OK"; code: AppliedCode; breakdown: ServerBreakdown }
  | { type: "CODE_FAIL"; error: PayError }
  | { type: "CODE_REMOVE" }
  | { type: "OPEN_PANEL" }
  | { type: "CLOSE_PANEL" }
  | { type: "ORDER_SUBMIT" }
  | { type: "ORDER_OK"; reference: string }
  | { type: "ORDER_FAIL"; error: PayError | "checkout" }
  | { type: "RETRY" }
  | { type: "SELECTION_CHANGED" };

/** Paso "base" (tarjeta) según haya o no código aplicado. */
const cardStep = (state: PayState): "idle" | "ready" => (state.code ? "ready" : "idle");

/**
 * Transiciones. Los eventos que no tocan en un paso se ignoran (devuelven el mismo estado).
 * Con el pago bloqueado no se llama: la interfaz muestra el motivo en vez del paso de pago.
 */
export const payReducer = (state: PayState, event: PayEvent): PayState => {
  switch (event.type) {
    case "CODE_SUBMIT":
      return state.step === "idle" || state.step === "ready" ? { ...state, step: "code-checking", codeError: null } : state;
    case "CODE_OK":
      return state.step === "code-checking" ? { ...state, step: "ready", code: event.code, breakdown: event.breakdown, codeError: null } : state;
    case "CODE_FAIL":
      // El código anterior (si había) se mantiene; el nuevo no se aplica
      return state.step === "code-checking" ? { ...state, step: cardStep(state), codeError: event.error } : state;
    case "CODE_REMOVE":
      return state.step === "idle" || state.step === "ready" ? { ...state, step: "idle", code: null, breakdown: null, codeError: null } : state;
    case "OPEN_PANEL":
      return state.step === "idle" || state.step === "ready" ? { ...state, step: "confirming", back: cardStep(state) } : state;
    case "CLOSE_PANEL":
      return state.step === "confirming" ? { ...state, step: cardStep(state) } : state;
    case "ORDER_SUBMIT":
      return state.step === "confirming" ? { ...state, step: "creating-order", error: null } : state;
    case "ORDER_OK":
      return state.step === "creating-order" ? { ...state, step: "redirecting", reference: event.reference } : state;
    case "ORDER_FAIL": {
      if (state.step !== "creating-order" && state.step !== "redirecting") return state;
      // Código que ya no vale (agotado, vencido): se quita y se vuelve a la tarjeta con el precio sin código
      if (event.error === "invalid_code") return { ...state, step: "error", error: event.error, code: null, breakdown: null, back: "idle", reference: null };
      // Token vencido o inválido: se vuelve a la tarjeta (la interfaz quita la verificación → precio de lista)
      if (event.error === "invalid_token") return { ...state, step: "error", error: event.error, back: cardStep(state), reference: null };
      return { ...state, step: "error", error: event.error, back: "confirming", reference: null };
    }
    case "RETRY":
      return state.step === "error" ? { ...state, step: state.back, error: null } : state;
    case "SELECTION_CHANGED":
      // El desglose depende de la selección: se descarta el código aplicado (hay que volver a validarlo)
      return state.step === "creating-order" || state.step === "redirecting" ? state : initialPayState;
  }
};

/** Mientras hay una petición o una redirección en curso, la selección y los botones quedan quietos. */
export const isBusy = (state: PayState) => state.step === "code-checking" || state.step === "creating-order" || state.step === "redirecting";

// ---------- Formulario del panel ----------

export type OrderForm = { name: string; email: string; acceptTerms: boolean };
export type OrderFormErrors = { name?: "required" | "tooLong"; email?: "invalid"; acceptTerms?: "required" };

const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;
const MAX_NAME = 120;

/** Normaliza nombre (espacios) y correo (minúsculas) como el Worker. */
export const normalizeOrderForm = (form: OrderForm): OrderForm => ({
  name: form.name.trim().replace(/\s+/g, " "),
  email: form.email.trim().toLowerCase(),
  acceptTerms: form.acceptTerms,
});

export const validateOrderForm = (form: OrderForm): OrderFormErrors => {
  const f = normalizeOrderForm(form);
  const errors: OrderFormErrors = {};
  if (f.name.length === 0) errors.name = "required";
  else if (f.name.length > MAX_NAME) errors.name = "tooLong";
  if (f.email.length > 254 || !EMAIL_PATTERN.test(f.email)) errors.email = "invalid";
  if (!f.acceptTerms) errors.acceptTerms = "required";
  return errors;
};

/** El botón de pagar sigue deshabilitado mientras la casilla de Términos y Política no esté marcada. */
export const canSubmitOrder = (state: PayState, form: OrderForm) => state.step === "confirming" && form.acceptTerms;

// ---------- Aviso del piso ----------

/** Pesos en el formato del idioma, con "COP" al final (12.000 COP / 12,000 COP). */
export const copAmount = (value: number, lang: string) => `${formatPriceFor(value, lang)} COP`;

/** Clave i18n y valores del aviso del piso, o null si el piso no redujo el descuento. */
export const floorNotice = (breakdown: Pick<ServerBreakdown, "reducedBy">, lang: string) =>
  breakdown.reducedBy > 0
    ? { key: "quote.pay.floorNotice" as const, values: { minimum: copAmount(MIN_TOTAL / 2, lang), amount: copAmount(breakdown.reducedBy, lang) } }
    : null;
