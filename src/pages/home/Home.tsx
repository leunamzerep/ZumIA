import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

import { ContactCard } from "../../components/contactCard/ContactCard";

import mainImg from "../../assets/img/mainImg.jpg";
import home1 from "../../assets/img/home1.webp";
import home2 from "../../assets/img/home2.jpg";
import home3 from "../../assets/img/home3.avif";
import home4 from "../../assets/img/home4.avif";
import home5 from "../../assets/img/home5.avif";
import home6 from "../../assets/img/home6.avif";

import styles from "./Home.module.css";
import { SeoEntry } from "../../components/seoEntry/SeoEntry";

type HomeProps = { canAnimate: boolean };

export const Home = ({ canAnimate }: HomeProps) => {

  const { t } = useTranslation();
  const h1 = t("home.main")
  const [animate, setAnimate] = useState(false);
  const getUrl = 'https://script.google.com/macros/s/AKfycbx67xF67fqj8WyFOZSfkL1Po8PlRX7t0I_7AbngNT-inTEAVlDR6qcAGqL6M5J9aRtk9Q/exec'

  const extractInstagramPostId = (url: string): string | null => {
    try {
      const match = url.match(/instagram\.com\/(?:p|reel)\/([^/?#]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const [igPostIds, setIgPostIds] = useState<string[]>([]);

  useEffect(() => {
    if (!canAnimate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [canAnimate]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(getUrl);
        const json = await res.json();

        if (Array.isArray(json.posts)) {
          const ids = json.posts
            .map(extractInstagramPostId)
            .filter((id: string): id is string => Boolean(id));

          setIgPostIds(ids);
        }
      } catch (err) {
        console.error("Failed to load Instagram posts", err);
      }
    })();
  }, [getUrl]);


  return (
    <>
      <Helmet defer={false}>
        <title>{t("seo.homeTitle")}</title>
        <meta name="description" content={t("seo.homeDescription")} />
        <link rel="canonical" href="https://zumiasolutions.xyz" />
        <link rel="alternate" hrefLang="es" href="https://zumiasolutions.xyz/" />
        <link rel="alternate" hrefLang="x-default" href="https://zumiasolutions.xyz/" />
      </Helmet>

      <main className={styles.mainContainer}>
        <SeoEntry imgPath={mainImg} content={h1} canAnimate={canAnimate} />
        <div className={styles.infoContainer}>
          <div className={`${styles.item} ${animate ? styles.enter : ""}`}>
            <img src={home1} className={styles.home1} />
            <div className={styles.textContainer1}>
              <h2 className={styles.itemTitle}>{t("home.title1")}</h2>
              <h3 className={styles.itemText}>{t("home.text1")}</h3>
            </div>
          </div>
          <div className={`${styles.item} ${animate ? styles.enter : ""}`} >
            <div className={styles.textContainer2}>
              <h2 className={styles.itemTitle}>{t("home.title2")}</h2>
              <h3 className={styles.itemText}>{t("home.text2")}</h3>
            </div>
            <img src={home2} className={styles.home2} />
          </div>
          <div className={`${styles.item} ${animate ? styles.enter : ""}`}>
            <img src={home3} className={styles.home1} />
            <div className={styles.textContainer1}>
              <h2 className={styles.itemTitle}>{t("home.title3")}</h2>
              <h3 className={styles.itemText}>{t("home.text3")}</h3>
            </div>
          </div>
          <div className={`${styles.item} ${animate ? styles.enter : ""}`}>
            <div className={styles.textContainer2}>
              <h2 className={styles.itemTitle}>{t("home.title4")}</h2>
              <h3 className={styles.itemText}>{t("home.text4")}</h3>
            </div>
            <img src={home4} className={styles.home2} />
          </div>
          <div className={`${styles.item} ${animate ? styles.enter : ""}`}>
            <img src={home5} className={styles.home1} />
            <div className={styles.textContainer1}>
              <h2 className={styles.itemTitle}>{t("home.title5")}</h2>
              <h3 className={styles.itemText}>{t("home.text5")}</h3>
            </div>
          </div>
          <div className={`${styles.item} ${animate ? styles.enter : ""}`}>
            <div className={styles.textContainer2}>
              <h2 className={styles.itemTitle}>{t("home.title6")}</h2>
              <h3 className={styles.itemText}>{t("home.text6")}</h3>
            </div>
            <img src={home6} className={styles.home2} />
          </div>
        </div>
        {igPostIds.length > 0 && (
          <div className={styles.post}>
            <h2>{t("home.invitation")}</h2>

            <div className={styles.gridPosts}>
              {igPostIds.map((id) => (
                <iframe
                  key={id}
                  title={`Instagram post ${id}`}
                  src={`https://www.instagram.com/p/${id}/embed`}
                  width="100%"
                  height="500"
                  style={{ border: 0, borderRadius: "16px" }}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}
        <ContactCard />
      </main>
    </>
  );
};
