import { useEffect } from "react";

/**
 * Animación de entrada al hacer scroll para los elementos con data-reveal.
 *
 * Es una mejora opcional, segura para el prerender y sin saltos de diseño:
 * - Sin JavaScript (o durante el prerender) todo se ve normal: el CSS solo
 *   oculta elementos cuando <html> tiene la clase "reveal-ready".
 * - Lo que ya está en pantalla al cargar se marca como visto antes de activar
 *   la clase, así que no parpadea.
 * - Solo anima opacidad y desplazamiento (no cambia tamaños).
 * - Con "reducir movimiento" activado en el sistema, no hace nada.
 * Las páginas nuevas (al navegar) se detectan con un MutationObserver.
 */
export const useReveal = () => {
  useEffect(() => {
    const isPrerender = (window as { __PRERENDER_INJECTED?: { prerender?: boolean } }).__PRERENDER_INJECTED?.prerender === true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.getElementById("contenido");
    if (isPrerender || reduceMotion || !root || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    const scan = () => {
      root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-watched])").forEach((el) => {
        el.setAttribute("data-watched", "");
        if (el.getBoundingClientRect().top < window.innerHeight) el.setAttribute("data-shown", "");
        else io.observe(el);
      });
    };

    scan();
    document.documentElement.classList.add("reveal-ready");
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      document.documentElement.classList.remove("reveal-ready");
    };
  }, []);
};
