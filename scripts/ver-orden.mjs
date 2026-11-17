// Muestra qué compró un cliente: lee una orden de D1 por su referencia y la imprime en español.
// Solo lee (un SELECT); no escribe nada ni envía nada. Los nombres salen de src/i18n/es.json; si falta alguno, se ve el id.
//
// Uso (desde la raíz del repo; necesita haber iniciado sesión en wrangler: `npx wrangler whoami`):
//   node scripts/ver-orden.mjs <referencia>              (producción: D1 remota zumia-verificacion)
//   node scripts/ver-orden.mjs <referencia> --staging    (D1 remota de staging)
//   node scripts/ver-orden.mjs <referencia> --local      (D1 local de worker/.wrangler; para pruebas)
//   node scripts/ver-orden.mjs <referencia> --local --persist-to <carpeta>   (D1 local en otra carpeta, para pruebas)
//   node scripts/ver-orden.mjs <referencia> --json       (imprime la fila cruda en JSON)
// La referencia es la que ves en el correo de aviso ("Pago de anticipo aprobado: <referencia>").
import { execFileSync, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fail = (message) => {
  console.error(`Error: ${message}`);
  process.exit(1);
};

const args = process.argv.slice(2);
const persistAt = args.indexOf("--persist-to");
const persistDir = persistAt === -1 ? null : args.splice(persistAt, 2)[1];
if (persistAt !== -1 && !persistDir) fail("--persist-to necesita una carpeta");
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));
if (persistDir && !flags.has("--local")) fail("--persist-to solo se usa con --local");
const known = new Set(["--staging", "--local", "--json"]);
for (const f of flags) if (!known.has(f)) fail(`opción desconocida: ${f}`);
if (flags.has("--staging") && flags.has("--local")) fail("usa --staging o --local, no las dos");
if (positional.length !== 1) fail("falta la referencia. Uso: node scripts/ver-orden.mjs <referencia> [--staging|--local] [--json]");

// La referencia va dentro del SQL: solo se acepta el formato que genera el Worker (letras, números, guion y guion bajo)
const reference = positional[0];
if (!/^[A-Za-z0-9_-]{8,64}$/.test(reference)) fail("la referencia no tiene el formato esperado (8 a 64 letras, números, guion o guion bajo)");

const database = flags.has("--staging") ? "zumia-verificacion-staging" : "zumia-verificacion";
const target = flags.has("--local") ? "--local" : "--remote";
const sql = `SELECT * FROM orders WHERE reference = '${reference}'`;
const wranglerArgs = ["wrangler", "d1", "execute", database, target, "--json", "--command", sql];
if (flags.has("--staging")) wranglerArgs.push("--env", "staging");
if (persistDir) wranglerArgs.push("--persist-to", resolve(persistDir));

let raw;
try {
  const options = { cwd: fileURLToPath(new URL("../worker/", import.meta.url)), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] };
  // En Windows npx es un .cmd: se corre como una sola línea (todos los valores ya están validados; el SQL va entre comillas)
  raw =
    process.platform === "win32"
      ? execSync(["npx", ...wranglerArgs.map((a) => (a === sql ? `"${a}"` : a))].join(" "), options)
      : execFileSync("npx", wranglerArgs, options);
} catch (error) {
  // con --json wrangler deja el error en stdout; si no, en stderr
  const detail = [error.stdout, error.stderr].filter(Boolean).join("\n").trim() || String(error.message);
  fail(["wrangler falló.", ...detail.split("\n").slice(-8)].join("\n"));
}

let row;
try {
  const parsed = JSON.parse(raw.slice(raw.indexOf("[")));
  row = parsed?.[0]?.results?.[0];
} catch {
  fail("no pude leer la respuesta de wrangler como JSON");
}
if (!row) fail(`no existe una orden con la referencia ${reference} en ${database} (${target.slice(2)})`);

if (flags.has("--json")) {
  console.log(JSON.stringify(row, null, 2));
  process.exit(0);
}

const es = JSON.parse(readFileSync(new URL("../src/i18n/es.json", import.meta.url), "utf8"));
const named = (group, id) => {
  const name = es[group]?.[id]?.name;
  return typeof name === "string" ? `${name} (${id})` : id;
};
const cop = (n) => `$${Number(n).toLocaleString("es-CO")} COP`;
const date = (s) => (s ? new Date(s * 1000).toLocaleString("es-CO", { timeZone: "America/Bogota", hour12: false }) : "—");
const yesNo = (v) => (v ? "sí" : "no");

let selection = {};
try {
  selection = JSON.parse(row.selection_json);
} catch {
  /* se mostrará vacío */
}

const lines = [];
const add = (label, value) => lines.push(`${label.padEnd(22)}${value}`);
add("Referencia", row.reference);
add("Estado", `${row.status}${row.wompi_status ? ` (Wompi: ${row.wompi_status})` : ""}`);
add("Creada", date(row.created_at));
add("Pagada", date(row.paid_at));
add("Cliente", `${row.customer_name} <${row.customer_email}>`);
add("Idioma", row.lang);
add("Términos aceptados", `${row.terms_version} (${date(row.accepted_terms_at)})`);
add("Modo", row.mode);
add("Cliente verificado", `${yesNo(row.verified)}${row.project_id ? ` · proyecto ${row.project_id}` : ""}`);
lines.push("", "Servicios elegidos");
lines.push(`  Plan: ${selection.planId ? named("plans", selection.planId) : "ninguno"}`);
const extras = Object.entries(selection.extras ?? {});
if (extras.length === 0) lines.push("  Herramientas: ninguna");
else {
  lines.push("  Herramientas:");
  for (const [id, qty] of extras) lines.push(`    - ${named("extras", id)}${qty > 1 ? ` × ${qty}` : ""}`);
}
const { subpages = 0, sections = 0 } = selection.additional ?? {};
lines.push(`  Subpáginas adicionales: ${subpages} · Secciones adicionales: ${sections}`);
lines.push("", "Importes");
add("Subtotal", cop(row.subtotal));
add("Código", row.code ?? "ninguno");
add("Descuento pedido", cop(row.discount_requested));
add("Descuento aplicado", `${cop(row.discount_applied)}${row.floor_applied ? " (se aplicó el piso mínimo)" : ""}`);
add("Total", cop(row.total));
add("Anticipo", cop(row.deposit));
add("Saldo", cop(row.balance));
console.log(lines.join("\n"));
