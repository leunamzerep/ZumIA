// Prueba de configuración contra `wrangler dev` real con D1 LOCAL aislada y llaves FALSAS:
//  A) D1 con SOLO la migración 0001 (sin tabla orders) y llaves de Wompi: el cron no falla.
//  B) Igual, pero sin llaves de Wompi: el cron no toca órdenes.
//  C) WOMPI_ENV=prod con DEV_LOG_CODES: las rutas /pay/* responden 503.
// Este script arranca y detiene wrangler dev él mismo (puerto 8797). Nada sale a internet.
// Uso (desde la raíz): PERSIST_BASE=<carpeta-temporal> node scripts/worker-config.mjs
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.PERSIST_BASE;
if (!BASE) throw new Error("Falta PERSIST_BASE (carpeta temporal)");
const WORKER_DIR = fileURLToPath(new URL("../worker/", import.meta.url));
const WRANGLER = `${WORKER_DIR}node_modules/wrangler/bin/wrangler.js`;
const PORT = 8797;
const API = `http://127.0.0.1:${PORT}`;

let fallos = 0;
const check = (ok, texto, extra = "") => {
  if (!ok) fallos++;
  console.log(ok ? "✓" : "✗", texto, ok ? "" : extra);
};
const wrangler = (args) => execFileSync(process.execPath, [WRANGLER, ...args], { cwd: WORKER_DIR, encoding: "utf8" });
const db = (persist, sql) =>
  JSON.parse(wrangler(["d1", "execute", "zumia-verificacion", "--local", "--persist-to", persist, "--json", "--command", sql])).map((r) => r.results);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** D1 nueva con solo 0001_init.sql (sin la tabla orders). */
const freshDb0001 = (name) => {
  const persist = `${BASE}/${name}`;
  rmSync(persist, { recursive: true, force: true });
  mkdirSync(persist, { recursive: true });
  wrangler(["d1", "execute", "zumia-verificacion", "--local", "--persist-to", persist, "--file=./migrations/0001_init.sql"]);
  return persist;
};

const FAKE_KEYS = [
  "WOMPI_PUBLIC_KEY:pub_test_FALSO000",
  "WOMPI_PRIVATE_KEY:prv_test_FALSO789",
  "WOMPI_EVENTS_SECRET:test_events_FALSO456",
  "WOMPI_INTEGRITY_SECRET:test_integrity_FALSO123",
];

/** Arranca wrangler dev, ejecuta fn y lo detiene (árbol completo en Windows). Devuelve el log. */
const withDev = async (persist, vars, fn) => {
  const logFile = `${persist}.log`;
  writeFileSync(logFile, "");
  const args = [WRANGLER, "dev", "--port", String(PORT), "--test-scheduled", "--persist-to", persist, "--var", "BREVO_API_KEY:"];
  for (const v of vars) args.push("--var", v);
  const child = spawn(process.execPath, args, { cwd: WORKER_DIR, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  try {
    for (let i = 0; i < 120 && !log.includes("Ready on"); i++) await sleep(500);
    if (!log.includes("Ready on")) throw new Error("wrangler dev no arrancó");
    await fn();
    await sleep(1500); // deja que lleguen los logs del cron
    return log.replace(/\x1b\[[0-9;]*m/g, "");
  } finally {
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        /* ya terminó */
      }
    } else child.kill("SIGTERM");
    await sleep(1000);
  }
};
const cron = (expr) => fetch(`${API}/__scheduled?cron=${encodeURIComponent(expr)}`);
const base = ["VERIFY_PEPPER:pepper-falso-1", "TOKEN_SECRET:token-falso-2", "ALLOWED_ORIGINS:https://zumia.dev", "DEV_LOG_CODES:", "ALLOW_MISSING_IP:"];

// A) Solo 0001 + llaves: el cron de órdenes termina con una línea; la limpieza diaria sigue funcionando
{
  const persist = freshDb0001("cfg-a");
  db(persist, "INSERT INTO rate_limits (key, window_start, count) VALUES ('viejo', 1000, 1)");
  const log = await withDev(persist, [...base, "WOMPI_ENV:test", ...FAKE_KEYS], async () => {
    const r1 = await cron("*/10 * * * *");
    const r2 = await cron("17 3 * * *");
    check(r1.ok && r2.ok, "A: los dos crons responden OK");
  });
  const lineas = log.split("\n").filter((l) => l.includes("orders cron"));
  check(lineas.length === 2 && lineas.every((l) => l.includes("skipped (orders table missing)")), "A: sin tabla orders → una línea por cron ('orders table missing')", JSON.stringify(lineas));
  check(!/scheduled failed|expire orders failed|Uncaught|no such table: orders.*at /i.test(log), "A: sin errores ni excepciones en el log");
  const [[restantes]] = db(persist, "SELECT count(*) AS n FROM rate_limits WHERE key = 'viejo'");
  check(restantes.n === 0, "A: la limpieza diaria sí corrió (borró la ventana vieja de rate_limits)");
}

// B) Solo 0001 sin llaves de Wompi
{
  const persist = freshDb0001("cfg-b");
  const log = await withDev(persist, [...base, "WOMPI_ENV:test"], async () => {
    check((await cron("*/10 * * * *")).ok, "B: el cron responde OK");
  });
  const lineas = log.split("\n").filter((l) => l.includes("orders cron"));
  check(lineas.length === 1 && lineas[0].includes("skipped (wompi not configured)"), "B: sin llaves → una sola línea ('wompi not configured')", JSON.stringify(lineas));
  check(!/scheduled failed|expire orders failed|Uncaught/i.test(log), "B: sin errores ni excepciones en el log");
}

// C) Producción con una variable de desarrollo: /pay/* → 503, el log no muestra el valor
{
  const persist = freshDb0001("cfg-c");
  const log = await withDev(persist, [...base.filter((v) => !v.startsWith("DEV_LOG_CODES")), "DEV_LOG_CODES:valor-que-no-debe-salir", "WOMPI_ENV:prod"], async () => {
    const post = (path) =>
      fetch(`${API}${path}`, { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.5" }, body: "{}" });
    const rs = [await post("/pay/code"), await post("/pay/orders"), await post("/pay/events"), await fetch(`${API}/pay/status?reference=x`, { headers: { "CF-Connecting-IP": "203.0.113.5" } })];
    check(rs.every((r) => r.status === 503), "C: prod + DEV_LOG_CODES → /pay/code, /pay/orders, /pay/events y /pay/status responden 503", rs.map((r) => r.status).join(","));
    const health = await fetch(`${API}/health`);
    check(health.status === 200, "C: /health sigue respondiendo (la guarda solo afecta /pay/*)");
  });
  check(log.includes("unsafe config") && !log.includes("valor-que-no-debe-salir"), "C: registra el aviso sin el valor de la variable");
}

console.log(fallos ? `✗ ${fallos} pruebas fallaron` : "✓ todas las pruebas pasan");
process.exit(fallos ? 1 : 0);
