import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import "./LangSwitch.css";
import { getLangFromPath, withLangPrefix } from "../../i18n/langRouting";

export const LanguageSwitch = () => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isEnglish = getLangFromPath(location.pathname) === "en";

  const handleToggle = () => {
    const newLang = isEnglish ? "es" : "en";
    const newPath =
      withLangPrefix(location.pathname, newLang) +
      location.search +
      location.hash;

    if (i18n.resolvedLanguage !== newLang) {
      i18n.changeLanguage(newLang);
    }

    navigate(newPath);
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
