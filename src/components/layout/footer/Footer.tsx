import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

import logo from "@/assets/img/mainIcon.png";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";
import { FACEBOOK_URL, INSTAGRAM_URL, WHATSAPP_URL } from "@/config/site";
import { PATHS } from "@/config/paths";
import { FacebookIcon, InstagramIcon, MailIcon, WhatsAppIcon } from "@/components/ui/icons";

// Clases base = móvil (< 768 px); md: = escritorio (≥ 768 px), igual que el CSS anterior
const optionClass =
  "text-[10px] md:[font-size:medium] font-medium no-underline text-black " +
  "transition-all duration-200 ease-[ease] hover:underline hover:text-(--brightFont) hover:-translate-y-px";

const mediaClass =
  "flex justify-center items-center text-[14px] md:text-[22px] h-[22px] w-[22px] md:h-[26px] md:w-[26px] " +
  "p-[3px] md:p-[6px] rounded-[10px] md:rounded-[15px] text-white no-underline " +
  "shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-all duration-200 ease-[ease-in-out] " +
  "hover:-translate-y-[2px] hover:shadow-[0_0_10px_rgba(0,0,0,0.3)]";

// Botón flotante: "bottom" sigue en style porque cambia con el scroll
const whatsappClass =
  "fixed right-[14px] md:right-[21px] z-99 flex items-center justify-center " +
  "h-[40px] w-[40px] md:h-[60px] md:w-[60px] p-[3px] md:p-0 rounded-[50%] " +
  "bg-social-whatsapp text-white text-[18px] md:text-[30px] no-underline cursor-pointer " +
  "shadow-[0px_4px_10px_rgba(0,0,0,0.25)] transition-all duration-300 ease-[ease] " +
  "hover:shadow-[0px_4px_10px_rgba(0,0,0,0.35)] hover:-translate-y-[3px] hover:bg-(--brightFont)";

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
          <Link to={localizePath(PATHS.terms)} className={optionClass}>
            {t("footer.terms")}
          </Link>
          <Link to={localizePath(PATHS.privacy)} className={optionClass}>
            {t("footer.privacy")}
          </Link>
        </div>
        <img src={logo} className="h-[4.5vh] md:h-[14vh]" />
        <div className="flex flex-col items-center gap-[6px] md:gap-[12px]">
          <div className="flex flex-row items-center gap-[6px] md:gap-[10px]">
            <a className={`${mediaClass} bg-social-instagram`} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              <InstagramIcon className="size-[1em]" />
            </a>
            <a className={`${mediaClass} bg-social-facebook`} href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
              <FacebookIcon className="size-[1em]" />
            </a>
            <a className={`${mediaClass} bg-social-mail`} href={mailLink} target="_blank" rel="noopener noreferrer">
              <MailIcon className="size-[1em]" />
            </a>
          </div>
          <p className="m-0 text-center max-md:text-[11px]">© 2026 Zumia Solutions. Todos los derechos reservados.</p>
        </div>
      </div>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={whatsappClass} style={{ bottom: `${buttonBottom}px` }}>
        <WhatsAppIcon className="size-[1em]" />
      </a>
    </section>
  )
}
