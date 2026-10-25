import { useTranslation } from "react-i18next";

import jotuLogo from "@/assets/img/logo-jotu.webp";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Cliente real (JoTu). Cuando haya más, se agregan aquí. */
const JOTU_URL = "https://jotusolutions.net/";

export const Clients = () => {
  const { t } = useTranslation();

  return (
    <Section tone="cream" labelledBy="clientes-titulo">
      <div className="flex flex-col items-center gap-10">
        <div data-reveal>
          <SectionHeading id="clientes-titulo" align="center" titleKey="about.clients" />
        </div>
        <a
          data-reveal
          href={JOTU_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group card-hover flex w-full max-w-sm flex-col items-center gap-4 rounded-card bg-white p-8 ring-1 ring-navy-900/8 shadow-[0_24px_60px_-32px_rgba(19,23,61,0.35)]"
        >
          <img src={jotuLogo} alt={t("clients.jotuAlt")} width={480} height={480} loading="lazy" className="size-40 object-contain transition-transform duration-300 group-hover:scale-105" />
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700">
            {t("about.from")} {t("clients.jotuName")}
            <ArrowUpRightIcon className="size-4" />
            <span className="sr-only">{t("footer.newTab")}</span>
          </span>
        </a>
      </div>
    </Section>
  );
};
