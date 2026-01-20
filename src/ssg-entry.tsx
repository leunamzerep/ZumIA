import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router-dom/server";

import { createServerRoutes } from "./routes.ssr";

export async function render(url: string) {
  const routes = [
    {
      path: "/",
      children: [
        ...createServerRoutes(true),
        ...createServerRoutes(true, "/en"),
      ],
    },
  ];

  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(url));

  if (context instanceof Response) {
    throw new Error("SSG routing error");
  }

  const router = createStaticRouter(handler.dataRoutes, context);

  const helmetContext: any = {};

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouterProvider router={router} context={context} />
    </HelmetProvider>
  );

  const { helmet } = helmetContext;

  return {
    html,
    head:
      `${helmet?.title?.toString() ?? ""}` +
      `${helmet?.meta?.toString() ?? ""}`,
  };
}
