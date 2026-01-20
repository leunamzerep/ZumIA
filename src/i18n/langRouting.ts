export type SupportedLang = "en" | "es";

export const getLangFromPath = (pathname: string): SupportedLang =>
  pathname === "/en" || pathname.startsWith("/en/") ? "en" : "es";

export const stripLangPrefix = (pathname: string): string => {
  const stripped = pathname.replace(/^\/en(\/|$)/, "/");
  return stripped === "" ? "/" : stripped;
};

export const withLangPrefix = (pathname: string, lang: SupportedLang): string => {
  const normalized = stripLangPrefix(pathname);
  if (lang === "en") {
    return normalized === "/" ? "/en" : `/en${normalized}`;
  }
  return normalized;
};
