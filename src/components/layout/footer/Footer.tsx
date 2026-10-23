import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

import logo from "@/assets/img/mainIcon.png";
import styles from './Footer.module.css'
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { FACEBOOK_URL, INSTAGRAM_URL, WHATSAPP_URL } from "@/config/site";

export const Footer = () => {

  const { t } = useTranslation();
  const localizePath = useLocalizedPath();
  const mailLink: string = t('footer.mailRedirect')

  const [buttonBottom, setButtonBottom] = useState(30);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!cardRef.current) return;

      const cardRect = cardRef.current.getBoundingClientRect();

      if (cardRect.top > window.innerHeight) {
        setButtonBottom(30);
        return;
      }

      if (cardRect.top <= window.innerHeight) {
        const distanceFromBottom = window.innerHeight - cardRect.top;
        const deviceDistance = window.innerWidth > 767 ? 30 : 115;
        setButtonBottom(distanceFromBottom + deviceDistance);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [])

  return (
    <section>
      <div ref={cardRef} className={styles.footer}>
        <div className={styles.optionsContainer}>
          <span className={styles.legalsTitle}>
            {t("footer.legals")}
          </span>
          <Link to={localizePath("/terms-and-conditions")} className={styles.option}>
            {t("footer.terms")}
          </Link>
          <Link to={localizePath("/privacy-policy")} className={styles.option}>
            {t("footer.privacy")}
          </Link>
        </div>
        <img src={logo} className={styles.logo} />
        <div className={styles.socialContainer}>
          <div className={styles.medias}>
            <a className={styles.media} style={{ backgroundColor: '#fea501' }} href={INSTAGRAM_URL} target="_blank">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a className={styles.media} style={{ backgroundColor: '#1970ff' }} href={FACEBOOK_URL} target="_blank">
              <i className="fa-brands fa-facebook"></i>
            </a>
            <a className={styles.media} style={{ backgroundColor: '#e23f33' }} href={mailLink} target="_blank">
              <i className="fa-regular fa-envelope"></i>
            </a>
          </div>
          <p className={styles.legalAdvice}>© 2026. All rights reserved.</p>
        </div>
      </div>
      <a href={WHATSAPP_URL} target="_blank" className={styles.whatsappFloat} style={{ bottom: `${buttonBottom}px` }}>
        <i className="fa-brands fa-whatsapp"></i>
      </a>
    </section>
  )
}
