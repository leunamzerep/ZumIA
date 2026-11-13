// Prueba scripts/crear-codigo.mjs: formato del código, validaciones y que el INSERT generado pasa los
// CHECK de la migración en una D1 LOCAL aislada (0001 + 0002). Nada remoto.
// Uso (desde la raíz): PERSIST=<carpeta-temporal> node scripts/crear-codigo-test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PERSIST = process.env.PERSIST;
if (!PERSIST) throw new Error("Falta PERSIST (carpeta temporal)");
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const WORKER_DIR = `${ROOT}worker/`;
const WRANGLER = `${WORKER_DIR}node_modules/wrangler/bin/wrangler.js`;
const SCRIPT = `${ROOT}scripts/crear-codigo.mjs`;
const ALPHABET = /^[BCDFGHJKMNPQRSTVWXYZ2-9]+$/;

let fallos = 0;
const check = (ok, texto, extra = "") => {
  if (!ok) fallos++;
  console.log(ok ? "✓" : "✗", texto, ok ? "" : extra);
};
const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
const gen = (args) => {
  const r = run([...args, "--json"]);
  if (r.status !== 0) throw new Error(`crear-codigo falló: ${r.stderr}`);
  return JSON.parse(r.stdout);
};
const wrangler = (args) => execFileSync(process.execPath, [WRANGLER, ...args], { cwd: WORKER_DIR, encoding: "utf8" });
const sql = (command) =>
  JSON.parse(wrangler(["d1", "execute", "zumia-verificacion", "--local", "--persist-to", PERSIST, "--json", "--command", command])).map((r) => r.results);

// D1 local nueva con las dos migraciones
rmSync(PERSIST, { recursive: true, force: true });
wrangler(["d1", "migrations", "apply", "zumia-verificacion", "--local", "--persist-to", PERSIST]);

// 1) Formato: 300 códigos de largo 8 a 12, sin vocales ni ambiguos, sin repetirse
const codes = [];
for (let i = 0; i < 300; i++) codes.push(gen(["--tipo", "percent", "--valor", "5", "--largo", String(8 + (i % 5))]).code);
check(codes.every((c) => ALPHABET.test(c)), "300 códigos solo con BCDFGHJKMNPQRSTVWXYZ23456789 (sin vocales, sin 0/O/1/I/L)");
check(codes.every((c, i) => c.length === 8 + (i % 5)), "el largo respeta --largo (8 a 12)");
check(new Set(codes).size === codes.length, "300 códigos distintos");
check(gen(["--tipo", "percent", "--valor", "5"]).code.length === 10, "largo por defecto: 10");

// 2) Lo que genera pasa la migración (ejecutado en la D1 local)
const casos = [
  ["porcentaje simple", ["--tipo", "percent", "--valor", "10"]],
  ["porcentaje 100 con usos y vencimiento", ["--tipo", "percent", "--valor", "100", "--usos", "1", "--vence", "2030-01-31"]],
  ["monto fijo con correo y notas con apóstrofo", ["--tipo", "amount", "--valor", "50000", "--correo", "Cliente@Ejemplo.com", "--notas", "Campaña de O'Brien, diciembre"]],
];
const creados = [];
for (const [nombre, args] of casos) {
  const { code, sql: insert } = gen(args);
  let ok = true;
  try {
    sql(insert);
  } catch (e) {
    ok = false;
    console.log(String(e.stdout ?? e.message).slice(0, 300));
  }
  check(ok, `INSERT de "${nombre}" pasa los CHECK de la migración`);
  creados.push(code);
}
const filas = sql(`SELECT code, kind, value, expires_at, max_uses, email, notes, active FROM discount_codes ORDER BY created_at, code`)[0];
const fijo = filas.find((f) => f.code === creados[2]);
check(fijo?.email === "cliente@ejemplo.com" && fijo.notes === "Campaña de O'Brien, diciembre" && fijo.active === 1, "correo guardado en minúsculas y notas con apóstrofo intactas");
const vence = filas.find((f) => f.code === creados[1]);
check(vence?.expires_at === Date.UTC(2030, 1, 1, 5) / 1000 && vence.max_uses === 1, "vencimiento = fin del 31/01/2030 en Colombia (05:00 UTC del 01/02)");

// 3) Desactivar
const { sql: update } = gen(["--desactivar", creados[0].toLowerCase()]);
sql(update);
check(sql(`SELECT active FROM discount_codes WHERE code = '${creados[0]}'`)[0][0].active === 0, "--desactivar genera un UPDATE que deja active = 0");

// 4) Validaciones: todos deben fallar con código de salida 1 y sin imprimir SQL
const invalidos = [
  ["sin tipo", ["--valor", "10"]],
  ["tipo desconocido", ["--tipo", "gift", "--valor", "10"]],
  ["porcentaje 101", ["--tipo", "percent", "--valor", "101"]],
  ["valor 0", ["--tipo", "amount", "--valor", "0"]],
  ["valor decimal", ["--tipo", "amount", "--valor", "10.5"]],
  ["valor negativo", ["--tipo", "amount", "--valor", "-5"]],
  ["usos 0", ["--tipo", "percent", "--valor", "10", "--usos", "0"]],
  ["fecha con formato malo", ["--tipo", "percent", "--valor", "10", "--vence", "31/12/2030"]],
  ["fecha imposible", ["--tipo", "percent", "--valor", "10", "--vence", "2030-02-30"]],
  ["fecha pasada", ["--tipo", "percent", "--valor", "10", "--vence", "2020-01-01"]],
  ["correo inválido", ["--tipo", "percent", "--valor", "10", "--correo", "no-es-correo"]],
  ["notas con $", ["--tipo", "percent", "--valor", "10", "--notas", "precio $10"]],
  ["notas con comillas dobles", ["--tipo", "percent", "--valor", "10", "--notas", 'hola "x"']],
  ["largo 7", ["--tipo", "percent", "--valor", "10", "--largo", "7"]],
  ["largo 13", ["--tipo", "percent", "--valor", "10", "--largo", "13"]],
];
for (const [nombre, args] of invalidos) {
  const r = run(args);
  check(r.status === 1 && !r.stdout.includes("INSERT"), `rechaza: ${nombre}`, `status=${r.status}`);
}

// 5) Salida normal: muestra los tres comandos
const normal = run(["--tipo", "percent", "--valor", "10", "--usos", "5"]);
check(
  normal.status === 0 && normal.stdout.includes("--local --command") && normal.stdout.includes("--env staging --remote") && normal.stdout.includes('--env="" --remote'),
  "la salida incluye los comandos local, staging y producción",
);

console.log(fallos ? `✗ ${fallos} pruebas fallaron` : "✓ todas las pruebas pasan");
process.exit(fallos ? 1 : 0);
