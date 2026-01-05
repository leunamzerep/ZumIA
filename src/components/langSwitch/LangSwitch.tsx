import { useTranslation } from "react-i18next";
import './LangSwitch.css'

export const LanguageSwitch = () => {

  const { i18n } = useTranslation();
  const isEnglish = i18n.language.startsWith("en");

  const handleToggle = () => {
    const newLang = isEnglish ? "es" : "en";
    i18n.changeLanguage(newLang);
  };

  return (
    <label className="lang-switch">
      <span className={`lang-label ${!isEnglish ? "lang-label--active" : ""}`}>
        ES
      </span>
      <div className="lang-switch_control">
        <input type="checkbox" checked={isEnglish} onChange={handleToggle} />
        <span className="lang-switch_slider" />
      </div>
      <span className={`lang-label ${isEnglish ? "lang-label--active" : ""}`}>
        EN
      </span>
    </label>
  );
};
