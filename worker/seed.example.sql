-- Datos de ejemplo con correos ficticios. NO poner correos reales aquí.
-- Copia este archivo a seed.local.sql (ignorado por git) y cambia los correos por los reales.
-- Ids de plan: esencial | alamedida | profesional (ver src/data/plans.ts).

INSERT INTO projects (id, email, name, plan) VALUES
  ('proj_jotu', 'cliente1@example.com', 'Jotu', 'alamedida'),
  ('proj_ac4', 'cliente2@example.com', 'Ac4', 'esencial'),
  ('proj_definanzas', 'cliente3@example.com', 'De Finanzas y Personas', 'alamedida');

-- Códigos de descuento de ejemplo (ficticios). code en mayúsculas; kind: percent (1-100) | amount (COP).
-- expires_at en segundos desde 1970 (NULL = no vence); max_uses NULL = sin límite; email NULL = cualquiera.
INSERT INTO discount_codes (code, kind, value, expires_at, max_uses, email, notes) VALUES
  ('EJEMPLO10', 'percent', 10, NULL, 20, NULL, 'Ejemplo: 10 % hasta 20 usos'),
  ('EJEMPLO-FIJO', 'amount', 50000, 1893456000, 5, NULL, 'Ejemplo: 50.000 COP, vence el 01/01/2030'),
  ('EJEMPLO-CLIENTE', 'percent', 15, NULL, 1, 'cliente1@example.com', 'Ejemplo: solo para el correo verificado de cliente1');
