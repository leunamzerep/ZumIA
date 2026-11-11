import { useTranslation } from "react-i18next";

import { PageSeo } from "@/components/seo/PageSeo";
import { BookingCta } from "@/components/sections/BookingCta";
import { PageHero } from "@/components/sections/PageHero";
import { ExtrasGrid } from "@/components/sections/services/ExtrasGrid";
import { ProcessTimeline } from "@/components/sections/services/ProcessTimeline";
import { PLANS_ID } from "@/components/sections/home/Plans";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { useWhatsappUrl } from "@/config/whatsapp";
import { PATHS } from "@/config/paths";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";

export const Services = () => {
  const { t } = useTranslation();
  const whatsappUrl = useWhatsappUrl();
  const localizePath = useLocalizedPath();

  return (
    <>
      <PageSeo title={t("seo.servicesTitle")} description={t("seo.servicesDescription")} />
      {/* "relative": el patrón de fondo de todas las secciones se alinea con <main> */}
      <main className="relative">
        <PageHero id="servicios-titulo" eyebrow={t("services.eyebrow")} titleKey="services.title" lead={t("services.lead")} align="center">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <ButtonLink to={`${localizePath(PATHS.home)}#${PLANS_ID}`} size="lg">
              {t("home.hero.ctaPlans")}
            </ButtonLink>
            <ButtonAnchor href={whatsappUrl} target="_blank" rel="noopener noreferrer" variant="outline-light" size="lg">
              <WhatsAppIcon className="size-5" />
              {t("home.hero.ctaWhatsapp")}
            </ButtonAnchor>
          </div>
        </PageHero>
        <ProcessTimeline />
        <ExtrasGrid />
        <BookingCta />
      </main>
    </>
  );
};
