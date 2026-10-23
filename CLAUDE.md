# Zumia Solutions: guía del repo

## Contexto
- Manuel vende sitios web a negocios pequeños en Colombia (primer nicho: club de golf), como persona natural.
- Web: https://zumiasolutions.xyz/ · Stack: React + Vite, sin Tailwind. Objetivo: React + Tailwind (D-007).
- Rutas: /, /about-us, /contact, /terms-and-conditions, /privacy-policy.
- La web partió de una plantilla anterior (JoTu); pueden quedar restos en metadatos y textos.
- Futuro: componentes modernos de React y pasarela de pagos con backend pequeño.

## Sobre Manuel
- Principiante en código (base de frontend), sin experiencia en backend ni Git avanzado.
- Responde en español sencillo. Explica el porqué de cada cambio, con ejemplos cortos.

## Reglas de trabajo
- Rama nueva por tarea (hoy: refactor/estructura-base). Nada directo a main.
- Un cambio lógico por commit, mensaje claro en español.
- Después de cada fase: corre el build y avísame. Yo reviso a mano que la web se vea igual.
- No borres contenido, imágenes ni textos sin avisar. Si algo parece sobrante, lístalo y espera mi OK.
- No inventes datos. Si falta uno (dominio, hosting, fuentes), pregunta o márcalo PENDIENTE.
- Nunca escribas llaves, tokens ni contraseñas en el repo. Usa variables de entorno y .env.example sin valores; verifica que .env esté en .gitignore.
- No hagas git push, no borres archivos ni instales paquetes sin pedirme permiso.
- Carpetas vacías llevan un archivo .gitkeep.
- Entre fases, detente y muestra un resumen corto. Fases 0 y 1 requieren mi visto bueno.

## No hacer
- No rediseñar secciones ni cambiar textos comerciales.
- No modificar precios ni planes.
- No integrar pagos ni crear cuentas en servicios externos.
- No desplegar a producción.
- No instalar librerías de componentes ni de animación hasta que lo pida.

## Decisiones vigentes
- D-007: React + Tailwind.
- R-002: las llaves secretas de la pasarela nunca van en el navegador; el checkout necesitará servidor.
- D-010: dominio sin decidir (zumiasolutions.xyz vs zumia.dev). Canonical, og:url y sitemap deben depender de UNA sola variable.
- i18n (botón de traducción): fuera de este plan; será un script aparte tras el rediseño.
- Despliegue/hosting: PENDIENTE de verificar en la Fase 0. No asumir que solo main publica.

## Formato de entrega (al terminar cada fase)
[FECHA] [Software - Dev]
Hecho: ...
Decisión propuesta (si aplica): ...
Bloqueos / dudas: ...
Siguiente paso: ...
Fuentes: ...
