import { useTranslation } from "react-i18next";
// import { LanguageSwitch } from "@/components/langSwitch/LangSwitch";
import { Link } from "react-router-dom";

import logo from "@/assets/img/mainIcon.png";
import { useLocalizedPath } from "@/i18n/useLocalizedPath";

// Clases base = móvil (< 768 px); md: = escritorio (≥ 768 px), igual que el CSS anterior
const optionClass =
  "px-[10px] py-[6px] md:px-[20px] md:py-[8px] rounded-[100px] border-none bg-white " +
  "text-[14px] md:text-[18px] font-medium no-underline text-black " +
  "transition-all duration-333 ease-[ease] hover:bg-(--brightMain) hover:text-white";

export const Header = () => {

  const { t } = useTranslation();
  const localizePath = useLocalizedPath();

  return (
    <section>
      <div className="flex flex-row items-center justify-evenly gap-[6px] md:gap-[15px] px-[10px] py-[5px] md:px-[180px] bg-white">
        <img src={logo} className="h-[7vh] md:h-[15vh]" />
        <div className="flex flex-row gap-[2px] md:gap-[20px]">
          <Link to={localizePath("/")} className={optionClass}>{t('header.home')}</Link>
          <Link to={localizePath("/about-us")} className={optionClass}>{t('header.aboutUs')}</Link>
          <Link to={localizePath("/contact")} className={optionClass}>{t('header.contact')}</Link>
        </div>
        <img src={logo} className="h-[7vh] md:h-[15vh]" />
        {/* <LanguageSwitch /> */}
      </div>
    </section>
  )
}
