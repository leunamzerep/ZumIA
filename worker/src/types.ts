// Tipos mínimos de D1 y del entorno (sin @cloudflare/workers-types).

export type D1Value = string | number | null;

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
}

export interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

/** Solo lo que usamos del ExecutionContext de Workers. */
export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

/** Solo lo que usamos del evento programado (cron). */
export interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

export interface Env {
  DB: D1Database;
  /** Secreto para los HMAC (wrangler secret put VERIFY_PEPPER). */
  VERIFY_PEPPER?: string;
  /** Secreto para firmar tokens; debe ser distinto de VERIFY_PEPPER. */
  TOKEN_SECRET?: string;
  /** Vigencia del token en segundos (por defecto 1800). */
  TOKEN_TTL_SECONDS?: string;
  /** Clave API v3 de Brevo (xkeysib-…), secret: wrangler secret put BREVO_API_KEY. */
  BREVO_API_KEY?: string;
  /** Remitente (no secretos; valores por defecto en wrangler.toml [vars]). */
  MAIL_FROM_EMAIL?: string;
  MAIL_FROM_NAME?: string;
  /** "1" = solo local: permite peticiones sin CF-Connecting-IP (IP fija). Nunca definir en producción. */
  ALLOW_MISSING_IP?: string;
  /** "1" = imprimir el código en consola (solo desarrollo). */
  DEV_LOG_CODES?: string;
  /** Orígenes permitidos para CORS, separados por comas. */
  ALLOWED_ORIGINS?: string;
  /** Ambiente de Wompi: "test" (sandbox) o "prod". Elige la URL de la API y los prefijos de llave válidos. */
  WOMPI_ENV?: string;
  /** Llave pública de Wompi (pub_test_… / pub_prod_…): no es secreta, va en [vars]. */
  WOMPI_PUBLIC_KEY?: string;
  /** Llave privada (prv_…): secret. Solo para consultar transacciones desde el servidor. */
  WOMPI_PRIVATE_KEY?: string;
  /** Secreto de eventos (test_events_… / prod_events_…): secret. Valida el checksum del webhook. */
  WOMPI_EVENTS_SECRET?: string;
  /** Secreto de integridad (test_integrity_… / prod_integrity_…): secret. Firma el Web Checkout. */
  WOMPI_INTEGRITY_SECRET?: string;
  /** Base del sitio para redirect-url (https://zumia.dev; http://localhost:5173 solo en staging). Sin barra final. */
  PAY_REDIRECT_BASE?: string;
  /** Solo pruebas locales: servidor simulado de Wompi y Brevo en localhost (ver devmock.ts). Nunca en producción. */
  DEV_MOCK_ORIGIN?: string;
}
