import type { RouteObject } from "react-router-dom";
import { routes } from "./routes";
import { PageTransition } from "./components/PageTransition";
import { PageWrapper } from "./PageWrapper";

export const createServerRoutes = (canAnimate: boolean): RouteObject[] =>
  routes.map(({ path, Component }) => ({
    path,
    element: (
      <PageTransition>
        <PageWrapper Component={Component} canAnimate={canAnimate} />
      </PageTransition>
    ),
  }));
