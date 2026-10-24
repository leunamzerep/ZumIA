import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CONTACT_WORKER_URL } from "@/config/site";
import { PATHS } from "@/config/paths";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

type SubmitState = "idle" | "loading" | "success" | "error";
type Field = "name" | "email" | "message" | "consent";
type Errors = Record<Field, boolean>;

const NO_ERRORS: Errors = { name: false, email: false, message: false, consent: false };

const inputClass = (invalid: boolean) =>
  cx(
    "w-full rounded-2xl bg-cream-50 px-4 py-3.5 text-base text-navy-900 placeholder:text-navy-400",
    "ring-1 ring-inset transition-shadow duration-200 focus:outline-none focus-visible:ring-2",
    invalid ? "ring-2 ring-red-700 focus-visible:ring-red-700" : "ring-navy-900/15 focus-visible:ring-gold-700",
  );
const labelClass = "font-semibold text-navy-900";
const errorClass = "text-sm font-semibold text-red-700";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const buildGmailLink = (to: string, subject: string, body: string) => {
  const params = new URLSearchParams({ fs: "1", to, su: subject, body, tf: "cm" });
  return `https://mail.google.com/mail/u/0/?${params.toString()}`;
};

/**
 * Formulario de contacto. Envía al Cloudflare Worker los mismos campos de
 * siempre (name, email, message, link). La casilla de autorización es
 * obligatoria: sin marcarla no se envía nada. Al enviar, al final de "message"
 * se agrega contact.consentNote (solo en lo enviado, no en el cuadro de texto),
 * para que la autorización quede registrada en la hoja de cálculo.
 */
export const ContactForm = () => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const localizePath = useLocalizedPath();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);

    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    const consent = data.get("consent") === "on";

    const newErrors: Errors = {
      name: name === "",
      email: email === "" || !isValidEmail(email),
      message: message === "",
      consent: !consent,
    };
    setErrors(newErrors);

    // Lleva el foco al primer campo con error
    const firstError = (Object.keys(newErrors) as Field[]).find((field) => newErrors[field]);
    if (firstError) {
      form.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
      return;
    }

    setSubmitState("loading");

    // Enlace para responder por Gmail con la consulta original (sin la nota)
    const link = buildGmailLink(
      email,
      t("contact.label3"),
      `${t("contact.mail1")} ${name}\n\n${t("contact.mail2")}\n\n"${message}"\n\n${t("contact.mail3")}`,
    );

    try {
      const res = await fetch(CONTACT_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message: `${message}\n\n${t("contact.consentNote")}`,
          link,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Error al enviar");

      setSubmitState("success");
      form.reset();
    } catch {
      setSubmitState("error");
    }
  };

  // Al corregir un campo, su aviso de error desaparece
  const clearError = (field: Field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: false }));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 font-body">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className={labelClass}>{t("contact.label1")}</label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder={t("contact.place1")}
          aria-invalid={errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          onInput={() => clearError("name")}
          className={inputClass(errors.name)}
        />
        {errors.name && <p id="name-error" className={errorClass}>{t("contact.warn")}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={labelClass}>{t("contact.label2")}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t("contact.place2")}
          aria-invalid={errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          onInput={() => clearError("email")}
          className={inputClass(errors.email)}
        />
        {errors.email && <p id="email-error" className={errorClass}>{t("contact.warn")}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className={labelClass}>{t("contact.label3")}</label>
        <textarea
          id="message"
          name="message"
          autoComplete="off"
          required
          rows={5}
          placeholder={t("contact.place3")}
          aria-invalid={errors.message}
          aria-describedby={errors.message ? "message-error" : undefined}
          onInput={() => clearError("message")}
          className={cx(inputClass(errors.message), "min-h-32 resize-y")}
        />
        {errors.message && <p id="message-error" className={errorClass}>{t("contact.warn")}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            required
            aria-invalid={errors.consent}
            aria-describedby={errors.consent ? "consent-error" : undefined}
            onChange={() => clearError("consent")}
            className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-navy-900"
          />
          <label htmlFor="consent" className="text-sm leading-relaxed text-navy-700">
            <Trans
              i18nKey="contact.consent"
              components={{
                1: <Link to={localizePath(PATHS.privacy)} className="font-semibold text-navy-900 underline underline-offset-4 hover:text-gold-700" />,
              }}
            />
          </label>
        </div>
        {errors.consent && <p id="consent-error" className={errorClass}>{t("contact.consentWarn")}</p>}
      </div>

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Button type="submit" variant="secondary" size="lg" disabled={submitState === "loading"}>
          {t("contact.send")}
        </Button>
        {/* Estado del envío: los lectores de pantalla lo anuncian sin mover el foco */}
        <p id="form-estado" role="status" aria-live="polite" className="text-sm font-semibold">
          {submitState === "loading" && <span className="text-navy-600">{t("contact.processing")}</span>}
          {submitState === "success" && <span className="text-green-800">{t("contact.sended")}</span>}
          {submitState === "error" && <span className="text-red-700">{t("contact.error")}</span>}
        </p>
      </div>
    </form>
  );
};
