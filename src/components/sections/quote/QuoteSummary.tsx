import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WhatsAppIcon } from "@/components/ui/icons";
import { AGENDA_ID, PATHS } from "@/config/paths";
import { BOOKING_URL } from "@/config/site";
import type { Quote } from "@/data/quote";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";

export const SUMMARY_ID = "resumen";

/** Resumen del estimado: plan, extras con descuento, total, anticipo, plazo y acciones. */
export const QuoteSummary = forwardRef<
  HTMLHeadingElement,
  { quote: Quote | null; money: (value: number) => string; whatsappUrl: string; onReset: () => void }
>(({ quote, money, whatsappUrl, onReset }, headingRef) => {
  const { t } = useTranslation();
  const localizePath = useLocalizedPath();
  const row = "flex items-baseline justify-between gap-4";

  return (
    <Card tone="dark" className="flex flex-col gap-6">
      <h2 id="resumen-titulo" ref={headingRef} tabIndex={-1} className="font-title text-h3 font-bold text-white outline-none">
        {t("quote.summaryTitle")}
      </h2>

      {quote ? (
        <>
          <ul className="flex flex-col gap-3 text-sm">
            <li className={row}>
              <span className="font-semibold text-white">{t("quote.planLine", { plan: t(`plans.${quote.plan.id}.name`) })}</span>
              <span className="shrink-0 font-semibold whitespace-nowrap text-white">{money(quote.plan.price)}</span>
            </li>
            {quote.lines.map((line) => (
              <li key={line.id} className={row}>
                <span className="min-w-0 text-white/80">
                  {t(`extras.${line.id}.name`)}
                  {line.id === "translation" && ` (${t("quote.languagesCount", { count: line.quantity })})`}
                </span>
                <span className="shrink-0 whitespace-nowrap text-white/80">{money(line.price)}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-3 border-t border-white/15 pt-5">
            <div className={row}>
              <dt className="font-semibold text-gold-300">{t("quote.total")}</dt>
              <dd className="text-right font-title text-2xl font-extrabold whitespace-nowrap text-white">{money(quote.total)}</dd>
            </div>
            <div className={row}>
              <dt className="text-sm text-white/80">{t("quote.deposit")}</dt>
              <dd className="text-sm font-semibold whitespace-nowrap text-white">{money(quote.deposit)}</dd>
            </div>
            <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1">
              <dt className="text-sm text-white/80">{t("quote.delivery")}</dt>
              <dd className="text-right text-sm font-semibold text-white">{t("quote.planDays", { count: quote.days })}</dd>
              <dd className="col-span-2 text-xs text-white/70">{t("quote.deliveryNote")}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="text-white/80">{t("quote.summaryEmpty")}</p>
      )}

      <p className="text-xs leading-relaxed text-white/70">{t("quote.disclaimer")}</p>

      <div className="flex flex-col gap-3 border-t border-white/15 pt-5">
        <p className="font-semibold text-white">{t("quote.doubts")}</p>
        <ButtonAnchor href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full">
          <WhatsAppIcon className="size-5" />
          {t("quote.whatsappCta")}
        </ButtonAnchor>
        {BOOKING_URL && (
          <ButtonLink to={`${localizePath(PATHS.contact)}#${AGENDA_ID}`} variant="outline-light" className="w-full">
            {t("booking.scheduleCta")}
          </ButtonLink>
        )}
        <button type="button" onClick={onReset} className="mx-auto mt-1 rounded-full px-3 py-2 text-sm font-semibold text-white/80 underline underline-offset-4 hover:text-gold-300">
          {t("quote.reset")}
        </button>
      </div>
    </Card>
  );
});
QuoteSummary.displayName = "QuoteSummary";
