import type { ReactNode } from "react";

import { cx } from "./cx";

type Tone = "light" | "dark" | "gold";

const TONES: Record<Tone, string> = {
  // Sobre fondos claros: texto dorado oscuro (5,3:1)
  light: "bg-gold-100 text-gold-800 ring-gold-700/20",
  // Sobre fondos navy
  dark: "bg-white/8 text-gold-300 ring-white/15",
  gold: "bg-gold-500 text-navy-900 ring-gold-600",
};

/** Píldora pequeña en mayúsculas: antetítulos de sección y etiquetas ("Recomendado"). */
export const Pill = ({ tone = "light", className, children }: { tone?: Tone; className?: string; children: ReactNode }) => (
  <span
    className={cx(
      "inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 font-body text-xs font-bold uppercase tracking-[0.16em] ring-1 ring-inset",
      TONES[tone],
      className,
    )}
  >
    {children}
  </span>
);
