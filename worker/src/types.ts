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

export interface Env {
  DB: D1Database;
  /** Secreto para los HMAC (wrangler secret put VERIFY_PEPPER). */
  VERIFY_PEPPER?: string;
  /** "1" = imprimir el código en consola (solo desarrollo). */
  DEV_LOG_CODES?: string;
  /** Orígenes permitidos para CORS, separados por comas. */
  ALLOWED_ORIGINS?: string;
}
