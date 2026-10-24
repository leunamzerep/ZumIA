import type { ReactNode } from "react";

import { cx } from "./cx";
import { OutlineText } from "./OutlineText";
import { Pill } from "./Pill";

/**
 * Encabezado de sección: antetítulo en píldora, título en mayúsculas gruesas
 * (con palabra en contorno) y texto de entrada opcional.
 */
export const SectionHeading = ({
  id,
  eyebrow,
  titleKey,
  lead,
  tone = "light",
  align = "left",
  as: Tag = "h2",
  className,
}: {
  /** id del título (lo usa Section en aria-labelledby) */
  id?: string;
  eyebrow?: ReactNode;
  /** Clave de es.json del título; admite <1>…</1> para la palabra en contorno */
  titleKey: string;
  lead?: ReactNode;
  /** "light" = sobre fondo claro; "dark" = sobre navy */
  tone?: "light" | "dark";
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}) => (
  <div className={cx("flex max-w-3xl flex-col gap-5", align === "center" && "mx-auto items-center text-center", className)}>
    {eyebrow && <Pill tone={tone === "dark" ? "dark" : "light"}>{eyebrow}</Pill>}
    <Tag
      id={id}
      className={cx(
        "font-title font-extrabold uppercase tracking-tight text-balance",
        Tag === "h1" ? "text-display" : "text-h2",
        tone === "dark" ? "text-white" : "text-navy-900",
      )}
    >
      <OutlineText i18nKey={titleKey} outline={tone === "dark" ? "gold" : "navy"} />
    </Tag>
    {lead && (
      <p className={cx("max-w-2xl text-lead text-pretty", tone === "dark" ? "text-white/75" : "text-navy-600")}>{lead}</p>
    )}
  </div>
);
