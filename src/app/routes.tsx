import { Home } from "@/pages/home/Home";
import { Services } from "@/pages/services/Services";
import { Quote } from "@/pages/quote/Quote";
import { BlogIndex } from "@/pages/blog/BlogIndex";
import { BlogPost } from "@/pages/blog/BlogPost";
import { AboutUs } from "@/pages/about-us/AboutUs";
import { Contact } from "@/pages/contact/Contact";
import { TermsAndConditions } from "@/pages/terms/TermsAndConditions";
import { PrivacyPolicy } from "@/pages/privacy-policy/PrivacyPolicy";

export const routes = [
  { path: "/", Component: Home },
  { path: "/services", Component: Services },
  { path: "/quote", Component: Quote },
  { path: "/blog", Component: BlogIndex },
  { path: "/blog/:slug", Component: BlogPost },
  { path: "/about-us", Component: AboutUs },
  { path: "/contact", Component: Contact },
  { path: "/terms-and-conditions", Component: TermsAndConditions },
  { path: "/privacy-policy", Component: PrivacyPolicy },
];
