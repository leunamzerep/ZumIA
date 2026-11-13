// Lógica pura del paso de pago (sin componentes): disponibilidad, estados del paso, validación del formulario,
// mensajes de error y aviso del piso. La interfaz (PaymentStep.tsx) solo traduce este estado a pantalla.

import { formatPriceFor } from "@/data/plans";
import { MIN_TOTAL, type QuoteMode } from "@/data/quote";
import type { AppliedCode, OrderData, PayError, ServerBreakdown } from "@/lib/payApi";

// ---------- Disponibilidad ----------

/**
 * blocked: rediseño y sitio externo no se pagan en línea; tampoco un total por debajo de MIN_TOTAL
 * (se muestra el motivo, nunca un botón de pagar ni un anticipo).
 * payable: modo normal o cliente Zumia. listPrice = cliente Zumia SIN verificar → paga precio de lista con aviso visible.
 */
export type BlockReason = "redesign" | "external" | "below_minimum";
export type PayAvailability = { kind: "blocked"; reason: BlockReason } | { kind: "payable"; listPrice: boolean };

/** `total` = total estimado del cotizador (solo para decidir qué mostrar; el Worker recalcula y vuelve a comprobar). */
export const payAvailability = (mode: QuoteMode, verified: boolean, total?: number | null): PayAvailability => {
  if (mode === "redesign" || mode === "external") return { kind: "blocked", reason: mode };
  if (typeof total === "number" && total < MIN_TOTAL) return { kind: "blocked", reason: "below_minimum" };
  return { kind: "payable", listPrice: mode === "zumiaClient" && !verified };
};

// ---------- Estados del paso ----------

/**
 * idle            panel cerrado, sin código aplicado
 * code-checking   validando un código con /pay/code (codeFrom dice si el panel estaba abierto)
 * ready           panel cerrado, con un código aplicado (desglose del Worker)
 * confirming      panel abierto: desglose, código, nombre, correo y casilla de aceptación
 * creating-order  creando la orden con /pay/orders
 * redirecting     orden creada: se guarda la referencia y se va al checkout de Wompi
 * error           falló la orden; el panel sigue abierto con el mensaje y "Intentar de nuevo"
 */
export type PayStep = "idle" | "code-checking" | "ready" | "confirming" | "creating-order" | "redirecting" | "error";

/** Error de la orden: los de payApi, más "checkout" (respuesta incoherente) y "amount_changed" (el Worker cobró otro monto). */
export type OrderError = PayError | "checkout" | "amount_changed";
/** Avisos informativos (no son errores). */
export type PayNotice = "codeCleared" | "returned";

export type PayState = {
  step: PayStep;
  /** Código aplicado */
  code: AppliedCode | null;
  /** Desglose del Worker (tras aplicar un código o si cambió el monto); null = mostrar el cálculo local sin código */
  breakdown: ServerBreakdown | null;
  /** Error del código (se muestra junto al campo; no cambia de paso) */
  codeError: PayError | null;
  /** Error de la orden (solo en step "error") */
  error: OrderError | null;
  /** Paso al que vuelve "Intentar de nuevo" */
  back: "idle" | "ready" | "confirming";
  /** Dónde estaba el usuario al pedir el código: con el panel abierto o cerrado */
  codeFrom: "card" | "panel";
  /** Referencia de la orden creada (solo en redirecting) */
  reference: string | null;
  notice: PayNotice | null;
};

export const initialPayState: PayState = {
  step: "idle",
  code: null,
  breakdown: null,
  codeError: null,
  error: null,
  back: "idle",
  codeFrom: "card",
  reference: null,
  notice: null,
};

export type PayEvent =
  | { type: "CODE_SUBMIT" }
  | { type: "CODE_OK"; code: AppliedCode; breakdown: ServerBreakdown }
  | { type: "CODE_FAIL"; error: PayError }
  | { type: "CODE_REMOVE" }
  | { type: "OPEN_PANEL" }
  | { type: "CLOSE_PANEL" }
  | { type: "ORDER_SUBMIT" }
  | { type: "ORDER_OK"; reference: string }
  | { type: "ORDER_FAIL"; error: OrderError; breakdown?: ServerBreakdown }
  | { type: "RETRY" }
  | { type: "SELECTION_CHANGED" }
  | { type: "PAGE_RESTORED" };

/** Paso "en reposo" según el panel y el código. */
const restStep = (panel: boolean, code: AppliedCode | null): "idle" | "ready" | "confirming" => (panel ? "confirming" : code ? "ready" : "idle");

/** ¿El panel se ve abierto en este estado? */
export const isPanelOpen = (state: PayState) =>
  state.step === "confirming" ||
  state.step === "creating-order" ||
  state.step === "redirecting" ||
  state.step === "error" ||
  (state.step === "code-checking" && state.codeFrom === "panel");

/**
 * Transiciones. Los eventos que no tocan en un paso se ignoran (devuelven el mismo estado).
 * Con el pago bloqueado no se llama: la interfaz muestra el motivo en vez del paso de pago.
 */
export const payReducer = (state: PayState, event: PayEvent): PayState => {
  const resting = state.step === "idle" || state.step === "ready" || state.step === "confirming";
  switch (event.type) {
    case "CODE_SUBMIT":
      // Un código por orden: con uno aplicado hay que quitarlo antes de probar otro
      if (!resting || state.code) return state;
      return { ...state, step: "code-checking", codeError: null, notice: null, codeFrom: state.step === "confirming" ? "panel" : "card" };
    case "CODE_OK":
      if (state.step !== "code-checking") return state; // respuesta tardía (p. ej. tras cambiar la selección): se ignora
      return { ...state, step: restStep(state.codeFrom === "panel", event.code), code: event.code, breakdown: event.breakdown, codeError: null };
    case "CODE_FAIL":
      if (state.step !== "code-checking") return state;
      return { ...state, step: restStep(state.codeFrom === "panel", null), codeError: event.error };
    case "CODE_REMOVE":
      if (!resting) return state;
      return { ...state, step: restStep(state.step === "confirming", null), code: null, breakdown: null, codeError: null };
    case "OPEN_PANEL":
      return state.step === "idle" || state.step === "ready" ? { ...state, step: "confirming", notice: null } : state;
    case "CLOSE_PANEL":
      return state.step === "confirming" || state.step === "error" ? { ...state, step: restStep(false, state.code), error: null } : state;
    case "ORDER_SUBMIT":
      return state.step === "confirming" ? { ...state, step: "creating-order", error: null, notice: null } : state;
    case "ORDER_OK":
      return state.step === "creating-order" ? { ...state, step: "redirecting", reference: event.reference } : state;
    case "ORDER_FAIL": {
      if (state.step !== "creating-order" && state.step !== "redirecting") return state;
      const base = { ...state, step: "error" as const, error: event.error, back: "confirming" as const, reference: null };
      // Código que ya no vale (agotado, vencido): se quita; se puede pagar sin él
      if (event.error === "invalid_code") return { ...base, code: null, breakdown: null };
      // El Worker calculó otro monto: se muestra el suyo y el cliente decide de nuevo
      if (event.error === "amount_changed" && event.breakdown) return { ...base, breakdown: event.breakdown };
      return base;
    }
    case "RETRY":
      return state.step === "error" ? { ...state, step: state.back, error: null } : state;
    case "SELECTION_CHANGED": {
      // El desglose depende de la selección: se descarta el código (hay que validarlo de nuevo) sin cerrar el panel
      if (state.step === "creating-order" || state.step === "redirecting") return state;
      // Con un error a la vista (p. ej. venció la verificación) el mensaje se mantiene; solo se descarta el código
      if (state.step === "error") return { ...state, code: null, breakdown: null, codeError: null, notice: state.code ? "codeCleared" : state.notice };
      const panel = isPanelOpen(state);
      const changed = state.code !== null || state.breakdown !== null || state.step === "code-checking";
      return { ...initialPayState, step: panel ? "confirming" : "idle", notice: state.code ? "codeCleared" : changed ? null : state.notice };
    }
    case "PAGE_RESTORED":
      // Volvió desde Wompi con el botón Atrás (página restaurada de la caché): se puede intentar de nuevo.
      // La orden anterior queda pendiente y el Worker la vence; al reintentar se crea una nueva.
      return state.step === "redirecting" || state.step === "creating-order" ? { ...state, step: "confirming", reference: null, error: null, notice: "returned" } : state;
  }
};

/** Mientras hay una petición o una redirección en curso, los controles quedan quietos. */
export const isBusy = (state: PayState) => state.step === "code-checking" || state.step === "creating-order" || state.step === "redirecting";

/** El anticipo de la orden creada debe ser el mismo que se le mostró al cliente; si no, no se redirige. */
export const amountMatches = (shownAmountInCents: number, order: Pick<OrderData, "breakdown">) => order.breakdown.amountInCents === shownAmountInCents;

// ---------- Mensajes (claves i18n) ----------

/** Mensaje accionable de cada error de la orden: quote.pay.errors.<error>. */
export const orderErrorKey = (error: OrderError) => `quote.pay.errors.${error}` as const;

/** Mensaje de un error al aplicar un código. Un código mal escrito y uno agotado o vencido reciben el mismo mensaje. */
export const codeErrorKey = (error: PayError) => (error === "invalid_code" || error === "invalid_request" ? ("quote.pay.codeInvalid" as const) : orderErrorKey(error));

/** Todos los errores con mensaje propio (las pruebas comprueban que cada uno tiene texto en es.json y en.json). */
export const ORDER_ERRORS: readonly OrderError[] = [
  "invalid_code",
  "invalid_token",
  "payment_not_available",
  "terms_required",
  "invalid_request",
  "below_minimum",
  "invalid_reference",
  "rate_limited",
  "unavailable",
  "network",
  "checkout",
  "amount_changed",
];

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

/** Motivo en texto de por qué el botón de pagar está deshabilitado (null = habilitado). */
export const submitBlockReason = (state: PayState, form: OrderForm): "busy" | "terms" | "error" | null => {
  if (isBusy(state)) return "busy";
  if (state.step === "error") return "error";
  if (!form.acceptTerms) return "terms";
  return canSubmitOrder(state, form) ? null : "busy";
};

// ---------- Aviso del piso ----------

/** Pesos en el formato del idioma, con "COP" al final (12.000 COP / 12,000 COP). */
export const copAmount = (value: number, lang: string) => `${formatPriceFor(value, lang)} COP`;

/** Clave i18n y valores del aviso del piso, o null si el piso no redujo el descuento. */
export const floorNotice = (breakdown: Pick<ServerBreakdown, "reducedBy">, lang: string) =>
  breakdown.reducedBy > 0
    ? { key: "quote.pay.floorNotice" as const, values: { minimum: copAmount(MIN_TOTAL / 2, lang), amount: copAmount(breakdown.reducedBy, lang) } }
    : null;
