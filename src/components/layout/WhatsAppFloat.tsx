import { useTranslation } from "react-i18next";

import { WHATSAPP_URL } from "@/config/site";
import { WhatsAppIcon } from "@/components/ui/icons";

/**
 * Botón flotante de WhatsApp, solo con CSS (sin JavaScript ni medidas del pie).
 *
 * Va justo antes del <footer>, dentro de un contenedor "sticky" de altura 0
 * pegado al borde inferior de la ventana:
 * - mientras el pie no se ve, el botón queda fijo abajo a la derecha;
 * - al llegar al pie, el contenedor vuelve a su sitio (encima del pie) y el
 *   botón se detiene ahí, sin taparlo.
 * Como no guarda ninguna posición, cada página empieza igual, venga de donde venga.
 */
export const WhatsAppFloat = () => {
  const { t } = useTranslation();

  return (
    <div className="pointer-events-none sticky bottom-0 z-30 h-0">
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("footer.whatsapp")}
        className={
          "pointer-events-auto absolute right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] md:right-6 md:bottom-7 " +
          "inline-flex size-14 items-center justify-center rounded-full bg-social-whatsapp-dark text-white md:size-15 " +
          "shadow-[0_10px_30px_-8px_rgba(19,23,61,0.55)] ring-4 ring-white/70 " +
          "transition-transform duration-200 hover:-translate-y-0.5"
        }
      >
        <WhatsAppIcon className="size-7 md:size-8" />
      </a>
    </div>
  );
};
