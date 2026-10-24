import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "./cx";

type Tone = "light" | "dark" | "glass";

const TONES: Record<Tone, string> = {
  light: "bg-white text-navy-900 ring-1 ring-navy-900/8 shadow-[0_24px_60px_-32px_rgba(19,23,61,0.35)]",
  dark: "bg-navy-900 text-white ring-1 ring-white/10 shadow-[0_30px_70px_-30px_rgba(11,14,38,0.8)] [--focus-ring:var(--color-gold-400)]",
  // Transparente sobre secciones navy
  glass: "bg-white/[0.04] text-white ring-1 ring-white/12 backdrop-blur-sm [--focus-ring:var(--color-gold-400)]",
};

/** Tarjeta con esquinas muy redondeadas. "as" permite usar <article> o <li>. */
export const Card = ({
  tone = "light",
  as: Tag = "div",
  className,
  children,
  ...props
}: { tone?: Tone; as?: "div" | "article" | "li"; className?: string; children: ReactNode } & HTMLAttributes<HTMLElement>) => (
  <Tag className={cx("relative rounded-card p-6 md:p-8", TONES[tone], className)} {...props}>
    {children}
  </Tag>
);
