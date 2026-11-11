import { POSTS } from "../data/posts";

// Solo rutas en español. Las rutas /en están desactivadas (Fase 4) hasta que
// exista la traducción real; antes se generaba también la copia /en de cada una.
// Los artículos del blog salen de src/data/posts (import relativo: este archivo
// lo lee vite.config.ts, que no conoce el alias @/).
export const prerenderRoutes = [
  "/",
  "/services",
  "/quote",
  "/blog",
  ...POSTS.map((post) => `/blog/${post.slug}`),
  "/about-us",
  "/contact",
  "/terms-and-conditions",
  "/privacy-policy",
];
