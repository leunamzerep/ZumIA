import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
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
    prerender({
      routes: prerenderRoutes,
      renderer: "@prerenderer/renderer-puppeteer",
      rendererOptions: {
        renderAfterDocumentEvent: "prerender:ready",
      },
    }),
  ],
  build: {
    manifest: true,
    outDir: "dist",
  },
});
