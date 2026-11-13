// Referencia de la orden para la página de resultado. Wompi vuelve a redirect-url añadiendo solo ?id=<transacción>,
// así que la referencia se guarda en sessionStorage justo antes de redirigir. SOLO la referencia: nunca nombre,
// correo, montos ni el token de verificación (D-055). sessionStorage vive en esa pestaña y se borra al cerrarla.

import { REFERENCE_PATTERN } from "@/lib/payApi";

const KEY = "zumia.pay.reference";

const storage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null; // modo privado o almacenamiento bloqueado
  }
};

/** Guarda la referencia. Devuelve false si no tiene el formato ZUM-… o el navegador no deja guardar. */
export const savePendingReference = (reference: string): boolean => {
  if (!REFERENCE_PATTERN.test(reference)) return false;
  try {
    const s = storage();
    if (!s) return false;
    s.setItem(KEY, reference);
    return true;
  } catch {
    return false;
  }
};

/** Referencia guardada en esta pestaña, o null (otra pestaña, otro navegador, o nada guardado). */
export const readPendingReference = (): string | null => {
  try {
    const value = storage()?.getItem(KEY) ?? null;
    return value && REFERENCE_PATTERN.test(value) ? value : null;
  } catch {
    return null;
  }
};

export const clearPendingReference = (): void => {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // nada que hacer
  }
};
