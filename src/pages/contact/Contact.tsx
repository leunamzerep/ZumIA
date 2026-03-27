import { useEffect, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { ContactForm } from "../../components/contactForm/ContactForm";
import { SeoEntry } from "../../components/seoEntry/SeoEntry";
import { PageSeo } from "../../components/pageSeo/PageSeo";

import mainImg from "../../assets/img/contactMainImg.jpg";
import styles from './Contact.module.css'

type ContactProps = { canAnimate: boolean };

export const Contact = ({ canAnimate }: ContactProps) => {

  const { t } = useTranslation();
  const h1 = t('contact.main')
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!canAnimate) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [canAnimate]);

  return (
    <>
      <PageSeo
        title={t("seo.contactTitle")}
        description={t("seo.contactDescription")}
      />
      <main>
        <div className={`${styles.main} ${animate ? styles.appear : ''}`}>
          <div className={styles.formContainer}>
            <ContactForm canAnimate={canAnimate} />
          </div>
          <div className={styles.info}>
            <h2>{t('contact.ubih23')}</h2>
            <h3>{t('contact.ubih33')}</h3>
            <h2>{t('contact.ubih21')}</h2>
            <h3>{t('contact.ubih31')}</h3>
            <h2>{t('contact.ubih22')}</h2>
            <h3>{t('contact.ubih32')}</h3>
            <h2>{t('contact.ubih24')}</h2>
            <h3 className={styles.inlineText}>
              <Trans
                i18nKey="contact.ubih34"
                components={{
                  1: (
                    <a
                      className={styles.inlineLink}
                      href="https://maps.app.goo.gl/RLb5JBkL7xMh57Hg6"
                      target="_blank"
                      rel="noreferrer"
                    />
                  ),
                }}
              />
            </h3>
          </div>
        </div>
        <div className={`${styles.mapContainer} ${animate ? styles.appear : ''}`}>
          <iframe
            title="Office location"
            src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d1000.55701215540367!2d-74.1184326!3d4.6097371!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f994a28f11d69%3A0x4c123bddc646c3e1!2zQ2wuIDFoICMgNTFBLTQyLCBQdWVudGUgQXJhbmRhLCBCb2dvdMOhLCBELkMuLCBCb2dvdMOhLCBCb2dvdMOhLCBELkMu!5e0!3m2!1ses-419!2sco!4v1774632123856!5m2!1ses-419!2sco"
            width="100%"
            height="300"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            style={{ border: 0, borderRadius: "22px" }}
          />
        </div>
        <SeoEntry imgPath={mainImg} content={h1} canAnimate={canAnimate} />
      </main>
    </>
  );
};
