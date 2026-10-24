import { useTranslation } from "react-i18next";

/**
 * Mockup de una página web en computador y celular, hecho solo con código
 * (sin fotos). Es una ilustración: un solo nombre accesible y nada de texto.
 */
export const DeviceMockup = () => {
  const { t } = useTranslation();

  return (
    <div role="img" aria-label={t("home.hero.mockupLabel")} className="relative mx-auto w-full max-w-xl animate-float pb-10 sm:pb-14">
      {/* Computador */}
      <div className="overflow-hidden rounded-2xl bg-navy-800 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)] ring-1 ring-white/15">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
          <span className="size-2.5 rounded-full bg-gold-500/80" />
          <span className="size-2.5 rounded-full bg-white/25" />
          <span className="size-2.5 rounded-full bg-white/25" />
          <span className="ml-3 h-4 w-1/2 rounded-full bg-white/10" />
        </div>
        <div className="flex flex-col gap-4 bg-cream-50 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="h-3 w-16 rounded-full bg-navy-900" />
            <span className="flex gap-2">
              <span className="h-2.5 w-8 rounded-full bg-navy-900/20" />
              <span className="h-2.5 w-8 rounded-full bg-navy-900/20" />
              <span className="h-2.5 w-10 rounded-full bg-gold-500" />
            </span>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-navy-900 to-navy-700 p-4 sm:p-6">
            <span className="block h-3.5 w-3/4 rounded-full bg-white/90" />
            <span className="mt-2 block h-3.5 w-1/2 rounded-full bg-gold-400" />
            <span className="mt-4 block h-2 w-2/3 rounded-full bg-white/30" />
            <span className="mt-4 block h-6 w-24 rounded-full bg-gold-500" />
            {/* Barras de la marca */}
            <span className="absolute right-4 bottom-0 flex items-end gap-1.5">
              <span className="h-8 w-2 rounded-t-full bg-gold-500/60" />
              <span className="h-14 w-2 rounded-t-full bg-gold-400/80" />
              <span className="h-10 w-2 rounded-t-full bg-gold-500/60" />
              <span className="h-16 w-2 rounded-t-full bg-white/30" />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-navy-900/8">
                <span className="size-5 rounded-md bg-gold-100 ring-1 ring-gold-500/40" />
                <span className="h-2 w-full rounded-full bg-navy-900/15" />
                <span className="h-2 w-2/3 rounded-full bg-navy-900/10" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Celular, superpuesto abajo a la izquierda */}
      <div className="absolute bottom-0 -left-2 w-[30%] min-w-24 overflow-hidden rounded-[1.6rem] border-[6px] border-navy-950 bg-cream-50 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] sm:-left-6">
        <div className="mx-auto mt-1.5 h-1.5 w-1/3 rounded-full bg-navy-950" />
        <div className="flex flex-col gap-2 p-2.5">
          <span className="rounded-lg bg-linear-to-br from-navy-900 to-navy-700 p-2.5">
            <span className="block h-2 w-4/5 rounded-full bg-white/90" />
            <span className="mt-1.5 block h-2 w-1/2 rounded-full bg-gold-400" />
            <span className="mt-2.5 block h-3.5 w-12 rounded-full bg-gold-500" />
          </span>
          <span className="h-10 rounded-lg bg-white ring-1 ring-navy-900/8" />
          <span className="h-10 rounded-lg bg-white ring-1 ring-navy-900/8" />
          <span className="ml-auto size-5 rounded-full bg-social-whatsapp-dark" />
        </div>
      </div>
    </div>
  );
};
