import { Suspense, lazy, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageSeo } from "@/components/seo/PageSeo";
import { PageHero } from "@/components/sections/PageHero";
import { ChoiceMark, RadioCards, choiceCardClass } from "@/components/sections/quote/ChoiceCards";
import { ClientVerify, ClientVerifyUnavailable, type VerifiedClient } from "@/components/sections/quote/ClientVerify";
import { Counter } from "@/components/sections/quote/Counter";
import { QuoteSummary, SUMMARY_ID } from "@/components/sections/quote/QuoteSummary";
import { Card } from "@/components/ui/Card";
import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { Pill } from "@/components/ui/Pill";
import { Section } from "@/components/ui/Section";
import { PAYMENTS_ENABLED, VERIFY_API_URL } from "@/config/site";
import { useWhatsappUrl, whatsappWithMessage } from "@/config/whatsapp";
import { EXTRAS, OTHER_SERVICES, type ExtraId } from "@/data/extras";
import { PLANS, formatPriceFor, type PlanId } from "@/data/plans";
import {
  MAX_ADDITIONAL,
  MAX_LANGUAGES,
  NO_ADDITIONAL,
  PAGE_OPTIONS,
  SECTION_OPTIONS,
  computeQuote,
  deriveMode,
  discountFor,
  discounted,
  suggestPlan,
  type Additional,
  type ExtrasSelection,
  type Quote as QuoteData,
  type SiteGoal,
} from "@/data/quote";

/** Paso de pago: con el interruptor apagado es null y su código no entra al bundle (ver PAYMENTS_ENABLED). */
const PaymentStep = PAYMENTS_ENABLED ? lazy(() => import("@/features/payments/PaymentStep")) : null;

/** Largo máximo del enlace de WhatsApp; si se pasa, se recorta la lista con "y N herramientas más". */
const MAX_WHATSAPP_URL = 1800;

const stepTitle = "font-title text-h3 font-bold text-navy-900";
const SITE_QUESTIONS_ID = "sitio-existente";

// Estado solo en memoria: el cotizador no guarda nada (sin localStorage, sessionStorage, cookies ni URL).
// Esto incluye el token de verificación del cliente: si se recarga la página, vuelve a verificar.
// Única excepción, solo con los pagos encendidos: justo antes de ir a Wompi, el paso de pago guarda la
// referencia de la orden (ZUM-…) en sessionStorage para la página de resultado (ver pendingReference.ts).
// Nunca nombre, correo, código ni token.
export const Quote = () => {
  const { t, i18n } = useTranslation();
  const genericWhatsappUrl = useWhatsappUrl();
  const [pages, setPages] = useState<number>();
  const [sections, setSections] = useState<number>();
  const [planId, setPlanId] = useState<PlanId | null>(null);
  const [selection, setSelection] = useState<ExtrasSelection>({});
  const [additional, setAdditional] = useState<Additional>(NO_ADDITIONAL);
  // Bloque "Ya tengo un sitio web": hired = ¿contrató a Zumia antes?, goal = qué quiere hacer si no
  const [hasSite, setHasSite] = useState(false);
  const [hired, setHired] = useState<boolean>();
  const [goal, setGoal] = useState<SiteGoal>();
  // Cliente Zumia verificado con el Worker (incluye el token, solo en memoria)
  const [verified, setVerified] = useState<VerifiedClient | null>(null);
  // El Worker de pagos dijo que el token ya no vale: se quita la verificación (vuelve a precio de lista)
  const clearVerification = () => setVerified(null);
  const stepOneRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);

  const suggested = suggestPlan(pages, sections);
  const mode = deriveMode({ hasSite, hired, goal });
  const external = mode === "external";
  const client = mode === "zumiaClient";
  // El descuento de un cliente Zumia solo existe con verificación; sin ella, precio de lista
  const activeVerified = client ? verified : null;
  const quote = computeQuote(mode, planId, selection, additional, activeVerified?.extrasDiscount);
  const discount = discountFor(mode, planId, activeVerified?.extrasDiscount);
  const money = (value: number) => t("extras.price", { price: formatPriceFor(value, i18n.language) });
  // En rediseño el precio y el plazo son "desde"
  const from = (value: number) => (mode === "redesign" ? t("quote.fromAmount", { amount: money(value) }) : money(value));
  const days = (count: number) => t(mode === "redesign" ? "quote.daysFrom" : "quote.planDays", { count });

  // Cambiar una respuesta vuelve a sugerir plan (y reemplaza la elección manual)
  const answerPages = (value: number) => {
    setPages(value);
    setPlanId(suggestPlan(value, sections));
  };
  const answerSections = (value: number) => {
    setSections(value);
    setPlanId(suggestPlan(pages, value));
  };

  // Modo externo: no hay extensión, plan ni adicionales; se borra lo que ya no aplica
  const answerHired = (value: boolean) => {
    setHired(value);
    setGoal(undefined); // la segunda pregunta solo existe si la respuesta es "No"
    setVerified(null);
  };
  const answerGoal = (value: SiteGoal) => {
    setGoal(value);
    if (value === "external") {
      setPages(undefined);
      setSections(undefined);
      setPlanId(null);
      setAdditional(NO_ADDITIONAL);
    }
  };
  // Cerrar el bloque borra sus respuestas
  const toggleSite = () => {
    // Al abrirlo se ocultan las dos preguntas de extensión: se borran sus respuestas
    if (!hasSite) {
      setPages(undefined);
      setSections(undefined);
    }
    setHasSite((open) => !open);
    setHired(undefined);
    setGoal(undefined);
    setVerified(null);
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
    setAdditional(NO_ADDITIONAL);
    setHasSite(false);
    setHired(undefined);
    setGoal(undefined);
    setVerified(null);
    stepOneRef.current?.focus();
  };

  const goToSummary = () => {
    const smooth = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
    document.getElementById(SUMMARY_ID)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    summaryRef.current?.focus({ preventScroll: true });
  };

  const whatsappUrl = quote ? buildWhatsappUrl(quote, t, money, from, activeVerified?.plan) : genericWhatsappUrl;
  const summaryEmpty = t(
    external ? "quote.summaryEmptyTools" : mode === "zumiaClient" ? "quote.summaryEmptyClient" : "quote.summaryEmpty",
  );

  return (
    <>
      <PageSeo title={t("seo.quoteTitle")} description={t("seo.quoteDescription")} />
      {/* "relative": el patrón de fondo de todas las secciones se alinea con <main> */}
      <main className="relative">
        <PageHero id="cotizador-titulo" eyebrow={t("quote.eyebrow")} titleKey="quote.title" lead={t("quote.lead")} />

        <Section tone="cream" decoration={<GeometricPattern tone="light" />}>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_25rem]">
            <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
              {/* 1. Selector de necesidad */}
              <Card className="flex flex-col gap-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 ref={stepOneRef} tabIndex={-1} className={`${stepTitle} outline-none`}>
                    {t("quote.needTitle")}
                  </h2>
                  <button
                    type="button"
                    onClick={toggleSite}
                    aria-pressed={hasSite}
                    aria-expanded={hasSite}
                    aria-controls={SITE_QUESTIONS_ID}
                    className={`w-fit shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:[outline-color:var(--focus-ring)] ${
                      hasSite ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-navy-900 ring-navy-900/25 hover:bg-gold-100"
                    }`}
                  >
                    {t("quote.haveSite")}
                  </button>
                </div>
                {hasSite ? (
                  external && (
                    <p className="rounded-2xl bg-gold-50 px-4 py-3 text-sm leading-relaxed text-navy-800 ring-1 ring-gold-700/20">
                      {t("quote.noteExternal")}
                    </p>
                  )
                ) : (
                  <>
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
                  </>
                )}
                <div id={SITE_QUESTIONS_ID} hidden={!hasSite} className="flex flex-col gap-8">
                  {hasSite && (
                    <>
                      <RadioCards
                        name="contrato-previo"
                        legend={t("quote.hiredLegend")}
                        className="sm:grid-cols-2"
                        options={[
                          { value: "yes", label: t("quote.yes") },
                          { value: "no", label: t("quote.no") },
                        ]}
                        value={hired === undefined ? undefined : hired ? "yes" : "no"}
                        onChange={(value) => answerHired(value === "yes")}
                      />
                      {hired === false && (
                        <RadioCards
                          name="objetivo-sitio"
                          legend={t("quote.goalLegend")}
                          className="sm:grid-cols-2"
                          options={[
                            { value: "redesign" as SiteGoal, label: t("quote.goalRedesign") },
                            { value: "external" as SiteGoal, label: t("quote.goalExternal") },
                          ]}
                          value={goal}
                          onChange={answerGoal}
                        />
                      )}
                    </>
                  )}
                </div>
              </Card>

              {/* 2. Cliente Zumia: el descuento sale solo de la verificación (no del plan elegido a mano) */}
              {client && (VERIFY_API_URL ? <ClientVerify verified={activeVerified} onVerified={setVerified} /> : <ClientVerifyUnavailable />)}

              {/* 2. Plan (sugerido, pero se puede cambiar); no aplica en modo externo ni de cliente */}
              {!external && !client && (
                <Card className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <h2 className={stepTitle}>
                      {t("quote.planTitle")}
                      {hasSite && <span className="ml-2 text-base font-semibold text-navy-600">{t("quote.planNewOnly")}</span>}
                    </h2>
                    {!hasSite && (
                      <p className="text-sm leading-relaxed text-navy-600">{suggested ? t("quote.suggestionNote") : t("quote.planHint")}</p>
                    )}
                  </div>
                  {/* Con "conservar mi sitio" las opciones se ven atenuadas y no se pueden usar (inert: sin clic ni teclado);
                      se conserva el plan que ya estaba elegido, que da el descuento */}
                  <div className={hasSite ? "pointer-events-none opacity-50" : undefined} {...(hasSite ? ({ inert: "" } as object) : {})}>
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
                          <span className="block">{t("quote.planDays", { count: plan.days })}</span>
                        </>
                      ),
                    }))}
                    value={planId}
                    onChange={setPlanId}
                  />
                  </div>
                </Card>
              )}

              {/* 3. Herramientas extra (precios y días de extras.ts) */}
              <Card className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h2 className={stepTitle}>{t("quote.extrasTitle")}</h2>
                  <p className="text-sm leading-relaxed text-navy-600">
                    {t(client && !activeVerified ? "quote.extrasLeadClient" : "quote.extrasLead")}
                  </p>
                </div>
                {activeVerified ? (
                  <p className="w-fit max-w-full rounded-2xl bg-gold-100 px-4 py-2 text-sm font-semibold text-gold-800 ring-1 ring-gold-700/20">
                    {t("quote.verify.extrasBanner", { plan: t(`plans.${activeVerified.plan}.name`), pct: activeVerified.extrasDiscount })}
                  </p>
                ) : (
                  !external &&
                  !client &&
                  planId &&
                  discount > 0 && (
                    <p className="w-fit max-w-full rounded-2xl bg-gold-100 px-4 py-2 text-sm font-semibold text-gold-800 ring-1 ring-gold-700/20">
                      {t("quote.extrasDiscount", { plan: t(`plans.${planId}.name`), pct: discount })}
                    </p>
                  )
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

                {/* Otros: subpáginas y secciones adicionales (no aplican en modo externo) */}
                {!external && (
                  <div className="flex flex-col gap-4 border-t border-navy-900/10 pt-6">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-title text-lg font-bold text-navy-900">{t("quote.otherTitle")}</h3>
                      <p className="text-sm leading-relaxed text-navy-600">{t("quote.otherLead")}</p>
                    </div>
                    <Counter
                      id="adicional-subpaginas"
                      label={t("quote.counterSubpages")}
                      detail={t("quote.counterUnit", {
                        price: money(discounted(OTHER_SERVICES.additional.subpagePrice, discount)),
                        unit: t("quote.unitSubpage"),
                      })}
                      value={additional.subpages}
                      max={MAX_ADDITIONAL}
                      onChange={(value) => setAdditional((current) => ({ ...current, subpages: value }))}
                    />
                    <Counter
                      id="adicional-secciones"
                      label={t("quote.counterSections")}
                      detail={t("quote.counterUnit", {
                        price: money(discounted(OTHER_SERVICES.additional.sectionPrice, discount)),
                        unit: t("quote.unitSection"),
                      })}
                      value={additional.sections}
                      max={MAX_ADDITIONAL}
                      onChange={(value) => setAdditional((current) => ({ ...current, sections: value }))}
                    />
                  </div>
                )}
              </Card>

            </div>

            {/* 4. Resumen: tarjeta fija al lado en escritorio; en móvil y tableta, al final, con la barra de abajo.
                La barra de scroll vive en el contenedor interno: queda dentro de las esquinas redondeadas. */}
            <aside
              id={SUMMARY_ID}
              aria-labelledby="resumen-titulo"
              className="scroll-mt-20 md:scroll-mt-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:overflow-hidden lg:rounded-card lg:bg-navy-900"
            >
              <div className="lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-color:rgb(255_255_255/0.35)_transparent] lg:[scrollbar-width:thin]">
                <QuoteSummary ref={summaryRef} quote={quote} mode={mode} money={money} from={from} days={days} whatsappUrl={whatsappUrl} onReset={reset} />
              </div>
            </aside>

            {/* Pago del anticipo: solo existe con VITE_PAYMENTS_ENABLED="true" (ver PAYMENTS_ENABLED).
                En móvil y tableta va después del estimado; en escritorio, al pie de la columna izquierda,
                con el estimado fijo al lado (el resumen ocupa las dos filas de la derecha). */}
            {PaymentStep && (
              <Suspense fallback={null}>
                <PaymentStep
                  mode={mode}
                  quote={quote}
                  planId={planId}
                  extras={selection}
                  additional={additional}
                  verified={activeVerified}
                  discountPct={discount}
                  money={money}
                  onVerificationInvalid={clearVerification}
                  className="min-w-0 lg:col-start-1 lg:row-start-2"
                />
              </Suspense>
            )}
          </div>
        </Section>

        {/* Aviso educado para lectores de pantalla: solo el total y el plazo, no cada línea */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {quote ? t("quote.live", { total: from(quote.total), days: days(quote.days) }) : ""}
        </p>

        {/* Barra fija en móvil y tableta: se detiene al final de la página, encima del pie */}
        <div className="sticky bottom-0 z-20 border-t border-white/10 bg-navy-900 text-white [--focus-ring:var(--color-gold-400)] lg:hidden">
          <div className="container-site flex items-center justify-between gap-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="flex min-w-0 flex-col leading-tight">
              <span className="text-xs font-semibold text-gold-300">{t("quote.total")}</span>
              <span className="truncate font-title text-lg font-extrabold">{quote ? from(quote.total) : summaryEmpty}</span>
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

/** Mensaje de WhatsApp con el modo, el plan, las herramientas, los adicionales y el total (sin datos personales). */
const buildWhatsappUrl = (
  quote: QuoteData,
  t: ReturnType<typeof useTranslation>["t"],
  money: (value: number) => string,
  from: (value: number) => string,
  verifiedPlan?: PlanId,
) => {
  const planName = quote.plan ? t(`plans.${quote.plan.id}.name`) : "";
  // Nunca van el correo, el token ni el nombre del proyecto: solo el plan, y solo si está verificado
  const base =
    quote.mode === "redesign"
      ? t("quote.waRedesign")
      : quote.mode === "zumiaClient"
        ? verifiedPlan
          ? t("quote.waClientPlan", { plan: t(`plans.${verifiedPlan}.name`) })
          : t("quote.waClient")
        : quote.mode === "external"
          ? t("quote.waExternal", { surcharge: money(quote.surcharge) })
          : t("quote.waPlan", { plan: planName });
  const additions = quote.additionalLines.map((line) => t(`quote.waAdditional_${line.kind}`, { count: line.quantity }));
  const extras = quote.lines.map((line) =>
    line.id === "translation"
      ? `${t(`extras.${line.id}.name`)} (${t("quote.languagesCount", { count: line.quantity })})`
      : t(`extras.${line.id}.name`),
  );
  const total = from(quote.total);
  const head = [base, ...additions];
  // Si el enlace queda muy largo, se listan menos extras y se agrega "y N herramientas más"
  for (let shown = extras.length; shown >= 0; shown--) {
    const hidden = extras.length - shown;
    const items = [...head, ...extras.slice(0, shown)].join(" + ") + (hidden ? ` ${t("quote.waMore", { count: hidden })}` : "");
    const url = whatsappWithMessage(t("quote.waIntro", { items, total }));
    if (url.length <= MAX_WHATSAPP_URL || shown === 0) return url;
  }
  return whatsappWithMessage(t("quote.waIntro", { items: base, total }));
};
