import type { ReactNode } from "react";

import { cx } from "./cx";

export type SectionTone = "cream" | "white" | "navy";

const TONES: Record<SectionTone, string> = {
  cream: "bg-cream-50 text-navy-900",
  white: "bg-white text-navy-900",
  // En secciones navy, el anillo de foco pasa a dorado claro para verse sobre el fondo oscuro
  navy: "bg-navy-900 text-white [--focus-ring:var(--color-gold-400)]",
};

/** Sección de página: fondo, espacio vertical fluido y contenedor centrado. */
export const Section = ({
  tone = "cream",
  id,
  labelledBy,
  className,
  innerClassName,
  decoration,
  children,
}: {
  tone?: SectionTone;
  id?: string;
  /** id del título de la sección, para que los lectores de pantalla la nombren */
  labelledBy?: string;
  className?: string;
  innerClassName?: string;
  /** Fondo decorativo (patrón, degradados) detrás del contenido */
  decoration?: ReactNode;
  children: ReactNode;
}) => (
  <section id={id} aria-labelledby={labelledBy} className={cx("relative isolate overflow-clip section-y font-body", TONES[tone], className)}>
    {decoration}
    <div className={cx("container-site relative", innerClassName)}>{children}</div>
  </section>
);
