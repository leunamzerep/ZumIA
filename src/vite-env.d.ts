/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del Worker de verificación (pública, sin barra final). Ver .env.example. */
  readonly VITE_VERIFY_API_URL?: string;
  /** "true" (exacto) enciende el pago del anticipo con Wompi; cualquier otro valor lo apaga. Ver .env.example. */
  readonly VITE_PAYMENTS_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
