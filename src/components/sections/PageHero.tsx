import type { ReactNode } from "react";

import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Encabezado de las páginas internas (Nosotros, Contacto, legales, 404):
 * fondo navy con el patrón de marca y el h1 de la página.
 */
export const PageHero = ({
  id,
  eyebrow,
  titleKey,
  lead,
  children,
}: {
  /** id del h1 */
  id: string;
  eyebrow?: ReactNode;
  /** Clave de es.json del h1; admite <1>…</1> para la palabra en contorno */
  titleKey: string;
  lead?: ReactNode;
  /** Contenido extra bajo el título (botones, enlaces) */
  children?: ReactNode;
}) => (
  <section
    aria-labelledby={id}
    className="relative isolate overflow-hidden bg-navy-950 font-body text-white [--focus-ring:var(--color-gold-400)]"
  >
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-20 bg-[radial-gradient(50rem_30rem_at_90%_0%,rgba(212,143,64,0.2),transparent_60%),linear-gradient(160deg,#13173D,#0B0E26)]"
    />
    <GeometricPattern tone="dark" />
    <GeometricPattern variant="cluster" className="-right-6 -bottom-8 hidden w-72 opacity-60 md:block" />
    <div className="container-site flex flex-col gap-8 pt-14 pb-16 md:pt-20 md:pb-24">
      <SectionHeading as="h1" id={id} tone="dark" eyebrow={eyebrow} titleKey={titleKey} lead={lead} className="max-w-4xl" />
      {children}
    </div>
  </section>
);
