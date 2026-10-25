import { LegalPage } from "@/components/sections/LegalPage";
import { PRIVACY_SECTIONS } from "@/data/legal";

export const PrivacyPolicy = () => (
  <LegalPage ns="privacy" sections={PRIVACY_SECTIONS} seoTitleKey="seo.privacyTitle" seoDescriptionKey="seo.privacyDescription" />
);
