/** Une clases de Tailwind ignorando las vacías: cx("a", cond && "b") → "a b". */
export const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");
