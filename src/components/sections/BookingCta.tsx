import { useTranslation } from "react-i18next";

import { useWhatsappUrl } from "@/config/whatsapp";
import { ButtonAnchor } from "@/components/ui/Button";
import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Llamado a reservar ("¿Hablamos de tu proyecto?"). Por ahora solo WhatsApp.
 * Fase C: añadir aquí, junto al botón de WhatsApp, el botón de agenda usando
 * BOOKING_URL (src/config/site.ts).
 */
export const BookingCta = () => {
  const { t } = useTranslation();
  const whatsappUrl = useWhatsappUrl();

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
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonAnchor href={whatsappUrl} target="_blank" rel="noopener noreferrer" size="lg">
              <WhatsAppIcon className="size-5" />
              {t("header.whatsapp")}
            </ButtonAnchor>
          </div>
        </div>
      </div>
    </Section>
  );
};
