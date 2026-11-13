// Pruebas de configuración del Worker sin servidor: guarda de producción, aviso de pago (PAY_NOTICE_TO)
// y cron de órdenes sin llaves o sin tabla. Base de datos y fetch simulados; llaves FALSAS.
// Uso (desde la raíz):
//   npx esbuild scripts/config-calc.mjs --bundle --platform=node --format=esm --outfile=<carpeta-temporal>/config-calc.mjs
//   node <carpeta-temporal>/config-calc.mjs
import { unsafeProdConfig } from "../worker/src/devmock.ts";
import { expireOverdueOrders, handlePayEvents, handlePayStatus } from "../worker/src/orders.ts";
import { handlePayCode, handlePayOrders } from "../worker/src/pay.ts";
import { sendPaymentNotice } from "../worker/src/send.ts";

let fallos = 0;
const check = (ok, texto, extra = "") => {
  if (!ok) fallos++;
  console.log(ok ? "✓" : "✗", texto, ok ? "" : extra);
};

// Captura de console.log / console.error (para comprobar qué se registra y que no salgan valores)
let logs = [];
const realLog = console.log;
const realError = console.error;
const capture = () => {
  logs = [];
  console.log = (...a) => logs.push(a.join(" "));
  console.error = (...a) => logs.push(a.join(" "));
};
const release = () => {
  console.log = realLog;
  console.error = realError;
};

/** Base de datos que falla si se usa (para probar que la guarda corta antes). */
const dbProhibida = {
  prepare() {
    throw new Error("la base no debía usarse");
  },
  batch() {
    throw new Error("la base no debía usarse");
  },
};
const keysTest = {
  WOMPI_ENV: "test",
  WOMPI_PUBLIC_KEY: "pub_test_FALSO000",
  WOMPI_PRIVATE_KEY: "prv_test_FALSO789",
  WOMPI_EVENTS_SECRET: "test_events_FALSO456",
  WOMPI_INTEGRITY_SECRET: "test_integrity_FALSO123",
};
const prod = { WOMPI_ENV: "prod", ALLOWED_ORIGINS: "https://zumia.dev", DB: dbProhibida };
const ctx = { waitUntil() {} };
const req = (path, method = "POST") =>
  new Request(`https://w.example${path}`, {
    method,
    headers: { "content-type": "application/json", origin: "https://zumia.dev", "CF-Connecting-IP": "203.0.113.9" },
    body: method === "POST" ? "{}" : undefined,
  });

// 1) Guarda de producción
check(unsafeProdConfig({ WOMPI_ENV: "test", DEV_LOG_CODES: "1" }) === false, "guarda: test con DEV_LOG_CODES → permitido");
check(unsafeProdConfig({ WOMPI_ENV: "prod" }) === false, "guarda: prod sin variables de desarrollo → permitido");
check(unsafeProdConfig({ WOMPI_ENV: "prod", ALLOW_MISSING_IP: "" }) === false, "guarda: prod con ALLOW_MISSING_IP vacía → permitido");
for (const name of ["DEV_MOCK_ORIGIN", "ALLOW_MISSING_IP", "DEV_LOG_CODES"]) {
  const secreto = `valor-secreto-${name}`;
  capture();
  const env = { ...prod, [name]: secreto };
  const respuestas = [
    await handlePayCode(req("/pay/code"), env),
    await handlePayOrders(req("/pay/orders"), env),
    await handlePayEvents(req("/pay/events"), env, ctx),
    await handlePayStatus(req("/pay/status?reference=x", "GET"), env),
  ];
  release();
  const cuerpos = await Promise.all(respuestas.map((r) => r.json()));
  check(
    respuestas.every((r) => r.status === 503) && cuerpos.every((b) => b.error === "payments_unavailable"),
    `guarda: prod + ${name} → las 4 rutas /pay/* responden 503 payments_unavailable`,
    respuestas.map((r) => r.status).join(","),
  );
  check(
    logs.length === 4 && logs.every((l) => l.includes("unsafe config")) && !logs.some((l) => l.includes(secreto)),
    `guarda: prod + ${name} → registra el aviso sin el valor`,
    JSON.stringify(logs),
  );
}
{
  capture();
  const r = await handlePayCode(req("/pay/code"), { ...prod });
  release();
  check(r.status !== 503, "guarda: prod sin variables de desarrollo no responde 503 por la guarda", String(r.status));
}

// 2) Aviso de pago: solo a PAY_NOTICE_TO
const notice = {
  reference: "ZUM-" + "A".repeat(32),
  deposit: 12_000,
  balance: 12_000,
  total: 24_000,
  customerName: "Ana",
  customerEmail: "ana@example.com",
  mode: "normal",
  verified: false,
  code: null,
  late: false,
};
const realFetch = globalThis.fetch;
let envios = [];
globalThis.fetch = async (url, init) => {
  envios.push({ url: String(url), body: JSON.parse(init.body) });
  return new Response("{}", { status: 201 });
};
const brevo = { BREVO_API_KEY: "xkeysib-FALSO", MAIL_FROM_EMAIL: "remitente@example.com", MAIL_FROM_NAME: "Zumia" };
for (const [caso, valor] of [
  ["sin PAY_NOTICE_TO", undefined],
  ["PAY_NOTICE_TO vacío", "  "],
  ["PAY_NOTICE_TO inválido (PENDIENTE)", "PENDIENTE"],
]) {
  envios = [];
  capture();
  await sendPaymentNotice({ ...brevo, PAY_NOTICE_TO: valor }, notice);
  release();
  check(envios.length === 0, `aviso ${caso}: no se envía nada (tampoco a MAIL_FROM_EMAIL)`);
  check(logs.length === 1 && logs[0] === `payment notice not configured ref=${notice.reference}`, `aviso ${caso}: una sola línea con la referencia`, JSON.stringify(logs));
}
envios = [];
capture();
await sendPaymentNotice({ ...brevo, PAY_NOTICE_TO: "Admin@Example.com" }, notice);
release();
check(envios.length === 1 && envios[0].body.to[0].email === "admin@example.com", "aviso con PAY_NOTICE_TO: se envía solo a ese correo (normalizado)");
check(envios[0]?.body.sender.email === "remitente@example.com" && logs.length === 0, "aviso con PAY_NOTICE_TO: remitente MAIL_FROM_EMAIL y sin errores");
check(envios[0]?.url === "https://api.brevo.com/v3/smtp/email", "aviso: URL real de Brevo cuando no hay DEV_MOCK_ORIGIN (fetch simulado, nada sale)");
globalThis.fetch = async () => new Response("{}", { status: 500 });
capture();
await sendPaymentNotice({ ...brevo, PAY_NOTICE_TO: "admin@example.com" }, notice);
release();
check(logs.some((l) => l === `payment notice failed ref=${notice.reference}`) && !logs.some((l) => l.includes("admin@")), "aviso con Brevo caído: registra el fallo sin el correo");
globalThis.fetch = realFetch;

// 3) Cron de órdenes: sin llaves o sin tabla → una sola línea, sin errores
{
  capture();
  let lanzo = false;
  try {
    await expireOverdueOrders({ DB: dbProhibida }, 1_800_000_000);
  } catch {
    lanzo = true;
  }
  release();
  check(!lanzo && logs.length === 1 && logs[0] === "orders cron: skipped (wompi not configured)", "cron sin llaves: una línea, no toca la base ni lanza", JSON.stringify(logs));
}
{
  const sinTabla = {
    prepare: () => ({
      bind() {
        return this;
      },
      all: async () => {
        throw new Error("D1_ERROR: no such table: orders: SQLITE_ERROR");
      },
    }),
  };
  capture();
  let lanzo = false;
  try {
    await expireOverdueOrders({ ...keysTest, DB: sinTabla }, 1_800_000_000);
  } catch {
    lanzo = true;
  }
  release();
  check(!lanzo && logs.length === 1 && logs[0] === "orders cron: skipped (orders table missing)", "cron sin tabla orders: una línea, sin lanzar", JSON.stringify(logs));
}

console.log(fallos ? `✗ ${fallos} pruebas fallaron` : "✓ todas las pruebas pasan");
if (fallos) process.exit(1);
