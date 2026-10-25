import type { CSSProperties, SVGProps } from "react";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/Card";
import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

// Íconos de las tarjetas (dibujados aquí, decorativos)
const icon = { "aria-hidden": true, focusable: false, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const BrowserIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon} {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M8 13l-2 2 2 2M16 13l2 2-2 2" /></svg>
);
const SlidersIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon} {...p}><path d="M5 4v6M5 14v6M12 4v10M12 18v2M19 4v2M19 10v10" /><circle cx="5" cy="12" r="2" /><circle cx="12" cy="16" r="2" /><circle cx="19" cy="8" r="2" /></svg>
);
const CursorIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon} {...p}><path d="m5 3 14 7-6 2-2 6Z" /><path d="m13 12 6 6" /></svg>
);
const GrowthIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...icon} {...p}><path d="M5 20v-4M10 20v-7M15 20v-10" /><path d="m4 10 5-4 3 2 7-5M15 3h4v4" /></svg>
);

// Las 4 tarjetas existentes (home.title1–4 y home.text1–4)
const SERVICES = [
  { n: 1, Icon: BrowserIcon },
  { n: 2, Icon: SlidersIcon },
  { n: 3, Icon: CursorIcon },
  { n: 4, Icon: GrowthIcon },
];

export const Services = () => {
  const { t } = useTranslation();

  return (
    <Section tone="cream" labelledBy="servicios-titulo" decoration={<GeometricPattern tone="light" />}>
      <div className="flex flex-col gap-12 md:gap-16">
        <div data-reveal>
          <SectionHeading id="servicios-titulo" eyebrow={t("home.services.eyebrow")} titleKey="home.services.title" />
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ n, Icon }, i) => (
            <li key={n} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as CSSProperties}>
              <Card className="card-hover flex h-full flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-navy-900 text-gold-400">
                    <Icon className="size-7" />
                  </span>
                  <span aria-hidden="true" className="font-title text-4xl font-extrabold text-outline [--outline-color:var(--color-navy-900)] opacity-25">
                    {String(n).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-title text-h3 font-bold text-navy-900">{t(`home.title${n}`)}</h3>
                <p className="leading-relaxed text-navy-600">{t(`home.text${n}`)}</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
};
