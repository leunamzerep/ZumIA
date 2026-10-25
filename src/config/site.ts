// Datos del sitio en un solo lugar: dominio, contacto, redes y servicios externos.
// Si cambia alguno de estos datos, cámbialo aquí. Ojo: public/sitemap.xml,
// public/robots.txt y public/CNAME son archivos estáticos y repiten el dominio.

/** Dominio oficial (sin barra final). */
export const SITE_URL = "https://zumiasolutions.xyz";

/**
 * Imagen que se ve al compartir la web en redes (og:image / twitter:image).
 * Archivo: public/og-image.png, horizontal de 1200x630 (medida leída del archivo).
 * Si se cambia la imagen, actualizar aquí width, height y el alt.
 */
export const OG_IMAGE = {
  path: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Logo de Zumia Solutions con el texto: Páginas web a la medida de tu negocio",
};

/** Teléfono tal como se muestra en la web. */
export const PHONE_DISPLAY = "+57 (315) 223-0495";

/** Enlace de WhatsApp con el mensaje inicial ya escrito. */
export const WHATSAPP_URL =
  "https://wa.me/573152230495?text=%C2%A1Hola%21%2C%20estoy%20explorando%20opciones%20para%20mejorar%20mi%20presencia%20digital%20y%20ganar%20m%C3%A1s%20clientes.%20%C2%BFMe%20podr%C3%ADas%20brindar%20m%C3%A1s%20informaci%C3%B3n%3F";

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

/** Datos del proveedor para Términos y Privacidad (Ley 1480 de 2011, art. 50). */
export const OWNER_NAME = "Manuel Santiago Pérez Hernández";
export const OWNER_NIT = "1013105486-6";
/** Dirección de notificaciones: se publica SOLO en las páginas legales. */
export const NOTIFICATION_ADDRESS = "TV. 70D BIS A #68-75 SUR, Bogotá";

/** Superintendencia de Industria y Comercio (autoridad de protección al consumidor). */
export const SIC_URL = "https://www.sic.gov.co";
