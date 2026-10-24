import type { CSSProperties, SVGProps } from "react";
import { useTranslation } from "react-i18next";

import { PageSeo } from "@/components/seo/PageSeo";
import { Clients } from "@/components/sections/Clients";
import { CtaBand } from "@/components/sections/CtaBand";
import { PageHero } from "@/components/sections/PageHero";
import { Card } from "@/components/ui/Card";
import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { Section } from "@/components/ui/Section";

// Íconos de las tarjetas (dibujados aquí, decorativos)
const icon = { "aria-hidden": true, focusable: false, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const LayersIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon} {...p}><path d="m12 3 9 5-9 5-9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
);
const ShieldIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon} {...p}><path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6Z" /><path d="m8.8 12 2.2 2.2 4.4-4.4" /></svg>
);
const HandsIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon} {...p}><circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><path d="M3 20c0-3 2.2-5 5-5s5 2 5 5M11 20c0-3 2.2-5 5-5s5 2 5 5" /></svg>
);

// Tarjetas: Servicios (h22/h32), Compromiso (h23/h33) y Enfoque (h27/h37).
// h26/h36 no se usan: son de la plantilla fiscal.
const VALUES = [
  { title: "about.h22", text: "about.h32", Icon: LayersIcon },
  { title: "about.h23", text: "about.h33", Icon: ShieldIcon },
  { title: "about.h27", text: "about.h37", Icon: HandsIcon },
];

// Misión (h24/h34) y Visión (h25/h35)
const PURPOSE = [
  { title: "about.h24", text: "about.h34" },
  { title: "about.h25", text: "about.h35" },
];

export const AboutUs = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageSeo
        title={t("seo.aboutUsTitle")}
        description={t("seo.aboutUsDescription")}
      />
      <main>
        <PageHero id="nosotros-titulo" eyebrow={t("about.h21")} titleKey="about.h1" lead={t("about.h31")} />

        <Section tone="cream" decoration={<GeometricPattern tone="light" />}>
          <ul className="grid gap-6 md:grid-cols-3">
            {VALUES.map(({ title, text, Icon }, i) => (
              <li key={title} data-reveal style={{ "--reveal-delay": `${i * 100}ms` } as CSSProperties}>
                <Card className="flex h-full flex-col gap-5">
                  <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-navy-900 text-gold-400">
                    <Icon className="size-7" />
                  </span>
                  <h2 className="font-title text-h3 font-bold text-navy-900">{t(title)}</h2>
                  <p className="leading-relaxed text-navy-600">{t(text)}</p>
                </Card>
              </li>
            ))}
          </ul>
        </Section>

        <Section tone="navy" decoration={<GeometricPattern tone="dark" />}>
          <ul className="grid gap-6 lg:grid-cols-2">
            {PURPOSE.map(({ title, text }, i) => (
              <li key={title} data-reveal style={{ "--reveal-delay": `${i * 120}ms` } as CSSProperties}>
                <Card tone="glass" className="flex h-full flex-col gap-5 overflow-hidden md:p-10">
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-gold-700 via-gold-400 to-transparent" />
                  <h2 className="font-title text-h2 font-extrabold uppercase tracking-tight text-white">{t(title)}</h2>
                  <p className="text-lead text-white/80">{t(text)}</p>
                </Card>
              </li>
            ))}
          </ul>
        </Section>

        <Clients />
        <CtaBand />
      </main>
    </>
  );
};
