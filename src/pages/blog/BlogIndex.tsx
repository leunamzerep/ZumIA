import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { blogPostPath } from "@/config/paths";
import { POSTS, readingMinutes } from "@/data/posts";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { PageSeo } from "@/components/seo/PageSeo";
import { PageHero } from "@/components/sections/PageHero";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { formatPostDate } from "./formatDate";

/** Índice del blog: una tarjeta por artículo (título, descripción y fecha). */
export const BlogIndex = () => {
  const { t, i18n } = useTranslation();
  const localizePath = useLocalizedPath();
  // Los artículos solo existen en español: con el sitio en inglés se avisa arriba
  const isEnglish = i18n.language === "en";

  return (
    <>
      <PageSeo title={t("seo.blogTitle")} description={t("seo.blogDescription")} />
      {/* "relative": el patrón de fondo de todas las secciones se alinea con <main> */}
      <main className="relative">
        <PageHero id="blog-titulo" eyebrow={t("blog.eyebrow")} titleKey="blog.title" lead={t("blog.lead")} />

        <Section tone="white" innerClassName="flex flex-col gap-8">
          {isEnglish && (
            <p className="rounded-2xl bg-cream-50 p-4 leading-relaxed font-semibold text-navy-900 ring-1 ring-navy-900/10">
              {t("blog.notice")}
            </p>
          )}
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((post, i) => (
              <li key={post.slug} data-reveal style={{ "--reveal-delay": `${i * 120}ms` } as CSSProperties}>
                {/* Toda la tarjeta es clicable: el enlace del título se extiende con un ::after */}
                <Card as="article" className="card-hover flex h-full flex-col gap-4 overflow-hidden focus-within:ring-2 focus-within:ring-gold-500">
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-gold-700 via-gold-400 to-transparent" />
                  <p className="text-sm font-semibold text-gold-700">
                    <time dateTime={post.date}>{formatPostDate(post.date, i18n.language)}</time>
                    <span aria-hidden="true"> · </span>
                    {t("blog.readingTime", { count: readingMinutes(post) })}
                  </p>
                  <h2 lang="es" className="font-title text-xl leading-snug font-bold text-balance text-navy-900 md:text-2xl">
                    <Link
                      to={localizePath(blogPostPath(post.slug))}
                      className="rounded-md outline-none after:absolute after:inset-0 after:content-[''] hover:text-navy-700"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p lang="es" className="leading-relaxed text-navy-600">{post.description}</p>
                  <span aria-hidden="true" className="mt-auto pt-2 text-sm font-bold text-navy-900">
                    {t("blog.readMore")} →
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </>
  );
};
