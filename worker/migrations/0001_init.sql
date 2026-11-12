-- Esquema inicial de verificación de clientes previos.
-- Fechas en segundos desde 1970 (unixepoch).

-- Un cliente (email) puede tener varios proyectos; el descuento se aplica al proyecto según su plan.
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL CHECK (email = lower(email)),
  name TEXT NOT NULL,
  -- id de plan tal como existe en src/data/plans.ts (se valida en código, no aquí)
  plan TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_projects_email ON projects (email);

CREATE TABLE verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL CHECK (email = lower(email)),
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_verification_codes_email ON verification_codes (email);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);
