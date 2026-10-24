import { WHATSAPP_URL } from "./site";

/**
 * Enlace de WhatsApp al mismo número de WHATSAPP_URL (src/config/site.ts), pero
 * con otro mensaje ya escrito (por ejemplo, el del plan elegido).
 */
export const whatsappWithMessage = (message: string) =>
  `${WHATSAPP_URL.split("?")[0]}?text=${encodeURIComponent(message)}`;
