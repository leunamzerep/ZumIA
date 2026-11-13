// Prueba manual de STAGING contra el sandbox de Wompi. No toca el Worker ni el frontend.
// Solo usa las rutas públicas del Worker de staging (/pay/orders y /pay/status) y nunca imprime llaves ni secretos
// (la llave PÚBLICA de Wompi va dentro de la URL del checkout porque Wompi la exige; no es secreta).
//
// Uso (desde la raíz del repo):
//   node scripts/sandbox-check.mjs                       crea una orden y muestra la URL del Web Checkout
//   node scripts/sandbox-check.mjs --codigo ABCD2345     igual, con un código de descuento
//   node scripts/sandbox-check.mjs --otra                otra orden con referencia nueva y otro correo de prueba
//                                                        (así la orden anterior sigue pendiente y puedes pagar las dos)
//   node scripts/sandbox-check.mjs --estado ZUM-…        consulta el estado de una orden después de pagar
//   node scripts/sandbox-check.mjs http://127.0.0.1:8799 --estado ZUM-…   (otra URL del Worker, p. ej. wrangler dev)
//
// Ojo: una orden nueva con el MISMO correo cancela (vence) la orden pendiente anterior de ese correo. Por eso existe --otra.

const DEFAULT_API = "https://zumia-verificacion-staging.zumiasolutions.workers.dev";
const ORIGIN = "http://localhost:5173";
const CHECKOUT = "https://checkout.wompi.co/p/";
const REFERENCE_PATTERN = /^ZUM-[0-9A-F]{32}$/;
const CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;
const TIMEOUT_MS = 20_000;
// Campos que se envían a Wompi. Nunca customer-data:* (decisión del proyecto: ni nombre ni correo a Wompi).
const CHECKOUT_FIELDS = ["public-key", "currency", "amount-in-cents", "reference", "signature:integrity", "expiration-time", "redirect-url"];

// Selección de ejemplo válida: plan Esencial, modo normal, sin adicionales (ver src/data/plans.ts)
const SELECTION = { mode: "normal", planId: "esencial", extras: {} };
const CUSTOMER_NAME = "Cliente Sandbox";
const DEFAULT_EMAIL = "sandbox@example.com";

const fail = (message) => {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
};

const parseArgs = (argv) => {
  const args = { api: DEFAULT_API };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--otra") args.otra = true;
    else if (arg === "--codigo" || arg === "--estado") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) fail(`falta el valor de ${arg}`);
      args[arg.slice(2)] = value.trim().toUpperCase();
      i++;
    } else if (!arg.startsWith("--")) args.api = arg;
    else fail(`opción desconocida: ${arg} (usa --codigo, --otra o --estado)`);
  }
  let url;
  try {
    url = new URL(args.api);
  } catch {
    fail(`URL del Worker inválida: ${args.api}`);
  }
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) fail("la URL del Worker debe ser https (http solo para localhost)");
  args.api = url.origin;
  return args;
};

const pesos = (value) => `${new Intl.NumberFormat("es-CO").format(value)} COP`;

const post = async (api, path, body) => {
  let res;
  try {
    res = await fetch(`${api}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    fail(`no se pudo conectar con ${api}${path}: ${error.cause?.code ?? error.name}`);
  }
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
};

/** Explica en español los errores que devuelve el Worker. */
const explain = (status, json) => {
  const code = json?.error ?? "sin_cuerpo";
  const hints = {
    payments_unavailable: "Wompi no está configurado en staging: faltan las 4 llaves de PRUEBA (wrangler secret put … --env staging) o hay una variable solo-local definida.",
    invalid_code: "el código no existe, está inactivo, vencido, agotado o restringido a otro correo. Créalo en la D1 de staging (ver abajo).",
    payment_not_available: "ese modo de cotización no se paga en línea.",
    terms_required: "falta aceptar Términos y Política (acceptTerms).",
    invalid_request: "el cuerpo no tiene el formato esperado.",
    rate_limited: "demasiados intentos desde esta IP o con este correo; espera una hora o usa --otra.",
    below_minimum: "el total queda por debajo del mínimo; elige otra selección.",
    invalid_reference: "esa referencia no existe en esta base (¿la creaste en otro Worker o en local?) o tiene mal formato.",
    not_found: "la ruta no existe en ese Worker: ¿está desplegada la versión con /pay/*?",
    server_error: "error interno del Worker; mira los logs con: npx wrangler tail --env staging",
  };
  return `HTTP ${status} (${code}): ${hints[code] ?? "respuesta inesperada del Worker."}`;
};

const codeHelp = () => {
  console.log("Cómo crear un código en la D1 de STAGING:");
  console.log("  1) node scripts/crear-codigo.mjs --tipo percent --valor 10 --usos 5 --notas \"prueba sandbox\"");
  console.log("  2) De lo que imprime, copia SOLO el comando marcado \"Staging\" (--env staging --remote) y córrelo desde worker/.");
  console.log("  3) node scripts/sandbox-check.mjs --codigo <CÓDIGO>\n");
};

const createOrder = async (args) => {
  const email = args.otra ? `sandbox+${Date.now().toString(36)}@example.com` : DEFAULT_EMAIL;
  const body = { selection: SELECTION, name: CUSTOMER_NAME, email, acceptTerms: true, lang: "es" };
  if (args.codigo) {
    if (!CODE_PATTERN.test(args.codigo)) fail("el código solo admite A-Z, 0-9 y guion (4 a 32)");
    body.code = args.codigo;
  }

  console.log(`\nCreando orden en ${args.api} (plan Esencial, modo normal, correo de prueba ${email})…`);
  const { status, json } = await post(args.api, "/pay/orders", body);
  if (status !== 200 || !json?.ok) {
    console.error(`\n✗ ${explain(status, json)}\n`);
    if (json?.error === "invalid_code") codeHelp();
    process.exit(1);
  }

  const fields = json.checkout?.fields ?? {};
  const missing = CHECKOUT_FIELDS.filter((key) => typeof fields[key] !== "string" || fields[key] === "");
  if (missing.length) fail(`la respuesta no trae: ${missing.join(", ")}`);
  // Seguridad: este script es SOLO para sandbox. Si el Worker devuelve una llave de producción, no se imprime nada.
  if (!fields["public-key"].startsWith("pub_test_")) fail("la llave pública NO es de sandbox (pub_test_…). Este script es solo para pruebas: no se muestra la URL.");
  if (json.checkout.action !== CHECKOUT) fail(`el Worker indica otro checkout (${json.checkout.action}); esperado ${CHECKOUT}`);

  const params = new URLSearchParams();
  for (const key of CHECKOUT_FIELDS) params.set(key, fields[key]); // solo estos; nada de customer-data:*
  const url = `${CHECKOUT}?${params}`;
  const b = json.breakdown;

  console.log("\n✓ Orden creada");
  console.log(`  Referencia:        ${json.reference}`);
  console.log(`  Monto a pagar:     ${pesos(Number(fields["amount-in-cents"]) / 100)}  (anticipo del 50 %)`);
  console.log(`  Subtotal:          ${pesos(b.subtotal)}`);
  if (args.codigo) {
    console.log(`  Código ${args.codigo}:  pedido ${pesos(b.discountRequested)}, aplicado ${pesos(b.discountApplied)}`);
    if (b.floorApplied) console.log(`  Piso aplicado:     el descuento se redujo en ${pesos(b.reducedBy)} (mínimo ${pesos(b.minTotal)})`);
  }
  console.log(`  Total / saldo:     ${pesos(b.total)} / ${pesos(b.balance)}`);
  console.log(`  Vence:             ${fields["expiration-time"]} (30 min; luego Wompi no deja pagar)`);
  console.log(`  Vuelve a:          ${fields["redirect-url"]}`);
  console.log("\nAbre esta URL en el navegador (Wompi debe mostrar la MISMA referencia y el MISMO monto):\n");
  console.log(url);
  console.log("\nDespués de pagar, consulta el estado con:\n");
  console.log(`  node scripts/sandbox-check.mjs${args.api === DEFAULT_API ? "" : ` ${args.api}`} --estado ${json.reference}\n`);
};

const checkStatus = async (args) => {
  const reference = args.estado;
  if (!REFERENCE_PATTERN.test(reference)) fail("la referencia debe ser ZUM- + 32 caracteres hex (cópiala de la salida al crear la orden)");

  const { status, json } = await post(args.api, "/pay/status", { reference });
  if (status !== 200 || !json?.ok) fail(explain(status, json));

  const meaning = {
    pending: "pendiente: aún no llega el evento de Wompi (o el pago sigue en proceso)",
    approved: "APROBADA: llegó el evento de Wompi y se confirmó contra su API",
    declined: "rechazada por Wompi",
    voided: "anulada en Wompi",
    error: "Wompi reportó ERROR",
    expired: "vencida: pasaron 30 min sin pago aprobado (o se creó otra orden con el mismo correo)",
  };
  console.log(`\nOrden ${reference}`);
  console.log(`  Estado: ${json.status} → ${meaning[json.status] ?? "estado desconocido"}${json.expired ? " (ya venció el plazo)" : ""}`);
  console.log("\nDetalle en la D1 de staging (cópialo y córrelo desde worker/; solo lee):\n");
  const sql =
    "SELECT reference, status, wompi_status, payment_method_type, deposit, amount_in_cents, wompi_transaction_id, " +
    "datetime(created_at, 'unixepoch') AS creada, datetime(paid_at, 'unixepoch') AS pagada " +
    `FROM orders WHERE reference = '${reference}';`;
  console.log(`  npx wrangler d1 execute zumia-verificacion-staging --env staging --remote --command "${sql}"\n`);
};

const args = parseArgs(process.argv.slice(2));
if (args.estado && (args.codigo || args.otra)) fail("--estado no se combina con --codigo ni --otra");
if (args.estado) await checkStatus(args);
else await createOrder(args);
