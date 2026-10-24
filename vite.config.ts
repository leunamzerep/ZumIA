import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import prerender from "@prerenderer/rollup-plugin";
import { prerenderRoutes } from "./src/app/prerender-routes";

export default defineConfig({
  base: "/",
  resolve: {
    // Alias @/ → src/ (ruta absoluta, como pide la documentación de Vite)
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    prerender({
      routes: prerenderRoutes,
      renderer: "@prerenderer/renderer-puppeteer",
      rendererOptions: {
        renderAfterDocumentEvent: "prerender:ready",
        // Marca la página como prerender (window.__PRERENDER_INJECTED): así
        // useReveal no oculta nada en el HTML estático que se genera
        inject: { prerender: true },
      },
    }),
  ],
  build: {
    manifest: true,
    outDir: "dist",
  },
});
