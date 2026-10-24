import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import {
  RouterProvider,
  Outlet,
  createBrowserRouter,
  useLocation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PrerenderReady } from "./PrerenderReady";

import { Header } from "@/components/layout/header/Header";
import { Footer } from "@/components/layout/footer/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { NotFound } from "@/pages/not-found/NotFound";
import { createServerRoutes } from "./routes.ssr";

import "@/styles/global.css";
// import { getLangFromPath } from "@/i18n/langRouting";

const Layout = () => {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();

  useEffect(() => {
    // Idioma fijo en español mientras no existan rutas /en (ver
    // src/i18n/config.ts). Para revertir: getLangFromPath(pathname).
    const lang = "es";
    if (i18n.resolvedLanguage !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [i18n, pathname]);

  return (
    <>
      <Header />
      {/* Destino del enlace "Saltar al contenido" del encabezado */}
      <div id="contenido" tabIndex={-1} className="outline-none">
        <AnimatePresence mode="wait">
          <Outlet />
        </AnimatePresence>
      </div>
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
