// Página /payment/result/: adonde vuelve el cliente desde Wompi (redirect-url + ?id=<transacción>).
// Solo existe con PAYMENTS_ENABLED (ruta y prerender condicionados; ver App.tsx y vite.config.ts).
// Privacidad: noindex,nofollow, referrer no-referrer, sin analítica ni recursos de terceros, y nunca se escribe en
// consola el id ni la referencia. El estado lo da el Worker (/pay/status); aquí nunca se confirma un pago por la URL.

import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Trans, useTranslation } from "react-i18next";

import { Button, ButtonLink } from "@/components/ui/Button";
import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { PATHS } from "@/config/paths";
import { EMAIL, PHONE_DISPLAY, SITE_URL, WHATSAPP_URL } from "@/config/site";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { getPayStatus } from "@/lib/payApi";

import { clearPendingReference, readPendingReference } from "./pendingReference";
import {
  POLL_INTERVAL_MS,
  RESULT_PATH,
  isFinalView,
  nextAfterPoll,
  readResultInputs,
  resultMessageKey,
  statusQueryFor,
  viewForError,
  viewForStatus,
  type ResultInputs,
  type ResultView,
} from "./result";

const isPrerender = () =>
  typeof window === "undefined" || (window as { __PRERENDER_INJECTED?: { prerender?: boolean } }).__PRERENDER_INJECTED?.prerender === true;

const linkClass = "font-semibold text-white underline underline-offset-4 hover:text-gold-300";

const PaymentResult = () => {
  const { t } = useTranslation();
  const localizePath = useLocalizedPath();
  // En el HTML del prerender no hay datos: se muestra "consultando" y no se llama al Worker
  const [inputs] = useState<ResultInputs>(() =>
    isPrerender() ? { reference: null, id: null } : readResultInputs(window.location.search, readPendingReference()),
  );
  const [view, setView] = useState<ResultView>(() => (isPrerender() || statusQueryFor(inputs) ? "checking" : "unknown"));
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Foco en el encabezado al cargar (sin redirecciones automáticas)
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    const query = statusQueryFor(inputs);
    if (isPrerender() || !query) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = Date.now();
    const run = async () => {
      const result = await getPayStatus(query);
      if (cancelled) return;
      const current = result.status === "ok" ? viewForStatus(result.data.status) : viewForError(result.error);
      const next = nextAfterPoll(current, Date.now() - start);
      setView(next.view);
      if (isFinalView(next.view)) clearPendingReference();
      if (next.poll) timer = setTimeout(() => void run(), POLL_INTERVAL_MS);
    };
    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [inputs, attempt]);

  const retry = () => {
    setView("checking");
    setAttempt((value) => value + 1);
  };

  const copyReference = () => {
    if (!inputs.reference || !navigator.clipboard) return;
    navigator.clipboard.writeText(inputs.reference).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  const base = resultMessageKey(view);
  const busy = view === "checking" || view === "pending";
  const failed = view === "declined" || view === "error" || view === "voided" || view === "expired";

  return (
    <>
      <Helmet defer={false}>
        <title>{t("payResult.seoTitle")}</title>
        <meta name="description" content={t("payResult.seoDescription")} />
        <link rel="canonical" href={`${SITE_URL}${RESULT_PATH}`} />
        <meta name="robots" content="noindex,nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <main className="relative isolate flex min-h-[70dvh] items-center overflow-hidden bg-navy-950 font-body text-white [--focus-ring:var(--color-gold-400)]">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(45rem_30rem_at_50%_0%,rgba(212,143,64,0.22),transparent_65%),linear-gradient(160deg,#13173D,#0B0E26)]"
        />
        <GeometricPattern tone="dark" />

        <div className="container-site flex flex-col items-center gap-7 py-20 text-center md:py-28">
          <h1 ref={headingRef} tabIndex={-1} className="font-title text-h2 font-extrabold tracking-tight text-balance outline-none">
            {t(`${base}.title`)}
          </h1>
          {/* Mensaje del estado: se anuncia con calma cuando cambia (consultando → confirmado, etc.) */}
          <p aria-live="polite" aria-busy={busy} className="max-w-xl text-lead text-pretty text-white/80">
            {t(`${base}.body`, { email: EMAIL })}
          </p>

          {inputs.reference && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-white/70">{t("payResult.referenceLabel")}</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <code className="rounded-xl bg-white/10 px-3 py-2 font-mono text-sm break-all text-white ring-1 ring-white/20">{inputs.reference}</code>
                <Button variant="outline-light" onClick={copyReference}>
                  {t("payResult.copy")}
                </Button>
              </div>
              <p role="status" className="min-h-5 text-sm text-gold-300">
                {copied ? t("payResult.copied") : ""}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {view === "unavailable" && (
              <Button size="lg" onClick={retry}>
                {t("payResult.retry")}
              </Button>
            )}
            {failed && (
              <ButtonLink to={localizePath(PATHS.quote)} size="lg">
                {t("payResult.backToQuote")}
              </ButtonLink>
            )}
            {(view === "approved" || view === "pendingTimeout" || view === "unknown") && (
              <ButtonLink to={localizePath(PATHS.home)} size="lg" variant={view === "approved" ? "primary" : "outline-light"}>
                {t("payResult.home")}
              </ButtonLink>
            )}
          </div>

          {view !== "checking" && view !== "pending" && (
            <p className="max-w-xl text-sm text-white/75">
              <Trans
                i18nKey="payResult.contact"
                values={{ email: EMAIL, phone: PHONE_DISPLAY }}
                components={{
                  1: <a href={`mailto:${EMAIL}`} className={linkClass} />,
                  2: <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={linkClass} />,
                }}
              />
            </p>
          )}
        </div>
      </main>
    </>
  );
};

export default PaymentResult;
