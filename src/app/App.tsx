import { AnimatePresence } from "framer-motion";
import {
  RouterProvider,
  Outlet,
  ScrollRestoration,
  createBrowserRouter,
} from "react-router-dom";

import { PrerenderReady } from "./PrerenderReady";

import { Header } from "@/components/layout/header/Header";
import { Footer } from "@/components/layout/footer/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { useReveal } from "@/components/layout/useReveal";
import { PageTransition } from "@/components/layout/PageTransition";
import { NotFound } from "@/pages/not-found/NotFound";
import { createServerRoutes } from "./routes.ssr";

import "@/styles/global.css";

const Layout = () => {
  // El idioma lo maneja src/i18n/config.ts (switch ES/EN, sin rutas /en)
  useReveal();

  return (
    <>
      <Header />
      {/* Destino del enlace "Saltar al contenido" del encabezado */}
      <div id="contenido" tabIndex={-1} className="outline-none">
        <AnimatePresence mode="wait">
          <Outlet />
        </AnimatePresence>
      </div>
      {/* Justo antes del pie: así los botones flotantes (WhatsApp e idioma) se detienen encima de él */}
      <WhatsAppFloat />
      <Footer />
    </>
  );
};

// Sin pantalla de carga (splash): el HTML prerenderizado ya muestra la página
// real desde el primer momento.
const router = createBrowserRouter([
  {
    element: (
      <>
        <Layout />
        {/* Cada página nueva empieza arriba; atrás/adelante recuerdan la posición */}
        <ScrollRestoration />
        <PrerenderReady />
      </>
    ),
    children: [
      // Las rutas /en están desactivadas: su contenido era de otra
      // plantilla (fiscal). Volverán cuando exista la traducción real:
      // ...createServerRoutes("/en"),
      ...createServerRoutes(),
      {
        path: "*",
        element: (
          <PageTransition>
            <NotFound />
          </PageTransition>
        ),
      },
    ],
  },
]);

export const App = () => <RouterProvider router={router} />;
