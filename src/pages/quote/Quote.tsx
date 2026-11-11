import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageSeo } from "@/components/seo/PageSeo";
import { PageHero } from "@/components/sections/PageHero";
import { ChoiceMark, RadioCards, choiceCardClass } from "@/components/sections/quote/ChoiceCards";
import { QuoteSummary, SUMMARY_ID } from "@/components/sections/quote/QuoteSummary";
import { Card } from "@/components/ui/Card";
import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { Pill } from "@/components/ui/Pill";
import { Section } from "@/components/ui/Section";
import { useWhatsappUrl, whatsappWithMessage } from "@/config/whatsapp";
import { EXTRAS, type ExtraId } from "@/data/extras";
import { PLANS, formatPriceFor, getPlan, type PlanId } from "@/data/plans";
import {
  MAX_LANGUAGES,
  PAGE_OPTIONS,
  SECTION_OPTIONS,
  computeQuote,
  discounted,
  suggestPlan,
  type ExtrasSelection,
  type Quote as QuoteData,
} from "@/data/quote";

/** Largo máximo del enlace de WhatsApp; si se pasa, se recorta la lista con "y N herramientas más". */
const MAX_WHATSAPP_URL = 1800;

const stepTitle = "font-title text-h3 font-bold text-navy-900";

// Estado solo en memoria: nada se guarda (sin localStorage, cookies ni formularios)
export const Quote = () => {
  const { t, i18n } = useTranslation();
  const genericWhatsappUrl = useWhatsappUrl();
  const [pages, setPages] = useState<number>();
  const [sections, setSections] = useState<number>();
  const [planId, setPlanId] = useState<PlanId | null>(null);
  const [selection, setSelection] = useState<ExtrasSelection>({});
  const stepOneRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);

  const suggested = suggestPlan(pages, sections);
  const quote = planId ? computeQuote(planId, selection) : null;
  const discount = planId ? getPlan(planId).extrasDiscount : 0;
  const money = (value: number) => t("extras.price", { price: formatPriceFor(value, i18n.language) });
  const days = (count: number) => t("quote.planDays", { count });

  // Cambiar una respuesta vuelve a sugerir plan (y reemplaza la elección manual)
  const answerPages = (value: number) => {
    setPages(value);
    setPlanId(suggestPlan(value, sections));
  };
  const answerSections = (value: number) => {
    setSections(value);
    setPlanId(suggestPlan(pages, value));
  };

  const toggleExtra = (id: ExtraId, checked: boolean) =>
    setSelection((current) => {
      const next = { ...current };
      if (checked) next[id] = 1;
      else delete next[id];
      return next;
    });

  const reset = () => {
    setPages(undefined);
    setSections(undefined);
    setPlanId(null);
    setSelection({});
    stepOneRef.current?.focus();
  };

  const goToSummary = () => {
    const smooth = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    document.getElementById(SUMMARY_ID)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    summaryRef.current?.focus({ preventScroll: true });
  };

  const whatsappUrl = quote ? buildWhatsappUrl(quote, t, money) : genericWhatsappUrl;

  return (
    <>
      <PageSeo title={t("seo.quoteTitle")} description={t("seo.quoteDescription")} />
      {/* "relative": el patrón de fondo de todas las secciones se alinea con <main> */}
      <main className="relative">
        <PageHero id="cotizador-titulo" eyebrow={t("quote.eyebrow")} titleKey="quote.title" lead={t("quote.lead")} />

        <Section tone="cream" decoration={<GeometricPattern tone="light" />}>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_25rem]">
            <div className="flex min-w-0 flex-col gap-6">
              {/* 1. Selector de necesidad */}
              <Card className="flex flex-col gap-8">
                <h2 ref={stepOneRef} tabIndex={-1} className={`${stepTitle} outline-none`}>
                  {t("quote.needTitle")}
                </h2>
                <RadioCards
                  name="paginas"
                  legend={t("quote.pagesLegend")}
                  className="sm:grid-cols-3"
                  options={PAGE_OPTIONS.map((value) => ({ value, label: t(`quote.pages_${value}`) }))}
                  value={pages}
                  onChange={answerPages}
                />
                <RadioCards
                  name="secciones"
                  legend={t("quote.sectionsLegend")}
                  className="sm:grid-cols-3"
                  options={SECTION_OPTIONS.map((value) => ({ value, label: t(`quote.sections_${value}`) }))}
                  value={sections}
                  onChange={answerSections}
                />
              </Card>

              {/* 2. Plan (sugerido, pero se puede cambiar) */}
              <Card className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h2 className={stepTitle}>{t("quote.planTitle")}</h2>
                  <p className="text-sm leading-relaxed text-navy-600">{suggested ? t("quote.suggestionNote") : t("quote.planHint")}</p>
                </div>
                <RadioCards
                  name="plan"
                  legend={t("quote.planLegend")}
                  legendClassName="sr-only"
                  className="md:grid-cols-3"
                  options={PLANS.map((plan) => ({
                    value: plan.id,
                    label: t(`plans.${plan.id}.name`),
                    badge: suggested === plan.id ? <Pill className="px-2.5! py-1! text-[0.65rem]!">{t("quote.suggested")}</Pill> : undefined,
                    detail: (
                      <>
                        <span className="block font-semibold text-navy-800">{money(plan.price)}</span>
                        <span className="block">{days(plan.days)}</span>
                      </>
                    ),
                  }))}
                  value={planId}
                  onChange={setPlanId}
                />
              </Card>

              {/* 3. Herramientas extra (precios y días de extras.ts) */}
              <Card className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h2 className={stepTitle}>{t("quote.extrasTitle")}</h2>
                  <p className="text-sm leading-relaxed text-navy-600">{t("quote.extrasLead")}</p>
                </div>
                {planId && discount > 0 && (
                  <p className="w-fit max-w-full rounded-2xl bg-gold-100 px-4 py-2 text-sm font-semibold text-gold-800 ring-1 ring-gold-700/20">
                    {t("quote.extrasDiscount", { plan: t(`plans.${planId}.name`), pct: discount })}
                  </p>
                )}
                <ul className="grid gap-3 sm:grid-cols-2">
                  {EXTRAS.map((extra) => {
                    const checked = Boolean(selection[extra.id]);
                    const inputId = `extra-${extra.id}`;
                    return (
                      <li key={extra.id} className="flex min-w-0 flex-col gap-2">
                        <label htmlFor={inputId} className={`${choiceCardClass} h-full`}>
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => toggleExtra(extra.id, event.target.checked)}
                            className="peer sr-only"
                          />
                          <ChoiceMark type="checkbox" />
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="font-semibold leading-snug text-navy-900">{t(`extras.${extra.id}.name`)}</span>
                            <span className="text-sm text-navy-600">
                              <span className="font-semibold text-navy-800">{money(discounted(extra.price, discount))}</span>
                              {extra.perLanguage && ` ${t("extras.perLanguage")}`}
                              {" · "}
                              {t(extra.perLanguage ? "extras.daysPerLanguage" : "extras.days", { count: extra.days })}
                            </span>
                          </span>
                        </label>
                        {extra.perLanguage && checked && (
                          <div className="flex items-center justify-between gap-3 rounded-2xl bg-gold-50 px-4 py-2 ring-1 ring-gold-700/20">
                            <label htmlFor="idiomas" className="text-sm font-semibold text-navy-800">
                              {t("quote.languages")}
                            </label>
                            <select
                              id="idiomas"
                              value={selection[extra.id]}
                              onChange={(event) => setSelection((current) => ({ ...current, [extra.id]: Number(event.target.value) }))}
                              className="rounded-lg bg-white px-3 py-1.5 font-semibold text-navy-900 ring-1 ring-navy-900/25"
                            >
                              {Array.from({ length: MAX_LANGUAGES }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>

            {/* 4. Resumen: tarjeta fija al lado en escritorio (con scroll propio si no cabe en la pantalla);
                en móvil y tableta, al final, con la barra de abajo */}
            <aside id={SUMMARY_ID} aria-labelledby="resumen-titulo" className="scroll-mt-20 md:scroll-mt-24 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-card">
              <QuoteSummary ref={summaryRef} quote={quote} money={money} whatsappUrl={whatsappUrl} onReset={reset} />
            </aside>
          </div>
        </Section>

        {/* Aviso educado para lectores de pantalla: solo el total y el plazo, no cada línea */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {quote ? t("quote.live", { total: money(quote.total), days: days(quote.days) }) : ""}
        </p>

        {/* Barra fija en móvil y tableta: se detiene al final de la página, encima del pie */}
        <div className="sticky bottom-0 z-20 border-t border-white/10 bg-navy-900 text-white [--focus-ring:var(--color-gold-400)] lg:hidden">
          <div className="container-site flex items-center justify-between gap-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="flex min-w-0 flex-col leading-tight">
              <span className="text-xs font-semibold text-gold-300">{t("quote.total")}</span>
              <span className="truncate font-title text-lg font-extrabold">{quote ? money(quote.total) : t("quote.summaryEmpty")}</span>
            </p>
            <button
              type="button"
              onClick={goToSummary}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-bold text-navy-900 bg-gold-500 hover:bg-gold-400"
            >
              {t("quote.seeSummary")}
            </button>
          </div>
        </div>
      </main>
    </>
  );
};

/** Mensaje de WhatsApp con el plan, los extras y el total (sin datos personales). */
const buildWhatsappUrl = (
  quote: QuoteData,
  t: ReturnType<typeof useTranslation>["t"],
  money: (value: number) => string,
) => {
  const plan = t("quote.waPlan", { plan: t(`plans.${quote.plan.id}.name`) });
  const extras = quote.lines.map((line) =>
    line.id === "translation"
      ? `${t(`extras.${line.id}.name`)} (${t("quote.languagesCount", { count: line.quantity })})`
      : t(`extras.${line.id}.name`),
  );
  const total = money(quote.total);
  // Si el enlace queda muy largo, se listan menos extras y se agrega "y N herramientas más"
  for (let shown = extras.length; shown >= 0; shown--) {
    const hidden = extras.length - shown;
    const items = [plan, ...extras.slice(0, shown)].join(" + ") + (hidden ? ` ${t("quote.waMore", { count: hidden })}` : "");
    const url = whatsappWithMessage(t("quote.waIntro", { items, total }));
    if (url.length <= MAX_WHATSAPP_URL || shown === 0) return url;
  }
  return whatsappWithMessage(t("quote.waIntro", { items: plan, total }));
};
