import { useTranslation } from "react-i18next";

import { WHATSAPP_URL } from "@/config/site";
import { PATHS } from "@/config/paths";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Llamada a la acción final (Inicio y Nosotros): ir a Contacto o escribir por WhatsApp. */
export const CtaBand = () => {
  const { t } = useTranslation();
  const localizePath = useLocalizedPath();

  return (
    <Section tone="cream" labelledBy="cta-titulo" className="pt-0! pb-12! md:pb-16!">
      <div
        data-reveal
        className="relative isolate overflow-hidden rounded-[2rem] bg-linear-to-br from-navy-900 via-navy-800 to-navy-700 px-6 py-14 text-white [--focus-ring:var(--color-gold-400)] md:px-14 md:py-20"
      >
        <GeometricPattern tone="dark" />
        <GeometricPattern variant="cluster" className="-right-10 -bottom-10 w-72 opacity-70 md:w-96" />
        <div className="flex max-w-2xl flex-col gap-8">
          <SectionHeading id="cta-titulo" tone="dark" titleKey="card.schedule" lead={t("home.cta.text")} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink to={localizePath(PATHS.contact)} size="lg">
              {t("card.contactUs")}
            </ButtonLink>
            <ButtonAnchor href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" variant="outline-light" size="lg">
              <WhatsAppIcon className="size-5" />
              {t("header.whatsapp")}
            </ButtonAnchor>
          </div>
        </div>
      </div>
    </Section>
  );
};
