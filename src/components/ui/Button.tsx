import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

import { cx } from "./cx";

type Variant = "primary" | "secondary" | "outline" | "outline-light";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // Dorado con texto navy (contraste 6,4:1): la acción principal
  primary: "bg-gold-500 text-navy-900 shadow-[0_10px_30px_-12px_rgba(212,143,64,0.9)] hover:bg-gold-400",
  // Navy con texto blanco: acción principal sobre fondos claros
  secondary: "bg-navy-900 text-white hover:bg-navy-700",
  // Borde navy sobre fondos claros
  outline: "bg-transparent text-navy-900 ring-2 ring-inset ring-navy-900/80 hover:bg-navy-900 hover:text-white",
  // Borde blanco sobre fondos navy
  "outline-light": "bg-white/5 text-white ring-2 ring-inset ring-white/60 hover:bg-white hover:text-navy-900",
};

const SIZES: Record<Size, string> = {
  md: "gap-2 px-5 py-3 text-sm",
  lg: "gap-2.5 px-7 py-4 text-base",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cx(
    "inline-flex items-center justify-center rounded-full font-body font-bold",
    "transition-[background-color,color,translate,box-shadow] duration-200 hover:-translate-y-0.5",
    "disabled:pointer-events-none disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

type CommonProps = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

/** Enlace interno con aspecto de botón (usa el router, sin recargar la página). */
export const ButtonLink = ({ to, variant, size, className, children }: CommonProps & { to: string }) => (
  <Link to={to} className={buttonClass(variant, size, className)}>
    {children}
  </Link>
);

/** Enlace externo o ancla (#planes) con aspecto de botón. */
export const ButtonAnchor = ({
  variant,
  size,
  className,
  children,
  ...props
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a className={buttonClass(variant, size, className)} {...props}>
    {children}
  </a>
);

/** Botón de verdad (formularios y acciones en la página). */
export const Button = ({
  variant,
  size,
  className,
  children,
  type = "button",
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type={type} className={buttonClass(variant, size, className)} {...props}>
    {children}
  </button>
);
