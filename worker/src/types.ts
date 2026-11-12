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
  /** "1" = imprimir el código en consola (solo desarrollo). */
  DEV_LOG_CODES?: string;
  /** Orígenes permitidos para CORS, separados por comas. */
  ALLOWED_ORIGINS?: string;
}
