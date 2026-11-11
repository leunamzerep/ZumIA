import type { ReactNode } from "react";

import { cx } from "@/components/ui/cx";

/**
 * Clases de una opción tipo tarjeta (radio o casilla). El <input> real queda
 * oculto a la vista pero accesible (teclado y lectores de pantalla); la tarjeta
 * muestra el estado elegido y el anillo de foco cuando el input lo tiene.
 */
export const choiceCardClass =
  "relative flex cursor-pointer gap-3 rounded-2xl bg-white p-4 ring-1 ring-navy-900/15 transition-[box-shadow,background-color] duration-200 " +
  "hover:ring-navy-900/35 has-[input:checked]:bg-gold-50 has-[input:checked]:ring-2 has-[input:checked]:ring-gold-700 " +
  "has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-solid has-[input:focus-visible]:[outline-color:var(--focus-ring)]";

/** Círculo (radio) o cuadro (casilla) que dibuja el estado del input anterior (peer). */
export const ChoiceMark = ({ type }: { type: "radio" | "checkbox" }) => (
  <span
    aria-hidden="true"
    className={cx(
      "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center border-2 border-navy-500 bg-white transition-colors",
      "peer-checked:border-gold-700 peer-checked:bg-gold-700 peer-checked:[&>svg]:opacity-100",
      type === "radio" ? "rounded-full" : "rounded-md",
    )}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5 opacity-0">
      {type === "radio" ? <circle cx="12" cy="12" r="3" fill="white" stroke="none" /> : <path d="m5 12.5 4.5 4.5L19 7.5" />}
    </svg>
  </span>
);

type Option<T> = { value: T; label: ReactNode; detail?: ReactNode; badge?: ReactNode };

/** Grupo de radios con aspecto de tarjeta (las flechas del teclado cambian la opción). */
export const RadioCards = <T extends string | number>({
  name,
  legend,
  legendClassName,
  options,
  value,
  onChange,
  className,
}: {
  name: string;
  legend: ReactNode;
  legendClassName?: string;
  options: Option<T>[];
  value: T | undefined | null;
  onChange: (value: T) => void;
  className?: string;
}) => (
  <fieldset className="flex min-w-0 flex-col gap-3">
    <legend className={cx("mb-3 font-semibold text-navy-900", legendClassName)}>{legend}</legend>
    <div className={cx("grid gap-3", className)}>
      {options.map((option) => (
        <label key={option.value} className={choiceCardClass}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          <ChoiceMark type="radio" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold leading-snug text-navy-900">
              {option.label}
              {option.badge}
            </span>
            {option.detail && <span className="text-sm leading-snug text-navy-600">{option.detail}</span>}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);
