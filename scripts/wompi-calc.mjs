// Prueba worker/src/wompi.ts con vectores propios (llaves FALSAS, nunca reales).
// Los hashes esperados se calcularon aparte con node:crypto y quedan fijos aquí; además se recalculan
// en cada corrida con node:crypto (otra implementación de SHA-256) para comparar.
// Uso (desde la raíz):
//   npx esbuild scripts/wompi-calc.mjs --bundle --platform=node --format=esm --outfile=<carpeta-temporal>/wompi-calc.mjs
//   node <carpeta-temporal>/wompi-calc.mjs
import { createHash } from "node:crypto";
import {
  fetchTransaction,
  integritySignature,
  loadWompiConfig,
  readTransactionEvent,
  sha256Hex,
  verifyEventChecksum,
} from "../worker/src/wompi.ts";

let fallos = 0;
const check = (ok, texto) => {
  if (!ok) fallos++;
  console.log(ok ? "✓" : "✗", texto);
};
const nodeSha = (s) => createHash("sha256").update(s).digest("hex");
const rejects = async (fn) => {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
};

// Llaves ficticias: solo para estas pruebas
const FAKE = {
  WOMPI_ENV: "test",
  WOMPI_PUBLIC_KEY: "pub_test_FALSO000",
  WOMPI_PRIVATE_KEY: "prv_test_FALSO789",
  WOMPI_EVENTS_SECRET: "test_events_FALSO456",
  WOMPI_INTEGRITY_SECRET: "test_integrity_FALSO123",
};

// 1) SHA-256 (vector estándar de "abc")
check((await sha256Hex("abc")) === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA-256 de 'abc' = vector estándar");

// 2) Firma de integridad
const base = { reference: "ZUM-PRUEBA-0001", amountInCents: 1_200_000, currency: "COP" };
const firma = await integritySignature(FAKE.WOMPI_INTEGRITY_SECRET, base);
check(firma === "45ec2bceba0432afe433fc4a3e3bd14f83a39cc302807c6c9e82fb7a68194555", "firma conocida sin expiración");
check(firma === nodeSha("ZUM-PRUEBA-0001" + "1200000" + "COP" + FAKE.WOMPI_INTEGRITY_SECRET), "firma = node:crypto (referencia + centavos + moneda + secreto)");
const conExp = await integritySignature(FAKE.WOMPI_INTEGRITY_SECRET, { ...base, expirationTime: "2026-11-12T20:30:00.000Z" });
check(conExp === "f42ee58499095eaf511e22729a6a5fbee9021db085d9be042d7ed7457326a0b4", "firma conocida con expiración (va entre moneda y secreto)");
check(firma !== (await integritySignature(FAKE.WOMPI_INTEGRITY_SECRET, { ...base, amountInCents: 1_200_100 })), "otro monto → otra firma");
check(/^[0-9a-f]{64}$/.test(firma), "firma en hex minúsculas de 64 caracteres");
check(await rejects(() => integritySignature(FAKE.WOMPI_INTEGRITY_SECRET, { ...base, amountInCents: 12_000.5 })), "rechaza monto con decimales");
check(await rejects(() => integritySignature(FAKE.WOMPI_INTEGRITY_SECRET, { ...base, amountInCents: 0 })), "rechaza monto 0");
check(await rejects(() => integritySignature(FAKE.WOMPI_INTEGRITY_SECRET, { ...base, reference: "ZUM 1" })), "rechaza referencia con espacio");
check(await rejects(() => integritySignature(FAKE.WOMPI_INTEGRITY_SECRET, { ...base, currency: "USD" })), "rechaza moneda distinta de COP");
check(await rejects(() => integritySignature(FAKE.WOMPI_INTEGRITY_SECRET, { ...base, expirationTime: "12/11/2026" })), "rechaza expiración que no es ISO UTC");

// 3) Checksum del evento
const CHECKSUM = "76579ce3bd004b4ae9c2254499a209d043bd72531341756eac6660799ecf41a1";
const evento = (cambios = {}) => ({
  event: "transaction.updated",
  data: {
    transaction: {
      id: "15113-1700000000-12345",
      status: "APPROVED",
      amount_in_cents: 1_200_000,
      reference: "ZUM-PRUEBA-0001",
      currency: "COP",
      payment_method_type: "CARD",
      ...cambios,
    },
  },
  environment: "test",
  signature: {
    properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents", "transaction.reference"],
    checksum: CHECKSUM,
  },
  timestamp: 1_700_000_500,
  sent_at: "2023-11-14T22:21:40.000Z",
});
const S = FAKE.WOMPI_EVENTS_SECRET;
check(CHECKSUM === nodeSha("15113-1700000000-12345" + "APPROVED" + "1200000" + "ZUM-PRUEBA-0001" + "1700000500" + S), "checksum esperado = node:crypto (propiedades + timestamp + secreto)");
check(await verifyEventChecksum(evento(), S), "checksum válido → true");
check(await verifyEventChecksum({ ...evento(), signature: { ...evento().signature, checksum: CHECKSUM.toUpperCase() } }, S), "checksum en MAYÚSCULAS → true");
check(await verifyEventChecksum(evento(), S, CHECKSUM.toUpperCase()), "cabecera X-Event-Checksum igual (otra capitalización) → true");
check(!(await verifyEventChecksum(evento({ amount_in_cents: 1_000_000 }), S)), "monto alterado → false");
check(!(await verifyEventChecksum(evento({ status: "DECLINED" }), S)), "estado alterado → false");
check(!(await verifyEventChecksum({ ...evento(), timestamp: 1_700_000_501 }, S)), "timestamp alterado → false");
check(!(await verifyEventChecksum({ ...evento(), signature: { ...evento().signature, checksum: CHECKSUM.replace(/.$/, "0") } }, S)), "checksum alterado (último carácter) → false");
check(!(await verifyEventChecksum(evento(), "test_events_OTRO")), "otro secreto → false");
check(!(await verifyEventChecksum(evento(), S, "0".repeat(64))), "cabecera distinta del cuerpo → false");
check(!(await verifyEventChecksum({ ...evento(), signature: { ...evento().signature, properties: ["transaction.id", "transaction.status"] } }, S)), "propiedades distintas → false");
check(!(await verifyEventChecksum({ ...evento(), signature: { ...evento().signature, properties: ["transaction.no_existe"] } }, S)), "propiedad que no existe → false");
check(!(await verifyEventChecksum({ ...evento(), signature: { ...evento().signature, properties: ["transaction"] } }, S)), "propiedad que es un objeto → false");
check(!(await verifyEventChecksum({ ...evento(), signature: { ...evento().signature, properties: ["__proto__.x"] } }, S)), "ruta __proto__ → false");
check(!(await verifyEventChecksum({ ...evento(), timestamp: "1700000500" }, S)), "timestamp como texto → false");
check(!(await verifyEventChecksum(null, S)) && !(await verifyEventChecksum({}, S)), "cuerpo vacío → false");

// 4) Lectura del evento ya verificado
const leido = readTransactionEvent(evento());
check(leido?.environment === "test" && leido.transaction.amountInCents === 1_200_000 && leido.transaction.paymentMethodType === "CARD", "readTransactionEvent lee ambiente, monto y medio");
check(readTransactionEvent({ ...evento(), event: "nequi_token.updated" }) === null, "otro tipo de evento → null");
check(readTransactionEvent(evento({ status: "RARO" })) === null, "estado desconocido → null");

// 5) Configuración (prefijos según WOMPI_ENV)
const cfg = loadWompiConfig(FAKE);
check(cfg?.apiBase === "https://sandbox.wompi.co/v1", "test → https://sandbox.wompi.co/v1");
check(loadWompiConfig({ ...FAKE, WOMPI_ENV: "prod" }) === null, "prod con llaves de test → null (falla cerrado)");
const prod = loadWompiConfig({
  WOMPI_ENV: "prod",
  WOMPI_PUBLIC_KEY: "pub_prod_FALSO",
  WOMPI_PRIVATE_KEY: "prv_prod_FALSO",
  WOMPI_EVENTS_SECRET: "prod_events_FALSO",
  WOMPI_INTEGRITY_SECRET: "prod_integrity_FALSO",
});
check(prod?.apiBase === "https://production.wompi.co/v1", "prod → https://production.wompi.co/v1");
check(loadWompiConfig({ ...FAKE, WOMPI_ENV: undefined }) === null, "sin WOMPI_ENV → null");
check(loadWompiConfig({ ...FAKE, WOMPI_PRIVATE_KEY: undefined }) === null, "sin llave privada → null");
check(loadWompiConfig({ ...FAKE, WOMPI_EVENTS_SECRET: "test_events_" }) === null, "secreto vacío tras el prefijo → null");

// 6) Consulta de la transacción (fetch simulado: nada sale a internet)
const llamadas = [];
const fakeFetch = (respuesta) => async (url, init) => {
  llamadas.push({ url, auth: init.headers.Authorization });
  return respuesta();
};
const json = (status, body) => () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const tx = evento().data.transaction;
const ok = await fetchTransaction(cfg, tx.id, fakeFetch(json(200, { data: tx })));
check(ok.status === "ok" && ok.transaction.status === "APPROVED", "200 → transacción leída");
check(llamadas[0].url === "https://sandbox.wompi.co/v1/transactions/15113-1700000000-12345", "URL de sandbox con el id");
check(llamadas[0].auth === "Bearer " + FAKE.WOMPI_PRIVATE_KEY, "usa la llave PRIVADA en Authorization: Bearer");
check((await fetchTransaction(cfg, tx.id, fakeFetch(json(404, {})))).status === "not_found", "404 → not_found");
const errores = console.error;
console.error = () => {}; // los errores esperados no ensucian la salida
check((await fetchTransaction(cfg, tx.id, fakeFetch(json(500, {})))).status === "error", "500 → error");
check((await fetchTransaction(cfg, tx.id, fakeFetch(json(200, { data: { ...tx, id: "otro-id" } })))).status === "error", "id distinto en la respuesta → error");
check((await fetchTransaction(cfg, tx.id, fakeFetch(json(200, { data: { ...tx, amount_in_cents: "1200000" } })))).status === "error", "monto como texto → error");
check((await fetchTransaction(cfg, tx.id, async () => { throw new TypeError("network"); })).status === "error", "error de red → error");
console.error = errores;
const antes = llamadas.length;
check((await fetchTransaction(cfg, "../evil?x=1", fakeFetch(json(200, {})))).status === "not_found" && llamadas.length === antes, "id con caracteres raros → not_found sin llamar a la API");

console.log(fallos ? `✗ ${fallos} pruebas fallaron` : "✓ todas las pruebas pasan");
if (fallos) process.exit(1);
