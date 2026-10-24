import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

import { PATHS } from "@/config/paths";
import styles from "./NotFound.module.css";

export const NotFound = () => {
  const { t, i18n } = useTranslation();
  const homeHref = i18n.resolvedLanguage === "en" ? "/en" : PATHS.home;

  return (
    <>
      <Helmet defer={false}>
        <title>{t("seo.notFoundTitle")}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className={styles.mainContainer}>
        <div className={styles.card}>
          <p className={styles.code}>404</p>
          <h1 className={styles.title}>{t("notFound.title")}</h1>
          <p className={styles.text}>{t("notFound.description")}</p>
          <Link to={homeHref} className={styles.link}>
            {t("notFound.cta")}
          </Link>
        </div>
      </main>
    </>
  );
};
