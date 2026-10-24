import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

import { getLangFromPath, stripLangPrefix, withLangPrefix } from "@/i18n/langRouting";
import { OG_IMAGE, SITE_URL } from "@/config/site";

const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE.path}`;

type PageSeoProps = {
  title: string;
  description: string;
};

// URL absoluta siempre con barra final (/about-us/), porque el build genera
// about-us/index.html. Así canonical, og:url y sitemap usan la misma forma,
// sin importar si se visitó /about-us o /about-us/.
const toAbsoluteUrl = (pathname: string) => {
  const clean = pathname.replace(/\/+$/, "");
  return clean === "" ? `${SITE_URL}/` : `${SITE_URL}${clean}/`;
};

export const PageSeo = ({ title, description }: PageSeoProps) => {
  const { pathname } = useLocation();
  const lang = getLangFromPath(pathname);
  const normalizedPath = stripLangPrefix(pathname);

  const canonicalUrl = toAbsoluteUrl(withLangPrefix(normalizedPath, lang));

  return (
    <Helmet defer={false}>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {/* Las rutas /en tienen contenido de otra plantilla: Google no debe
          indexarlas, pero sí puede seguir sus enlaces. No hay hreflang
          hasta que exista una traducción real. */}
      {lang === "en" && <meta name="robots" content="noindex,follow" />}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={OG_IMAGE_URL} />
      <meta property="og:image:width" content={String(OG_IMAGE.width)} />
      <meta property="og:image:height" content={String(OG_IMAGE.height)} />
      <meta property="og:image:alt" content={OG_IMAGE.alt} />
      <meta property="og:site_name" content="Zumia Solutions" />
      <meta property="og:locale" content={lang === "en" ? "en_US" : "es_CO"} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE_URL} />
      <meta name="twitter:image:alt" content={OG_IMAGE.alt} />
    </Helmet>
  );
};
