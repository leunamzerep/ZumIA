import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";

import styles from './PrivacyPolicy.module.css'

import { SeoEntry } from "../../components/seoEntry/SeoEntry";
import aboutImg from "../../assets/img/aboutImg.jpg"

type TermsProps = {
  canAnimate: boolean;
}

export const PrivacyPolicy = ({ canAnimate }: TermsProps) => {

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
      <Helmet defer={false}>
        <title>{t('seo.privacyTitle')}</title>
        <meta name="description" content={t('seo.privacyDescription')} />
        <link rel="canonical" href="https://zumiasolutions.xyz/privacy-policy" />
        <link rel="alternate" hrefLang="es" href="https://zumiasolutions.xyz/" />
        <link rel="alternate" hrefLang="x-default" href="https://zumiasolutions.xyz/" />
      </Helmet>
      <h1>Sitio Web en Mantenimiento</h1>
      {/* <main>
        <SeoEntry imgPath={aboutImg} content={h1} canAnimate={canAnimate} />
        <div className={`${styles.main} ${animate ? styles.appear : ""}`}>
          <h2>{t('privacy.section1')}</h2>
          <p>{t('privacy.p1')}</p>
          <h2>{t('privacy.section2')}</h2>
          <p>{t('privacy.p2')}</p>
          <h2>{t('privacy.section3')}</h2>
          <p>{t('privacy.p3')}</p>
          <h2>{t('privacy.section4')}</h2>
          <p>{t('privacy.p4')}</p>
          <h2>{t('privacy.section5')}</h2>
          <p>{t('privacy.p5')}</p>
          <h2>{t('privacy.section6')}</h2>
          <p>{t('privacy.p6')}</p>
          <h2>{t('privacy.section7')}</h2>
          <p>{t('privacy.p7')}</p>
          <h2>{t('privacy.section8')}</h2>
          <p>{t('privacy.p8')}</p>
        </div>
      </main> */}
    </>
  );
};