import type { ComponentType } from "react";

export const PageWrapper = ({
  Component,
  canAnimate,
}: {
  Component: ComponentType<{ canAnimate: boolean }>;
  canAnimate: boolean;
}) => {
  return <Component canAnimate={canAnimate} />;
};
