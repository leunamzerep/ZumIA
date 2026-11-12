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

## Correo (Brevo) — checklist

- [ ] Usar una clave **API v3** (`xkeysib-…`), no la clave SMTP (`xsmtpsib-…`): con esa el Worker no envía.
- [ ] Acceso **Restricted** y solo "Transactional email: All".
- [ ] "Authorized IPs" sin bloqueo (las IPs de Cloudflare cambian).
- [ ] La clave caduca tras 90 días seguidos sin uso: poner un recordatorio y hacer un envío de prueba cada ~60 días.
- [ ] Paso 6: `wrangler secret put BREVO_API_KEY` (nunca en el repo).
- [ ] Tras la mudanza de zumia.dev (19/11): comprobar que los registros DNS de Brevo siguen (incluidos los 3 CNAME
      de marca en "DNS only", nunca Proxied) y que el dominio sigue autenticado en Brevo.

- [ ] SPF softfail en auth.zumia.dev (Return-Path): no bloquea porque DMARC pasa por DKIM; revisar el registro de marca
      tras la mudanza de zumia.dev (19/11).

El remitente (`MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`) tiene valores por defecto en `wrangler.toml`.
En local, `DEV_LOG_CODES=1` imprime el código en consola y, si hay `BREVO_API_KEY`, también envía el correo.

## Pendientes (sugerencias)

- Paso 6: limpiar la tabla `rate_limits` (hoy nunca se borra).
- Paso 6: revisar si el token debe ser de un solo uso en el pago con Wompi (hoy es sin estado y
  se puede reusar hasta que venza; hacerlo de un solo uso exigiría guardar el `jti` en D1).

`seed.local.sql` y `.dev.vars` están en `.gitignore`: nunca subas correos reales ni secretos.
