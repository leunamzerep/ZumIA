import type { RouteObject } from "react-router-dom";
import { routes } from "./routes";
import { PageTransition } from "./components/PageTransition";
import { PageWrapper } from "./PageWrapper";

const buildPath = (basePath: string, path: string) => {
  if (!basePath) return path;
  if (path === "/") return basePath;
  return `${basePath}${path}`;
};

export const createServerRoutes = (
  canAnimate: boolean,
  basePath = ""
): RouteObject[] =>
  routes.map(({ path, Component }) => ({
    path: buildPath(basePath, path),
    element: (
      <PageTransition>
        <PageWrapper Component={Component} canAnimate={canAnimate} />
      </PageTransition>
    ),
  }));
