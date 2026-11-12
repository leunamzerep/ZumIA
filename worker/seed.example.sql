-- Datos de ejemplo con correos ficticios. NO poner correos reales aquí.
-- Copia este archivo a seed.local.sql (ignorado por git) y cambia los correos por los reales.
-- Ids de plan: esencial | alamedida | profesional (ver src/data/plans.ts).

INSERT INTO projects (id, email, name, plan) VALUES
  ('proj_jotu', 'cliente1@example.com', 'Jotu', 'alamedida'),
  ('proj_ac4', 'cliente2@example.com', 'Ac4', 'esencial'),
  ('proj_definanzas', 'cliente3@example.com', 'De Finanzas y Personas', 'alamedida');
