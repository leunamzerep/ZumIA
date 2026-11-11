// Datos del sitio en un solo lugar: dominio, contacto, redes y servicios externos.
// Si cambia alguno de estos datos, cámbialo aquí. Ojo: public/sitemap.xml,
// public/robots.txt y public/CNAME son archivos estáticos y repiten el dominio.

/** Dominio oficial (sin barra final). */
export const SITE_URL = "https://zumia.dev";

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
export const PHONE_DISPLAY = "+57 312 484 2024";

/**
 * Enlace de WhatsApp. De aquí se toma el número; el mensaje que ve la persona
 * sale de header.whatsappMessage (es.json / en.json) con useWhatsappUrl().
 */
export const WHATSAPP_URL = `https://wa.me/573124842024?text=${encodeURIComponent("¡Hola! Quiero saber más sobre los servicios digitales")}`;

/**
 * Calendario de citas de Google (página de reservas embebible). Solo se usa en
 * el iframe de /contact/#agenda, que se carga cuando la persona lo pide.
 * Los botones "Agendar asesoría" (BookingCta y /quote) no abren Google: llevan
 * a /contact/#agenda. Con null, la sección de agenda y esos botones no aparecen.
 */
export const BOOKING_URL: string | null =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0J87DIG0QSnYpiPOEiqwP4f-zXCEhu-G0DClmH2uafDnsL0WKI64YHeq-_GjO1GdhVHkqXlqew?gv=true";

/** Correo de contacto. El enlace que abre Gmail vive en i18n (footer.mailRedirect). */
export const EMAIL = "contact@zumia.dev";

/** Redes sociales. */
export const INSTAGRAM_URL = "https://www.instagram.com/zumiasolutions";
export const FACEBOOK_URL = "https://www.facebook.com/people/Zumia-Solutions/61586976116654";

/** Cloudflare Worker que recibe el formulario de contacto (endpoint público, no es secreto). */
export const CONTACT_WORKER_URL = "https://contact.zumiasolutions.workers.dev/api/contacto";

/** Datos del proveedor para Términos y Privacidad (Ley 1480 de 2011, art. 50). */
export const OWNER_NAME = "Manuel Santiago Pérez Hernández";
export const OWNER_NIT = "1013105486-6";
/** Dirección de notificaciones: se publica SOLO en las páginas legales. */
export const NOTIFICATION_ADDRESS = "TV. 70D BIS A #68-75 SUR, Bogotá";

/** Superintendencia de Industria y Comercio (autoridad de protección al consumidor). */
export const SIC_URL = "https://www.sic.gov.co";
