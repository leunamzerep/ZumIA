# Zumia Solutions — sitio web

Web de la marca Zumia Solutions: https://zumia.dev

Hecha con React 18 + TypeScript + Vite 7. Las rutas usan React Router y los textos están en `src/i18n/`.

## Requisitos

- Node.js 22 (la misma versión que usa el despliegue).
- npm (viene con Node).

## Instalar

```bash
npm ci
```

`npm ci` instala exactamente las versiones de `package-lock.json`, sin actualizarlas. La primera vez también descarga un Chrome para puppeteer (unos cientos de MB, en la carpeta de caché de tu usuario). El build lo necesita.

## Correr en local

```bash
npm run dev
```

Abre la dirección que muestra la terminal (normalmente http://localhost:5173). Los cambios se ven al guardar.

## Verificación de clientes en /quote

> Nota (tanda 9): esta sección venía de la rama `feat/quote-verify` y estaba desactualizada. El workflow de
> despliegue ya pasa `VITE_VERIFY_API_URL` al build (`vars.VITE_VERIFY_API_URL`); confirma en GitHub
> (Settings → Secrets and variables → Actions → Variables) que la variable exista con la URL del Worker.

- El modo "ya contraté con Zumia" ya no toma el descuento del plan elegido a mano: solo se aplica si el cliente verifica su correo con el Worker (`worker/`). Sin verificar, el cotizador muestra el precio de lista.
- Para probar en local: `copy .env.example .env.local` (define `VITE_VERIFY_API_URL=http://localhost:8787`), arranca el Worker (`worker/README.md`) y usa el origen `http://localhost:5173` (en `ALLOWED_ORIGINS` del `.dev.vars` del Worker). Arranca Vite con `npm run dev -- --port 5173 --strictPort` para que el puerto no cambie.
- El token vive solo en memoria (estado de React): nunca en localStorage, sessionStorage ni URL. Si se recarga la página, hay que verificar de nuevo.
- El descuento que ve el navegador es solo informativo: al pagar el anticipo, el Worker (`/pay/code` y `/pay/orders`) recalcula el precio con el token.
- `VITE_VERIFY_API_URL` es una variable pública del repositorio (no un secreto) que el workflow pasa al build.

## Pago del anticipo con Wompi en /quote (rama `feat/wompi-anticipo`)

- **Interruptor `VITE_PAYMENTS_ENABLED`:** solo el texto exacto `true` enciende el pago. Cualquier otro valor (`TRUE`, `1`, vacío o sin definir) lo apaga: la sección de pago **no existe** (no se renderiza, no se prerenderiza y su código no entra al bundle). También necesita `VITE_VERIFY_API_URL`, porque usa el mismo Worker.
- En local: añade `VITE_PAYMENTS_ENABLED=true` a `.env.local` y usa el Worker local o el de staging (ver `worker/README.md`). Vite lee las variables al arrancar: reinicia `npm run dev` tras cambiarlas.
- **Producción:** `.github/workflows/deploy.yml` pasa `VITE_PAYMENTS_ENABLED: ${{ vars.VITE_PAYMENTS_ENABLED || 'false' }}`. Sin variable del repositorio queda en `false` (apagado). Para encenderlo: crea la variable `VITE_PAYMENTS_ENABLED` = `true` en GitHub (Settings → Secrets and variables → Actions → Variables) y vuelve a desplegar. Para apagarlo: bórrala o ponle `false` y despliega.
- **Interfaz (tanda 9):** `src/features/payments/PaymentStep.tsx`, al final de la columna del cotizador. Bloquea rediseño, sitio externo y totales por debajo de $24.000 COP con un mensaje; si se puede pagar, el botón «Me gustaría pagar ahora» abre el panel: desglose (el del Worker tras aplicar un código), código de descuento, avisos (anticipo del 50 %, cliente sin verificar, piso), nombre, correo, casilla de aceptación (enlaces a `#terms-s7` y `#privacy-s14`) y «Pagar anticipo». Si el Worker devuelve un anticipo distinto del mostrado, no redirige y muestra el nuevo desglose.
- **Página de resultado (tanda 10):** `/payment/result/` (`src/features/payments/PaymentResult.tsx`), adonde vuelve el cliente desde Wompi (`redirect-url` = `PAY_REDIRECT_BASE` + `/payment/result/`, igual en los dos idiomas; Wompi añade `?id=`). Solo existe con el interruptor encendido: ruta y prerender condicionados (`App.tsx`, `vite.config.ts`). Es `noindex,nofollow`, `no-referrer`, no está en el sitemap ni en la navegación. Consulta `/pay/status` con la referencia guardada en `sessionStorage` o, si no la hay, con el `id`; mientras esté `pending` consulta cada 3 s hasta ~90 s. En estado final borra la referencia guardada.
- Código: `src/lib/payApi.ts` (cliente de `/pay/*`, nunca envía montos), `src/features/payments/` (`flow.ts`: estados y reglas; `checkout.ts`: URL del checkout; `pendingReference.ts`: referencia en `sessionStorage`). Pruebas: `scripts/pay-front-calc.mjs` (no hay pruebas de componentes en el repo: el panel se prueba a mano).
- Solo se guarda la referencia de la orden (`ZUM-…`) en `sessionStorage`, justo antes de ir a Wompi, para la página de resultado. Nunca nombre, correo, montos ni el token de verificación (que sigue solo en memoria).

## Construir

```bash
npm run build
```

Este comando hace tres cosas:

1. Revisa los tipos de TypeScript (`tsc -b`). Si hay errores, se detiene.
2. Genera la web en la carpeta `dist/`.
3. **Prerenderiza**: abre un Chrome invisible con puppeteer, visita las 7 rutas (`/`, `/services`, `/quote`, `/about-us`, `/contact`, `/terms-and-conditions`, `/privacy-policy`; las rutas `/en` están desactivadas) y guarda el HTML de cada una. Así cada ruta tiene su propio HTML con contenido y etiquetas SEO, y GitHub Pages puede servirlo directamente. Si una ruta no tiene HTML, `public/404.html` redirige al inicio y la app abre la ruta correcta.

Para ver el resultado del build en local:

```bash
npm run preview
```

## Desplegar

La publicación es automática:

- Hacer **push a la rama `main`** activa el workflow `.github/workflows/deploy.yml`.
- El workflow instala dependencias, corre `npm run build` y publica `dist/` en **GitHub Pages**.
- El dominio propio (zumia.dev, comprado en Porkbun) apunta a GitHub Pages.

Solo `main` publica. El trabajo se hace en otras ramas.

> **PENDIENTE (lo confirma Manuel):** que en GitHub, *Settings → Pages*, la fuente esté en **"GitHub Actions"**.

## Mapa de carpetas

```
.github/workflows/deploy.yml   Publicación automática en GitHub Pages
public/                        Se copia tal cual a la web: íconos, robots.txt,
                               sitemap.xml, site.webmanifest, 404.html y CNAME
index.html                     HTML base (el <head> común)
vite.config.ts                 Configuración de Vite, alias @/ y prerender
src/
  main.tsx                     Punto de entrada
  app/                         App, rutas (routes, routes.ssr, PageWrapper) y prerender
  pages/                       Una carpeta por página (home, about-us, contact, ...)
  components/
    layout/                    Header, Footer, SplashScreen, PageTransition
    sections/                  Bloques que se repiten: ContactCard, SeoEntry
    forms/                     Formulario de contacto
    seo/                       PageSeo (title, description, canonical, og, twitter)
    langSwitch/                Botón de idioma (desactivado por ahora)
  config/site.ts               Dominio y datos de contacto (ver abajo)
  i18n/                        Textos en español (es.json) e inglés (en.json)
  styles/global.css            Colores de marca y estilos globales
  assets/img/                  Imágenes
  features/                    Futuras secciones: pricing/ y payments/
```

En el código, `@/` significa `src/`. Por ejemplo, `@/config/site` es `src/config/site.ts`.

## Dónde cambiar el dominio y los datos de contacto

**`src/config/site.ts`** contiene:

- `SITE_URL`: dominio usado para canonical, og:url y og:image.
- `PHONE_DISPLAY` y `WHATSAPP_URL`: teléfono y enlace de WhatsApp con su mensaje.
- `EMAIL`: correo que se muestra.
- `INSTAGRAM_URL` y `FACEBOOK_URL`: redes sociales.
- `CONTACT_WORKER_URL`: dirección del Cloudflare Worker que recibe el formulario.
- `INSTAGRAM_FEED_URL`: Google Apps Script que trae las publicaciones de Instagram.

Si cambia el dominio, también hay que editar a mano estos archivos estáticos:

- `public/sitemap.xml` y `public/robots.txt` (llevan el dominio escrito; cada uno tiene un comentario que lo recuerda). El sitemap solo lista las 7 rutas en español y con barra final (`https://zumia.dev/about-us/`), la misma forma que usa el canonical. Si agregas una página, agrégala también ahí.
- `public/CNAME` (dominio de GitHub Pages).

El enlace que abre Gmail con un correo ya escrito está en `src/i18n/es.json` y `en.json`, en la clave `footer.mailRedirect`.

## Seguridad

- Nunca subas llaves, tokens ni contraseñas al repo.
- Usa variables de entorno en un archivo `.env`, que ya está en `.gitignore`.
- Si hace falta un ejemplo, crea `.env.example` sin valores reales.
- Las URLs de `site.ts` son públicas, no son secretos.
- Las llaves de la futura pasarela de pagos irán en un backend aparte, nunca en el navegador.
