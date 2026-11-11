import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PATHS } from "@/config/paths";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { EXTRAS, type Extra } from "@/data/extras";
import { formatPriceFor, getPlan } from "@/data/plans";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

const ClockIcon = () => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-gold-700">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const ExtraCard = ({ extra, index }: { extra: Extra; index: number }) => {
  const { t, i18n } = useTranslation();
  // En inglés el separador de miles es la coma ($49,000); en español, el punto ($49.000)
  const price = formatPriceFor(extra.price, i18n.language);

  return (
    <li data-reveal style={{ "--reveal-delay": `${(index % 3) * 90}ms` } as CSSProperties} className="min-w-0">
      <Card as="article" aria-labelledby={`extra-${extra.id}`} className="flex h-full flex-col gap-4 md:p-6">
        <h3 id={`extra-${extra.id}`} className="font-title text-lg font-bold text-navy-900">
          {t(`extras.${extra.id}.name`)}
        </h3>
        <p className="leading-relaxed text-navy-600">{t(`extras.${extra.id}.desc`)}</p>
        <div className="mt-auto flex flex-col gap-1 border-t border-navy-900/10 pt-4">
          <p className="font-title text-xl font-extrabold text-navy-900">
            {t("extras.price", { price })}
            {extra.perLanguage && <span className="ml-1.5 font-body text-sm font-semibold text-navy-600">{t("extras.perLanguage")}</span>}
          </p>
          <p className="flex items-center gap-2 text-sm font-semibold text-navy-700">
            <ClockIcon />
            {t(extra.perLanguage ? "extras.daysPerLanguage" : "extras.days", { count: extra.days })}
          </p>
        </div>
      </Card>
    </li>
  );
};

/** Herramientas extra: tarjetas leídas de src/data/extras.ts, con descuento por plan y nota de costos externos. */
export const ExtrasGrid = () => {
  const { t } = useTranslation();
  const localizePath = useLocalizedPath();

  return (
    <Section id="herramientas" tone="white" labelledBy="servicios-extras-titulo" className="scroll-mt-16 md:scroll-mt-20">
      <div className="flex flex-col gap-10 md:gap-12">
        <div data-reveal>
          <SectionHeading
            id="servicios-extras-titulo"
            eyebrow={t("extras.eyebrow")}
            titleKey="extras.title"
            lead={t("extras.lead")}
          />
        </div>
        <p data-reveal className="w-fit max-w-full rounded-2xl bg-gold-100 px-5 py-3 text-sm font-semibold text-gold-800 ring-1 ring-gold-700/20">
          {t("extras.discount", {
            esencial: t("plans.esencial.name"),
            alamedida: t("plans.alamedida.name"),
            profesional: t("plans.profesional.name"),
            alamedidaPct: getPlan("alamedida").extrasDiscount,
            profesionalPct: getPlan("profesional").extrasDiscount,
          })}
        </p>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EXTRAS.map((extra, index) => (
            <ExtraCard key={extra.id} extra={extra} index={index} />
          ))}
        </ul>
        <div className="flex flex-col items-start gap-3">
          <p className="max-w-3xl text-sm leading-relaxed text-navy-600">{t("extras.externalNote")}</p>
          <Link to={localizePath(PATHS.quote)} className="rounded text-sm font-semibold text-navy-700 underline decoration-gold-500 decoration-2 underline-offset-4 hover:text-navy-900">
            {t("extras.quoteLink")}
          </Link>
        </div>
      </div>
    </Section>
  );
};
