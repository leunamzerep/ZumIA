import type { CSSProperties, SVGProps } from "react";
import { useTranslation } from "react-i18next";

import { PLANS, formatPrice, type Plan } from "@/data/plans";
import { whatsappWithMessage } from "@/config/whatsapp";
import { ButtonAnchor } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Pill } from "@/components/ui/Pill";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** id de la sección: el botón "Ver planes" del hero salta aquí (#planes) */
export const PLANS_ID = "planes";

const stroke = { "aria-hidden": true, focusable: false, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const CheckIcon = (p: SVGProps<SVGSVGElement>) => <svg {...stroke} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
const ClockIcon = (p: SVGProps<SVGSVGElement>) => <svg {...stroke} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;

const PlanCard = ({ plan, index }: { plan: Plan; index: number }) => {
  const { t } = useTranslation();
  const name = t(`plans.${plan.id}.name`);
  const price = formatPrice(plan.price);
  const dark = Boolean(plan.featured);

  return (
    <li data-reveal style={{ "--reveal-delay": `${index * 110}ms` } as CSSProperties} className={cx("min-w-0", dark && "lg:-my-4")}>
      <Card as="article" tone={dark ? "dark" : "light"} aria-labelledby={`plan-${plan.id}`} className="flex h-full flex-col gap-6 overflow-hidden">
        {dark && (
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-gold-700 via-gold-400 to-gold-700" />
        )}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h3 id={`plan-${plan.id}`} className={cx("font-title text-2xl font-extrabold uppercase tracking-wide", dark ? "text-white" : "text-navy-900")}>
              {name}
            </h3>
            {dark && <Pill tone="gold">{t("plans.badge")}</Pill>}
          </div>
          <p className={cx("leading-relaxed", dark ? "text-white/75" : "text-navy-600")}>{t(`plans.${plan.id}.tagline`)}</p>
        </div>

        {/* Precio: los lectores de pantalla leen la frase completa; la vista, el número grande */}
        <p className="flex items-baseline gap-1.5">
          <span className="sr-only">{t("plans.priceLabel", { price })}</span>
          <span aria-hidden="true" className={cx("font-title text-2xl font-bold", dark ? "text-gold-400" : "text-gold-700")}>{t("plans.currencySymbol")}</span>
          <span aria-hidden="true" className="font-title text-[2.75rem] leading-none font-extrabold tracking-tight sm:text-5xl">{price}</span>
          <span aria-hidden="true" className={cx("text-sm font-bold", dark ? "text-white/60" : "text-navy-500")}>{t("plans.currency")}</span>
        </p>

        <div className={cx("flex flex-1 flex-col gap-4 border-t pt-6", dark ? "border-white/10" : "border-navy-900/10")}>
          <p className={cx("text-xs font-bold uppercase tracking-[0.16em]", dark ? "text-gold-300" : "text-gold-700")}>{t("plans.includes")}</p>
          <ul className="flex flex-col gap-3">
            {plan.features.map((key) => (
              <li key={key} className="flex gap-3 leading-snug">
                <span className={cx("mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full", dark ? "bg-gold-500 text-navy-900" : "bg-navy-900 text-gold-400")}>
                  <CheckIcon className="size-3.5" />
                </span>
                <span className={dark ? "text-white/90" : "text-navy-800"}>{t(key)}</span>
              </li>
            ))}
          </ul>
          <p className={cx("mt-auto flex items-center gap-2 pt-2 text-sm font-semibold", dark ? "text-white/80" : "text-navy-700")}>
            <ClockIcon className={cx("size-4.5 shrink-0", dark ? "text-gold-400" : "text-gold-700")} />
            {t("plans.delivery", { days: t(`plans.${plan.id}.days`) })}
          </p>
          {plan.maintenanceKey && (
            <p className={cx("text-sm", dark ? "text-white/60" : "text-navy-500")}>{t(plan.maintenanceKey)}</p>
          )}
        </div>

        <ButtonAnchor
          href={whatsappWithMessage(t("plans.whatsapp", { plan: name }))}
          target="_blank"
          rel="noopener noreferrer"
          variant={dark ? "primary" : "secondary"}
          size="lg"
          className="w-full px-4 text-[0.9rem] sm:px-7 sm:text-base"
        >
          <WhatsAppIcon className="size-5" />
          {t(`plans.${plan.id}.cta`)}
        </ButtonAnchor>
      </Card>
    </li>
  );
};

export const Plans = () => {
  const { t } = useTranslation();

  return (
    <Section id={PLANS_ID} tone="white" labelledBy="planes-titulo" className="scroll-mt-16 md:scroll-mt-20">
      <div className="flex flex-col gap-12 md:gap-16">
        <div data-reveal>
          <SectionHeading id="planes-titulo" align="center" eyebrow={t("plans.eyebrow")} titleKey="plans.title" lead={t("plans.lead")} />
        </div>
        <ul className="mx-auto grid w-full max-w-md gap-10 sm:gap-12 lg:max-w-none lg:grid-cols-3 lg:items-stretch lg:gap-6">
          {PLANS.map((plan, index) => (
            <PlanCard key={plan.id} plan={plan} index={index} />
          ))}
        </ul>
        <p className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-navy-600">{t("plans.conditions")}</p>
      </div>
    </Section>
  );
};
