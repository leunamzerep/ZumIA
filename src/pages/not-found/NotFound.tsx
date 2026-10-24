import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

import { PATHS } from "@/config/paths";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { ButtonLink } from "@/components/ui/Button";
import { GeometricPattern } from "@/components/ui/GeometricPattern";

const OTHER_LINKS = [
  { to: PATHS.aboutUs, labelKey: "header.aboutUs" },
  { to: PATHS.contact, labelKey: "header.contact" },
];

export const NotFound = () => {
  const { t } = useTranslation();
  const localizePath = useLocalizedPath();

  return (
    <>
      <Helmet defer={false}>
        <title>{t("seo.notFoundTitle")}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className="relative isolate flex min-h-[70dvh] items-center overflow-hidden bg-navy-950 font-body text-white [--focus-ring:var(--color-gold-400)]">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(45rem_30rem_at_50%_0%,rgba(212,143,64,0.22),transparent_65%),linear-gradient(160deg,#13173D,#0B0E26)]"
        />
        <GeometricPattern tone="dark" />
        <GeometricPattern variant="cluster" className="-right-8 -bottom-10 hidden w-80 opacity-60 md:block" />

        <div className="container-site flex flex-col items-center gap-7 py-20 text-center md:py-28">
          {/* "404" grande en contorno: decorativo, el título real es el h1 */}
          <p
            aria-hidden="true"
            className="font-title text-[clamp(6rem,4rem+12vw,12rem)] leading-none font-extrabold text-outline [--outline-color:var(--color-gold-400)]"
          >
            {t("notFound.code")}
          </p>
          <h1 className="font-title text-h2 font-extrabold uppercase tracking-tight text-balance">{t("notFound.title")}</h1>
          <p className="max-w-xl text-lead text-pretty text-white/75">{t("notFound.description")}</p>
          <ButtonLink to={localizePath(PATHS.home)} size="lg">
            {t("notFound.cta")}
          </ButtonLink>
          <nav aria-label={t("notFound.alt")} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <span className="text-white/60">{t("notFound.alt")}</span>
            {OTHER_LINKS.map(({ to, labelKey }) => (
              <Link
                key={to}
                to={localizePath(to)}
                className="rounded-full px-3 py-1.5 font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white hover:text-navy-900"
              >
                {t(labelKey)}
              </Link>
            ))}
          </nav>
        </div>
      </main>
    </>
  );
};
