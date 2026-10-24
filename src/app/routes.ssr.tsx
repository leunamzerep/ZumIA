import type { RouteObject } from "react-router-dom";
import { routes } from "./routes";
import { PageTransition } from "@/components/layout/PageTransition";

const buildPath = (basePath: string, path: string) => {
  if (!basePath) return path;
  if (path === "/") return basePath;
  return `${basePath}${path}`;
};

export const createServerRoutes = (basePath = ""): RouteObject[] =>
  routes.map(({ path, Component }) => ({
    path: buildPath(basePath, path),
    element: (
      <PageTransition>
        <Component />
      </PageTransition>
    ),
  }));
