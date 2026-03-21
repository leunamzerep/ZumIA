import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

import { getLangFromPath, stripLangPrefix, withLangPrefix } from "../../i18n/langRouting";

const SITE_ORIGIN = "https://zumiasolutions.xyz";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/mainIcon.png`;

type PageSeoProps = {
  title: string;
  description: string;
};

const toAbsoluteUrl = (pathname: string) =>
  pathname === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${pathname}`;

export const PageSeo = ({ title, description }: PageSeoProps) => {
  const { pathname } = useLocation();
  const lang = getLangFromPath(pathname);
  const normalizedPath = stripLangPrefix(pathname);

  const canonicalUrl = toAbsoluteUrl(withLangPrefix(normalizedPath, lang));
  const spanishUrl = toAbsoluteUrl(withLangPrefix(normalizedPath, "es"));
  const englishUrl = toAbsoluteUrl(withLangPrefix(normalizedPath, "en"));

  return (
    <Helmet defer={false}>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="es" href={spanishUrl} />
      <link rel="alternate" hrefLang="en" href={englishUrl} />
      <link rel="alternate" hrefLang="x-default" href={spanishUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={DEFAULT_IMAGE} />
      <meta property="og:site_name" content="Zumia Solutions" />
      <meta property="og:locale" content={lang === "en" ? "en_US" : "es_ES"} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={DEFAULT_IMAGE} />
    </Helmet>
  );
};
