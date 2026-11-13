// Paso de pago del anticipo con Wompi. Se carga aparte (React.lazy) SOLO si PAYMENTS_ENABLED es true (ver Quote.tsx):
// con el interruptor apagado este archivo no entra al bundle.
//
// Reglas: el Worker es la autoridad de los montos (aquí nunca se envía un monto); el nombre, el correo y el código
// viven solo en el estado de React (nada en almacenamiento ni en consola); lo único que se guarda es la referencia
// ZUM-… en sessionStorage justo antes de ir a Wompi; a Wompi solo van los 7 campos de buildCheckoutUrl.

import { useEffect, useId, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { VerifiedClient } from "@/components/sections/quote/ClientVerify";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PATHS } from "@/config/paths";
import type { PlanId } from "@/data/plans";
import { MIN_TOTAL, paymentBreakdown, type Additional, type ExtrasSelection, type Quote, type QuoteMode } from "@/data/quote";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { checkCode, createOrder, type PaySelection, type PayVerification } from "@/lib/payApi";

import { buildCheckoutUrl } from "./checkout";
import {
  amountMatches,
  codeErrorKey,
  floorNotice,
  initialPayState,
  isBusy,
  isPanelOpen,
  normalizeOrderForm,
  orderErrorKey,
  payAvailability,
  payReducer,
  submitBlockReason,
  validateOrderForm,
  type OrderForm,
} from "./flow";
import { savePendingReference } from "./pendingReference";

export type PaymentStepProps = {
  mode: QuoteMode;
  quote: Quote | null;
  planId: PlanId | null;
  extras: ExtrasSelection;
  additional: Additional;
  /** Cliente Zumia verificado (token solo en memoria, D-055); null = sin verificar */
  verified: VerifiedClient | null;
  /** % de descuento del plan o del cliente verificado que ya aplica el cotizador (solo para mostrarlo) */
  discountPct: number;
  /** Formato de pesos del cotizador ("$590.000 COP") */
  money: (value: number) => string;
  /** El Worker dijo que el token de verificación ya no vale: el cotizador vuelve a precio de lista */
  onVerificationInvalid: () => void;
  /** Ubicación en la grilla del cotizador (sin contenedor extra: si no hay nada que mostrar, no ocupa espacio) */
  className?: string;
};

const stepTitle = "font-title text-h3 font-bold text-navy-900";
const inputClass =
  "w-full rounded-xl bg-white px-4 py-3 text-navy-900 ring-1 ring-navy-900/25 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:[outline-color:var(--focus-ring)] disabled:bg-cream-50 disabled:text-navy-600";
const linkClass = "font-semibold text-navy-900 underline underline-offset-2 hover:text-gold-800";
const noticeClass = "rounded-2xl bg-gold-100 px-4 py-3 text-sm leading-relaxed text-gold-800 ring-1 ring-gold-700/20";
const row = "flex items-baseline justify-between gap-4";

const isPrerender = () =>
  typeof window !== "undefined" && (window as { __PRERENDER_INJECTED?: { prerender?: boolean } }).__PRERENDER_INJECTED?.prerender === true;

/** Enlace a un documento legal en pestaña nueva, con aviso para lectores de pantalla. */
const NewTabLink = ({ to, newTab, children }: { to: string; newTab: string; children?: ReactNode }) => (
  <Link to={to} target="_blank" rel="noopener noreferrer" className={linkClass}>
    {children}
    <span className="sr-only"> {newTab}</span>
  </Link>
);

const PaymentStep = ({ mode, quote, planId, extras, additional, verified, discountPct, money, onVerificationInvalid, className = "" }: PaymentStepProps) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "en" ? "en" : "es";
  const localizePath = useLocalizedPath();
  const [state, dispatch] = useReducer(payReducer, initialPayState);
  const [codeInput, setCodeInput] = useState("");
  const [form, setForm] = useState<OrderForm>({ name: "", email: "", acceptTerms: false });
  const [showFormErrors, setShowFormErrors] = useState(false);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const focusPanel = useRef(false);
  const mounted = useRef(true);
  const id = useId();
  const ids = {
    panel: `${id}-panel`,
    heading: `${id}-heading`,
    code: `${id}-code`,
    codeMsg: `${id}-code-msg`,
    name: `${id}-name`,
    nameErr: `${id}-name-err`,
    email: `${id}-email`,
    emailErr: `${id}-email-err`,
    terms: `${id}-terms`,
    reason: `${id}-reason`,
  };

  const selection: PaySelection = useMemo(() => ({ mode, planId, extras, additional }), [mode, planId, extras, additional]);
  const verification: PayVerification = verified ? { token: verified.token, projectId: verified.projectId } : null;
  // Cambia si cambia algo que mueve el precio: la selección o la verificación
  const selectionKey = `${JSON.stringify(selection)}|${verified?.projectId ?? ""}|${verified?.extrasDiscount ?? ""}`;
  const keyRef = useRef(selectionKey);
  // Cada petición lleva un número; una respuesta de una petición vieja (selección distinta) se descarta
  const requestRef = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (keyRef.current === selectionKey) return;
    keyRef.current = selectionKey;
    requestRef.current++;
    dispatch({ type: "SELECTION_CHANGED" });
  }, [selectionKey]);

  // Volver desde Wompi con "Atrás": el navegador puede restaurar la página tal como quedó (redirecting)
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) dispatch({ type: "PAGE_RESTORED" });
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const panelOpen = isPanelOpen(state);
  useEffect(() => {
    if (panelOpen && focusPanel.current) {
      focusPanel.current = false;
      panelHeadingRef.current?.focus();
    }
  }, [panelOpen]);

  // Nada que pagar todavía (o HTML estático del prerender): no se muestra nada
  if (!quote || isPrerender()) return null;

  const availability = payAvailability(mode, verified !== null, quote.total);

  if (availability.kind === "blocked") {
    return (
      <Card className={`flex flex-col gap-3 ${className}`}>
        <h2 className={stepTitle}>{t("quote.pay.title")}</h2>
        <p role="status" className="text-sm leading-relaxed text-navy-700">
          {t(`quote.pay.blocked.${availability.reason}`, { minimum: money(MIN_TOTAL) })}
        </p>
      </Card>
    );
  }

  // Desglose: el del Worker si existe (tras aplicar un código o si cambió el monto); si no, el mismo cálculo
  // que ya muestra el cotizador (solo para mostrar: el Worker recalcula todo al crear la orden)
  const shown = state.breakdown ?? paymentBreakdown(quote);
  const floor = floorNotice(shown, lang);
  const busy = isBusy(state);
  const formErrors = validateOrderForm(form);
  const nameError = showFormErrors ? formErrors.name : undefined;
  const emailError = showFormErrors ? formErrors.email : undefined;
  const reason = submitBlockReason(state, form);

  const toggle = () => {
    if (panelOpen) dispatch({ type: "CLOSE_PANEL" });
    else {
      focusPanel.current = true;
      dispatch({ type: "OPEN_PANEL" });
    }
  };

  const applyCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code || state.code || busy) return;
    const request = ++requestRef.current;
    dispatch({ type: "CODE_SUBMIT" });
    const result = await checkCode({ code, selection, verification });
    if (!mounted.current || request !== requestRef.current) return;
    if (result.status === "ok") {
      dispatch({ type: "CODE_OK", code: result.data.code, breakdown: result.data.breakdown });
      return;
    }
    dispatch({ type: "CODE_FAIL", error: result.error });
    if (result.error === "invalid_token") onVerificationInvalid();
  };

  const removeCode = () => {
    dispatch({ type: "CODE_REMOVE" });
    setCodeInput("");
  };

  const submitOrder = async () => {
    setShowFormErrors(true);
    if (formErrors.name) return nameRef.current?.focus();
    if (formErrors.email) return emailRef.current?.focus();
    if (reason !== null) return;
    const f = normalizeOrderForm(form);
    const request = ++requestRef.current;
    const shownCents = shown.amountInCents;
    dispatch({ type: "ORDER_SUBMIT" });
    const result = await createOrder({ selection, verification, code: state.code?.code ?? null, name: f.name, email: f.email, acceptTerms: true, lang });
    if (!mounted.current) return;
    const sameSelection = request === requestRef.current;
    if (result.status === "error") {
      dispatch({ type: "ORDER_FAIL", error: result.error });
      if (result.error === "invalid_token") onVerificationInvalid();
      return;
    }
    // Nunca se cobra un monto distinto del que vio el cliente
    if (!sameSelection || !amountMatches(shownCents, result.data)) {
      dispatch({ type: "ORDER_FAIL", error: "amount_changed", breakdown: sameSelection ? result.data.breakdown : undefined });
      return;
    }
    const url = buildCheckoutUrl(result.data);
    if (!url) {
      dispatch({ type: "ORDER_FAIL", error: "checkout" });
      return;
    }
    dispatch({ type: "ORDER_OK", reference: result.data.reference });
    // Solo la referencia (para la página de resultado). Si el navegador no deja guardarla, el pago sigue igual:
    // el Worker lo confirma con el webhook de Wompi.
    savePendingReference(result.data.reference);
    window.location.assign(url);
  };

  const discountLine =
    discountPct > 0 && mode === "normal"
      ? t("quote.pay.planDiscount", { pct: discountPct })
      : discountPct > 0 && mode === "zumiaClient" && verified
        ? t("quote.pay.clientDiscount", { pct: discountPct })
        : null;

  return (
    <Card className={`flex flex-col gap-6 ${className}`}>
      <div className="flex flex-col gap-2">
        <h2 className={stepTitle}>{t("quote.pay.title")}</h2>
        <p className="text-sm leading-relaxed text-navy-600">{t("quote.pay.lead")}</p>
      </div>

      <div>
        <Button variant={panelOpen ? "outline" : "secondary"} onClick={toggle} disabled={busy} aria-expanded={panelOpen} aria-controls={ids.panel}>
          {t("quote.pay.toggle")}
        </Button>
      </div>

      {state.notice && !panelOpen && (
        <p role="status" className="text-sm leading-relaxed text-navy-700">
          {t(`quote.pay.${state.notice}`)}
        </p>
      )}

      {panelOpen && (
        <section id={ids.panel} aria-labelledby={ids.heading} className="flex flex-col gap-6 border-t border-navy-900/10 pt-6">
          <h3 id={ids.heading} ref={panelHeadingRef} tabIndex={-1} className="font-title text-lg font-bold text-navy-900 outline-none">
            {t("quote.pay.breakdownTitle")}
          </h3>

          {/* Desglose: se anuncia con calma cuando cambia (código aplicado, quitado o monto nuevo) */}
          <div aria-live="polite" className="flex flex-col gap-3">
            <dl className="flex flex-col gap-2 text-sm">
              <div className={row}>
                <dt className="text-navy-700">{t("quote.pay.subtotal")}</dt>
                <dd className="font-semibold whitespace-nowrap text-navy-900">{money(shown.subtotal)}</dd>
              </div>
              {state.code && shown.discountApplied > 0 && (
                <div className={row}>
                  <dt className="text-navy-700">{t("quote.pay.codeDiscount", { code: state.code.code })}</dt>
                  <dd className="font-semibold whitespace-nowrap text-navy-900">−{money(shown.discountApplied)}</dd>
                </div>
              )}
              <div className={`${row} border-t border-navy-900/10 pt-2`}>
                <dt className="font-semibold text-navy-900">{t("quote.pay.total")}</dt>
                <dd className="font-semibold whitespace-nowrap text-navy-900">{money(shown.total)}</dd>
              </div>
              <div className={row}>
                <dt className="font-semibold text-navy-900">{t("quote.pay.deposit")}</dt>
                <dd className="font-title text-xl font-extrabold whitespace-nowrap text-navy-900">{money(shown.deposit)}</dd>
              </div>
              <div className={row}>
                <dt className="text-navy-700">{t("quote.pay.balance")}</dt>
                <dd className="whitespace-nowrap text-navy-700">{money(shown.balance)}</dd>
              </div>
            </dl>
            {discountLine && <p className="text-xs leading-relaxed text-navy-600">{discountLine}</p>}
            {availability.listPrice && <p className={noticeClass}>{t("quote.pay.unverifiedNotice")}</p>}
            {floor && <p className={noticeClass}>{t(floor.key, floor.values)}</p>}
            {state.notice && (
              <p role="status" className="text-sm leading-relaxed text-navy-700">
                {t(`quote.pay.${state.notice}`)}
              </p>
            )}
          </div>

          {/* Código de descuento: uno por pago */}
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void applyCode();
            }}
          >
            <label htmlFor={ids.code} className="font-semibold text-navy-900">
              {t("quote.pay.codeLabel")}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id={ids.code}
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={32}
                value={state.code ? state.code.code : codeInput}
                onChange={(event) => setCodeInput(event.target.value)}
                disabled={busy || state.code !== null}
                aria-invalid={state.codeError !== null}
                aria-describedby={ids.codeMsg}
                className={`${inputClass} uppercase`}
              />
              {state.code ? (
                <Button variant="outline" onClick={removeCode} disabled={busy} className="shrink-0">
                  {t("quote.pay.codeRemove")}
                </Button>
              ) : (
                <Button type="submit" variant="outline" disabled={busy || codeInput.trim() === ""} className="shrink-0">
                  {t(state.step === "code-checking" ? "quote.pay.codeChecking" : "quote.pay.codeApply")}
                </Button>
              )}
            </div>
            <div id={ids.codeMsg}>
              {state.step === "code-checking" ? (
                <p role="status" className="text-sm text-navy-700">
                  {t("quote.pay.codeChecking")}
                </p>
              ) : state.codeError ? (
                <p role="alert" className="text-sm font-semibold text-red-700">
                  {t(codeErrorKey(state.codeError), { minimum: money(MIN_TOTAL) })}
                </p>
              ) : state.code ? (
                <p role="status" className="text-sm font-semibold text-navy-900">
                  {t("quote.pay.codeApplied", { code: state.code.code, amount: money(shown.discountApplied) })}
                </p>
              ) : (
                <p className="text-sm text-navy-600">{t("quote.pay.codeOne")}</p>
              )}
            </div>
          </form>

          {/* Datos de quien paga y aceptación */}
          <form
            noValidate
            aria-busy={busy}
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitOrder();
            }}
          >
            <h3 className="font-title text-lg font-bold text-navy-900">{t("quote.pay.payerTitle")}</h3>
            <div className="flex flex-col gap-2">
              <label htmlFor={ids.name} className="font-semibold text-navy-900">
                {t("quote.pay.nameLabel")}
              </label>
              <input
                ref={nameRef}
                id={ids.name}
                type="text"
                autoComplete="name"
                required
                maxLength={200}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                disabled={busy}
                aria-invalid={nameError !== undefined}
                aria-describedby={nameError ? ids.nameErr : undefined}
                className={inputClass}
              />
              {nameError && (
                <p id={ids.nameErr} className="text-sm font-semibold text-red-700">
                  {t(nameError === "tooLong" ? "quote.pay.nameTooLong" : "quote.pay.nameRequired")}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor={ids.email} className="font-semibold text-navy-900">
                {t("quote.pay.emailLabel")}
              </label>
              <input
                ref={emailRef}
                id={ids.email}
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                disabled={busy}
                aria-invalid={emailError !== undefined}
                aria-describedby={emailError ? ids.emailErr : undefined}
                className={inputClass}
              />
              {emailError && (
                <p id={ids.emailErr} className="text-sm font-semibold text-red-700">
                  {t("quote.pay.emailInvalid")}
                </p>
              )}
            </div>
            <label htmlFor={ids.terms} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-navy-800">
              <input
                id={ids.terms}
                type="checkbox"
                required
                checked={form.acceptTerms}
                onChange={(event) => setForm((current) => ({ ...current, acceptTerms: event.target.checked }))}
                disabled={busy}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-gold-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:[outline-color:var(--focus-ring)]"
              />
              <span>
                <Trans
                  i18nKey="quote.pay.consent"
                  components={{
                    1: <NewTabLink to={`${localizePath(PATHS.terms)}#terms-s7`} newTab={t("quote.pay.newTab")} />,
                    2: <NewTabLink to={`${localizePath(PATHS.privacy)}#privacy-s14`} newTab={t("quote.pay.newTab")} />,
                  }}
                />
              </span>
            </label>

            {state.step === "error" && state.error && (
              <div className="flex flex-col gap-3">
                <p role="alert" className="text-sm font-semibold text-red-700">
                  {t(orderErrorKey(state.error), { minimum: money(MIN_TOTAL) })}
                </p>
                <div>
                  <Button variant="outline" onClick={() => dispatch({ type: "RETRY" })}>
                    {t("quote.pay.retry")}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-sm font-semibold text-navy-900">{t("quote.pay.depositNotice", { amount: money(shown.deposit) })}</p>
            <div className="flex flex-col gap-2">
              <Button type="submit" size="lg" disabled={reason !== null} aria-busy={busy} aria-describedby={reason ? ids.reason : undefined} className="w-full sm:w-fit">
                {t(state.step === "redirecting" ? "quote.pay.redirecting" : state.step === "creating-order" ? "quote.pay.creating" : "quote.pay.submit")}
              </Button>
              {state.step === "creating-order" || state.step === "redirecting" ? (
                <p id={ids.reason} role="status" className="text-sm text-navy-700">
                  {t(state.step === "redirecting" ? "quote.pay.redirecting" : "quote.pay.creating")}
                </p>
              ) : (
                reason && (
                  <p id={ids.reason} className="text-sm text-navy-600">
                    {t(reason === "terms" ? "quote.pay.reasonTerms" : reason === "error" ? "quote.pay.reasonError" : "quote.pay.reasonBusy")}
                  </p>
                )
              )}
            </div>
            <p className="text-xs leading-relaxed text-navy-600">{t("quote.pay.wompiNote")}</p>
          </form>
        </section>
      )}
    </Card>
  );
};

export default PaymentStep;
