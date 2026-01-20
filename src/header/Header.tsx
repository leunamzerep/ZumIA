import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "../components/langSwitch/LangSwitch";
import { Link } from "react-router-dom";

import logo from "../assets/img/JoTu_color_1.png";
import styles from './Header.module.css'
import { useLocalizedPath } from "../i18n/useLocalizedPath";

export const Header = () => {

  const { t } = useTranslation();
  const localizePath = useLocalizedPath();

  return (
    <section>
      <div className={styles.header}>
        <img src={logo} className={styles.logo} />
        <div className={styles.optionsContainer}>
          <Link to={localizePath("/")} className={styles.option}>{t('header.home')}</Link>
          <Link to={localizePath("/about-us")} className={styles.option}>{t('header.aboutUs')}</Link>
          <Link to={localizePath("/contact")} className={styles.option}>{t('header.contact')}</Link>
        </div>
        <LanguageSwitch />
      </div>
    </section>
  )
}
