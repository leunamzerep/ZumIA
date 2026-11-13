import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import prerender from "@prerenderer/rollup-plugin";
import { prerenderRoutes } from "./src/app/prerender-routes";

export default defineConfig(({ mode }) => {
  // Mismo criterio que PAYMENTS_ENABLED (src/config/site.ts): solo "true" exacto y con VITE_VERIFY_API_URL.
  // loadEnv lee los .env y da prioridad a las variables ya definidas en el entorno (como en el build de GitHub).
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const paymentsEnabled = env.VITE_PAYMENTS_ENABLED === "true" && Boolean(env.VITE_VERIFY_API_URL?.trim());
  // /payment/result solo se prerenderiza con los pagos encendidos (y nunca entra al sitemap)
  const routes = paymentsEnabled ? [...prerenderRoutes, "/payment/result"] : prerenderRoutes;

  return {
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
        routes,
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
  };
});
