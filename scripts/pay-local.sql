-- Datos de prueba para scripts/pay-local.mjs (D1 LOCAL aislada; nunca en la base remota).
-- Se cargan después de las migraciones y de worker/seed.example.sql (proyectos y códigos ficticios).
INSERT INTO discount_codes (code, kind, value, expires_at, max_uses, used_count, active, notes) VALUES
  ('UNO-SOLO', 'percent', 10, NULL, 1, 0, 1, 'prueba: un solo uso'),
  ('CARRERA', 'percent', 10, NULL, 1, 0, 1, 'prueba: dos reservas simultáneas'),
  ('AGOTADO', 'percent', 10, NULL, 1, 1, 1, 'prueba: ya usado'),
  ('VENCIDO', 'percent', 10, 1000, NULL, 0, 1, 'prueba: vencido en 1970'),
  ('INACTIVO', 'percent', 10, NULL, NULL, 0, 0, 'prueba: inactivo'),
  ('MITAD', 'percent', 50, NULL, NULL, 0, 1, 'prueba: 50 % (activa el piso con 39.200)'),
  ('FIJO-10K', 'amount', 10000, NULL, NULL, 0, 1, 'prueba: 10.000 fijo');
INSERT INTO projects (id, email, name, plan) VALUES ('proj_pro', 'cliente9@example.com', 'Proyecto Profesional', 'profesional');
