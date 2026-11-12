# Worker de verificación (Cloudflare + D1)

Paso 1: solo estructura local y `GET /health`. Sin correos ni verificación todavía.
Los descuentos se leen de `../src/data/plans.ts` (por eso ese archivo no debe importar nada del front).

Desde esta carpeta (`worker/`):

```powershell
npm install                  # una vez
npm run db:migrate:local     # crea las tablas en la D1 local
Copy-Item seed.example.sql seed.local.sql   # luego edita los correos reales
npm run db:seed:local        # carga los proyectos
npm run dev                  # http://localhost:8787/health
```

## Rutas

- `GET /health`
- `POST /verify/request` `{ email }`: pide un código (respuesta genérica).
- `POST /verify/confirm` `{ email, code }`: devuelve `token` y proyectos con su `extrasDiscount`.
- `POST /verify/discount` `{ token, projectId }`: relee el proyecto y devuelve su descuento.

Secretos (`.dev.vars` en local, `wrangler secret put` en producción): `VERIFY_PEPPER` y `TOKEN_SECRET`
deben ser distintos. Ver `.dev.vars.example`.

## Pendientes (sugerencias)

- Paso 6: limpiar la tabla `rate_limits` (hoy nunca se borra).
- Paso 6: revisar si el token debe ser de un solo uso en el pago con Wompi (hoy es sin estado y
  se puede reusar hasta que venza; hacerlo de un solo uso exigiría guardar el `jti` en D1).

`seed.local.sql` y `.dev.vars` están en `.gitignore`: nunca subas correos reales ni secretos.
