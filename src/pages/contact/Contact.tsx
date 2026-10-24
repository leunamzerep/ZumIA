import type { ReactNode, SVGProps } from "react";
import { useTranslation } from "react-i18next";

import { ContactForm } from "@/components/forms/contactForm/ContactForm";
import { PageSeo } from "@/components/seo/PageSeo";
import { PageHero } from "@/components/sections/PageHero";
import { Card } from "@/components/ui/Card";
import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { MailIcon, WhatsAppIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { EMAIL, PHONE_DISPLAY, WHATSAPP_URL } from "@/config/site";

// Íconos de horario y ubicación (dibujados aquí, decorativos)
const icon = { "aria-hidden": true, focusable: false, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ClockIcon = (p: SVGProps<SVGSVGElement>) => <svg {...icon} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
const PinIcon = (p: SVGProps<SVGSVGElement>) => <svg {...icon} {...p}><path d="M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>;

/** Un canal de contacto: ícono, etiqueta y contenido (enlace o texto) */
const Channel = ({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) => (
  <li className="flex gap-4">
    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-gold-400 ring-1 ring-white/10">
      {icon}
    </span>
    <div className="flex min-w-0 flex-col gap-1">
      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-gold-300">{label}</h3>
      <div className="leading-relaxed text-white/85">{children}</div>
    </div>
  </li>
);

const linkClass = "break-words font-semibold text-white underline-offset-4 hover:text-gold-300 hover:underline";

// Sin dirección ni mapa: la dirección de notificaciones solo va en las páginas legales
export const Contact = () => {
  const { t } = useTranslation();
  const mailLink: string = t("footer.mailRedirect");

  return (
    <>
      <PageSeo
        title={t("seo.contactTitle")}
        description={t("seo.contactDescription")}
      />
      <main>
        <PageHero id="contacto-titulo" eyebrow={t("header.contact")} titleKey="contact.main" />

        <Section tone="cream" decoration={<GeometricPattern tone="light" />}>
          <div className="grid items-start gap-6 lg:grid-cols-[1.45fr_1fr] lg:gap-8">
            <Card className="flex flex-col gap-8" aria-labelledby="formulario-titulo">
              <h2 id="formulario-titulo" className="font-title text-h3 font-bold text-navy-900">
                {t("contact.invitation")}
              </h2>
              <ContactForm />
            </Card>

            <Card tone="dark" as="article" aria-labelledby="canales-titulo" className="flex flex-col gap-8 overflow-hidden">
              <GeometricPattern variant="cluster" className="-right-16 -bottom-16 w-56 opacity-40" />
              <h2 id="canales-titulo" className="font-title text-h3 font-bold text-white">{t("contact.channels")}</h2>
              <ul className="flex flex-col gap-6">
                <Channel icon={<WhatsAppIcon className="size-6" />} label={t("contact.whatsappLabel")}>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {PHONE_DISPLAY}
                    <span className="sr-only"> {t("footer.newTab")}</span>
                  </a>
                </Channel>
                <Channel icon={<MailIcon className="size-6" />} label={t("contact.emailLabel")}>
                  <a href={mailLink} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {EMAIL}
                    <span className="sr-only"> {t("footer.newTab")}</span>
                  </a>
                </Channel>
                <Channel icon={<ClockIcon className="size-6" />} label={t("contact.ubih23")}>
                  {t("contact.ubih33")}
                </Channel>
                <Channel icon={<PinIcon className="size-6" />} label={t("contact.ubih21")}>
                  {t("contact.ubih31")}
                </Channel>
              </ul>
            </Card>
          </div>
        </Section>
      </main>
    </>
  );
};
