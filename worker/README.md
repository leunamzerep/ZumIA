# Worker de Zumia (Cloudflare + D1): verificación de clientes y pagos del anticipo

Un solo Worker con dos funciones:

- **Verificación de clientes previos** (`/verify/*`): ya en producción.
- **Pago del anticipo con Wompi** (`/pay/*`): en preparación. Primero se prueba en **staging** con el sandbox de Wompi.

Los precios se leen de `../src/data/` (plans.ts, extras.ts, quote.ts y legal.ts). Esos archivos no deben importar nada del front.

Todos los comandos se ejecutan **desde esta carpeta (`worker/`)** en PowerShell.

## Rutas

| Ruta | Para qué |
|---|---|
| `GET /health` | Salud |
| `POST /verify/request` `{ email }` | Pide un código (respuesta genérica) |
| `POST /verify/confirm` `{ email, code }` | Devuelve `token` y proyectos con su `extrasDiscount` |
| `POST /verify/discount` `{ token, projectId }` | Relee el proyecto y devuelve su descuento |
| `POST /pay/code` `{ code, selection, token?, projectId? }` | Valida un código de descuento y devuelve el desglose (no reserva) |
| `POST /pay/orders` `{ selection, code?, token?, projectId?, name, email, acceptTerms, lang }` | Crea la orden y devuelve los campos del Web Checkout de Wompi |
| `POST /pay/events` | Webhook de Wompi (lo llama Wompi, no el navegador) |
| `GET /pay/status?ref=…` o `?id=…` · `POST { reference }` o `{ id }` | Solo el estado de la orden y si venció (ver abajo) |

### `/pay/status` (lo usa la página `/payment/result/`)

- **Entradas:** la referencia de la orden (`ref=ZUM-…`; también se acepta el nombre anterior `reference`, en mayúsculas o minúsculas) o el id de transacción de Wompi (`id=…`: solo letras, números, `_` y `-`, de 1 a 64). Si llegan las dos, manda la referencia. El formato se valida antes de tocar la base o Wompi. El front usa `POST` con cuerpo JSON para que la referencia y el id no queden en la URL ni en los logs.
- **Con referencia:** solo lee D1.
- **Con id:** consulta la transacción a Wompi (`GET /transactions/:id` con la llave privada), toma su referencia y busca la orden en D1. Solo responde si la orden existe y la moneda y el monto de Wompi coinciden con la orden (la misma comprobación que el webhook). Si el id no existe, la referencia no es `ZUM-…`, no hay orden o no coinciden: la **misma** respuesta neutra que una referencia inexistente (`400 invalid_reference`). Si Wompi falla o los pagos no están configurados: `503 payments_unavailable`.
- **Respuesta:** `{ ok, status, expired }`. Ni datos personales ni montos.
- **No escribe nada:** solo el webhook y el cron cambian estados. Si Wompi ya aprobó pero la orden sigue `pending` (aún no llegó el webhook), responde `pending`.
- **Límites por IP y por hora:** 300 consultas por referencia y 120 por id (contadores separados; la consulta por id llega hasta Wompi). La página de resultado sondea cada 3 s durante unos 90 s (~30 consultas).
- La guarda de producción (`WOMPI_ENV=prod` con variables solo locales → 503) también aplica.

---

## (a) Correr en local

```powershell
npm install                                   # una vez
npm run db:migrate:local                      # crea las tablas en la D1 local (.wrangler/)
Copy-Item seed.example.sql seed.local.sql     # luego edita los correos (seed.local.sql no se sube)
npm run db:seed:local                         # carga proyectos y códigos de ejemplo
Copy-Item .dev.vars.example .dev.vars         # valores FALSOS; cámbialos si quieres
npm run dev                                   # http://localhost:8787/health
```

Pruebas automáticas (desde la raíz del repo; no llaman a nada remoto). Cada script explica su uso en el encabezado:

| Script | Qué prueba |
|---|---|
| `scripts/pago-calc.mjs` | Desglose del pago, piso de 24.000, anticipo + saldo = total |
| `scripts/wompi-calc.mjs` | Firma de integridad, checksum de eventos, consulta de transacciones |
| `scripts/config-calc.mjs` | Guarda de producción, aviso a `PAY_NOTICE_TO`, cron sin llaves o sin tabla |
| `scripts/pay-local.mjs` | `/pay/code` y `/pay/orders` contra `wrangler dev` |
| `scripts/pay-events.mjs` | Webhook, `/pay/status` (por referencia y por id), transiciones y cron (Wompi y Brevo simulados) |
| `scripts/worker-config.mjs` | Cron con solo la migración 0001 y guarda de producción con `wrangler dev` real |
| `scripts/crear-codigo-test.mjs` | Que los códigos generados pasan la migración |

---

## (b) Crear staging paso a paso (sandbox de Wompi)

Staging es **otro Worker** (`zumia-verificacion-staging`) con **su propia base D1**. Nada de esto toca producción.
Todos los comandos llevan `--env staging`: si se te olvida, estarías tocando producción.

1. **Comprobar la cuenta.** Debe salir la cuenta de Zumia. Si no has iniciado sesión, primero `npx wrangler login`.
   ```powershell
   npx wrangler whoami
   ```
2. **Crear la base de staging:**
   ```powershell
   npx wrangler d1 create zumia-verificacion-staging
   ```
3. **Copiar el `database_id`** que imprime y pegarlo en `wrangler.toml`, en el bloque `[[env.staging.d1_databases]]`,
   en lugar de `PEGAR-AQUI-EL-ID-DE-STAGING`. Guarda el archivo. El id no es secreto.
4. **Crear las tablas en la base remota de staging:**
   ```powershell
   npx wrangler d1 migrations apply zumia-verificacion-staging --env staging --remote
   ```
5. **Desplegar staging** (antes de los secretos, para que el Worker exista; sin secretos responde 500/503, falla cerrado).
   Anota la URL que imprime: `https://zumia-verificacion-staging.<tu-subdominio>.workers.dev`.
   ```powershell
   npx wrangler deploy --env staging
   ```
6. **Secretos de verificación** (aleatorios, distintos de los de producción). Se generan en memoria y no se muestran:
   ```powershell
   function Nuevo-Secreto {
     $bytes = New-Object byte[] 32
     $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
     $rng.GetBytes($bytes); $rng.Dispose()
     [Convert]::ToBase64String($bytes)
   }
   Nuevo-Secreto | npx wrangler secret put VERIFY_PEPPER --env staging
   Nuevo-Secreto | npx wrangler secret put TOKEN_SECRET --env staging
   npx wrangler secret put BREVO_API_KEY --env staging
   ```
7. **Las 4 llaves de PRUEBA de Wompi** (panel de Wompi, modo sandbox). Cada comando pide el valor con la entrada oculta:
   pégalo ahí, nunca en un chat ni en un archivo.
   ```powershell
   npx wrangler secret put WOMPI_PUBLIC_KEY --env staging        # pub_test_…
   npx wrangler secret put WOMPI_PRIVATE_KEY --env staging       # prv_test_…
   npx wrangler secret put WOMPI_EVENTS_SECRET --env staging     # test_events_…
   npx wrangler secret put WOMPI_INTEGRITY_SECRET --env staging  # test_integrity_…
   ```
8. **Correo del aviso de pago:** no hay que hacer nada. `PAY_NOTICE_TO = "payments@zumia.dev"` es una variable
   normal en `wrangler.toml` (dirección de función, no personal), no un secreto. No la cargues con `secret put`:
   un secreto con el mismo nombre choca con la variable.
9. **Comprobar** que están los 7 secretos y probar la salud:
   ```powershell
   npx wrangler secret list --env staging
   Invoke-WebRequest -UseBasicParsing "https://zumia-verificacion-staging.<tu-subdominio>.workers.dev/health"
   ```
10. **Volver a desplegar** para que tome todo: `npx wrangler deploy --env staging`.

Producción se despliega con `npx wrangler deploy --env=""`. El `--env=""` vacío elige explícitamente producción y evita el aviso de wrangler.

---

## (c) Crear y desactivar códigos de descuento

Los códigos se crean a mano. El script **solo imprime** el SQL y los comandos; tú eliges dónde ejecutarlo.

```powershell
# desde la raíz del repo
node scripts/crear-codigo.mjs --tipo percent --valor 10 --usos 20 --vence 2026-12-31 --notas "Campaña diciembre"
node scripts/crear-codigo.mjs --tipo amount --valor 50000 --usos 1 --correo cliente@ejemplo.com
node scripts/crear-codigo.mjs --desactivar 6KTNHQJQMV
```

- **`--tipo`**: `percent` (1 a 100) o `amount` (COP enteros). **`--valor`** es obligatorio.
- **`--usos`**: usos máximos; sin él, ilimitados.
- **`--vence AAAA-MM-DD`**: vale hasta las 23:59 de ese día, hora de Colombia.
- **`--correo`**: el código solo vale si coincide con el correo **verificado** del cliente Zumia.
- **El código**: 10 caracteres por defecto (`--largo` de 8 a 12), sin vocales y sin 0/O/1/I/L.

Copia el comando del entorno que quieras (local, staging o producción) y ejecútalo desde `worker/`. Para ver los códigos:

```powershell
npx wrangler d1 execute zumia-verificacion-staging --env staging --remote --command "SELECT code, kind, value, active, max_uses, used_count, reserved_count, expires_at FROM discount_codes"
```

Desactivar (`active = 0`) es mejor que borrar: las órdenes viejas siguen apuntando al código.

---

## (d) Panel de Wompi para sandbox

Fuente: docs.wompi.co (ambientes-y-llaves, eventos, widget-checkout-web, seguimiento-de-transacciones).

| Qué | Dónde / valor | Estado |
|---|---|---|
| Panel de comercios | comercios.wompi.co | Verificado en la doc |
| Llaves pública y privada de prueba (`pub_test_`, `prv_test_`) | Panel, sección de llaves del modo sandbox | Prefijos verificados; **menú exacto NO VERIFICADO** |
| Secretos de eventos e integridad (`test_events_`, `test_integrity_`) | La doc dice "Desarrolladores > Secretos para integración técnica" | Verificado en la doc; **ubicación en el panel actual NO VERIFICADA** |
| URL de eventos de sandbox | `https://zumia-verificacion-staging.<tu-subdominio>.workers.dev/pay/events` | La doc pide una URL distinta por ambiente y HTTPS. **Menú exacto NO VERIFICADO** |
| URL de eventos de producción | No configurarla todavía | — |

**NO VERIFICADO:**

- Si el panel deja reenviar eventos.
- Si Wompi acepta `http://localhost:5173` como `redirect-url` en sandbox. La doc solo dice que la URL "debe pertenecer a tu sitio web".
- El monto mínimo general: hay que probar el anticipo de 12.000 COP en sandbox.
- La forma de la respuesta de `GET /transactions?reference=`: sale en la especificación OpenAPI, sin esquema de respuesta.

**Datos de prueba** (doc "datos-de-prueba-en-sandbox"):

- Tarjeta `4242 4242 4242 4242`: aprobada. `4111 1111 1111 1111`: rechazada.
- Nequi `3991111111`: aprobada. `3992222222`: rechazada.

---

## (e) Variables

| Variable | Tipo | Producción | Staging | Local (`.dev.vars`) |
|---|---|---|---|---|
| `VERIFY_PEPPER`, `TOKEN_SECRET` | secreto | `secret put` | `secret put --env staging` | falso |
| `BREVO_API_KEY` | secreto | `secret put` | `secret put --env staging` | vacío o propio |
| `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET` | secreto | `secret put` (llaves `prod`) | `secret put --env staging` (llaves `test`) | falsas `*_test_*` |
| `PAY_NOTICE_TO` | var (no secreto) | `payments@zumia.dev` | `payments@zumia.dev` | `admin@example.com` |
| `WOMPI_ENV` | var | `prod` | `test` | `test` |
| `PAY_REDIRECT_BASE` | var | `https://zumia.dev` | `http://localhost:5173` | `http://localhost:5173` |
| `ALLOWED_ORIGINS` | var | `https://zumia.dev` | `http://localhost:5173` | `http://localhost:5173` |
| `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` | var | wrangler.toml | wrangler.toml | opcional |
| `TOKEN_TTL_SECONDS` | var | opcional (1800) | opcional | 1800 |
| `DEV_LOG_CODES` | **solo local** | **JAMÁS** | **JAMÁS** | `1` |
| `ALLOW_MISSING_IP` | **solo local** | **JAMÁS** | **JAMÁS** | `1` |
| `DEV_MOCK_ORIGIN` | **solo pruebas** | **JAMÁS** | **JAMÁS** | solo en las pruebas |

Con `WOMPI_ENV=prod`, si existe cualquiera de las tres variables "solo local", todo `/pay/*` responde 503 y se registra un aviso.
Las llaves deben tener el prefijo de su ambiente. Si no, el Worker no cobra.

---

## (f) Lo que NO se debe hacer

- **No** pegar llaves ni secretos en un chat (tampoco con Claude), en un correo, en una captura ni en un issue.
- **No** escribir llaves en el repo: ni en `wrangler.toml`, ni en `.dev.vars.example`, ni en scripts. `.dev.vars` y `seed.local.sql` están en `.gitignore`.
- **No** poner llaves de Wompi en el frontend ni en variables `VITE_*`: todo lo que empieza por `VITE_` queda público en el sitio. El navegador solo recibe la llave pública dentro de la respuesta de `/pay/orders`.
- **No** usar las llaves de producción (`pub_prod_`, `prv_prod_`…) en staging, ni las de prueba en producción.
- **No** definir `DEV_LOG_CODES`, `ALLOW_MISSING_IP` ni `DEV_MOCK_ORIGIN` fuera de tu PC.
- **No** ejecutar comandos `--remote` sin revisar si llevan `--env staging` o `--env=""` (producción).
- **No** borrar la base (`wrangler d1 delete`): es irreversible.

---

## Correo (Brevo): checklist

- [ ] Usar una clave **API v3** (`xkeysib-…`), no la clave SMTP (`xsmtpsib-…`): con esa el Worker no envía.
- [ ] Acceso **Restricted** y solo "Transactional email: All".
- [ ] "Authorized IPs" sin bloqueo (las IPs de Cloudflare cambian).
- [ ] La clave caduca tras 90 días seguidos sin uso: poner un recordatorio y hacer un envío de prueba cada ~60 días.
- [ ] Tras la mudanza de zumia.dev (19/11): comprobar que los registros DNS de Brevo siguen (incluidos los 3 CNAME
      de marca en "DNS only", nunca Proxied) y que el dominio sigue autenticado en Brevo.
- [ ] SPF softfail en auth.zumia.dev (Return-Path): no bloquea porque DMARC pasa por DKIM; revisar el registro de marca
      tras la mudanza de zumia.dev (19/11).

El remitente (`MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`) tiene valores por defecto en `wrangler.toml`.
El aviso de pago va a `PAY_NOTICE_TO`, nunca al remitente. Si falta, no se envía y se registra `payment notice not configured`.
En local, `DEV_LOG_CODES=1` imprime el código de verificación en consola y, si hay `BREVO_API_KEY`, también envía el correo.

## Operación

- **IP del cliente:** solo se usa `CF-Connecting-IP` (la pone Cloudflare; nunca `X-Forwarded-For`). IPv6 se agrupa por /64.
  Si falta la cabecera, las rutas responden 500 y registran `missing client ip`. Solo en local, `ALLOW_MISSING_IP=1` usa una IP fija.
- **Cabeceras:** todas las respuestas (errores y preflight incluidos) llevan `Cache-Control: no-store` y
  `X-Content-Type-Options: nosniff`. CORS solo responde `Access-Control-Allow-Origin` si el `Origin` está en `ALLOWED_ORIGINS`.
- **Crons:**
  - Cada 10 min se vencen las órdenes pendientes. Antes, el cron consulta a Wompi por si el webhook se retrasó.
  - A las 03:17 UTC, además, se borran ventanas vencidas de `rate_limits` y códigos de verificación viejos.
  - Si faltan las llaves de Wompi o la tabla `orders`, el cron de órdenes escribe una línea y no hace nada.
  - Para probarlo en local: `npx wrangler dev --test-scheduled` y luego
    `Invoke-WebRequest "http://localhost:8787/__scheduled?cron=*/10+*+*+*+*" -UseBasicParsing`.
- **Logs:** nunca llevan correos, nombres, códigos ni llaves; en pagos, solo la referencia `ZUM-…`.

## Producción: despliegue original de la verificación (ya hecho; referencia)

1. `npx wrangler login` y `npx wrangler whoami`.
2. `npx wrangler d1 create zumia-verificacion` y su `database_id` en `wrangler.toml` (hecho).
3. `npx wrangler d1 migrations apply zumia-verificacion --remote`.
4. `npx wrangler deploy --env=""` (antes de los secretos: sin ellos `/verify/*` responde 500).
5. Secretos con `Nuevo-Secreto` (ver staging, sin `--env staging`): `VERIFY_PEPPER`, `TOKEN_SECRET`, `BREVO_API_KEY`.
   Comprobar con `npx wrangler secret list` y que `DEV_LOG_CODES` y `ALLOW_MISSING_IP` no estén en `wrangler.toml`
   (`Select-String -Path wrangler.toml -Pattern "DEV_LOG_CODES|ALLOW_MISSING_IP"`: solo deben salir en comentarios).
6. Pruebas contra la URL `workers.dev`:
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
   (Invoke-WebRequest -UseBasicParsing "$api/health").Headers
   Probar "/verify/request" '{"email":"nadie@example.com"}' "https://zumia.dev"
   Probar "/verify/request" '{"email":"otro-inexistente@example.com"}' "https://zumia.dev"   # mismo 200 y cuerpo
   Probar "/verify/request" '{"email":"nadie@example.com"}' "https://evil.example"           # sin Allow-Origin
   (Invoke-WebRequest -UseBasicParsing -Method Options -Uri "$api/verify/request" -Headers @{ Origin = "https://evil.example"; "Access-Control-Request-Method" = "POST" }).Headers
   ```
7. Clientes reales: `npx wrangler d1 execute zumia-verificacion --remote --file=./seed.local.sql`.
8. Frontend: `VITE_VERIFY_API_URL` como variable pública del build de GitHub Pages.
9. Tras mover la zona (19/11):
   - Descomentar `[[routes]]` de `api.zumia.dev` y volver a desplegar.
   - Cambiar `VITE_VERIFY_API_URL`.
   - Revisar `ALLOWED_ORIGINS` (`www` solo si sirve el sitio).

**Pagos en producción (más adelante, NO ahora):**

- `npx wrangler d1 migrations apply zumia-verificacion --remote` (aplica 0002).
- Las 4 llaves `prod` de Wompi con `secret put` (`PAY_NOTICE_TO` ya va en `wrangler.toml`).
- La URL de eventos de producción en el panel.
- `npx wrangler deploy --env=""`.

**Revertir:**
```powershell
npx wrangler deployments list
npx wrangler rollback
npx wrangler secret delete <NOMBRE>            # añade --env staging para staging
npx wrangler delete                            # quita el Worker (con --env staging, el de staging)
```
`npx wrangler d1 delete <base>` borra la base y sus datos de forma irreversible: no lo uses salvo que quieras empezar de cero.

## Pendientes (sugerencias)

- Revisar si el token de verificación debe ser de un solo uso en el pago (hoy se puede reusar hasta que vence).
- Crear el buzón o reenvío `payments@zumia.dev` para que el aviso llegue a alguien.
