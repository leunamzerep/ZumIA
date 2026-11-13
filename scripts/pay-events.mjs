// Prueba /pay/events (webhook), /pay/status, transiciones y cron contra `wrangler dev` con una D1 LOCAL
// aislada, llaves FALSAS y Wompi/Brevo SIMULADOS (servidor en este proceso, http://127.0.0.1:8798).
// Nada sale a internet. Uso, desde worker/:
//   npx wrangler d1 migrations apply zumia-verificacion --local --persist-to <carpeta>
//   npx wrangler d1 execute zumia-verificacion --local --persist-to <carpeta> --file=./seed.example.sql
//   npx wrangler d1 execute zumia-verificacion --local --persist-to <carpeta> --file=../scripts/pay-events.sql
//   npx wrangler dev --port 8799 --test-scheduled --persist-to <carpeta> --var VERIFY_PEPPER:pepper-falso-1
//     --var TOKEN_SECRET:token-falso-2 --var WOMPI_ENV:test --var WOMPI_PUBLIC_KEY:pub_test_FALSO000
//     --var WOMPI_PRIVATE_KEY:prv_test_FALSO789 --var WOMPI_EVENTS_SECRET:test_events_FALSO456
//     --var WOMPI_INTEGRITY_SECRET:test_integrity_FALSO123 --var PAY_REDIRECT_BASE:https://zumia.dev
//     --var ALLOWED_ORIGINS:https://zumia.dev --var DEV_MOCK_ORIGIN:http://127.0.0.1:8798
//     --var BREVO_API_KEY:xkeysib-FALSO --var MAIL_FROM_EMAIL:remitente@example.com --var MAIL_FROM_NAME:Zumia
//     --var PAY_NOTICE_TO:admin@example.com
//   PERSIST=<carpeta> node ../scripts/pay-events.mjs
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const API = process.env.API ?? "http://127.0.0.1:8799";
const PERSIST = process.env.PERSIST;
const EVENTS_SECRET = "test_events_FALSO456";
if (!PERSIST) throw new Error("Falta PERSIST (carpeta de la D1 local)");

let fallos = 0;
const check = (ok, texto, extra = "") => {
  if (!ok) fallos++;
  console.log(ok ? "✓" : "✗", texto, ok ? "" : extra);
};

// ---------- Wompi y Brevo simulados ----------
const txById = new Map(); // id → transacción (formato de la API de Wompi)
const mails = []; // cuerpos enviados a Brevo
const auths = []; // cabeceras Authorization recibidas por la API de Wompi simulada
let wompiDown = false;
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (url.pathname.startsWith("/wompi/v1/transactions")) {
    auths.push(req.headers.authorization);
    if (wompiDown) return send(500, {});
    const id = decodeURIComponent(url.pathname.slice("/wompi/v1/transactions/".length));
    if (id) return txById.has(id) ? send(200, { data: txById.get(id) }) : send(404, {});
    const reference = url.searchParams.get("reference");
    return send(200, { data: [...txById.values()].filter((tx) => tx.reference === reference) });
  }
  if (url.pathname === "/brevo/v3/smtp/email") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      mails.push(JSON.parse(body));
      send(201, { messageId: "x" });
    });
    return;
  }
  send(404, {});
});
await new Promise((resolve) => server.listen(8798, "127.0.0.1", resolve));

// ---------- Utilidades ----------
// wrangler se llama con node directamente (sin shell), para que el SQL llegue como un solo argumento
const WORKER_DIR = fileURLToPath(new URL("../worker/", import.meta.url));
const WRANGLER = `${WORKER_DIR}node_modules/wrangler/bin/wrangler.js`;
const db = (sql) =>
  JSON.parse(
    execFileSync(process.execPath, [WRANGLER, "d1", "execute", "zumia-verificacion", "--local", "--persist-to", PERSIST, "--json", "--command", sql], {
      cwd: WORKER_DIR,
      encoding: "utf8",
    }),
  ).map((r) => r.results);
let ipN = 0;
const post = async (path, body, headers = {}) => {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://zumia.dev", "CF-Connecting-IP": `192.0.2.${(ipN++ % 250) + 1}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const statusOf = async (reference) => (await post("/pay/status", { reference })).json;
let mailN = 0;
const newOrder = async (code, email = `ev${mailN++}@example.com`) => {
  const r = await post("/pay/orders", { selection: { mode: "normal", planId: "esencial", extras: {} }, code, name: "Cliente <b>Prueba</b>", email, acceptTerms: true, lang: "es" });
  if (r.status !== 200) throw new Error(`no se creó la orden: ${JSON.stringify(r.json)}`);
  return { reference: r.json.reference, cents: r.json.breakdown.amountInCents, deposit: r.json.breakdown.deposit, email };
};
let txN = 0;
const tx = (order, status, cambios = {}) => {
  const t = { id: `99${txN++}-1700000000-0001`, status, reference: order.reference, amount_in_cents: order.cents, currency: "COP", payment_method_type: "CARD", ...cambios };
  txById.set(t.id, t);
  return t;
};
const sha = (s) => createHash("sha256").update(s).digest("hex");
/** Evento firmado con el secreto de eventos falso. `body` es lo que dice el evento (puede diferir de la API). */
const event = (body, { environment = "test", type = "transaction.updated", secret = EVENTS_SECRET } = {}) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const properties = ["transaction.id", "transaction.status", "transaction.amount_in_cents"];
  const checksum = sha(`${body.id}${body.status}${body.amount_in_cents}${timestamp}${secret}`).toUpperCase();
  return { event: type, data: { transaction: body }, environment, signature: { properties, checksum }, timestamp, sent_at: new Date().toISOString() };
};
const sendEvent = (ev) => post("/pay/events", ev);
const waitFor = async (fn, ms = 8000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};
const cron = () => fetch(`${API}/__scheduled?cron=${encodeURIComponent("*/10 * * * *")}`);
const code = (c) => db(`SELECT used_count u, reserved_count r FROM discount_codes WHERE code = '${c}'`)[0][0];
const expireNow = (refs) => db(`UPDATE orders SET expires_at = unixepoch() - 60 WHERE reference IN (${refs.map((r) => `'${r}'`).join(",")})`);

// 1) Evento válido aprobado (usa el código EV-UNO, de un solo uso)
const a = await newOrder("EV-UNO");
check(code("EV-UNO").r === 1, "orden A con EV-UNO: reserva 1");
const txA = tx(a, "APPROVED");
const r1 = await sendEvent(event(txA));
check(r1.status === 200, "evento APPROVED válido → 200");
check((await statusOf(a.reference)).status === "approved", "orden A → approved");
check(JSON.stringify(code("EV-UNO")) === '{"u":1,"r":0}', "EV-UNO: usado 1, reservado 0", JSON.stringify(code("EV-UNO")));
check(auths.at(-1) === "Bearer prv_test_FALSO789", "consulta a Wompi con la llave privada (Bearer)");
check(await waitFor(() => mails.length === 1), "aviso por Brevo enviado (1 correo)");
const m = mails[0];
const html = m?.htmlContent ?? "";
check(m?.to?.[0]?.email === "admin@example.com" && m.subject.includes(a.reference), "aviso a PAY_NOTICE_TO (no a MAIL_FROM_EMAIL) con la referencia en el asunto");
check(m?.sender?.email === "remitente@example.com", "el remitente sigue siendo MAIL_FROM_EMAIL");
const copA = `${new Intl.NumberFormat("es-CO").format(a.deposit)} COP`; // 10 % de EV-UNO: 265.500
check(html.includes(copA) && html.includes(a.email) && html.includes("&lt;b&gt;Prueba&lt;/b&gt;") && !html.includes("<b>Prueba"), "aviso con anticipo, saldo, correo y nombre escapado en HTML");
check(m?.textContent.includes("Modo: normal") && m.textContent.includes("Cliente verificado: no") && m.textContent.includes(`Anticipo pagado: ${copA}`) && m.textContent.includes(`Saldo pendiente: ${copA}`), "aviso con modo, verificado y saldo");

// 2) Evento repetido
const r2 = await sendEvent(event(txA));
await new Promise((r) => setTimeout(r, 500));
check(r2.status === 200 && JSON.stringify(code("EV-UNO")) === '{"u":1,"r":0}' && mails.length === 1, "evento repetido → 200, sin contar otro uso ni otro correo");

// 3) Checksum alterado
const malo = event(txA);
malo.signature.checksum = malo.signature.checksum.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
const r3 = await sendEvent(malo);
check(r3.status === 400 && Object.keys(r3.json).length === 2, "checksum alterado → 400 sin detalle", JSON.stringify(r3.json));
check((await sendEvent(event(txA, { secret: "test_events_OTRO" }))).status === 400, "evento firmado con otro secreto → 400");
check((await sendEvent("{no json")).status === 400, "cuerpo que no es JSON → 400");

// 4) Monto distinto: el evento dice el monto correcto, pero la API de Wompi dice otro
const b = await newOrder("EV-DIEZ");
const txB = tx(b, "APPROVED", { amount_in_cents: b.cents - 100 });
const r4 = await sendEvent(event({ ...txB, amount_in_cents: b.cents }));
check(r4.status === 200 && (await statusOf(b.reference)).status === "error", "monto distinto en la API → orden en error (no aprobada)");
check(JSON.stringify(code("EV-DIEZ")) === '{"u":0,"r":0}', "monto distinto: no cuenta el uso y libera la reserva", JSON.stringify(code("EV-DIEZ")));

// 5) Referencia desconocida
const fantasma = { reference: "ZUM-" + "0".repeat(32), cents: 100 };
const r5 = await sendEvent(event(tx(fantasma, "APPROVED")));
check(r5.status === 200, "referencia desconocida con checksum válido → 200");

// 6) DECLINED libera la reserva
const c = await newOrder("EV-DIEZ");
check(code("EV-DIEZ").r === 1, "orden C con EV-DIEZ: reserva 1");
await sendEvent(event(tx(c, "DECLINED")));
check((await statusOf(c.reference)).status === "declined" && JSON.stringify(code("EV-DIEZ")) === '{"u":0,"r":0}', "DECLINED → declined y libera la reserva");
await sendEvent(event(tx(c, "ERROR")));
check((await statusOf(c.reference)).status === "declined", "un ERROR posterior no cambia una orden ya cerrada como declined");

// 7) Cron que expira (sin pago en Wompi) y APPROVED tardío que supera max_uses
const d = await newOrder("EV-TARDE");
expireNow([d.reference]);
const mailsAntes = mails.length;
await cron();
check(await waitFor(async () => (await statusOf(d.reference)).status === "expired"), "cron: orden D vencida y sin pago → expired");
check(JSON.stringify(code("EV-TARDE")) === '{"u":0,"r":0}', "cron: libera la reserva de EV-TARDE");
const st = await statusOf(d.reference);
check(st.expired === true && Object.keys(st).sort().join() === "expired,ok,status", "status: solo ok, status y expired", JSON.stringify(st));
const e = await newOrder("EV-TARDE");
await sendEvent(event(tx(e, "APPROVED")));
check(JSON.stringify(code("EV-TARDE")) === '{"u":1,"r":0}', "orden E usa el cupo liberado y se aprueba (usado 1)");
await sendEvent(event(tx(d, "APPROVED")));
check((await statusOf(d.reference)).status === "approved", "APPROVED tardío sobre D expirada → approved");
check(code("EV-TARDE").u === 2, "el uso tardío se cuenta aunque supere max_uses (2 de 1)", JSON.stringify(code("EV-TARDE")));
check(await waitFor(() => mails.length === mailsAntes + 2) && mails.at(-1).textContent.includes("orden ya vencida"), "aviso del tardío con la nota de orden vencida");

// 8) Doble evento simultáneo
const f = await newOrder("EV-DOBLE");
const txF = tx(f, "APPROVED");
const antes8 = mails.length;
const [x, y] = await Promise.all([sendEvent(event(txF)), sendEvent(event(txF))]);
await new Promise((r) => setTimeout(r, 800));
check(x.status === 200 && y.status === 200 && JSON.stringify(code("EV-DOBLE")) === '{"u":1,"r":0}' && mails.length === antes8 + 1, "doble evento simultáneo: un solo uso y un solo correo", `${JSON.stringify(code("EV-DOBLE"))} correos=${mails.length - antes8}`);

// 9) Cancelación de pendientes al crear otra orden del mismo correo
const g = await newOrder("EV-CANCELA", "repite@example.com");
check(code("EV-CANCELA").r === 1, "orden G con EV-CANCELA: reserva 1");
const h = await newOrder(undefined, "repite@example.com");
check((await statusOf(g.reference)).status === "expired" && (await statusOf(h.reference)).status === "pending", "nueva orden del mismo correo: G → expired, H pending");
check(JSON.stringify(code("EV-CANCELA")) === '{"u":0,"r":0}', "la cancelación libera la reserva de G");
const g2 = await newOrder("EV-CANCELA", "repite@example.com");
check(code("EV-CANCELA").r === 1 && (await statusOf(h.reference)).status === "expired", "el mismo correo puede volver a usar el código (reserva 1) y H se cancela");

// 9b) Carrera: si otra orden gana el último cupo, la orden previa del perdedor NO se cancela (se deshace el batch)
const p1 = await newOrder(undefined, "carrera1@example.com");
const p2 = await newOrder(undefined, "carrera2@example.com");
const body = (email) => ({ selection: { mode: "normal", planId: "esencial", extras: {} }, code: "EV-CARRERA", name: "Carrera", email, acceptTerms: true, lang: "es" });
const [k1, k2] = await Promise.all([post("/pay/orders", body("carrera1@example.com")), post("/pay/orders", body("carrera2@example.com"))]);
const perdedor = k1.status === 200 ? p2 : p1;
check([k1, k2].filter((k) => k.status === 200).length === 1 && [k1, k2].some((k) => k.json?.error === "invalid_code"), "carrera por EV-CARRERA: 1 orden y 1 invalid_code", JSON.stringify([k1.json, k2.json]));
check((await statusOf(perdedor.reference)).status === "pending", "la orden previa del perdedor sigue pending (todo el batch se deshizo)");

// 10) Cron que encuentra un pago aprobado (webhook que nunca llegó)
const i = await newOrder(undefined);
tx(i, "APPROVED");
expireNow([i.reference]);
const antes10 = mails.length;
await cron();
check(await waitFor(async () => (await statusOf(i.reference)).status === "approved"), "cron: encuentra el pago aprobado por referencia → approved");
check(await waitFor(() => mails.length === antes10 + 1), "cron: envía el aviso del pago encontrado");

// 11) Otros casos del webhook
check((await sendEvent(event(txA, { type: "nequi_token.updated" }))).status === 200, "evento de otro tipo → 200 (se ignora)");
const j = await newOrder(undefined);
await sendEvent(event(tx(j, "APPROVED"), { environment: "prod" }));
check((await statusOf(j.reference)).status === "pending", "evento de otro ambiente (prod) → se ignora");
wompiDown = true;
const r11 = await sendEvent(event(tx(j, "APPROVED")));
wompiDown = false;
check(r11.status === 500 && (await statusOf(j.reference)).status === "pending", "Wompi caído al consultar → 500 (Wompi reintenta) y la orden sigue pending");

// 12) /pay/status
const getS = await fetch(`${API}/pay/status?reference=${a.reference}`, { headers: { origin: "https://zumia.dev", "CF-Connecting-IP": "192.0.2.250" } });
const getJ = await getS.json();
check(getS.status === 200 && getJ.status === "approved" && getS.headers.get("cache-control") === "no-store", "GET /pay/status → approved, no-store");
check(!JSON.stringify(getJ).includes("@"), "status sin datos personales");
check((await post("/pay/status", { reference: "ZUM-" + "F".repeat(32) })).json?.error === "invalid_reference", "status de referencia inexistente → invalid_reference");
check((await post("/pay/status", { reference: "abc" })).json?.error === "invalid_reference", "status con formato inválido → invalid_reference");

// Estado final de D1: reservas coherentes con las órdenes pending
const [[coherencia]] = db(
  `SELECT (SELECT coalesce(sum(reserved_count),0) FROM discount_codes) AS reservados,
          (SELECT count(*) FROM orders WHERE status = 'pending' AND code_reserved = 1) AS pendientes_con_codigo,
          (SELECT count(*) FROM orders WHERE status <> 'pending' AND code_reserved = 1) AS cerradas_con_reserva`,
);
check(coherencia.reservados === coherencia.pendientes_con_codigo && coherencia.cerradas_con_reserva === 0, "D1: suma de reservas = órdenes pending con código; ninguna cerrada conserva reserva", JSON.stringify(coherencia));

server.close();
console.log(fallos ? `✗ ${fallos} pruebas fallaron` : "✓ todas las pruebas pasan");
process.exit(fallos ? 1 : 0);
