import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PATHS } from "@/config/paths";
import type { PlanId } from "@/data/plans";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { confirmCode, getDiscount, requestCode, type VerifiedProject } from "@/lib/verifyApi";

import { RadioCards } from "./ChoiceCards";

/**
 * Cliente verificado. Vive solo en memoria (estado de React): nunca en localStorage, sessionStorage ni URL.
 * El token queda aquí para el paso 6 (recalcular el precio final en el servidor).
 */
export type VerifiedClient = {
  token: string;
  /** Vencimiento del token (ms, reloj del navegador) */
  expiresAt: number;
  projectId: string;
  name: string;
  plan: PlanId;
  /** % de descuento en herramientas y adicionales. Solo visual: el servidor recalcula en el paso 6. */
  extrasDiscount: number;
};

type Session = { token: string; expiresAt: number; projects: VerifiedProject[] };
type Step = "email" | "code";
type Notice = "sent" | "expired";
type ErrorKey = "emailInvalid" | "codeError" | "tryLater" | "network";

const RESEND_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;
const stepTitle = "font-title text-h3 font-bold text-navy-900";
const inputClass =
  "w-full rounded-xl bg-white px-4 py-3 text-navy-900 ring-1 ring-navy-900/25 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:[outline-color:var(--focus-ring)]";

/** Salida siempre disponible: enlace a Contacto. */
const ContactHelp = () => {
  const { t } = useTranslation();
  const localizePath = useLocalizedPath();
  return (
    <p className="text-sm text-navy-600">
      {t("quote.verify.contactHelp")}{" "}
      <Link to={localizePath(PATHS.contact)} className="font-semibold text-navy-900 underline underline-offset-2 hover:text-gold-800">
        {t("quote.verify.contactLink")}
      </Link>
    </p>
  );
};

/** Sin VITE_VERIFY_API_URL no se puede verificar: precio de lista y contacto. */
export const ClientVerifyUnavailable = () => {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col gap-4">
      <h2 className={stepTitle}>{t("quote.verify.title")}</h2>
      <p className="text-sm leading-relaxed text-navy-600">{t("quote.verify.unavailable")}</p>
      <ContactHelp />
    </Card>
  );
};

/** Pasos: correo → código → (si hay varios) elegir proyecto → descuento verificado. */
export const ClientVerify = ({
  verified,
  onVerified,
}: {
  verified: VerifiedClient | null;
  onVerified: (client: VerifiedClient | null) => void;
}) => {
  const { t } = useTranslation();
  const localizePath = useLocalizedPath();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const mounted = useRef(true);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Cuenta atrás del reenvío (60 s, igual que el cooldown del servidor)
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);
  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  // Vence el token: se borra la verificación y el estimado vuelve a precio de lista, con aviso
  const expire = useCallback(() => {
    setSession(null);
    setSelectedId(undefined);
    setCode("");
    setStep("email");
    setError(null);
    setNotice("expired");
    onVerified(null);
  }, [onVerified]);

  const expiresAt = session?.expiresAt;
  useEffect(() => {
    if (expiresAt === undefined) return;
    const id = setTimeout(expire, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(id);
  }, [expiresAt, expire]);

  const failureKey = (status: "invalid" | "rateLimited" | "network", invalidKey: ErrorKey): ErrorKey =>
    status === "rateLimited" ? "tryLater" : status === "invalid" ? invalidKey : "network";

  const sendCode = async () => {
    const value = email.trim().toLowerCase();
    if (value.length > 254 || !EMAIL_PATTERN.test(value)) {
      setError("emailInvalid");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await requestCode(value);
    if (!mounted.current) return;
    setBusy(false);
    if (result.status !== "ok") {
      setError(failureKey(result.status, "emailInvalid"));
      return;
    }
    const current = Date.now();
    setEmail(value);
    setStep("code");
    setCode("");
    setNotice("sent");
    setNow(current);
    setCooldownUntil(current + RESEND_SECONDS * 1000);
    requestAnimationFrame(() => codeRef.current?.focus());
  };

  const chooseProject = async (source: Session, project: VerifiedProject) => {
    // Si el token venció justo antes de pedir el descuento, no se queda a medias: vuelve a precio de lista con aviso
    if (Date.now() >= source.expiresAt) {
      setBusy(false);
      expire();
      return;
    }
    setSelectedId(project.id);
    setBusy(true);
    setError(null);
    const result = await getDiscount(source.token, project.id);
    if (!mounted.current) return;
    setBusy(false);
    if (result.status === "invalid" || (result.status === "ok" && Date.now() >= source.expiresAt)) {
      expire();
      return;
    }
    if (result.status !== "ok") {
      setError(failureKey(result.status, "network"));
      return;
    }
    onVerified({
      token: source.token,
      expiresAt: source.expiresAt,
      projectId: result.data.projectId,
      name: project.name,
      plan: result.data.plan,
      extrasDiscount: result.data.extrasDiscount,
    });
  };

  const submitCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("codeError");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await confirmCode(email, code);
    if (!mounted.current) return;
    if (result.status !== "ok") {
      setBusy(false);
      setError(failureKey(result.status, "codeError"));
      return;
    }
    const next: Session = {
      token: result.data.token,
      expiresAt: Date.now() + result.data.expiresIn * 1000,
      projects: result.data.projects,
    };
    setSession(next);
    setCode("");
    // Con un solo proyecto se aplica directo; con varios, la persona elige
    if (next.projects.length === 1) await chooseProject(next, next.projects[0]);
    else setBusy(false);
  };

  const changeEmail = () => {
    setStep("email");
    setCode("");
    setNotice(null);
    setError(null);
    setCooldownUntil(0);
  };

  const changeProject = () => {
    setSelectedId(undefined);
    setError(null);
    onVerified(null);
  };

  const removeVerification = () => {
    setSession(null);
    setSelectedId(undefined);
    setCode("");
    setStep("email");
    setNotice(null);
    setError(null);
    setCooldownUntil(0);
    onVerified(null);
  };

  const messages = (
    <>
      {notice && (
        <p role="status" className="text-sm leading-relaxed text-navy-700">
          {t(`quote.verify.${notice}`)}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {t(`quote.verify.${error}`)}
        </p>
      )}
    </>
  );

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className={stepTitle}>{t("quote.verify.title")}</h2>
        <p className="text-sm leading-relaxed text-navy-600">{t("quote.verify.lead")}</p>
      </div>

      {verified ? (
        <div className="flex flex-col gap-4">
          <p role="status" className="rounded-2xl bg-gold-100 px-4 py-3 text-sm font-semibold text-gold-800 ring-1 ring-gold-700/20">
            {t("quote.verify.verifiedLine", {
              name: verified.name,
              plan: t(`plans.${verified.plan}.name`),
              pct: verified.extrasDiscount,
            })}
          </p>
          <div className="flex flex-wrap gap-3">
            {session && session.projects.length > 1 && (
              <Button variant="outline" onClick={changeProject}>
                {t("quote.verify.changeProject")}
              </Button>
            )}
            <Button variant="outline" onClick={removeVerification}>
              {t("quote.verify.remove")}
            </Button>
          </div>
        </div>
      ) : session ? (
        <div className="flex flex-col gap-4">
          <RadioCards
            name="proyecto-verificado"
            legend={t("quote.verify.projectsLegend")}
            className="sm:grid-cols-2"
            options={session.projects.map((project) => ({
              value: project.id,
              label: project.name,
              detail: t("quote.verify.projectDetail", { plan: t(`plans.${project.plan}.name`), pct: project.extrasDiscount }),
            }))}
            value={selectedId}
            onChange={(id) => {
              const project = session.projects.find((item) => item.id === id);
              if (project && !busy) void chooseProject(session, project);
            }}
          />
          {busy && (
            <p role="status" className="text-sm text-navy-700">
              {t("quote.verify.applying")}
            </p>
          )}
          {messages}
        </div>
      ) : step === "email" ? (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) void sendCode();
          }}
        >
          <label htmlFor="verify-email" className="font-semibold text-navy-900">
            {t("quote.verify.emailLabel")}
          </label>
          <input
            id="verify-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error === "emailInvalid"}
            className={inputClass}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="secondary" disabled={busy}>
              {t(busy ? "quote.verify.sending" : "quote.verify.sendCode")}
            </Button>
          </div>
          {messages}
        </form>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) void submitCode();
          }}
        >
          {messages}
          <label htmlFor="verify-code" className="font-semibold text-navy-900">
            {t("quote.verify.codeLabel")}
          </label>
          <input
            ref={codeRef}
            id="verify-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={error === "codeError"}
            className={`${inputClass} tracking-[0.4em]`}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="secondary" disabled={busy}>
              {t(busy ? "quote.verify.verifying" : "quote.verify.confirm")}
            </Button>
            <Button variant="outline" disabled={busy || secondsLeft > 0} onClick={() => void sendCode()}>
              {secondsLeft > 0 ? t("quote.verify.resendIn", { seconds: secondsLeft }) : t("quote.verify.resend")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={changeEmail}>
              {t("quote.verify.changeEmail")}
            </Button>
          </div>
        </form>
      )}

      <p className="text-sm text-navy-600">
        {t("quote.verify.privacyNote")}{" "}
        <Link to={localizePath(PATHS.privacy)} className="font-semibold text-navy-900 underline underline-offset-2 hover:text-gold-800">
          {t("quote.verify.privacyLink")}
        </Link>
      </p>
      <ContactHelp />
    </Card>
  );
};
