-- Pagos del anticipo con Wompi y códigos de descuento.
-- Fechas en segundos desde 1970 (unixepoch). Montos en COP enteros (amount_in_cents en centavos).
-- Los códigos los crea Manuel a mano con wrangler (INSERT), igual que los proyectos.

-- Código de descuento. Se acumula con el descuento del plan o el de cliente verificado y se aplica
-- sobre ese subtotal; el piso de 24.000 (MIN_TOTAL en src/data/quote.ts) se calcula en código.
CREATE TABLE discount_codes (
  -- Código normalizado: sin espacios, en mayúsculas, solo A-Z, 0-9 y guion, de 4 a 32 caracteres
  code TEXT PRIMARY KEY CHECK (
    code = upper(code) AND length(code) BETWEEN 4 AND 32 AND code NOT GLOB '*[^A-Z0-9-]*'
  ),
  kind TEXT NOT NULL CHECK (kind IN ('percent', 'amount')),
  -- percent: 1 a 100; amount: COP enteros mayores que 0
  value INTEGER NOT NULL CHECK (
    typeof(value) = 'integer' AND value > 0 AND (kind <> 'percent' OR value <= 100)
  ),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  -- NULL = no vence
  expires_at INTEGER CHECK (expires_at IS NULL OR typeof(expires_at) = 'integer'),
  -- NULL = sin límite de usos
  max_uses INTEGER CHECK (max_uses IS NULL OR (typeof(max_uses) = 'integer' AND max_uses > 0)),
  -- Usos de pagos aprobados
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  -- Usos reservados por órdenes pendientes (se liberan al rechazarse o al vencer la orden, a los 30 min)
  reserved_count INTEGER NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
  -- Opcional: solo vale si coincide con el correo VERIFICADO del cliente (modo cliente Zumia)
  email TEXT CHECK (email IS NULL OR email = lower(email)),
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Orden de pago del anticipo. El Worker recalcula todos los montos desde la selección (nunca del navegador).
CREATE TABLE orders (
  -- Referencia única que se envía a Wompi (aleatoria, la genera el Worker)
  reference TEXT PRIMARY KEY CHECK (length(reference) BETWEEN 8 AND 64),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'voided', 'error', 'expired')),
  -- Solo los modos con pago habilitado (rediseño y externo quedan bloqueados)
  mode TEXT NOT NULL CHECK (mode IN ('normal', 'zumiaClient')),
  -- 1 si el descuento de cliente salió de un token de verificación válido; 0 = precio de lista
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1) AND (verified = 0 OR mode = 'zumiaClient')),
  -- Proyecto verificado del que sale el descuento de cliente (NULL si no hay verificación)
  project_id TEXT CHECK (project_id IS NULL OR verified = 1),
  -- Selección tal como la validó el Worker: plan, herramientas, adicionales
  selection_json TEXT NOT NULL CHECK (json_valid(selection_json)),

  -- Desglose (mismo cálculo que paymentBreakdown en src/data/quote.ts)
  subtotal INTEGER NOT NULL CHECK (subtotal > 0),
  code TEXT REFERENCES discount_codes (code),
  discount_requested INTEGER NOT NULL DEFAULT 0 CHECK (discount_requested >= 0),
  discount_applied INTEGER NOT NULL DEFAULT 0 CHECK (discount_applied >= 0 AND discount_applied <= discount_requested),
  floor_applied INTEGER NOT NULL DEFAULT 0 CHECK (floor_applied IN (0, 1)),
  total INTEGER NOT NULL CHECK (total = subtotal - discount_applied),
  deposit INTEGER NOT NULL CHECK (deposit > 0),
  balance INTEGER NOT NULL CHECK (deposit + balance = total),
  amount_in_cents INTEGER NOT NULL CHECK (amount_in_cents = deposit * 100),
  currency TEXT NOT NULL DEFAULT 'COP' CHECK (currency = 'COP'),
  -- 1 mientras la orden tiene reservado un uso del código
  code_reserved INTEGER NOT NULL DEFAULT 0 CHECK (code_reserved IN (0, 1) AND (code_reserved = 0 OR code IS NOT NULL)),

  -- Cliente (obligatorios) y aceptación de Términos y Política
  customer_name TEXT NOT NULL CHECK (length(trim(customer_name)) BETWEEN 1 AND 120),
  customer_email TEXT NOT NULL CHECK (customer_email = lower(customer_email) AND length(customer_email) BETWEEN 3 AND 254),
  accepted_terms_at INTEGER NOT NULL,
  terms_version TEXT NOT NULL CHECK (length(terms_version) BETWEEN 1 AND 32),
  lang TEXT NOT NULL DEFAULT 'es' CHECK (lang IN ('es', 'en')),

  -- Datos de Wompi (se llenan con el webhook o con la consulta de estado)
  wompi_transaction_id TEXT UNIQUE,
  wompi_status TEXT,
  payment_method_type TEXT,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  -- Vence a los 30 min (mismo valor que expiration-time de Wompi)
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  paid_at INTEGER
);
CREATE INDEX idx_orders_status_expires ON orders (status, expires_at);
CREATE INDEX idx_orders_customer_email ON orders (customer_email);
CREATE INDEX idx_orders_code ON orders (code);
