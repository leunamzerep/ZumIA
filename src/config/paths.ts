// Enlaces internos del sitio, siempre con barra final (/about-us/), que es la
// forma que publica GitHub Pages (about-us/index.html) y la del canonical y el
// sitemap. Sin barra, GitHub Pages responde con una redirección 301 extra.
// Las rutas de react-router (src/app/routes.tsx) siguen sin barra: el router
// acepta las dos formas.

export const PATHS = {
  home: "/",
  services: "/services/",
  quote: "/quote/",
  aboutUs: "/about-us/",
  contact: "/contact/",
  terms: "/terms-and-conditions/",
  privacy: "/privacy-policy/",
} as const;

/** id de la sección de agenda en Contacto: los botones "Agendar asesoría" llevan a /contact/#agenda */
export const AGENDA_ID = "agenda";
