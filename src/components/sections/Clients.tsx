import { useTranslation } from "react-i18next";

import ac4Logo from "@/assets/img/logo-ac4.webp";
import jotuLogo from "@/assets/img/logo-jotu.webp";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Clientes reales. Cuando haya más, se agregan aquí. */
const CLIENTS = [
  { key: "jotu", url: "https://jotusolutions.net/", logo: jotuLogo, size: 480 },
  { key: "ac4", url: "https://leunamzerep.github.io/AC4GROUP/", logo: ac4Logo, size: 150 },
];

export const Clients = () => {
  const { t } = useTranslation();

  return (
    <Section tone="cream" labelledBy="clientes-titulo">
      <div className="flex flex-col items-center gap-10">
        <div data-reveal>
          <SectionHeading id="clientes-titulo" align="center" titleKey="about.clients" />
        </div>
        <div className="flex w-full flex-wrap justify-center gap-6">
          {CLIENTS.map(({ key, url, logo, size }) => (
            <a
              key={key}
              data-reveal
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group card-hover flex w-full max-w-sm flex-col items-center gap-4 rounded-card bg-white p-8 ring-1 ring-navy-900/8 shadow-[0_24px_60px_-32px_rgba(19,23,61,0.35)]"
            >
              <img src={logo} alt={t(`clients.${key}Alt`)} width={size} height={size} loading="lazy" className="size-40 object-contain transition-transform duration-300 group-hover:scale-105" />
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700">
                {t("about.from")} {t(`clients.${key}Name`)}
                <ArrowUpRightIcon className="size-4" />
                <span className="sr-only">{t("footer.newTab")}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </Section>
  );
};
