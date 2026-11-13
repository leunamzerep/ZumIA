-- Códigos de prueba para scripts/pay-events.mjs (D1 LOCAL aislada; nunca en la base remota).
INSERT INTO discount_codes (code, kind, value, max_uses, notes) VALUES
  ('EV-UNO', 'percent', 10, 1, 'prueba: aprobado y repetido'),
  ('EV-DIEZ', 'percent', 10, NULL, 'prueba: monto distinto y rechazo'),
  ('EV-TARDE', 'percent', 10, 1, 'prueba: aprobado tardío tras expirar'),
  ('EV-DOBLE', 'percent', 10, NULL, 'prueba: doble evento simultáneo'),
  ('EV-CANCELA', 'percent', 10, 1, 'prueba: cancelación de pendientes'),
  ('EV-CARRERA', 'percent', 10, 1, 'prueba: carrera con orden previa');
