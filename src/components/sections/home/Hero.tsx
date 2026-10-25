import { useTranslation } from "react-i18next";

import { WHATSAPP_URL } from "@/config/site";
import { ButtonAnchor } from "@/components/ui/Button";
import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { WhatsAppIcon } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DeviceMockup } from "./DeviceMockup";
import { PLANS_ID } from "./Plans";

/** Hero de Inicio: propuesta de valor, dos acciones y el mockup de la web. */
export const Hero = () => {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="inicio-titulo"
      // Fondo: degradado navy con brillos dorados. Sin "relative" (ver Section.tsx):
      // el patrón se alinea con <main> y sigue en la sección siguiente
      className="isolate overflow-hidden [clip-path:inset(0)] bg-navy-950 bg-[radial-gradient(60rem_40rem_at_85%_10%,rgba(212,143,64,0.22),transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,rgba(58,64,122,0.55),transparent_70%),linear-gradient(160deg,#13173D,#0B0E26)] font-body text-white [--focus-ring:var(--color-gold-400)]"
    >
      <GeometricPattern variant="field" tone="dark" />

      <div className="relative">
        <GeometricPattern variant="cluster" className="right-0 bottom-0 hidden w-80 opacity-60 lg:block" />
        <div className="container-site grid items-center gap-14 pt-14 pb-20 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-24 lg:pb-28">
          <div className="flex flex-col gap-9">
            <SectionHeading
              as="h1"
              id="inicio-titulo"
              tone="dark"
              eyebrow={t("home.hero.eyebrow")}
              titleKey="home.main"
              lead={t("home.hero.lead")}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonAnchor href={`#${PLANS_ID}`} size="lg">
                {t("home.hero.ctaPlans")}
              </ButtonAnchor>
              <ButtonAnchor href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" variant="outline-light" size="lg">
                <WhatsAppIcon className="size-5" />
                {t("home.hero.ctaWhatsapp")}
              </ButtonAnchor>
            </div>
          </div>
          <DeviceMockup />
        </div>
      </div>
    </section>
  );
};
