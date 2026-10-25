import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import es from "./es.json";

export type Lang = "es" | "en";

/**
 * Idioma elegido con el switch (src/components/langSwitch/LangSwitch.tsx).
 * Sin rutas /en: la URL no cambia y el HTML del prerender siempre está en
 * español. Solo se recuerda lo que la persona eligió en el switch; no se
 * adivina por el idioma del navegador. La clave es propia ("zumia-lang"):
 * la vieja "i18nextLng" pudo quedar en "en" por la plantilla anterior.
 */
const STORAGE_KEY = "zumia-lang";

const readSavedLang = (): Lang => {
    try {
        return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
    } catch {
        // Navegador sin almacenamiento (modo privado, bloqueado): español
        return "es";
    }
};

export const saveLang = (lang: Lang) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
        // Si no se puede guardar, el idioma cambia igual en esta visita
    }
};

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        es: { translation: es },
    },
    lng: readSavedLang(),
    // Lo que no está en en.json (los textos legales) se muestra en español
    fallbackLng: "es",
    interpolation: {
        escapeValue: false,
    },
});

// <html lang> sigue al idioma visible (lectores de pantalla y traductores)
const setHtmlLang = (lng: string) => {
    if (typeof document !== "undefined") document.documentElement.lang = lng;
};
setHtmlLang(i18n.language);
i18n.on("languageChanged", setHtmlLang);

export default i18n;
