// Prueba el desglose del pago (paymentBreakdown en src/data/quote.ts) con precios reales.
// Imprime una tabla de casos y termina con código 1 si algún caso falla.
// Uso (desde la raíz; quote.ts importa sin extensión, por eso se empaqueta con esbuild):
//   npx esbuild scripts/pago-calc.mjs --bundle --platform=node --format=esm --outfile=<carpeta-temporal>/pago-calc.mjs
//   node <carpeta-temporal>/pago-calc.mjs
import { EXTRAS } from "../src/data/extras.ts";
import { getPlan } from "../src/data/plans.ts";
import { MIN_TOTAL, NO_ADDITIONAL, computeQuote, paymentBreakdown } from "../src/data/quote.ts";

const tool49 = EXTRAS.find((e) => e.price === 49_000 && !e.perLanguage); // una herramienta de 49.000
const pct = (p) => ({ kind: "percent", value: p });
const amount = (v) => ({ kind: "amount", value: v });

// Subtotales armados con computeQuote (no a mano), para que sigan los precios de plans.ts y extras.ts
const esencial = computeQuote("normal", "esencial", {}); // 590.000
const cliente20 = computeQuote("zumiaClient", null, { [tool49.id]: 1 }, NO_ADDITIONAL, getPlan("profesional").extrasDiscount); // 39.200
const cliente5 = computeQuote("zumiaClient", null, { [tool49.id]: 1 }, NO_ADDITIONAL, getPlan("esencial").extrasDiscount); // 46.550

// [nombre, quote, código, esperado parcial]
const casos = [
  ["Esencial, sin código", esencial, null, { discountApplied: 0, total: 590_000, deposit: 295_000 }],
  ["Esencial, 10 %", esencial, pct(10), { discountApplied: 59_000, total: 531_000, deposit: 265_500 }],
  ["Esencial, 50 %", esencial, pct(50), { discountApplied: 295_000, total: 295_000, deposit: 147_500 }],
  ["Esencial, fijo 1.000.000 (> subtotal)", esencial, amount(1_000_000), { discountRequested: 590_000, discountApplied: 566_000, total: MIN_TOTAL, floorApplied: true }],
  ["Cliente 5 % (46.550), 10 % → impar", cliente5, pct(10), { discountApplied: 4_655, total: 41_895, deposit: 20_948, balance: 20_947 }],
  ["Cliente 20 % (39.200), sin código", cliente20, null, { total: 39_200, deposit: 19_600, floorApplied: false }],
  ["Cliente 20 % (39.200), 50 %", cliente20, pct(50), { discountRequested: 19_600, discountApplied: 15_200, reducedBy: 4_400, total: 24_000, deposit: 12_000, balance: 12_000, floorApplied: true }],
  ["Cliente 20 % (39.200), fijo 10.000", cliente20, amount(10_000), { discountApplied: 10_000, total: 29_200, deposit: 14_600, floorApplied: false }],
  ["Subtotal 20.000 (< piso), 50 %", { total: 20_000 }, pct(50), { discountApplied: 0, total: 20_000, deposit: 10_000 }],
];

let fallos = 0;
const fmt = (n) => (typeof n === "boolean" ? (n ? "sí" : "no") : new Intl.NumberFormat("es-CO").format(n));
const filas = casos.map(([nombre, quote, code, esperado]) => {
  const b = paymentBreakdown(quote, code);
  const errores = Object.entries(esperado).filter(([k, v]) => b[k] !== v).map(([k, v]) => `${k}=${fmt(b[k])}≠${fmt(v)}`);
  if (b.deposit + b.balance !== b.total) errores.push("anticipo+saldo≠total");
  if (b.amountInCents !== b.deposit * 100) errores.push("centavos");
  if (b.reducedBy !== b.discountRequested - b.discountApplied) errores.push("reducedBy");
  if (errores.length) fallos++;
  return {
    caso: nombre,
    subtotal: fmt(b.subtotal),
    pedido: fmt(b.discountRequested),
    aplicado: fmt(b.discountApplied),
    reducido: fmt(b.reducedBy),
    piso: fmt(b.floorApplied),
    total: fmt(b.total),
    anticipo: fmt(b.deposit),
    saldo: fmt(b.balance),
    centavos: b.amountInCents,
    ok: errores.length ? `✗ ${errores.join(", ")}` : "✓",
  };
});
console.table(filas);

// Invariantes con 20.000 combinaciones al azar (semilla fija, para que se pueda repetir)
let seed = 12345;
const rand = (max) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % max);
let malos = 0;
for (let i = 0; i < 20_000; i++) {
  const subtotal = 1 + rand(5_000_000);
  const code = rand(3) === 0 ? null : rand(2) ? pct(1 + rand(100)) : amount(1 + rand(6_000_000));
  const b = paymentBreakdown({ total: subtotal }, code);
  const ok =
    b.deposit + b.balance === b.total &&
    b.deposit >= b.balance &&
    b.deposit - b.balance <= 1 &&
    b.discountApplied >= 0 &&
    b.discountApplied <= b.discountRequested &&
    (subtotal < MIN_TOTAL ? b.total === subtotal : b.total >= MIN_TOTAL);
  if (!ok) malos++;
}
console.log(malos === 0 ? "✓ 20.000 casos al azar: anticipo + saldo = total, anticipo ≥ saldo, total ≥ 24.000 (si el subtotal lo permite)" : `✗ ${malos} casos al azar fallaron`);

if (fallos || malos) {
  console.log(`✗ ${fallos} casos de la tabla fallaron`);
  process.exit(1);
}
console.log("✓ todos los casos de la tabla pasan");
