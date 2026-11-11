import { antesDeVisitarte } from "./antes-de-visitarte";
import { atendiendoMientrasTrabajas } from "./atendiendo-mientras-trabajas";
import { clienteNoTeEncuentra } from "./cliente-no-te-encuentra";
import type { Post } from "./types";

export type { Post, PostBlock } from "./types";

// Para publicar un artículo nuevo: crea su archivo en esta carpeta, agrégalo
// aquí y suma su URL a public/sitemap.xml. Las rutas y el prerender lo toman
// de esta lista. Imports relativos (sin @/): vite.config.ts también lee este archivo.
const ALL_POSTS: Post[] = [antesDeVisitarte, clienteNoTeEncuentra, atendiendoMientrasTrabajas];

/** Artículos del más reciente al más antiguo (con la misma fecha, se respeta el orden de la lista). */
export const POSTS: Post[] = [...ALL_POSTS].sort((a, b) => b.date.localeCompare(a.date));

export const getPostBySlug = (slug: string | undefined) => POSTS.find((post) => post.slug === slug);

const WORDS_PER_MINUTE = 200;

/** Minutos de lectura estimados (unas 200 palabras por minuto, mínimo 1). */
export const readingMinutes = (post: Post) => {
  const text = [post.title, ...post.blocks.flatMap((block) => (block.type === "list" ? block.items : [block.text]))].join(" ");
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
};
