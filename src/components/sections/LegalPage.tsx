import { Trans, useTranslation } from "react-i18next";

import { PageSeo } from "@/components/seo/PageSeo";
import { PageHero } from "@/components/sections/PageHero";
import { Section } from "@/components/ui/Section";
import type { LegalBlock, LegalSection } from "@/data/legal";
import { EMAIL, NOTIFICATION_ADDRESS, OWNER_NAME, OWNER_NIT, PHONE_DISPLAY, SIC_URL, SITE_URL } from "@/config/site";

// Datos que los textos legales toman de src/config/site.ts ({{name}}, {{email}}…)
const VALUES = {
  name: OWNER_NAME,
  nit: OWNER_NIT,
  address: NOTIFICATION_ADDRESS,
  email: EMAIL,
  phone: PHONE_DISPLAY,
  sicUrl: SIC_URL,
  domain: new URL(SITE_URL).host,
};

/** Texto de es.json con <1>negrita</1> y <2>enlace a la SIC</2> */
const Rich = ({ k }: { k: string }) => (
  <Trans
    i18nKey={k}
    values={VALUES}
    components={{
      // La negrita hereda el color del texto que la rodea (blanco en el encabezado, navy en el cuerpo)
      1: <strong className="font-semibold" />,
      2: <a href={SIC_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy-900 underline underline-offset-4 hover:text-gold-700" />,
    }}
  />
);

const Block = ({ base, block }: { base: string; block: LegalBlock }) => {
  const key = `${base}.${block.key}`;

  if (block.type === "p") return <p><Rich k={key} /></p>;

  if (block.type === "list") {
    return (
      <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-gold-700">
        {Array.from({ length: block.count }, (_, i) => (
          <li key={i} className="pl-1"><Rich k={`${key}.i${i + 1}`} /></li>
        ))}
      </ul>
    );
  }

  const cols = Array.from({ length: block.cols }, (_, c) => c + 1);
  const rows = Array.from({ length: block.rows }, (_, r) => r + 1);
  return (
    // En celular la tabla puede desplazarse a los lados sin romper la página
    <div className="overflow-x-auto rounded-2xl ring-1 ring-navy-900/10">
      <table className="w-full min-w-[28rem] border-collapse text-left text-[0.975rem]">
        <thead className="bg-navy-900 text-white">
          <tr>
            {cols.map((c) => (
              <th key={c} scope="col" className="px-4 py-3 font-semibold"><Rich k={`${key}.h${c}`} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r} className="border-t border-navy-900/10 even:bg-cream-50">
              {cols.map((c) =>
                c === 1 ? (
                  <th key={c} scope="row" className="px-4 py-3 font-normal"><Rich k={`${key}.r${r}c${c}`} /></th>
                ) : (
                  <td key={c} className="px-4 py-3 font-semibold whitespace-nowrap text-navy-900"><Rich k={`${key}.r${r}c${c}`} /></td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** Lista de secciones del índice */
const Toc = ({ ns, sections }: { ns: string; sections: LegalSection[] }) => {
  const { t } = useTranslation();
  return (
    // Los títulos de las secciones siempre están en español (también con el sitio en inglés)
    <ol lang="es" className="flex flex-col gap-1 text-sm">
      {sections.map(({ id }) => (
        <li key={id}>
          <a
            href={`#${ns}-${id}`}
            className="block rounded-lg px-3 py-1.5 leading-snug text-navy-700 transition-colors hover:bg-navy-900/5 hover:text-navy-900"
          >
            {t(`${ns}.${id}.title`)}
          </a>
        </li>
      ))}
    </ol>
  );
};

/**
 * Página legal (Términos o Privacidad): encabezado, índice de secciones y texto
 * con buen interlineado. ns = "terms" | "privacy" (prefijo de las claves en es.json).
 */
export const LegalPage = ({
  ns,
  sections,
  seoTitleKey,
  seoDescriptionKey,
}: {
  ns: "terms" | "privacy";
  sections: LegalSection[];
  seoTitleKey: string;
  seoDescriptionKey: string;
}) => {
  const { t, i18n } = useTranslation();
  // Los textos legales solo existen en español: en inglés se muestran en
  // español (fallback de i18next) con un aviso arriba
  const isEnglish = i18n.language === "en";

  return (
    <>
      <PageSeo title={t(seoTitleKey)} description={t(seoDescriptionKey)} />
      {/* "relative": el patrón de fondo de todas las secciones se alinea con <main> */}
      <main className="relative">
        <PageHero id={`${ns}-titulo`} eyebrow={t("footer.legals")} titleKey={`${ns}.h1`} lead={<Rich k={`${ns}.updated`} />} />

        <Section tone="white" innerClassName="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-16">
          {/* Solo con el sitio en inglés: aviso de que el documento está en español */}
          {isEnglish && (
            <p className="rounded-2xl bg-cream-50 p-4 leading-relaxed font-semibold text-navy-900 ring-1 ring-navy-900/10 lg:col-span-2">
              {t("legal.notice")}
            </p>
          )}
          {/* Índice: desplegable en celular, fijo al lado en escritorio */}
          <details className="rounded-2xl bg-cream-50 p-4 ring-1 ring-navy-900/10 lg:hidden">
            <summary className="cursor-pointer font-title font-bold text-navy-900">{t("legal.toc")}</summary>
            <nav aria-label={t("legal.toc")} className="mt-3">
              <Toc ns={ns} sections={sections} />
            </nav>
          </details>
          <nav aria-label={t("legal.toc")} className="hidden self-start lg:sticky lg:top-28 lg:block">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.16em] text-gold-700">{t("legal.toc")}</p>
            <Toc ns={ns} sections={sections} />
          </nav>

          <article lang="es" className="flex max-w-[70ch] flex-col gap-12 text-[1.0625rem] leading-[1.8] text-navy-800">
            {sections.map(({ id, blocks }) => (
              <section key={id} aria-labelledby={`${ns}-${id}`} className="flex flex-col gap-4">
                <h2 id={`${ns}-${id}`} className="scroll-mt-24 font-title text-2xl leading-tight font-bold text-navy-900 md:text-[1.75rem]">
                  {t(`${ns}.${id}.title`)}
                </h2>
                {blocks.map((block) => (
                  <Block key={block.key} base={`${ns}.${id}`} block={block} />
                ))}
              </section>
            ))}
          </article>
        </Section>
      </main>
    </>
  );
};
