import { useId } from "react";

import { cx } from "./cx";

/**
 * Patrón geométrico de la marca: triángulos y barras verticales.
 * Es decorativo (aria-hidden) y va detrás del contenido (absolute, -z-10).
 *
 * - "field": mosaico repetido que cubre toda la sección, muy transparente.
 * - "cluster": grupo grande de barras y triángulos con degradado dorado, para
 *   una esquina del hero o de una llamada a la acción.
 */
export const GeometricPattern = ({
  variant = "field",
  tone = "dark",
  className,
}: {
  variant?: "field" | "cluster";
  /** "dark" = sobre navy (trazos claros); "light" = sobre crema (trazos navy) */
  tone?: "dark" | "light";
  className?: string;
}) => {
  const id = useId().replace(/:/g, "");
  const ink = tone === "dark" ? "#FFFFFF" : "#13173D";

  if (variant === "cluster") {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 400 400"
        className={cx("pointer-events-none absolute -z-10", className)}
      >
        <defs>
          <linearGradient id={`${id}-gold`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#D48F40" stopOpacity="0" />
            <stop offset="1" stopColor="#E0A660" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`${id}-tri`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#EBC38E" stopOpacity="0.55" />
            <stop offset="1" stopColor="#D48F40" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {/* Barras verticales de distinta altura */}
        {[
          [40, 150], [70, 220], [100, 120], [130, 280], [160, 190], [190, 320], [220, 240], [250, 160],
        ].map(([x, h]) => (
          <rect key={x} x={x} y={400 - h} width="14" height={h} rx="7" fill={`url(#${id}-gold)`} />
        ))}
        {/* Triángulos */}
        <path d="M250 60 L390 60 L320 190 Z" fill={`url(#${id}-tri)`} />
        <path d="M290 210 L370 350 L210 350 Z" fill="none" stroke="#E0A660" strokeOpacity="0.5" strokeWidth="3" strokeLinejoin="round" />
        <path d="M20 40 L80 40 L50 92 Z" fill="none" stroke={ink} strokeOpacity="0.25" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" focusable="false" className={cx("pointer-events-none absolute inset-0 -z-10 size-full", className)}>
      <defs>
        <pattern id={`${id}-tile`} width="160" height="160" patternUnits="userSpaceOnUse">
          <rect x="18" y="20" width="5" height="46" rx="2.5" fill={ink} fillOpacity="0.07" />
          <rect x="30" y="34" width="5" height="32" rx="2.5" fill={ink} fillOpacity="0.07" />
          <rect x="42" y="12" width="5" height="54" rx="2.5" fill="#D48F40" fillOpacity="0.16" />
          <path d="M96 96 L136 96 L116 132 Z" fill="none" stroke={ink} strokeOpacity="0.08" strokeWidth="2" strokeLinejoin="round" />
          <path d="M100 18 L124 18 L112 40 Z" fill="#D48F40" fillOpacity="0.12" />
          <rect x="128" y="112" width="5" height="30" rx="2.5" fill={ink} fillOpacity="0.06" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id}-tile)`} />
    </svg>
  );
};
