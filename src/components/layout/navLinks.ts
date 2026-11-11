import { PATHS } from "@/config/paths";

/** Enlaces del menú principal (los usan el encabezado y el pie de página). */
export const NAV_LINKS = [
  { to: PATHS.home, labelKey: "header.home" },
  { to: PATHS.services, labelKey: "header.services" },
  { to: PATHS.blog, labelKey: "header.blog" },
  { to: PATHS.aboutUs, labelKey: "header.aboutUs" },
  { to: PATHS.contact, labelKey: "header.contact" },
] as const;

const withoutSlash = (path: string) => path.replace(/\/+$/, "") || "/";

/**
 * ¿El enlace corresponde a la página actual? Compara sin la barra final, porque
 * /about-us y /about-us/ son la misma página (el NavLink de react-router no las
 * trata como iguales).
 */
export const isCurrentPath = (pathname: string, to: string) =>
  withoutSlash(pathname) === withoutSlash(to);

/**
 * ¿La página actual está dentro de la sección del enlace? Igual que isCurrentPath,
 * pero también cuenta las subpáginas (un artículo /blog/<slug>/ marca "Blog").
 */
export const isInSection = (pathname: string, to: string) =>
  isCurrentPath(pathname, to) || (to !== "/" && withoutSlash(pathname).startsWith(withoutSlash(to) + "/"));
