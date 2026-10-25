import { useTranslation } from "react-i18next";

import { WHATSAPP_URL } from "./site";

/**
 * Enlace de WhatsApp al mismo número de WHATSAPP_URL (src/config/site.ts), pero
 * con otro mensaje ya escrito (por ejemplo, el del plan elegido).
 */
export const whatsappWithMessage = (message: string) =>
  `${WHATSAPP_URL.split("?")[0]}?text=${encodeURIComponent(message)}`;

/**
 * Enlace general de WhatsApp con el mensaje en el idioma visible
 * (header.whatsappMessage en es.json / en.json).
 */
export const useWhatsappUrl = () => {
  const { t } = useTranslation();
  return whatsappWithMessage(t("header.whatsappMessage"));
};
