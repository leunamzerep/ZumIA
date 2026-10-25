import { useTranslation } from "react-i18next";

import { cx } from "@/components/ui/cx";
import { saveLang } from "@/i18n/config";

/**
 * Switch de idioma ES / EN. Cambia los textos sin cambiar la URL y recuerda la
 * elección (ver src/i18n/config.ts). Es un botón con role="switch": encendido =
 * inglés. Las letras ES y EN son decorativas; el lector de pantalla lee
 * "Ver el sitio en inglés, activado / desactivado".
 */
export const LanguageSwitch = ({ className }: { className?: string }) => {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === "en";

  const toggle = () => {
    const next = isEnglish ? "es" : "en";
    saveLang(next);
    i18n.changeLanguage(next);
  };

  const label = (active: boolean) =>
    cx("w-6 text-center text-sm font-bold transition-colors duration-200", active ? "text-gold-400" : "text-white/60");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isEnglish}
      aria-label={t("header.langSwitch")}
      onClick={toggle}
      className={cx(
        "inline-flex h-14 items-center gap-2 rounded-full bg-navy-900 px-4 font-body text-white md:h-15 md:px-5",
        "shadow-[0_10px_30px_-8px_rgba(19,23,61,0.55)] ring-4 ring-white/70 [--focus-ring:var(--color-gold-400)]",
        "transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
    >
      <span aria-hidden="true" className={label(!isEnglish)}>ES</span>
      <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-white/15 ring-1 ring-white/20">
        <span
          className={cx(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-gold-500 shadow transition-transform duration-200",
            isEnglish && "translate-x-5",
          )}
        />
      </span>
      <span aria-hidden="true" className={label(isEnglish)}>EN</span>
    </button>
  );
};
