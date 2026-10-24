import { Trans } from "react-i18next";

import { cx } from "./cx";

/**
 * Texto de es.json con palabras en contorno. En la clave, la palabra va entre
 * <1>…</1>; por ejemplo "Soluciones <1>Digitales</1> para tu Negocio".
 * El texto real no cambia: el contorno y las mayúsculas son solo CSS.
 * outline: color del trazo ("gold" sobre navy, "navy" sobre fondos claros).
 */
export const OutlineText = ({ i18nKey, outline = "gold" }: { i18nKey: string; outline?: "gold" | "navy" }) => (
  <Trans
    i18nKey={i18nKey}
    components={{
      1: (
        <span
          className={cx(
            "text-outline",
            outline === "navy" ? "[--outline-color:var(--color-navy-900)]" : "[--outline-color:var(--color-gold-400)]",
          )}
        />
      ),
    }}
  />
);
