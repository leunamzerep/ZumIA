import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

import logo from "../assets/img/JoTu_icono_color.png";
import styles from './Footer.module.css'

export const Footer = () => {

  const { t } = useTranslation();
  const whaLink: string = 'https://wa.me/19179156583?text=%F0%9F%91%8B%20%C2%A1Hola!%0AGracias%20por%20comunicarte%20con%20JoTu%20Solutions%20LLC.%0A%0A%F0%9F%95%92%20Nuestro%20horario%20de%20atenci%C3%B3n%20es:%0ALunes%20a%20Viernes%20de%209:00%20a.m.%20a%205:00%20p.m.%20(hora%20Miami).%0A%0A%E2%9C%85%20En%20breve,%20uno%20de%20nuestros%20representantes%20te%20responder%C3%A1.%0AMientras%20tanto,%20por%20favor%20dinos%20tu%20nombre%20y%20c%C3%B3mo%20podemos%20ayudarte.%0A%0A%F0%9F%93%8C%20%C2%A1Gracias%20por%20elegir%20a%20JoTu%20Solutions%20LLC'
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
          <Link to="/terms-and-conditions" className={styles.option}>
            {t("footer.terms")}
          </Link>
          <Link to="/privacy-policy" className={styles.option}>
            {t("footer.privacy")}
          </Link>
        </div>
        <img src={logo} className={styles.logo} />
        <div className={styles.socialContainer}>
          <div className={styles.medias}>
            <a className={styles.media} style={{ backgroundColor: '#fea501' }} href="https://www.instagram.com/zumiasolutions" target="_blank">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a className={styles.media} style={{ backgroundColor: '#1970ff' }} href="https://www.facebook.com/people/JOTU-Solutions-LLC/61576996550658" target="_blank">
              <i className="fa-brands fa-facebook"></i>
            </a>
            <a className={styles.media} style={{ backgroundColor: '#e23f33' }} href={mailLink} target="_blank">
              <i className="fa-regular fa-envelope"></i>
            </a>
          </div>
          <p className={styles.legalAdvice}>© 2025. All rights reserved.</p>
        </div>
      </div>
      <a href={whaLink} target="_blank" className={styles.whatsappFloat} style={{ bottom: `${buttonBottom}px` }}>
        <i className="fa-brands fa-whatsapp"></i>
      </a>
    </section>
  )
}