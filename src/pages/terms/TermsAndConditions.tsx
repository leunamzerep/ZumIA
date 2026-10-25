import { LegalPage } from "@/components/sections/LegalPage";
import { TERMS_SECTIONS } from "@/data/legal";

export const TermsAndConditions = () => (
  <LegalPage ns="terms" sections={TERMS_SECTIONS} seoTitleKey="seo.termsTitle" seoDescriptionKey="seo.termsDescription" />
);
