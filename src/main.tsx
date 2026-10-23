import "./i18n/config";

import { HelmetProvider } from "react-helmet-async";
import { createRoot } from 'react-dom/client'
import { App } from "@/app/App";

createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
)