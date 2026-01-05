import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import prerender from "@prerenderer/rollup-plugin";
import { prerenderRoutes } from "./src/prerender-routes";

export default defineConfig({
  base: "/",
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
