// Genera un código de descuento y muestra el INSERT para D1 y los comandos de wrangler listos para copiar.
// No se conecta a nada: solo imprime. Tú decides dónde ejecutarlo (local, staging o producción).
//
// Uso (desde la raíz del repo):
//   node scripts/crear-codigo.mjs --tipo percent --valor 10 --usos 20 --vence 2026-12-31 --notas "Campaña diciembre"
//   node scripts/crear-codigo.mjs --tipo amount --valor 50000 --usos 1 --correo cliente@ejemplo.com
//   node scripts/crear-codigo.mjs --desactivar ABCD2345     (imprime el UPDATE para desactivar un código)
//
// Parámetros:
//   --tipo      percent | amount                     (obligatorio)
//   --valor     percent: 1 a 100; amount: COP enteros (obligatorio)
//   --usos      usos máximos (entero > 0); sin él, usos ilimitados
//   --vence     AAAA-MM-DD: vale hasta el final de ese día en Colombia (UTC-5); sin él, no vence
//   --correo    solo vale para ese correo VERIFICADO (modo cliente Zumia); sin él, cualquiera
//   --notas     texto libre corto (para ti)
//   --largo     largo del código, de 8 a 12 (por defecto 10)
//   --json      imprime solo { code, sql } (lo usan las pruebas)
import { randomInt } from "node:crypto";

// Sin vocales (evita formar palabras) y sin caracteres ambiguos: 0/O, 1/I/L
export const ALPHABET = "BCDFGHJKMNPQRSTVWXYZ23456789";
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;
const COLOMBIA_OFFSET_HOURS = 5;
const MAX_NOTES = 200;

const fail = (message) => {
  console.error(`Error: ${message}`);
  process.exit(1);
};

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) fail(`argumento inesperado: ${key}`);
    const name = key.slice(2);
    if (name === "json") {
      args.json = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) fail(`falta el valor de ${key}`);
    args[name] = value;
    i++;
  }
  return args;
};

const randomCode = (length) => Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** Texto SQL entre comillas simples. Se rechazan caracteres que rompen el comando en PowerShell o bash. */
const sqlText = (value, campo) => {
  if (/["`$\\\r\n]/.test(value)) fail(`${campo} no puede tener comillas dobles, $, \`, \\ ni saltos de línea`);
  return `'${value.replace(/'/g, "''")}'`;
};

const commands = (sql) => [
  ["Local (D1 de pruebas en tu PC)", `npx wrangler d1 execute zumia-verificacion --local --command "${sql}"`],
  ["Staging (sandbox de Wompi)", `npx wrangler d1 execute zumia-verificacion-staging --env staging --remote --command "${sql}"`],
  ["Producción (¡cobra de verdad!)", `npx wrangler d1 execute zumia-verificacion --env="" --remote --command "${sql}"`],
];

const print = (title, code, sql, json) => {
  if (json) {
    console.log(JSON.stringify({ code, sql }));
    return;
  }
  console.log(`\n${title}\n`);
  console.log(`SQL:\n  ${sql}\n`);
  console.log("Comandos (ejecútalos desde la carpeta worker/; elige SOLO el que corresponda):");
  for (const [label, command] of commands(sql)) console.log(`\n  # ${label}\n  ${command}`);
  console.log("");
};

const args = parseArgs(process.argv.slice(2));

if (args.desactivar !== undefined) {
  const code = args.desactivar.trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,32}$/.test(code)) fail("código inválido (A-Z, 0-9 y guion, de 4 a 32)");
  print(`Desactivar el código ${code}`, code, `UPDATE discount_codes SET active = 0 WHERE code = '${code}';`, args.json);
  process.exit(0);
}

const kind = args.tipo;
if (kind !== "percent" && kind !== "amount") fail("--tipo debe ser percent o amount");

if (!/^\d+$/.test(args.valor ?? "")) fail("--valor debe ser un entero positivo");
const value = Number(args.valor);
if (!Number.isSafeInteger(value) || value <= 0) fail("--valor debe ser un entero positivo");
if (kind === "percent" && value > 100) fail("--valor de un porcentaje debe ser de 1 a 100");

let maxUses = "NULL";
if (args.usos !== undefined) {
  if (!/^\d+$/.test(args.usos) || Number(args.usos) <= 0 || !Number.isSafeInteger(Number(args.usos))) fail("--usos debe ser un entero mayor que 0");
  maxUses = String(Number(args.usos));
}

let expiresAt = "NULL";
let expiresLabel = "no vence";
if (args.vence !== undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(args.vence);
  if (!match) fail("--vence debe tener el formato AAAA-MM-DD");
  const [, y, m, d] = match.map(Number);
  // Fin del día en Colombia = 00:00 del día siguiente en UTC-5 = 05:00 UTC del día siguiente
  const end = Date.UTC(y, m - 1, d + 1, COLOMBIA_OFFSET_HOURS) / 1000;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) fail("--vence no es una fecha real");
  if (end * 1000 <= Date.now()) fail("--vence ya pasó");
  expiresAt = String(end);
  expiresLabel = `vale hasta el ${args.vence} a las 23:59 (hora de Colombia)`;
}

let email = "NULL";
if (args.correo !== undefined) {
  const normalized = args.correo.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) fail("--correo no es un correo válido");
  email = sqlText(normalized, "--correo");
}

let notes = "NULL";
if (args.notas !== undefined) {
  if (args.notas.length > MAX_NOTES) fail(`--notas admite hasta ${MAX_NOTES} caracteres`);
  notes = sqlText(args.notas, "--notas");
}

const length = args.largo === undefined ? 10 : Number(args.largo);
if (!Number.isInteger(length) || length < 8 || length > 12) fail("--largo debe ser de 8 a 12");

const code = randomCode(length);
const sql = `INSERT INTO discount_codes (code, kind, value, expires_at, max_uses, email, notes) VALUES ('${code}', '${kind}', ${value}, ${expiresAt}, ${maxUses}, ${email}, ${notes});`;
const resumen = `Código ${code}: ${kind === "percent" ? `${value} %` : `${new Intl.NumberFormat("es-CO").format(value)} COP`}, ${
  maxUses === "NULL" ? "usos ilimitados" : `${maxUses} uso(s)`
}, ${expiresLabel}${email === "NULL" ? "" : ", solo para el correo verificado indicado"}`;
print(resumen, code, sql, args.json);
