import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import logo from "@/assets/img/mainIcon.png";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { EMAIL, FACEBOOK_URL, INSTAGRAM_URL, PHONE_DISPLAY, WHATSAPP_URL } from "@/config/site";
import { PATHS } from "@/config/paths";
import { ArrowUpRightIcon, FacebookIcon, InstagramIcon, MailIcon, WhatsAppIcon } from "@/components/ui/icons";
import { NAV_LINKS } from "../navLinks";

/** Autoridad de protección al consumidor (Ley 1480 de 2011, art. 50): enlace visible obligatorio. */
const SIC_URL = "https://www.sic.gov.co";

const headingClass = "font-title text-sm font-bold uppercase tracking-[0.18em] text-gold-400";
const linkClass =
  "rounded-md text-white/80 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline";
const socialClass =
  "inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white " +
  "transition-colors duration-200 hover:bg-gold-500 hover:text-navy-900";

export const Footer = () => {
  const { t } = useTranslation();
  const localizePath = useLocalizedPath();
  const mailLink: string = t("footer.mailRedirect");

  return (
    <footer className="relative overflow-hidden bg-navy-900 font-body text-white [--focus-ring:var(--color-gold-400)]">
      {/* Línea dorada superior con degradado */}
      <div aria-hidden="true" className="h-1 bg-linear-to-r from-gold-700 via-gold-500 to-gold-300" />

      <div className="container-site grid gap-12 py-14 md:grid-cols-2 md:py-16 lg:grid-cols-[1.4fr_1fr_1.3fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <Link to={localizePath(PATHS.home)} aria-label={t("header.logo")} className="flex w-fit items-center gap-3 rounded-xl">
            <img src={logo} alt="" width={1081} height={1081} className="size-12" />
            <span aria-hidden="true" className="font-title text-xl font-extrabold uppercase leading-none tracking-wide">
              {t("brand.name")}
            </span>
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">{t("home.hero.eyebrow")}</p>
          <ul className="flex gap-3">
            <li>
              <a className={socialClass} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label={t("footer.instagram")}>
                <InstagramIcon className="size-5" />
              </a>
            </li>
            <li>
              <a className={socialClass} href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label={t("footer.facebook")}>
                <FacebookIcon className="size-5" />
              </a>
            </li>
            <li>
              <a className={socialClass} href={mailLink} target="_blank" rel="noopener noreferrer" aria-label={t("footer.mail")}>
                <MailIcon className="size-5" />
              </a>
            </li>
          </ul>
        </div>

        <nav aria-label={t("footer.siteNav")} className="flex flex-col gap-4">
          <h2 className={headingClass}>{t("footer.siteNav")}</h2>
          <ul className="flex flex-col gap-2.5">
            {NAV_LINKS.map(({ to, labelKey }) => (
              <li key={to}>
                <Link to={localizePath(to)} className={linkClass}>{t(labelKey)}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("footer.legals")} className="flex flex-col gap-4">
          <h2 className={headingClass}>{t("footer.legals")}</h2>
          <ul className="flex flex-col gap-2.5">
            <li>
              <Link to={localizePath(PATHS.terms)} className={linkClass}>{t("footer.terms")}</Link>
            </li>
            <li>
              <Link to={localizePath(PATHS.privacy)} className={linkClass}>{t("footer.privacy")}</Link>
            </li>
            <li>
              <a href={SIC_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex gap-1.5`}>
                <span>{t("footer.sic")}</span>
                <ArrowUpRightIcon className="mt-1 size-4 shrink-0" />
                <span className="sr-only">{t("footer.newTab")}</span>
              </a>
            </li>
          </ul>
        </nav>

        <div className="flex flex-col gap-4">
          <h2 className={headingClass}>{t("header.contact")}</h2>
          <ul className="flex flex-col gap-3">
            <li>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-2.5`}>
                <WhatsAppIcon className="size-5 shrink-0 text-gold-400" />
                <span>{PHONE_DISPLAY}</span>
                <span className="sr-only">{t("footer.newTab")}</span>
              </a>
            </li>
            <li>
              <a href={mailLink} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-2.5 break-all`}>
                <MailIcon className="size-5 shrink-0 text-gold-400" />
                <span>{EMAIL}</span>
                <span className="sr-only">{t("footer.newTab")}</span>
              </a>
            </li>
            <li className="text-sm text-white/70">{t("contact.ubih33")}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="container-site py-6 text-center text-xs text-white/60 md:text-left">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
};
