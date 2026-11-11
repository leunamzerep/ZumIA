import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

const icon = { "aria-hidden": true, focusable: false, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

// Un ícono por paso, dibujado aquí (decorativo)
const STEPS: { n: number; icon: ReactNode }[] = [
  // 1 Asesoría: burbuja de conversación
  { n: 1, icon: <><path d="M4 5h16v11H9l-5 4Z" /><path d="M8 9.5h8M8 12.5h5" /></> },
  // 2 Contrato y anticipo: documento con visto
  { n: 2, icon: <><path d="M6 3h8l4 4v14H6Z" /><path d="M14 3v4h4" /><path d="m9 14.5 2 2 4-4" /></> },
  // 3 Tu contenido: imagen
  { n: 3, icon: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.5 3.5 3L16 12l4 4" /></> },
  // 4 Diseño y construcción: código
  { n: 4, icon: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" /></> },
  // 5 Revisión: lupa
  { n: 5, icon: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></> },
  // 6 Entrega y pago final: billete
  { n: 6, icon: <><rect x="3" y="6.5" width="18" height="11" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6.5 12h.01M17.5 12h.01" /></> },
  // 7 Publicación y mantenimiento: cohete
  { n: 7, icon: <><path d="M14 4c3.5 0 6 2.5 6 6-3 3.5-6 5.5-9 6l-3-3c.5-3 2.500-6 6-9Z" /><circle cx="15" cy="9" r="1.4" /><path d="M8 14c-2 .5-3.500 2-4 5 3-.5 4.500-2 5-4M6.500 9H9" /></> },
];

/**
 * Proceso de trabajo en 7 pasos: línea de tiempo con íconos unidos por una línea,
 * vertical en móvil y horizontal desde lg. Lista ordenada (<ol>) para lectores de pantalla.
 * Las entradas animadas usan data-reveal, que useReveal desactiva con "reducir movimiento".
 */
export const ProcessTimeline = () => {
  const { t } = useTranslation();

  return (
    <Section tone="cream" labelledBy="servicios-proceso-titulo">
      <div className="flex flex-col gap-12 md:gap-16">
        <div data-reveal>
          <SectionHeading
            id="servicios-proceso-titulo"
            eyebrow={t("services.process.eyebrow")}
            titleKey="services.process.title"
            lead={t("services.process.lead")}
          />
        </div>
        <ol className="relative flex flex-col gap-10 lg:grid lg:grid-cols-7 lg:gap-0">
          {/* Línea que une los pasos: vertical en móvil, horizontal en escritorio */}
          <span aria-hidden="true" className="absolute top-7 bottom-7 left-7 w-px -translate-x-1/2 bg-linear-to-b from-gold-500 via-navy-900/35 to-gold-500 lg:hidden" />
          <span aria-hidden="true" className="absolute top-7 right-[calc(100%/14)] left-[calc(100%/14)] hidden h-0.5 bg-linear-to-r from-gold-500 via-navy-900/35 to-gold-500 lg:block" />
          {STEPS.map(({ n, icon: paths }, i) => (
            <li
              key={n}
              data-reveal
              style={{ "--reveal-delay": `${i * 90}ms` } as CSSProperties}
              className="relative flex items-start gap-5 lg:flex-col lg:items-center lg:gap-4 lg:px-2 lg:text-center"
            >
              <span className="relative inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-400 ring-4 ring-cream-50">
                <svg {...icon} className="size-6">{paths}</svg>
                <span aria-hidden="true" className="absolute -top-1 -right-1 inline-flex size-6 items-center justify-center rounded-full bg-gold-500 font-title text-xs font-extrabold text-navy-900">
                  {n}
                </span>
              </span>
              <div className="flex flex-col gap-2 pt-1 lg:pt-0">
                <h3 className="font-title text-lg font-bold text-navy-900 lg:text-base">{t(`services.process.step${n}Title`)}</h3>
                <p className="text-sm leading-relaxed text-navy-600">{t(`services.process.step${n}Text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
};
