import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { PATHS } from "@/config/paths";
import { useWhatsappUrl } from "@/config/whatsapp";
import { getPostBySlug, readingMinutes, type PostBlock } from "@/data/posts";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { PageSeo } from "@/components/seo/PageSeo";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import { GeometricPattern } from "@/components/ui/GeometricPattern";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { NotFound } from "@/pages/not-found/NotFound";
import { formatPostDate } from "./formatDate";

const Block = ({ block }: { block: PostBlock }) => {
  if (block.type === "h2") {
    return <h2 className="mt-6 font-title text-2xl leading-tight font-bold text-balance text-navy-900 md:text-[1.75rem]">{block.text}</h2>;
  }
  if (block.type === "list") {
    return (
      <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-gold-700">
        {block.items.map((item) => (
          <li key={item} className="pl-1">{item}</li>
        ))}
      </ul>
    );
  }
  return <p>{block.text}</p>;
};

/** Artículo del blog (/blog/<slug>/). Si el slug no existe, muestra la página 404. */
export const BlogPost = () => {
  const { t, i18n } = useTranslation();
  const { slug } = useParams();
  const localizePath = useLocalizedPath();
  const whatsappUrl = useWhatsappUrl();
  const post = getPostBySlug(slug);

  if (!post) return <NotFound />;

  const isEnglish = i18n.language === "en";
  const backLinkClass =
    "inline-flex w-fit items-center gap-2 rounded-full text-sm font-semibold underline-offset-4 hover:underline";

  return (
    <>
      <PageSeo
        title={`${post.title} | Zumia Solutions`}
        description={post.description}
        article={{ headline: post.title, published: post.date }}
      />
      {/* "relative": el patrón de fondo de todas las secciones se alinea con <main> */}
      <main className="relative">
        {/* Encabezado navy como el de las páginas internas, con el título del artículo (h1) */}
        <section
          aria-labelledby="articulo-titulo"
          className="isolate overflow-hidden [clip-path:inset(0)] bg-navy-950 bg-[radial-gradient(50rem_30rem_at_90%_0%,rgba(212,143,64,0.2),transparent_60%),linear-gradient(160deg,#13173D,#0B0E26)] font-body text-white [--focus-ring:var(--color-gold-400)]"
        >
          <GeometricPattern tone="dark" />
          <div className="relative">
            <GeometricPattern variant="cluster" className="-right-6 -bottom-8 hidden w-72 opacity-60 md:block" />
            <div className="container-site flex flex-col gap-6 pt-12 pb-14 md:pt-16 md:pb-20">
              <Link to={localizePath(PATHS.blog)} className={`${backLinkClass} text-gold-400`}>
                <span aria-hidden="true">←</span> {t("blog.back")}
              </Link>
              <h1 id="articulo-titulo" lang="es" className="max-w-4xl font-title text-h2 font-extrabold text-balance">
                {post.title}
              </h1>
              <p className="text-sm font-semibold text-white/75 md:text-base">
                <time dateTime={post.date}>{formatPostDate(post.date, i18n.language)}</time>
                <span aria-hidden="true"> · </span>
                {t("blog.readingTime", { count: readingMinutes(post) })}
              </p>
            </div>
          </div>
        </section>

        <Section tone="white" innerClassName="flex flex-col gap-12">
          {isEnglish && (
            <p className="max-w-[70ch] rounded-2xl bg-cream-50 p-4 leading-relaxed font-semibold text-navy-900 ring-1 ring-navy-900/10">
              {t("blog.notice")}
            </p>
          )}
          {/* El contenido del artículo siempre está en español */}
          <article lang="es" aria-labelledby="articulo-titulo" className="flex max-w-[70ch] flex-col gap-5 text-[1.0625rem] leading-[1.8] text-navy-800">
            {post.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </article>

          {/* Llamado discreto al final: cotizador y WhatsApp */}
          <aside aria-labelledby="articulo-cta" className="flex max-w-[70ch] flex-col gap-4 rounded-card bg-cream-50 p-6 ring-1 ring-navy-900/10 md:p-8">
            <h2 id="articulo-cta" className="font-title text-xl font-bold text-navy-900 md:text-2xl">{t("blog.ctaTitle")}</h2>
            <p className="leading-relaxed text-navy-600">{t("blog.ctaText")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink to={localizePath(PATHS.quote)} variant="secondary">
                {t("blog.ctaQuote")}
              </ButtonLink>
              <ButtonAnchor href={whatsappUrl} target="_blank" rel="noopener noreferrer" variant="outline">
                <WhatsAppIcon className="size-4" />
                {t("header.whatsapp")}
                <span className="sr-only">{t("footer.newTab")}</span>
              </ButtonAnchor>
            </div>
          </aside>

          <Link to={localizePath(PATHS.blog)} className={`${backLinkClass} text-navy-900`}>
            <span aria-hidden="true">←</span> {t("blog.back")}
          </Link>
        </Section>
      </main>
    </>
  );
};
