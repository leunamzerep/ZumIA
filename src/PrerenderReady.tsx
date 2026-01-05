import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function helmetApplied(): boolean {
  const desc = document
    .querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.getAttribute("content")
    ?.trim();

  const canonical = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  )?.href;

  // index.html NO tiene description/canonical, así que esto confirma que Helmet ya escribió.
  return Boolean(desc) && Boolean(canonical) && document.title.trim().length > 0;
}

export function PrerenderReady() {
  const { pathname } = useLocation();

  useEffect(() => {
    let fired = false;

    const fire = () => {
      if (fired) return;
      fired = true;
      document.dispatchEvent(new Event("prerender:ready"));
    };

    if (helmetApplied()) {
      fire();
      return;
    }

    const obs = new MutationObserver(() => {
      if (helmetApplied()) {
        obs.disconnect();
        fire();
      }
    });

    obs.observe(document.head, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });

    const timeout = window.setTimeout(() => {
      obs.disconnect();
      fire();
    }, 4000);

    return () => {
      obs.disconnect();
      clearTimeout(timeout);
    };
  }, [pathname]);

  return null;
}
