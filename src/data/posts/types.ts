/**
 * Artículos del blog: datos tipados (sin CMS ni markdown). El contenido está
 * solo en español, como las páginas legales; los textos de interfaz (botones,
 * títulos de sección) sí van en es.json / en.json.
 */
export type PostBlock =
  | { type: "p"; text: string }
  /** Subtítulo: se muestra como h2 */
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] };

export type Post = {
  /** Parte final de la URL: /blog/<slug>/ */
  slug: string;
  /** Título del artículo (h1 y <title>) */
  title: string;
  /** Meta description y texto de la tarjeta del índice (máx. ~155 caracteres) */
  description: string;
  /** Fecha de publicación, formato AAAA-MM-DD */
  date: string;
  blocks: PostBlock[];
};
