// Lógica pura de la página /payment/result/ (sin componentes): datos de entrada, estado → vista, sondeo con límite.
// Wompi vuelve a redirect-url añadiendo solo ?id=<transacción>; la referencia ZUM-… sale de sessionStorage.

import { REFERENCE_PATTERN, TRANSACTION_ID_PATTERN, type OrderStatus, type PayError, type StatusQuery } from "@/lib/payApi";

/** Ruta de la página (con barra final). Vive aquí y no en PATHS para que con los pagos apagados no entre al bundle. */
export const RESULT_PATH = "/payment/result/";

/** Sondeo mientras la orden está pending: cada 3 s, hasta ~90 s. */
export const POLL_INTERVAL_MS = 3_000;
export const POLL_MAX_MS = 90_000;

/**
 * checking        primera consulta en curso
 * approved        pago confirmado (webhook recibido y verificado)
 * pending         confirmando (se sigue consultando)
 * pendingTimeout  pasaron ~90 s y sigue pending: se confirmará por correo
 * declined | error | voided   la pasarela no aprobó el pago (frase neutra)
 * expired         la orden venció sin pago
 * unknown         sin referencia ni id válidos, o la orden no se encontró (mensaje neutro)
 * unavailable     red caída, 503 o 429: reintento manual
 */
export type ResultView = "checking" | "approved" | "pending" | "pendingTimeout" | "declined" | "error" | "voided" | "expired" | "unknown" | "unavailable";

export type ResultInputs = { reference: string | null; id: string | null };

/** Lee y valida ?id= de la URL y la referencia guardada. Lo que no tenga el formato del Worker se descarta. */
export const readResultInputs = (search: string, storedReference: string | null): ResultInputs => {
  let id: string | null = null;
  try {
    id = new URLSearchParams(search).get("id");
  } catch {
    id = null;
  }
  return {
    reference: storedReference && REFERENCE_PATTERN.test(storedReference) ? storedReference : null,
    id: id && TRANSACTION_ID_PATTERN.test(id) ? id : null,
  };
};

/** Con qué consultar /pay/status: la referencia si la hay; si no, el id; si no hay ninguno, null. */
export const statusQueryFor = (inputs: ResultInputs): StatusQuery | null =>
  inputs.reference ? { reference: inputs.reference } : inputs.id ? { id: inputs.id } : null;

/** Vista según el estado de la orden. pending sigue siendo "pending" aunque haya pasado el plazo: un pago tardío se acepta. */
export const viewForStatus = (status: OrderStatus): ResultView => (status === "expired" ? "expired" : status);

/** Vista según el error de la consulta. "No encontrada" y "formato inválido" dan el mismo mensaje neutro. */
export const viewForError = (error: PayError): ResultView =>
  error === "network" || error === "unavailable" || error === "rate_limited" ? "unavailable" : "unknown";

/** Estados finales: se borra la referencia guardada. En pending (o si no se pudo consultar) se conserva. */
export const isFinalView = (view: ResultView) => view === "approved" || view === "declined" || view === "error" || view === "voided" || view === "expired";

/** ¿Seguir consultando? Solo en pending y antes del límite. Si se pasa del límite → pendingTimeout. */
export const nextAfterPoll = (view: ResultView, elapsedMs: number): { view: ResultView; poll: boolean } => {
  if (view !== "pending") return { view, poll: false };
  if (elapsedMs + POLL_INTERVAL_MS > POLL_MAX_MS) return { view: "pendingTimeout", poll: false };
  return { view, poll: true };
};

/** Clave i18n del mensaje de cada vista: payResult.views.<view>. */
export const resultMessageKey = (view: ResultView) => `payResult.views.${view}` as const;

export const RESULT_VIEWS: readonly ResultView[] = ["checking", "approved", "pending", "pendingTimeout", "declined", "error", "voided", "expired", "unknown", "unavailable"];
