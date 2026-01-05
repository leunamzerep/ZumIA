import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import styles from './ContactFrom.module.css'

type form = { canAnimate: boolean }
type SubmitState = "idle" | "loading" | "success";

export const ContactForm = ({ canAnimate }: form) => {

  const { t } = useTranslation();

  useEffect(() => {
    if (!canAnimate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [canAnimate]);

  const buildGmailLink = (to: string, subject: string, body: string) => {
    const params = new URLSearchParams({
      fs: "1", to, su: subject, body, tf: "cm"
    });
    return `https://mail.google.com/mail/u/0/?${params.toString()}`
  }

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const [errors, setErrors] = useState({
    name: false,
    email: false,
    message: false,
  });

  const [animate, setAnimate] = useState(false);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const dataURL = 'https://script.google.com/macros/s/AKfycbyU4w1licDsER_6jspu5DU9w2W-UCgXoO93TD9RDi3t0MQ6LARd6-EDBCbyNioLzHlf8A/exec';
    const data = new FormData(form);

    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();

    const newErrors = {
      name: name === "",
      email: email === "" || !isValidEmail(email),
      message: message === "",
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) return;

    setSubmitState("loading");

    const link = buildGmailLink(
      email,
      t("contact.label3"),
      `${t("contact.mail1")} ${name}\n\n${t("contact.mail2")}\n\n"${message}"\n\n${t("contact.mail3")}`
    );

    data.append("formType", "contact");
    data.append("link", link);

    try {
      const res = await fetch(dataURL, { method: "POST", body: data });
      const json = await res.json();

      if (json.result === "success") {
        setSubmitState("success");
        form.reset();
      } else {
        throw new Error();
      }
    } catch {
      setSubmitState("idle");
    }

    setTimeout(() => {
      setSubmitState("idle");
    }, 4567);
  };


  return (
    <section className={`${styles.displayContainer} ${animate ? styles.appear : ''}`}>
      <form onSubmit={onSubmit} className={styles.formContainer}>
        <h2 className={styles.invitation}>{t('contact.invitation')}</h2>
        <label htmlFor="name">
          <p className={styles.labelText}>{t('contact.label1')}</p>
          <p className={styles.labelWarn} style={{ opacity: errors.name ? 1 : 0 }}>{t('contact.warn')}</p>
        </label>
        <input id="name" name='name' autoComplete="name" type="text" placeholder={t('contact.place1')} />
        <label htmlFor="mail">
          <p className={styles.labelText}>{t('contact.label2')}</p>
          <p className={styles.labelWarn} style={{ opacity: errors.email ? 1 : 0 }}>{t('contact.warn')}</p>
        </label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder={t('contact.place2')} />
        <label htmlFor="mesagge">
          <p className={styles.labelText}>{t('contact.label3')}</p>
          <p className={styles.labelWarn} style={{ opacity: errors.message ? 1 : 0 }}>{t('contact.warn')}</p>
        </label>
        <textarea id="mesagge" name="message" autoComplete="off" className={styles.msgContainer} placeholder={t('contact.place3')} />
        <div>
          <button
            type="submit"
            className={styles.send}
            disabled={submitState === "loading"}
          >
            {t("contact.send")}
          </button>

          {submitState === "loading" && (
            <span className={styles.verification}>
              {t("contact.processing")}
            </span>
          )}

          {submitState === "success" && (
            <span className={styles.verification}>
              {t("contact.sended")}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}