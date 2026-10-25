import { useTranslation } from "react-i18next";

import { useWhatsappUrl } from "@/config/whatsapp";
import { WhatsAppIcon } from "@/components/ui/icons";
import { LanguageSwitch } from "@/components/langSwitch/LangSwitch";

/**
 * Botones flotantes: switch de idioma (abajo a la izquierda) y WhatsApp (abajo
 * a la derecha), a la misma altura. Solo con CSS (sin JavaScript ni medidas del pie).
 *
 * Va justo antes del <footer>, dentro de un contenedor "sticky" de altura 0
 * pegado al borde inferior de la ventana:
 * - mientras el pie no se ve, los botones quedan fijos abajo;
 * - al llegar al pie, el contenedor vuelve a su sitio (encima del pie) y los
 *   botones se detienen ahí, sin taparlo.
 * Como no guarda ninguna posición, cada página empieza igual, venga de donde venga.
 */
export const WhatsAppFloat = () => {
  const { t } = useTranslation();
  const whatsappUrl = useWhatsappUrl();

  return (
    <div className="pointer-events-none sticky bottom-0 z-30 h-0">
      <LanguageSwitch className="pointer-events-auto absolute left-4 bottom-[max(1rem,env(safe-area-inset-bottom))] md:left-6 md:bottom-7" />
      <a
        href={whatsappUrl}
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
