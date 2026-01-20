import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./en.json";
import es from "./es.json";
import { getLangFromPath } from "./langRouting";

const initialLang =
  typeof window !== "undefined"
    ? getLangFromPath(window.location.pathname)
    : "es";

i18n.use(LanguageDetector).use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            es: { translation: es }
        },
        lng: initialLang,
        fallbackLng: "es",
        interpolation: {
            escapeValue: false
        },
        detection: {
            order: ["localStorage", "navigator", "htmlTag"],
            caches: ["localStorage"]
        }
    }).then(() => {
        const lang = i18n.resolvedLanguage || i18n.language || "en";
        document.documentElement.lang = lang;
    });

i18n.on("languageChanged", (lng) => {
    document.documentElement.lang = lng || "en";
});

export default i18n;
