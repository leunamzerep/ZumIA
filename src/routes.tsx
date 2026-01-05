import { Home } from "./pages/home/Home";
import { AboutUs } from "./pages/aboutUs/AboutUs";
import { Contact } from "./pages/contact/Contact";
import { TermsAndConditions } from "./pages/terms/TermsAndConditions";
import { PrivacyPolicy } from "./pages/privacyPolicy/PrivacyPolicy";

export const routes = [
  { path: "/", Component: Home },
  { path: "/about-us", Component: AboutUs },
  { path: "/contact", Component: Contact },
  { path: "/terms-and-conditions", Component: TermsAndConditions },
  { path: "/privacy-policy", Component: PrivacyPolicy },
];
