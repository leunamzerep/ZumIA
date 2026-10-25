import type { ReactNode } from "react";

import { cx } from "./cx";

export type SectionTone = "cream" | "white" | "navy";

const TONES: Record<SectionTone, string> = {
  cream: "bg-cream-50 text-navy-900",
  white: "bg-white text-navy-900",
  // En secciones navy, el anillo de foco pasa a dorado claro para verse sobre el fondo oscuro
  navy: "bg-navy-900 text-white [--focus-ring:var(--color-gold-400)]",
};

/**
 * Sección de página: fondo, espacio vertical fluido y contenedor centrado.
 *
 * La sección NO es "relative" a propósito: así el patrón de fondo se posiciona
 * contra <main> y todas las secciones comparten la misma rejilla (el patrón
 * continúa de una sección a otra en vez de reiniciarse). clip-path: inset(0)
 * recorta esa capa al borde de la sección.
 */
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
  /** Fondo decorativo detrás del contenido (normalmente <GeometricPattern />, que se alinea con <main>) */
  decoration?: ReactNode;
  children: ReactNode;
}) => (
  <section id={id} aria-labelledby={labelledBy} className={cx("isolate overflow-clip [clip-path:inset(0)] section-y font-body", TONES[tone], className)}>
    {decoration}
    <div className={cx("container-site relative", innerClassName)}>{children}</div>
  </section>
);
