# Zumia Solutions — sitio web

Web de la marca Zumia Solutions: https://zumiasolutions.xyz

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

## Construir

```bash
npm run build
```

Este comando hace tres cosas:

1. Revisa los tipos de TypeScript (`tsc -b`). Si hay errores, se detiene.
2. Genera la web en la carpeta `dist/`.
3. **Prerenderiza**: abre un Chrome invisible con puppeteer, visita las 10 rutas (`/`, `/about-us`, `/contact`, `/terms-and-conditions`, `/privacy-policy` y las mismas con `/en`) y guarda el HTML de cada una. Así cada ruta tiene su propio HTML con contenido y etiquetas SEO, y GitHub Pages puede servirlo directamente. Si una ruta no tiene HTML, `public/404.html` redirige al inicio y la app abre la ruta correcta.

Para ver el resultado del build en local:

```bash
npm run preview
```

## Desplegar

La publicación es automática:

- Hacer **push a la rama `main`** activa el workflow `.github/workflows/deploy.yml`.
- El workflow instala dependencias, corre `npm run build` y publica `dist/` en **GitHub Pages**.
- El dominio propio (zumiasolutions.xyz, comprado en Porkbun) apunta a GitHub Pages.

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

- `public/sitemap.xml` y `public/robots.txt` (llevan el dominio escrito; cada uno tiene un comentario que lo recuerda). El sitemap solo lista las 5 rutas en español y con barra final (`https://zumiasolutions.xyz/about-us/`), la misma forma que usa el canonical. Si agregas una página, agrégala también ahí.
- `public/CNAME` (dominio de GitHub Pages).

El enlace que abre Gmail con un correo ya escrito está en `src/i18n/es.json` y `en.json`, en la clave `footer.mailRedirect`.

## Seguridad

- Nunca subas llaves, tokens ni contraseñas al repo.
- Usa variables de entorno en un archivo `.env`, que ya está en `.gitignore`.
- Si hace falta un ejemplo, crea `.env.example` sin valores reales.
- Las URLs de `site.ts` son públicas, no son secretos.
- Las llaves de la futura pasarela de pagos irán en un backend aparte, nunca en el navegador.
