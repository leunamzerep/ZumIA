import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

const STEPS = [1, 2, 3, 4];

/** "Cómo trabajamos": insumos → primera entrega → 2 rondas de cambios → entrega final. */
export const Process = () => {
  const { t } = useTranslation();

  return (
    <Section tone="navy" labelledBy="proceso-titulo" decoration={<GeometricPattern tone="dark" />}>
      <div className="flex flex-col gap-12 md:gap-16">
        <div data-reveal>
          <SectionHeading id="proceso-titulo" tone="dark" eyebrow={t("home.process.eyebrow")} titleKey="home.process.title" />
        </div>
        <ol className="relative grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Línea que une los pasos (escritorio) */}
          <span aria-hidden="true" className="absolute top-8 right-8 left-8 hidden h-px bg-linear-to-r from-gold-500/70 via-white/20 to-gold-500/70 lg:block" />
          {STEPS.map((n, i) => (
            <li
              key={n}
              data-reveal
              style={{ "--reveal-delay": `${i * 110}ms` } as CSSProperties}
              // Desde md, cada paso ocupa 3 filas compartidas (número, título, texto):
              // así los textos quedan alineados aunque un título tenga menos líneas
              className="relative flex flex-col gap-4 md:row-span-3 md:grid md:grid-rows-subgrid"
            >
              <span
                aria-hidden="true"
                className="relative inline-flex size-16 items-center justify-center rounded-full bg-navy-900 font-title text-2xl font-extrabold text-gold-400 ring-2 ring-gold-500/60"
              >
                {String(n).padStart(2, "0")}
              </span>
              <h3 className="font-title text-h3 font-bold text-white">{t(`home.process.step${n}Title`)}</h3>
              <p className="leading-relaxed text-white/75">{t(`home.process.step${n}Text`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
};
