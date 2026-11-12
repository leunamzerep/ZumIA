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

## Operación

- **IP del cliente:** solo se usa `CF-Connecting-IP` (la pone Cloudflare; nunca `X-Forwarded-For`). IPv6 se agrupa por /64.
  Si falta la cabecera, `/verify/*` responde 500 y registra `missing client ip`. Solo en local, `ALLOW_MISSING_IP=1`
  (`.dev.vars`) usa una IP fija. Nunca definirla en producción.
- **Cabeceras:** todas las respuestas (errores y preflight incluidos) llevan `Cache-Control: no-store` y
  `X-Content-Type-Options: nosniff`. CORS solo responde `Access-Control-Allow-Origin` si el `Origin` está en `ALLOWED_ORIGINS`.
- **Limpieza diaria (03:17 UTC):** `scheduled` borra ventanas vencidas de `rate_limits` y códigos de `verification_codes`
  vencidos o consumidos de hace más de 1 día. Probar en local: `npx wrangler dev --test-scheduled --persist-to .wrangler/mail-test`
  y `Invoke-WebRequest "http://localhost:8787/__scheduled?cron=17+3+*+*+*" -UseBasicParsing`.
- **Descuento en servidor (diferido):** hoy nada consume el descuento en el servidor (no hay pago ni pedido). Recalcular
  el precio con el token queda diferido hasta que exista un endpoint de pago o pedido. Mientras tanto el descuento es informativo.

## Despliegue (checklist, en orden; PowerShell 5.1, desde `worker/`)

Nada de esto se ha ejecutado desde el repo: lo corres tú. Primero a `*.workers.dev`; `api.zumia.dev` después de mover la zona (19/11).

1. Iniciar sesión y comprobar la cuenta (debe salir `zumiasolutions@gmail.com`):
   ```powershell
   npx wrangler login
   npx wrangler whoami
   ```
2. Crear la base D1 y copiar el `database_id` que imprime en `wrangler.toml` (reemplaza el marcador `PEGAR-AQUI-…`):
   ```powershell
   npx wrangler d1 create zumia-verificacion
   ```
3. Crear las tablas en la base remota:
   ```powershell
   npx wrangler d1 migrations apply zumia-verificacion --remote
   ```
4. Desplegar. Se hace **antes** de los secretos porque `wrangler secret put` sobre un Worker que no existe pregunta si crearlo y
   podría consumir la entrada; mientras faltan los secretos `/verify/*` responde 500 (falla cerrado). La primera vez pide registrar
   el subdominio `workers.dev`. Anota la URL que imprime (`https://zumia-verificacion.<tu-subdominio>.workers.dev`):
   ```powershell
   npx wrangler deploy
   ```
5. Secretos aleatorios, distintos entre sí y de los locales. Se generan en memoria y no se imprimen; `wrangler` quita el salto de línea final:
   ```powershell
   function Nuevo-Secreto {
     $bytes = New-Object byte[] 32
     $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
     $rng.GetBytes($bytes); $rng.Dispose()
     [Convert]::ToBase64String($bytes)
   }
   Nuevo-Secreto | npx wrangler secret put VERIFY_PEPPER
   Nuevo-Secreto | npx wrangler secret put TOKEN_SECRET
   npx wrangler secret put BREVO_API_KEY
   ```
   `BREVO_API_KEY` (clave API v3 `xkeysib-…`) la pide con entrada oculta. Comprueba que los 3 existen y que `DEV_LOG_CODES` y
   `ALLOW_MISSING_IP` no están definidos (solo deben aparecer en comentarios):
   ```powershell
   npx wrangler secret list
   Select-String -Path wrangler.toml -Pattern "DEV_LOG_CODES|ALLOW_MISSING_IP"
   ```
6. Pruebas contra la URL `workers.dev` (cambia `$api`):
   ```powershell
   $api = "https://zumia-verificacion.<tu-subdominio>.workers.dev"
   function Probar($ruta, $cuerpo, $origen) {
     $h = @{}; if ($origen) { $h["Origin"] = $origen }
     try {
       $r = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$api$ruta" -ContentType "application/json" -Headers $h -Body $cuerpo
       $estado = [int]$r.StatusCode; $acao = $r.Headers["Access-Control-Allow-Origin"]; $texto = $r.Content
     } catch {
       $estado = [int]$_.Exception.Response.StatusCode; $acao = $_.Exception.Response.Headers["Access-Control-Allow-Origin"]; $texto = $_.ErrorDetails.Message
     }
     "HTTP $estado | Allow-Origin: $acao | $texto"
   }
   ```
   - Salud y cabeceras (`Cache-Control: no-store`, `X-Content-Type-Options: nosniff`):
     ```powershell
     (Invoke-WebRequest -UseBasicParsing "$api/health").Headers
     ```
   - Petición normal con el origen permitido (200 genérico y `Allow-Origin: https://zumia.dev`):
     ```powershell
     Probar "/verify/request" '{"email":"nadie@example.com"}' "https://zumia.dev"
     ```
   - Correo inexistente: debe dar el mismo 200 y el mismo cuerpo que el anterior:
     ```powershell
     Probar "/verify/request" '{"email":"otro-inexistente@example.com"}' "https://zumia.dev"
     ```
   - Origin no permitido: el servidor procesa igual, pero **no** debe devolver `Allow-Origin` (campo vacío):
     ```powershell
     Probar "/verify/request" '{"email":"nadie@example.com"}' "https://evil.example"
     ```
   - Preflight con origen no permitido: 204 sin `Access-Control-Allow-Origin`:
     ```powershell
     (Invoke-WebRequest -UseBasicParsing -Method Options -Uri "$api/verify/request" -Headers @{ Origin = "https://evil.example"; "Access-Control-Request-Method" = "POST" }).Headers
     ```
7. Cargar los clientes reales (`seed.local.sql`, ignorado por git; lo ejecutas tú, no se muestra):
   ```powershell
   npx wrangler d1 execute zumia-verificacion --remote --file=./seed.local.sql
   npx wrangler d1 execute zumia-verificacion --remote --command "SELECT count(*) AS proyectos FROM projects"
   ```
8. Frontend: definir `VITE_VERIFY_API_URL` con la URL del Worker en el build de GitHub Pages (variable pública) **antes** de
   mergear `feat/quote-verify` a `main`.
9. Tras mover la zona (19/11): descomentar el bloque `[[routes]]` de `api.zumia.dev` en `wrangler.toml`, volver a desplegar,
   cambiar `VITE_VERIFY_API_URL` y revisar `ALLOWED_ORIGINS` (añadir `https://www.zumia.dev` solo si `www` sirve el sitio en lugar de redirigir).

**Revertir:**
```powershell
npx wrangler deployments list
npx wrangler rollback
npx wrangler secret delete BREVO_API_KEY
npx wrangler secret delete VERIFY_PEPPER
npx wrangler secret delete TOKEN_SECRET
npx wrangler delete
```
`wrangler rollback` vuelve a la versión anterior; `wrangler delete` quita el Worker. `npx wrangler d1 delete zumia-verificacion` borra la base y
sus datos de forma irreversible: no lo uses salvo que quieras empezar de cero.

## Pendientes (sugerencias)

- Paso 6: definir `VITE_VERIFY_API_URL` en el build de GitHub Pages (variable pública) y añadir `https://zumia.dev`
  a `ALLOWED_ORIGINS` en producción. No mergear `feat/quote-verify` a `main` antes.
- Diferido: recalcular el precio final en el servidor con el token, cuando exista un endpoint de pago o pedido.

- Paso 6: limpiar la tabla `rate_limits` (hoy nunca se borra).
- Paso 6: revisar si el token debe ser de un solo uso en el pago con Wompi (hoy es sin estado y
  se puede reusar hasta que venza; hacerlo de un solo uso exigiría guardar el `jti` en D1).

`seed.local.sql` y `.dev.vars` están en `.gitignore`: nunca subas correos reales ni secretos.
