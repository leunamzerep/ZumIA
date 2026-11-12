/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del Worker de verificación (pública, sin barra final). Ver .env.example. */
  readonly VITE_VERIFY_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
