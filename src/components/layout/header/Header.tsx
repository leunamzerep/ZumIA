import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
// import { LanguageSwitch } from "@/components/langSwitch/LangSwitch";
import { Link, useLocation } from "react-router-dom";

import logo from "@/assets/img/logo-zumia.webp";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { PATHS } from "@/config/paths";
import { WHATSAPP_URL } from "@/config/site";
import { CloseIcon, MenuIcon, WhatsAppIcon } from "@/components/ui/icons";
import { NAV_LINKS, isCurrentPath } from "../navLinks";

const MOBILE_MENU_ID = "menu-movil";

// Animación del menú móvil (solo CSS). El panel se despliega desde la esquina
// superior derecha (junto al botón ☰) hacia la izquierda y hacia abajo, y los
// enlaces entran desde la derecha uno tras otro. Con "reducir movimiento"
// activado en el sistema, global.css apaga las transiciones.
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const panelClass = (open: boolean) =>
  "fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-navy-900 text-white " +
  "[--focus-ring:var(--color-gold-400)] md:hidden " +
  // Al abrir, visible al instante (si no, el foco no puede entrar); al cerrar,
  // visibility espera a que termine el recorte para ocultarse
  `${EASE} ` +
  (open
    ? "visible transition-[clip-path] duration-500 [clip-path:inset(0_0_0_0_round_0)]"
    : "invisible transition-[clip-path,visibility] duration-300 [clip-path:inset(0_0_100%_100%_round_0_0_0_2.5rem)]");
const itemClass = (open: boolean) =>
  `transition-[translate,opacity] duration-500 ${EASE} ` +
  (open ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0");
// Retraso escalonado al abrir; al cerrar, todo sale a la vez
const itemDelay = (open: boolean, index: number) => ({
  transitionDelay: open ? `${120 + index * 70}ms` : "0ms",
});

// Píldoras del menú de escritorio: la página actual va en navy con texto blanco
const pillClass = (active: boolean) =>
  "inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 " +
  (active ? "bg-navy-900 text-white" : "text-navy-900 hover:bg-navy-900/8");

export const Header = () => {
  const { t } = useTranslation();
  const localizePath = useLocalizedPath();
  const { pathname } = useLocation();

  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Al cambiar de página, el menú móvil se cierra
  useEffect(() => setOpen(false), [pathname]);

  // Menú móvil abierto: bloquea el scroll de la página, lleva el foco al primer
  // enlace, cierra con Esc y mantiene el Tab dentro del menú (botón + enlaces)
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.style.overflow = "hidden";

    const focusables = () => [
      toggleRef.current,
      ...(panelRef.current?.querySelectorAll<HTMLElement>("a[href]") ?? []),
    ].filter((el): el is HTMLElement => Boolean(el));
    focusables()[1]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey
        ? (index <= 0 ? items.length - 1 : index - 1)
        : (index === items.length - 1 ? 0 : index + 1);
      e.preventDefault();
      items[next].focus();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      root.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-navy-900/10 bg-cream-50/85 font-body text-navy-900 backdrop-blur-md">
        <a
          href="#contenido"
          className="sr-only rounded-full bg-navy-900 px-5 py-3 text-sm font-semibold text-white [--focus-ring:var(--color-gold-400)] focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50"
        >
          {t("header.skip")}
        </a>

        <div className="container-site flex h-16 items-center justify-between gap-4 md:h-20">
          <Link to={localizePath(PATHS.home)} aria-label={t("header.logo")} className="flex items-center gap-2.5 rounded-xl">
            <img src={logo} alt="" width={192} height={192} className="size-10 md:size-12" />
            <span aria-hidden="true" className="font-title text-lg font-bold uppercase leading-none tracking-wide md:text-xl">
              {t("brand.name")}
            </span>
          </Link>

          <nav aria-label={t("header.menu")} className="hidden md:block">
            <ul className="flex items-center gap-1 rounded-full bg-white/70 p-1 ring-1 ring-navy-900/10">
              {NAV_LINKS.map(({ to, labelKey }) => {
                const active = isCurrentPath(pathname, to);
                return (
                  <li key={to}>
                    <Link to={localizePath(to)} aria-current={active ? "page" : undefined} className={pillClass(active)}>
                      {t(labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-full bg-gold-500 px-5 py-2.5 text-sm font-bold text-navy-900 shadow-sm transition-colors duration-200 hover:bg-gold-400 lg:inline-flex"
          >
            <WhatsAppIcon className="size-4" />
            {t("header.whatsapp")}
          </a>

          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={MOBILE_MENU_ID}
            aria-label={open ? t("header.closeMenu") : t("header.openMenu")}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-11 items-center justify-center rounded-full bg-navy-900 text-white md:hidden"
          >
            {open ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
          {/* <LanguageSwitch /> */}
        </div>
      </header>

      {/* Menú móvil: panel navy a pantalla completa bajo el encabezado. Va fuera del
          <header> porque su backdrop-blur haría que "fixed" se mida contra el encabezado.
          Cerrado queda "invisible" (visibility: hidden): no se ve, no recibe el foco
          y los lectores de pantalla lo ignoran. */}
      <div id={MOBILE_MENU_ID} ref={panelRef} className={panelClass(open)}>
        <nav aria-label={t("header.menu")} className="container-site flex flex-col gap-8 py-10">
          <ul className="flex flex-col gap-2">
            {NAV_LINKS.map(({ to, labelKey }, index) => {
              const active = isCurrentPath(pathname, to);
              return (
                <li key={to} className={itemClass(open)} style={itemDelay(open, index)}>
                  <Link
                    to={localizePath(to)}
                    aria-current={active ? "page" : undefined}
                    className={
                      "block rounded-2xl px-4 py-3 font-title text-3xl font-extrabold uppercase tracking-wide " +
                      (active ? "bg-white/10 text-gold-400" : "text-white hover:bg-white/5")
                    }
                  >
                    {t(labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 rounded-full bg-gold-500 px-6 py-4 text-base font-bold text-navy-900 ${itemClass(open)}`}
            style={itemDelay(open, NAV_LINKS.length)}
          >
            <WhatsAppIcon className="size-5" />
            {t("header.whatsapp")}
          </a>
        </nav>
      </div>
    </>
  );
};
