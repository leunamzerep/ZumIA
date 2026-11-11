import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CalendarIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AGENDA_ID } from "@/config/paths";
import { BOOKING_URL } from "@/config/site";

/**
 * "Agenda tu asesoría" (Contacto, /contact/#agenda): calendario de citas de Google.
 * El iframe NO se carga hasta que la persona pulsa "Cargar calendario", así
 * Google no recibe nada de quien solo visita la página. Sin BOOKING_URL no se muestra.
 */
export const AgendaSection = () => {
  const { t } = useTranslation();
  const { hash, key } = useLocation();
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Al llegar con #agenda desde otra página, el router aún no encuentra la sección
  // (la página anterior sigue en su fundido de salida); por eso se baja aquí, al montar.
  useEffect(() => {
    if (hash !== `#${AGENDA_ID}`) return;
    const frame = requestAnimationFrame(() => document.getElementById(AGENDA_ID)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [hash, key]);

  // Tras pulsar el botón, el foco pasa al calendario (el botón desaparece)
  useEffect(() => {
    if (loaded) frameRef.current?.focus();
  }, [loaded]);

  if (!BOOKING_URL) return null;

  return (
    <Section id={AGENDA_ID} tone="white" labelledBy="agenda-titulo" className="scroll-mt-16 md:scroll-mt-20">
      <div className="flex flex-col gap-8">
        <SectionHeading id="agenda-titulo" titleKey="contact.agendaTitle" lead={t("contact.agendaText")} />
        {loaded ? (
          <iframe
            ref={frameRef}
            src={BOOKING_URL}
            title={t("contact.agendaFrameTitle")}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-[700px] w-full rounded-card border-0 bg-white ring-1 ring-navy-900/10 md:h-[600px]"
          />
        ) : (
          // En una línea: botón, ícono de calendario y nota (en móvil, la nota baja si no cabe)
          <Card className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button variant="secondary" size="lg" onClick={() => setLoaded(true)}>
              {t("contact.agendaLoad")}
            </Button>
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gold-100 text-gold-700 ring-1 ring-gold-700/20">
              <CalendarIcon className="size-6" />
            </span>
            <p className="min-w-0 flex-1 basis-48 text-sm text-navy-600">{t("contact.agendaNote")}</p>
          </Card>
        )}
      </div>
    </Section>
  );
};
