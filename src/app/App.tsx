import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
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
import { SplashScreen } from "@/components/layout/splashScreen/SplashScreen";
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
      <AnimatePresence mode="wait">
        <Outlet />
      </AnimatePresence>
      <Footer />
    </>
  );
};

export const App = () => {
  const isPrerender =
    typeof window !== "undefined" &&
    (window as any).__PRERENDER_INJECTED?.prerender === true;

  const [canAnimate, setCanAnimate] = useState(isPrerender);
  const [showSplash, setShowSplash] = useState(!isPrerender);

  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          element: (
            <>
              {showSplash && (
                <SplashScreen
                  onReady={() => setCanAnimate(true)}
                  onFinish={() => setShowSplash(false)}
                />
              )}
              <Layout />
              <PrerenderReady />
            </>
          ),
          children: [
            // Las rutas /en están desactivadas: su contenido era de otra
            // plantilla (fiscal). Volverán cuando exista la traducción real:
            // ...createServerRoutes(canAnimate, "/en"),
            ...createServerRoutes(canAnimate),
            {
              path: "*",
              element: (
                <PageTransition>
                  <NotFound canAnimate={canAnimate} />
                </PageTransition>
              ),
            },
          ],
        },
      ]),
    [canAnimate, showSplash]
  );

  return <RouterProvider router={router} />;
};
