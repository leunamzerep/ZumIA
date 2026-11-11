import { useTranslation } from "react-i18next";

import { AGENDA_ID, PATHS } from "@/config/paths";
import { BOOKING_URL } from "@/config/site";
import { useWhatsappUrl } from "@/config/whatsapp";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Llamado a reservar ("¿Hablamos de tu proyecto?"): WhatsApp, el cotizador
 * (/quote) y, si existe BOOKING_URL (src/config/site.ts), "Agendar asesoría",
 * que lleva a la agenda de Contacto (/contact/#agenda).
 */
export const BookingCta = () => {
  const { t } = useTranslation();
  const whatsappUrl = useWhatsappUrl();
  const localizePath = useLocalizedPath();

  return (
    <Section tone="cream" labelledBy="reservar-titulo" className="pt-0! pb-12! md:pb-16!">
      <div
        data-reveal
        className="relative isolate overflow-hidden rounded-[2rem] bg-linear-to-br from-navy-900 via-navy-800 to-navy-700 px-6 py-14 text-white [--focus-ring:var(--color-gold-400)] md:px-14 md:py-20"
      >
        <GeometricPattern tone="dark" />
        <GeometricPattern variant="cluster" className="-right-10 -bottom-10 w-72 opacity-70 md:w-96" />
        <div className="flex max-w-2xl flex-col gap-8">
          <SectionHeading id="reservar-titulo" tone="dark" titleKey="booking.title" lead={t("booking.text")} />
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonAnchor href={whatsappUrl} target="_blank" rel="noopener noreferrer" size="lg">
              <WhatsAppIcon className="size-5" />
              {t("header.whatsapp")}
            </ButtonAnchor>
            <ButtonLink to={localizePath(PATHS.quote)} variant="outline-light" size="lg">
              {t("booking.quoteCta")}
            </ButtonLink>
            {BOOKING_URL && (
              <ButtonLink to={`${localizePath(PATHS.contact)}#${AGENDA_ID}`} variant="outline-light" size="lg">
                {t("booking.scheduleCta")}
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
};
