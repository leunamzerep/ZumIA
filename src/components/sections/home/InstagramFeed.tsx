import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { INSTAGRAM_FEED_URL } from "@/config/site";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";

const extractInstagramPostId = (url: string): string | null => {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([^/?#]+)/);
  return match ? match[1] : null;
};

/**
 * Publicaciones de Instagram (misma lógica y misma URL de Apps Script que antes).
 * La sección solo aparece si llegan publicaciones.
 */
export const InstagramFeed = () => {
  const { t } = useTranslation();
  const [igPostIds, setIgPostIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(INSTAGRAM_FEED_URL);
        const json = await res.json();

        if (Array.isArray(json.posts)) {
          const ids = json.posts
            .map(extractInstagramPostId)
            .filter((id: string | null): id is string => Boolean(id));
          setIgPostIds(ids);
        }
      } catch (err) {
        console.error("No se pudieron cargar las publicaciones de Instagram", err);
      }
    })();
  }, []);

  if (igPostIds.length === 0) return null;

  return (
    <Section tone="cream" labelledBy="instagram-titulo">
      <div className="flex flex-col gap-10">
        <SectionHeading id="instagram-titulo" titleKey="home.invitation" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {igPostIds.map((id) => (
            <iframe
              key={id}
              title={t("home.instagramPost", { id })}
              src={`https://www.instagram.com/p/${id}/embed`}
              width="100%"
              height="500"
              loading="lazy"
              className="w-full rounded-card border-0 bg-white"
            />
          ))}
        </div>
      </div>
    </Section>
  );
};
