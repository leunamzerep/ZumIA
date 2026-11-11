import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

const buttonClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold leading-none text-navy-900 ring-1 ring-navy-900/25 " +
  "transition-colors hover:bg-gold-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white " +
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:[outline-color:var(--focus-ring)]";

/**
 * Contador con botones − y + (son <button>: se usan con Tab, Enter y Espacio).
 * El valor se anuncia con aria-live; los botones llevan el nombre del elemento.
 */
export const Counter = ({
  id,
  label,
  detail,
  value,
  min = 0,
  max,
  onChange,
}: {
  id: string;
  label: ReactNode;
  detail: ReactNode;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}) => {
  const { t } = useTranslation();
  const labelId = `${id}-label`;

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-navy-900/15">
      <div className="flex min-w-0 flex-col gap-1">
        <span id={labelId} className="font-semibold leading-snug text-navy-900">
          {label}
        </span>
        <span className="text-sm text-navy-600">{detail}</span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={buttonClass} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label={t("quote.counterLess")} aria-describedby={labelId}>
          −
        </button>
        <span aria-live="polite" className="min-w-8 text-center font-title text-lg font-bold text-navy-900">
          {value}
        </span>
        <button type="button" className={buttonClass} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label={t("quote.counterMore")} aria-describedby={labelId}>
          +
        </button>
      </div>
    </div>
  );
};
