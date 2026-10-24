import { useTranslation } from "react-i18next";

import { PageSeo } from "@/components/seo/PageSeo";
import { CtaBand } from "@/components/sections/CtaBand";
import { Clients } from "@/components/sections/home/Clients";
import { Hero } from "@/components/sections/home/Hero";
import { InstagramFeed } from "@/components/sections/home/InstagramFeed";
import { Plans } from "@/components/sections/home/Plans";
import { Process } from "@/components/sections/home/Process";
import { Services } from "@/components/sections/home/Services";

export const Home = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageSeo
        title={t("seo.homeTitle")}
        description={t("seo.homeDescription")}
      />
      <main>
        <Hero />
        <Services />
        <Process />
        <Plans />
        <Clients />
        <CtaBand />
        <InstagramFeed />
      </main>
    </>
  );
};
