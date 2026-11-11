/** Fecha AAAA-MM-DD en texto largo según el idioma visible ("11 de noviembre de 2026"). */
export const formatPostDate = (date: string, lang: string) =>
  new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-CO", { dateStyle: "long", timeZone: "UTC" }).format(
    // Mediodía UTC: así la fecha no cambia de día por la zona horaria
    new Date(`${date}T12:00:00Z`),
  );
