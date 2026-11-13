// Pruebas de la capa de pago del frontend (sin navegador ni red): payApi con fetch simulado, URL del checkout,
// estados del paso, formulario, disponibilidad, aviso del piso (texto exacto) y referencia en sessionStorage.
// Uso (desde la raíz; usa el alias @/ de tsconfig.app.json y define import.meta.env):
//   npx esbuild scripts/pay-front-calc.mjs --bundle --platform=node --format=esm --tsconfig=tsconfig.app.json
//     "--define:import.meta.env={\"VITE_VERIFY_API_URL\":\"https://api.test\"}" --outfile=<carpeta-temporal>/pay-front-calc.mjs
//   node <carpeta-temporal>/pay-front-calc.mjs
import en from "../src/i18n/en.json";
import es from "../src/i18n/es.json";
import { buildCheckoutUrl, CHECKOUT_FIELDS } from "../src/features/payments/checkout.ts";
import { canSubmitOrder, floorNotice, initialPayState, payAvailability, payReducer, validateOrderForm } from "../src/features/payments/flow.ts";
import { clearPendingReference, readPendingReference, savePendingReference } from "../src/features/payments/pendingReference.ts";
import { checkCode, createOrder, getPayStatus } from "../src/lib/payApi.ts";

let fallos = 0;
const check = (ok, texto, extra = "") => {
  if (!ok) fallos++;
  console.log(ok ? "✓" : "✗", texto, ok ? "" : extra);
};

const REF = "ZUM-" + "0123456789ABCDEF".repeat(2);
const breakdown = { subtotal: 590000, discountRequested: 0, discountApplied: 0, reducedBy: 0, floorApplied: false, total: 590000, deposit: 295000, balance: 295000, amountInCents: 29500000, minTotal: 24000 };
const fields = {
  "public-key": "pub_test_ABC",
  currency: "COP",
  "amount-in-cents": "29500000",
  reference: REF,
  "signature:integrity": "a".repeat(64),
  "expiration-time": "2026-11-13T18:00:00.000Z",
  "redirect-url": "https://zumia.dev/payment/result/",
};
const orderResponse = { ok: true, reference: REF, expiresAt: 1, mode: "normal", verified: false, breakdown, checkout: { action: "https://checkout.wompi.co/p/", fields } };
const selection = { mode: "normal", planId: "esencial", extras: { faq: 1 }, additional: { subpages: 0, sections: 0 } };

// ---------- 1) URL del checkout ----------
{
  const order = { reference: REF, breakdown, checkout: { action: "https://checkout.wompi.co/p/", fields: { ...fields, "customer-data:email": "x@example.com", "customer-data:full-name": "Nombre" } } };
  const url = buildCheckoutUrl(order);
  const u = new URL(url);
  check(url.startsWith("https://checkout.wompi.co/p/?"), "URL del checkout de Wompi");
  check([...u.searchParams.keys()].join() === CHECKOUT_FIELDS.join(), "lleva exactamente los 7 campos, en orden", [...u.searchParams.keys()].join());
  check(CHECKOUT_FIELDS.every((k) => u.searchParams.get(k) === fields[k]), "cada valor es el que firmó el Worker");
  check(!url.includes("customer-data") && !url.includes("example.com") && !url.includes("Nombre"), "nunca nombre ni correo, aunque la respuesta los traiga");
  const bad = (cambio, nombre) => check(buildCheckoutUrl({ ...order, ...cambio(order) }) === null, `rechaza: ${nombre}`);
  bad((o) => ({ checkout: { ...o.checkout, action: "https://evil.example/p/" } }), "otro action");
  bad((o) => ({ checkout: { ...o.checkout, fields: { ...fields, "signature:integrity": "" } } }), "firma vacía");
  bad((o) => ({ checkout: { ...o.checkout, fields: { ...fields, "redirect-url": undefined } } }), "sin redirect-url");
  bad(() => ({ breakdown: { ...breakdown, amountInCents: 100 } }), "monto distinto al desglose mostrado");
  bad(() => ({ reference: "ZUM-" + "F".repeat(32) }), "referencia distinta");
  bad((o) => ({ checkout: { ...o.checkout, fields: { ...fields, currency: "USD" } } }), "moneda que no es COP");
  bad((o) => ({ checkout: { ...o.checkout, fields: { ...fields, "public-key": "prv_test_X" } } }), "llave que no es pública");
  bad((o) => ({ checkout: { ...o.checkout, fields: { ...fields, "redirect-url": "http://zumia.dev/payment/result/" } } }), "redirect http fuera de localhost");
  check(buildCheckoutUrl({ ...order, checkout: { ...order.checkout, fields: { ...fields, "redirect-url": "http://localhost:5173/payment/result/" } } }) !== null, "acepta redirect http://localhost:5173 (staging)");
}

// ---------- 2) payApi con fetch simulado ----------
const calls = [];
let next = { status: 200, body: {} };
globalThis.fetch = async (url, init) => {
  calls.push({ url, init, body: JSON.parse(init.body) });
  if (next === "throw") throw new TypeError("Failed to fetch");
  const { status, body } = next;
  return { status, json: async () => (body === "bad-json" ? JSON.parse("{") : body) };
};
const MONEY_KEYS = /amount|total|deposit|balance|price|cents|subtotal|discount|breakdown/i;
const keysDeep = (v) => (v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => [k, ...keysDeep(x)]) : []);
{
  next = { status: 200, body: { ok: true, code: { code: "ABCD2345", kind: "percent", value: 10 }, breakdown } };
  const r = await checkCode({ code: "abcd2345", selection: { ...selection, total: 1, amountInCents: 5 }, verification: { token: "t.k", projectId: "p1" } });
  const c = calls.at(-1);
  check(r.status === "ok" && r.data.code.code === "ABCD2345" && r.data.breakdown.deposit === 295000, "checkCode: respuesta tipada");
  check(c.url === "https://api.test/pay/code" && c.init.method === "POST" && c.init.credentials === "omit", "checkCode: POST a la base de VITE_VERIFY_API_URL, sin cookies");
  check(!keysDeep(c.body).some((k) => MONEY_KEYS.test(k)), "checkCode: el cuerpo no lleva montos (aunque la selección traiga total)", JSON.stringify(c.body));
  check(c.body.token === "t.k" && c.body.projectId === "p1", "checkCode: envía token y proyecto si hay verificación");

  next = { status: 200, body: orderResponse };
  const o = await createOrder({ selection, verification: null, code: null, name: "Ana", email: "ana@example.com", acceptTerms: true, lang: "es" });
  const oc = calls.at(-1);
  check(o.status === "ok" && o.data.reference === REF && o.data.checkout.fields["amount-in-cents"] === "29500000", "createOrder: respuesta tipada");
  check(!keysDeep(oc.body).some((k) => MONEY_KEYS.test(k)), "createOrder: el cuerpo no lleva montos");
  check(!("code" in oc.body) && !("token" in oc.body), "createOrder: sin código ni token, no se envían");
  check(Object.keys(oc.body).sort().join() === "acceptTerms,email,lang,name,selection", "createOrder: solo las claves que acepta el Worker", Object.keys(oc.body).join());

  next = { status: 200, body: { ok: true, status: "approved", expired: false } };
  const s = await getPayStatus(REF);
  check(s.status === "ok" && s.data.status === "approved", "getPayStatus: estado tipado");
  const n = calls.length;
  const malo = await getPayStatus("ZUM-123");
  check(malo.status === "error" && malo.error === "invalid_reference" && calls.length === n, "getPayStatus: referencia mal formada → error sin llamar a la red");

  const errores = [
    [{ status: 400, body: { ok: false, error: "invalid_code" } }, "invalid_code"],
    [{ status: 400, body: { ok: false, error: "invalid_token" } }, "invalid_token"],
    [{ status: 400, body: { ok: false, error: "payment_not_available" } }, "payment_not_available"],
    [{ status: 400, body: { ok: false, error: "terms_required" } }, "terms_required"],
    [{ status: 400, body: { ok: false, error: "invalid_request" } }, "invalid_request"],
    [{ status: 400, body: { ok: false, error: "algo_nuevo" } }, "invalid_request"],
    [{ status: 429, body: { ok: false, error: "rate_limited" } }, "rate_limited"],
    [{ status: 503, body: { ok: false, error: "payments_unavailable" } }, "unavailable"],
    [{ status: 500, body: { ok: false } }, "network"],
    [{ status: 200, body: "bad-json" }, "network"],
    [{ status: 200, body: { ok: true, reference: REF, breakdown: { ...breakdown, deposit: 1 } } }, "network"],
    ["throw", "network"],
  ];
  for (const [respuesta, esperado] of errores) {
    next = respuesta;
    const r2 = await createOrder({ selection, verification: null, code: "X", name: "A", email: "a@b.co", acceptTerms: true, lang: "es" });
    check(r2.status === "error" && r2.error === esperado, `error ${respuesta === "throw" ? "red caída" : `HTTP ${respuesta.status} ${JSON.stringify(respuesta.body).slice(0, 40)}`} → ${esperado}`, JSON.stringify(r2));
  }
}

// ---------- 3) Disponibilidad ----------
{
  const a = (mode, verified) => JSON.stringify(payAvailability(mode, verified));
  check(a("redesign", false) === '{"kind":"blocked","reason":"redesign"}' && a("external", true) === '{"kind":"blocked","reason":"external"}', "rediseño y sitio externo → bloqueado con motivo");
  check(a("normal", false) === '{"kind":"payable","listPrice":false}', "normal → se paga");
  check(a("zumiaClient", false) === '{"kind":"payable","listPrice":true}', "cliente Zumia sin verificar → precio de lista con aviso");
  check(a("zumiaClient", true) === '{"kind":"payable","listPrice":false}', "cliente Zumia verificado → su descuento");
}

// ---------- 4) Estados del paso ----------
{
  const run = (events, from = initialPayState) => events.reduce(payReducer, from);
  const code = { code: "ABCD2345", kind: "percent", value: 10 };
  let s = run([{ type: "CODE_SUBMIT" }]);
  check(s.step === "code-checking", "idle → code-checking");
  s = run([{ type: "CODE_OK", code, breakdown }], s);
  check(s.step === "ready" && s.code.code === "ABCD2345", "code-checking → ready con el código");
  const fallo = run([{ type: "CODE_SUBMIT" }, { type: "CODE_FAIL", error: "invalid_code" }], s);
  check(fallo.step === "ready" && fallo.code.code === "ABCD2345" && fallo.codeError === "invalid_code", "un código nuevo inválido no borra el aplicado y muestra el error");
  s = run([{ type: "OPEN_PANEL" }], s);
  check(s.step === "confirming" && s.back === "ready", "ready → confirming");
  check(!canSubmitOrder(s, { name: "Ana", email: "a@b.co", acceptTerms: false }) && canSubmitOrder(s, { name: "Ana", email: "a@b.co", acceptTerms: true }), "pagar deshabilitado hasta marcar Términos y Política");
  s = run([{ type: "ORDER_SUBMIT" }], s);
  check(s.step === "creating-order", "confirming → creating-order");
  check(run([{ type: "SELECTION_CHANGED" }, { type: "OPEN_PANEL" }], s) === s, "mientras se crea la orden, otros eventos se ignoran");
  const ok = run([{ type: "ORDER_OK", reference: REF }], s);
  check(ok.step === "redirecting" && ok.reference === REF, "creating-order → redirecting con la referencia");
  const e1 = run([{ type: "ORDER_FAIL", error: "rate_limited" }], s);
  check(e1.step === "error" && e1.back === "confirming" && run([{ type: "RETRY" }], e1).step === "confirming", "error de red/429 → error y reintentar vuelve al panel");
  const e2 = run([{ type: "ORDER_FAIL", error: "invalid_code" }], s);
  check(e2.step === "error" && e2.code === null && run([{ type: "RETRY" }], e2).step === "idle", "código agotado al crear la orden → se quita y vuelve a la tarjeta");
  const e3 = run([{ type: "ORDER_FAIL", error: "checkout" }], ok);
  check(e3.step === "error" && e3.reference === null, "checkout incoherente → error, sin redirigir");
  check(run([{ type: "CLOSE_PANEL" }], run([{ type: "OPEN_PANEL" }])).step === "idle", "cerrar el panel vuelve a la tarjeta");
  check(run([{ type: "SELECTION_CHANGED" }], run([{ type: "CODE_OK", code, breakdown }], run([{ type: "CODE_SUBMIT" }]))) === initialPayState, "cambiar la selección descarta el código (hay que validarlo de nuevo)");
  check(run([{ type: "ORDER_SUBMIT" }]) === initialPayState, "no se crea orden sin pasar por el panel");
}

// ---------- 5) Formulario ----------
{
  check(JSON.stringify(validateOrderForm({ name: "  Ana  María ", email: " ANA@Example.COM ", acceptTerms: true })) === "{}", "formulario válido (espacios y mayúsculas normalizados)");
  const e = validateOrderForm({ name: "   ", email: "no-correo", acceptTerms: false });
  check(e.name === "required" && e.email === "invalid" && e.acceptTerms === "required", "nombre, correo y casilla obligatorios");
  check(validateOrderForm({ name: "x".repeat(121), email: "a@b.co", acceptTerms: true }).name === "tooLong", "nombre de más de 120 caracteres");
}

// ---------- 6) Aviso del piso (texto exacto) ----------
{
  const render = (dict, n) => dict.quote.pay.floorNotice.replace(/\{\{(\w+)\}\}/g, (_, k) => n.values[k]);
  check(floorNotice({ reducedBy: 0 }, "es") === null, "sin reducción no hay aviso");
  const nEs = floorNotice({ reducedBy: 4400 }, "es");
  check(nEs.key === "quote.pay.floorNotice", "clave quote.pay.floorNotice");
  const esperadoEs = "El pago mínimo para anticipo es de 12.000 COP, tus descuentos se han reducido en 4.400 COP, si deseas aprovechar todo tu descuento, añade uno o más servicios adicionales";
  check(render(es, nEs) === esperadoEs, "texto ES exacto", render(es, nEs));
  const esperadoEn = "The minimum deposit payment is 12,000 COP. Your discounts have been reduced by 4,400 COP. To get your full discount, add one or more additional services";
  const nEn = floorNotice({ reducedBy: 4400 }, "en");
  check(render(en, nEn) === esperadoEn, "texto EN", render(en, nEn));
}

// ---------- 7) Referencia en sessionStorage ----------
{
  const store = new Map();
  globalThis.window = { sessionStorage: { setItem: (k, v) => store.set(k, v), getItem: (k) => store.get(k) ?? null, removeItem: (k) => store.delete(k) } };
  check(savePendingReference(REF) && readPendingReference() === REF, "guarda y lee la referencia");
  check([...store.keys()].join() === "zumia.pay.reference" && [...store.values()].join() === REF, "solo se guarda la referencia, nada más");
  check(!savePendingReference("ana@example.com") && readPendingReference() === REF, "rechaza lo que no es una referencia ZUM-…");
  clearPendingReference();
  check(readPendingReference() === null, "clear la borra");
  store.set("zumia.pay.reference", "<script>");
  check(readPendingReference() === null, "ignora un valor manipulado");
  globalThis.window = { get sessionStorage() { throw new Error("bloqueado"); } };
  check(savePendingReference(REF) === false && readPendingReference() === null, "almacenamiento bloqueado: no lanza");
}

console.log(fallos ? `✗ ${fallos} pruebas fallaron` : "✓ todas las pruebas pasan");
process.exit(fallos ? 1 : 0);
