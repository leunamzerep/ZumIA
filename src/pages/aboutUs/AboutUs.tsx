import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

import { SeoEntry } from "../../components/seoEntry/SeoEntry";
import { ContactCard } from "../../components/contactCard/ContactCard";
import { PageSeo } from "../../components/pageSeo/PageSeo";


import aboutImg from "../../assets/img/aboutImg.jpg"
import about1 from "../../assets/img/about1.jpg";
import about2 from "../../assets/img/about2.jpg";
import about3 from "../../assets/img/about3.avif";
import about4 from "../../assets/img/about4.avif";
// import about5 from "../../assets/img/about5.avif";
// import about6 from "../../assets/img/about6.avif";
import client1 from "../../assets/img/client1.png";
// import client2 from "../../assets/img/client2.png";
// import client3 from "../../assets/img/client3.png";
// import client4 from "../../assets/img/client4.png";
// import client5 from "../../assets/img/client5.png";
// import client6 from "../../assets/img/client6.png";
import styles from './AboutUs.module.css'

type AboutProps = {
  canAnimate: boolean;
}

export const AboutUs = ({ canAnimate }: AboutProps) => {

  const { t } = useTranslation();
  const h1 = t("about.h1")

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!canAnimate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [canAnimate]);

  return (
    <>
      <PageSeo
        title={t("seo.aboutUsTitle")}
        description={t("seo.aboutUsDescription")}
      />
      <main>
        <SeoEntry imgPath={aboutImg} content={h1} canAnimate={canAnimate} />
        <div>
          <div className={`${styles.header} ${animate ? styles.appear : ""}`}>
            <h2 className={styles.mainTitle}>{t('about.h21')}</h2>
            <h3 className={styles.mainText}>{t('about.h31')}</h3>
          </div>
          <div className={styles.infoContainer}>
            <div className={`${styles.item} ${animate ? styles.enter : ""}`} >
              <div className={styles.titleContainer}>
                <h2 className={styles.itemTitle}>{t("about.h22")}</h2>
              </div>
              <div className={styles.textContainer}>
                <h3 className={styles.itemText}>{t("about.h32")}</h3>
                <img src={about1} className={styles.about1} />
              </div>
            </div>
            <div className={`${styles.item} ${animate ? styles.enter : ""}`} >
              <div className={styles.textContainer}>
                <h3 className={styles.itemText}>{t("about.h33")}</h3>
                <img src={about2} className={styles.about2} />
              </div>
              <div className={styles.titleContainer}>
                <h2 className={styles.itemTitle}>{t("about.h23")}</h2>
              </div>
            </div>
            <div className={`${styles.item} ${animate ? styles.enter : ""}`} >
              <div className={styles.titleContainer}>
                <h2 className={styles.itemTitle}>{t("about.h24")}</h2>
              </div>
              <div className={styles.textContainer}>
                <h3 className={styles.itemText}>{t("about.h34")}</h3>
                <img src={about3} className={styles.about2} />
              </div>
            </div>
            <div className={`${styles.item} ${animate ? styles.enter : ""}`} >
              <div className={styles.textContainer}>
                <h3 className={styles.itemText}>{t("about.h35")}</h3>
                <img src={about4} className={styles.about2} />
              </div>
              <div className={styles.titleContainer}>
                <h2 className={styles.itemTitle}>{t("about.h25")}</h2>
              </div>
            </div>
          </div>
          <h2 className={styles.clients}>{t("about.clients")}</h2>
          <div className={styles.clientsContainer}>
            <a className={`${styles.aContainer} ${styles.hasTooltip}`} data-label={`${t('about.from')} Jotu Solutions`} target="_blank" href="https://jotusolutions.net/">
              <img className={styles.client1} src={client1} />
            </a>
          </div>
        </div>
        <ContactCard />
      </main>
    </>
  );
};
