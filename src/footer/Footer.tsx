import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

import logo from "../assets/img/mainIcon.png";
import styles from './Footer.module.css'
import { useLocalizedPath } from "../i18n/useLocalizedPath";

export const Footer = () => {

  const { t } = useTranslation();
  const localizePath = useLocalizedPath();
  const whaLink: string = 'https://wa.me/573224286264?text=%C2%A1Hola%21%2C%20estoy%20explorando%20opciones%20para%20mejorar%20mi%20presencia%20digital%20y%20ganar%20m%C3%A1s%20clientes.%20%C2%BFMe%20podr%C3%ADas%20brindar%20m%C3%A1s%20informaci%C3%B3n%3F'
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
            <a className={styles.media} style={{ backgroundColor: '#fea501' }} href="https://www.instagram.com/zumiasolutions" target="_blank">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a className={styles.media} style={{ backgroundColor: '#1970ff' }} href="https://www.facebook.com/people/Zumia-Solutions/61586976116654" target="_blank">
              <i className="fa-brands fa-facebook"></i>
            </a>
            <a className={styles.media} style={{ backgroundColor: '#e23f33' }} href={mailLink} target="_blank">
              <i className="fa-regular fa-envelope"></i>
            </a>
          </div>
          <p className={styles.legalAdvice}>© 2026. All rights reserved.</p>
        </div>
      </div>
      <a href={whaLink} target="_blank" className={styles.whatsappFloat} style={{ bottom: `${buttonBottom}px` }}>
        <i className="fa-brands fa-whatsapp"></i>
      </a>
    </section>
  )
}
