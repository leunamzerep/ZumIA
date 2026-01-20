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

import { Header } from "./header/Header";
import { Footer } from "./footer/Footer";
import { SplashScreen } from "./components/splashScreen/SplashScreen";
import { createServerRoutes } from "./routes.ssr";

import "./assets/css/app.css";
import { getLangFromPath } from "./i18n/langRouting";

const Layout = () => {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();

  useEffect(() => {
    const lang = getLangFromPath(pathname);
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
            ...createServerRoutes(canAnimate),
            ...createServerRoutes(canAnimate, "/en"),
          ],
        },
      ]),
    [canAnimate, showSplash]
  );

  return <RouterProvider router={router} />;
};
