const base = ["/", "/about-us", "/contact", "/terms-and-conditions", "/privacy-policy"];
export const prerenderRoutes = base.flatMap((r) => [
  r,
  r === "/" ? "/en" : `/en${r}`,
]);
