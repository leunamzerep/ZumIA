// Datos del sitio en un solo lugar: dominio, contacto, redes y servicios externos.
// Si cambia alguno de estos datos, cámbialo aquí. Ojo: public/sitemap.xml,
// public/robots.txt y public/CNAME son archivos estáticos y repiten el dominio.

/** Dominio oficial (sin barra final). */
export const SITE_URL = "https://zumiasolutions.xyz";

/** Teléfono tal como se muestra en la web. */
export const PHONE_DISPLAY = "+57(322)428-6264";

/** Enlace de WhatsApp con el mensaje inicial ya escrito. */
export const WHATSAPP_URL =
  "https://wa.me/573224286264?text=%C2%A1Hola%21%2C%20estoy%20explorando%20opciones%20para%20mejorar%20mi%20presencia%20digital%20y%20ganar%20m%C3%A1s%20clientes.%20%C2%BFMe%20podr%C3%ADas%20brindar%20m%C3%A1s%20informaci%C3%B3n%3F";

/** Correo de contacto. El enlace que abre Gmail vive en i18n (footer.mailRedirect). */
export const EMAIL = "zumiasolutions@gmail.com";

/** Redes sociales. */
export const INSTAGRAM_URL = "https://www.instagram.com/zumiasolutions";
export const FACEBOOK_URL = "https://www.facebook.com/people/Zumia-Solutions/61586976116654";

/** Cloudflare Worker que recibe el formulario de contacto (endpoint público, no es secreto). */
export const CONTACT_WORKER_URL = "https://contact.zumiasolutions.workers.dev/api/contacto";

/** Google Apps Script que devuelve las publicaciones de Instagram de Inicio (endpoint público). */
export const INSTAGRAM_FEED_URL =
  "https://script.google.com/macros/s/AKfycbxscPAE1czwBGME-COYjhEC-sq_vQceer9K3CgcEcEnfzUJZ5_ETvVv9yiUNVLwnK45/exec";
