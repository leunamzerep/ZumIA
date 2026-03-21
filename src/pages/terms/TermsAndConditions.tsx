import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

import styles from './TermsAndConditions.module.css'
import { SeoEntry } from "../../components/seoEntry/SeoEntry";
import aboutImg from "../../assets/img/aboutImg.jpg"
import { PageSeo } from "../../components/pageSeo/PageSeo";

type TermsProps = {
  canAnimate: boolean;
}

export const TermsAndConditions = ({ canAnimate }: TermsProps) => {

  const { t } = useTranslation();
  const h1 = t('terms.h1')

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!canAnimate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [canAnimate]);

  return (
    <>
      <PageSeo
        title={t("seo.termsTitle")}
        description={t("seo.termsDescription")}
      />
      <main>
        <SeoEntry imgPath={aboutImg} content={h1} canAnimate={canAnimate} />
        <div className={`${styles.main} ${animate ? styles.appear : ""}`}>
          <h2>{t('terms.section1')}</h2>
          <p>{t('terms.p1')}</p>
          <h2>{t('terms.section2')}</h2>
          <p>{t('terms.p2')}</p>
          <h2>{t('terms.section3')}</h2>
          <p>{t('terms.p3')}</p>
          <h2>{t('terms.section4')}</h2>
          <p>{t('terms.p4')}</p>
          <h2>{t('terms.section5')}</h2>
          <p>{t('terms.p5')}</p>
          <h2>{t('terms.section6')}</h2>
          <p>{t('terms.p6')}</p>
          <h2>{t('terms.section7')}</h2>
          <p>{t('terms.p7')}</p>
          <h2>{t('terms.section8')}</h2>
          <p>{t('terms.p8')}</p>
          <h2>{t('terms.section9')}</h2>
          <p>{t('terms.p9')}</p>
        </div>
      </main>
    </>
  );
};
