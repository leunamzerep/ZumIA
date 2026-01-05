import { useEffect, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { ContactForm } from "../../components/contactForm/ContactForm";
import { SeoEntry } from "../../components/seoEntry/SeoEntry";

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
      <Helmet defer={false}>
        <title>{t('seo.contactTitle')}</title>
        <meta name="description" content={t('seo.contactDescription')} />
        <link rel="canonical" href="https://zumiasolutions.xyz/contact" />
        <link rel="alternate" hrefLang="es" href="https://zumiasolutions.xyz/" />
        <link rel="alternate" hrefLang="x-default" href="https://zumiasolutions.xyz/" />
      </Helmet>

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
                      href="https://www.google.com/maps/dir//2875+S+Orange+Ave+Orlando,+FL+32806+EE.+UU./@28.509644,-81.3734382,13z/data=!4m8!4m7!1m0!1m5!1m1!1s0x88e77b71f8a223ed:0x3718d2730d0435af!2m2!1d-81.3734382!2d28.509644?entry=ttu&g_ep=EgoyMDI1MTIwOS4wIKXMDSoASAFQAw%3D%3D"
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
            src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d112192.0039618475!2d-81.373438!3d28.509644!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88e77b71f8a223ed%3A0x3718d2730d0435af!2s2875%20S%20Orange%20Ave%2C%20Orlando%2C%20FL%2032806!5e0!3m2!1ses-419!2sus!4v1765601806615!5m2!1ses-419!2sus"
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