import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

import logo from "@/assets/img/mainIcon.png";
import styles from './Footer.module.css'
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { FACEBOOK_URL, INSTAGRAM_URL, WHATSAPP_URL } from "@/config/site";

// Clases base = móvil (< 768 px); md: = escritorio (≥ 768 px), igual que el CSS anterior
const optionClass =
  "text-[10px] md:[font-size:medium] font-medium no-underline text-black " +
  "transition-all duration-200 ease-[ease] hover:underline hover:text-(--brightFont) hover:-translate-y-px";

const mediaClass =
  "flex justify-center items-center text-[14px] md:text-[22px] h-[22px] w-[22px] md:h-[26px] md:w-[26px] " +
  "p-[3px] md:p-[6px] rounded-[10px] md:rounded-[15px] text-white no-underline " +
  "shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-all duration-200 ease-[ease-in-out] " +
  "hover:-translate-y-[2px] hover:shadow-[0_0_10px_rgba(0,0,0,0.3)]";

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
      <div
        ref={cardRef}
        className="flex flex-row items-center justify-evenly md:justify-center gap-[5px] md:gap-[120px] pt-[18px] pr-[7.5px] pb-[23px] pl-[15px] md:pr-0 md:pb-[18px] md:pl-0 bg-white"
      >
        <div className="flex flex-col gap-[3px] md:gap-[5px]">
          <span className="text-[12px] md:text-[18px] font-bold mb-[2.5px]">
            {t("footer.legals")}
          </span>
          <Link to={localizePath("/terms-and-conditions")} className={optionClass}>
            {t("footer.terms")}
          </Link>
          <Link to={localizePath("/privacy-policy")} className={optionClass}>
            {t("footer.privacy")}
          </Link>
        </div>
        <img src={logo} className="h-[4.5vh] md:h-[14vh]" />
        <div className="flex flex-col items-center gap-[6px] md:gap-[12px]">
          <div className="flex flex-row items-center gap-[6px] md:gap-[10px]">
            <a className={`${mediaClass} bg-social-instagram`} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a className={`${mediaClass} bg-social-facebook`} href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-facebook"></i>
            </a>
            <a className={`${mediaClass} bg-social-mail`} href={mailLink} target="_blank" rel="noopener noreferrer">
              <i className="fa-regular fa-envelope"></i>
            </a>
          </div>
          <p className="m-0 text-center max-md:text-[11px]">© 2026. All rights reserved.</p>
        </div>
      </div>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={styles.whatsappFloat} style={{ bottom: `${buttonBottom}px` }}>
        <i className="fa-brands fa-whatsapp"></i>
      </a>
    </section>
  )
}
