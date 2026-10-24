import "./i18n/config";

// Fuentes autoalojadas (licencia SIL OFL 1.1). Solo el eje de peso, sin cursiva
import "@fontsource-variable/outfit/wght.css";
import "@fontsource-variable/plus-jakarta-sans/wght.css";

import { HelmetProvider } from "react-helmet-async";
import { createRoot } from 'react-dom/client'
import { App } from "@/app/App";

createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
)