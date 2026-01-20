import { useLocation } from "react-router-dom";

import { getLangFromPath, withLangPrefix } from "./langRouting";

export const useLocalizedPath = () => {
  const { pathname } = useLocation();
  const lang = getLangFromPath(pathname);

  return (path: string) => withLangPrefix(path, lang);
};
