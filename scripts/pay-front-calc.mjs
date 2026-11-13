// Pruebas de la capa de pago del frontend (sin navegador ni red): payApi con fetch simulado, URL del checkout,
// estados del paso (panel, código, bfcache, cambio de selección), formulario, disponibilidad, mensajes por error
// (ES/EN), aviso del piso (texto exacto), referencia en sessionStorage y página de resultado (entradas, vistas, sondeo).
// Uso (desde la raíz; usa el alias @/ de tsconfig.app.json y define import.meta.env):
//   npx esbuild scripts/pay-front-calc.mjs --bundle --platform=node --format=esm --tsconfig=tsconfig.app.json
//     "--define:import.meta.env={\"VITE_VERIFY_API_URL\":\"https://api.test\"}" --outfile=<carpeta-temporal>/pay-front-calc.mjs
//   node <carpeta-temporal>/pay-front-calc.mjs
import en from "../src/i18n/en.json";
import es from "../src/i18n/es.json";
import { buildCheckoutUrl, CHECKOUT_FIELDS } from "../src/features/payments/checkout.ts";
import {
  amountMatches,
  canSubmitOrder,
  codeErrorKey,
  floorNotice,
  initialPayState,
  isPanelOpen,
  ORDER_ERRORS,
  orderErrorKey,
  payAvailability,
  payReducer,
  submitBlockReason,
  validateOrderForm,
} from "../src/features/payments/flow.ts";
import { clearPendingReference, readPendingReference, savePendingReference } from "../src/features/payments/pendingReference.ts";
import { checkCode, createOrder, getPayStatus } from "../src/lib/payApi.ts";
import {
  POLL_INTERVAL_MS,
  POLL_MAX_MS,
  RESULT_VIEWS,
  isFinalView,
  nextAfterPoll,
  readResultInputs,
  resultMessageKey,
  statusQueryFor,
  viewForError,
  viewForStatus,
} from "../src/features/payments/result.ts";

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
  const s = await getPayStatus({ reference: REF });
  check(s.status === "ok" && s.data.status === "approved", "getPayStatus: estado tipado");
  const n = calls.length;
  const malo = await getPayStatus({ reference: "ZUM-123" });
  check(malo.status === "error" && malo.error === "invalid_reference" && calls.length === n, "getPayStatus: referencia mal formada → error sin llamar a la red");
  next = { status: 200, body: { ok: true, status: "pending", expired: false } };
  const porId = await getPayStatus({ id: "12345-1700000000-00001" });
  check(porId.status === "ok" && porId.data.status === "pending" && JSON.stringify(calls.at(-1).body) === '{"id":"12345-1700000000-00001"}' && !calls.at(-1).url.includes("12345"), "getPayStatus por id: POST { id } (el id no va en la URL)");
  const n2 = calls.length;
  const idMalo = await getPayStatus({ id: "abc$%" });
  check(idMalo.status === "error" && idMalo.error === "invalid_reference" && calls.length === n2, "getPayStatus: id mal formado → error sin llamar a la red");

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
  const a = (mode, verified, total) => JSON.stringify(payAvailability(mode, verified, total));
  check(a("redesign", false) === '{"kind":"blocked","reason":"redesign"}' && a("external", true) === '{"kind":"blocked","reason":"external"}', "rediseño y sitio externo → bloqueado con motivo");
  check(a("normal", false) === '{"kind":"payable","listPrice":false}', "normal → se paga");
  check(a("zumiaClient", false) === '{"kind":"payable","listPrice":true}', "cliente Zumia sin verificar → precio de lista con aviso");
  check(a("zumiaClient", true) === '{"kind":"payable","listPrice":false}', "cliente Zumia verificado → su descuento");
  check(a("zumiaClient", true, 23_999) === '{"kind":"blocked","reason":"below_minimum"}' && a("normal", false, 24_000) === '{"kind":"payable","listPrice":false}', "total < 24.000 → bloqueado (below_minimum); 24.000 sí se paga");
}

// ---------- 4) Estados del paso ----------
{
  const run = (events, from = initialPayState) => events.reduce(payReducer, from);
  const code = { code: "ABCD2345", kind: "percent", value: 10 };
  // Panel: cerrado por defecto; el código se aplica con el panel abierto y el panel sigue abierto
  check(!isPanelOpen(initialPayState), "el panel empieza cerrado");
  let s = run([{ type: "OPEN_PANEL" }]);
  check(s.step === "confirming" && isPanelOpen(s), "OPEN_PANEL abre el panel (confirming)");
  s = run([{ type: "CODE_SUBMIT" }], s);
  check(s.step === "code-checking" && s.codeFrom === "panel" && isPanelOpen(s), "aplicar código con el panel abierto → code-checking sin cerrar el panel");
  s = run([{ type: "CODE_OK", code, breakdown }], s);
  check(s.step === "confirming" && s.code.code === "ABCD2345" && s.breakdown.deposit === 295000, "código aplicado → vuelve al panel con el desglose del Worker");
  check(run([{ type: "CODE_SUBMIT" }], s) === s, "un código por orden: con uno aplicado no se puede pedir otro");
  const fallo = run([{ type: "OPEN_PANEL" }, { type: "CODE_SUBMIT" }, { type: "CODE_FAIL", error: "invalid_code" }]);
  check(fallo.step === "confirming" && fallo.code === null && fallo.codeError === "invalid_code", "código inválido → error junto al campo, panel abierto");
  check(run([{ type: "CODE_REMOVE" }], s).code === null && run([{ type: "CODE_REMOVE" }], s).step === "confirming", "quitar el código deja el panel abierto y sin código");
  check(run([{ type: "CODE_OK", code, breakdown }], run([{ type: "OPEN_PANEL" }])).code === null, "respuesta de código fuera de code-checking se ignora");
  check(!canSubmitOrder(s, { name: "Ana", email: "a@b.co", acceptTerms: false }) && canSubmitOrder(s, { name: "Ana", email: "a@b.co", acceptTerms: true }), "pagar deshabilitado hasta marcar Términos y Política");
  check(submitBlockReason(s, { name: "", email: "", acceptTerms: false }) === "terms" && submitBlockReason(s, { name: "Ana", email: "a@b.co", acceptTerms: true }) === null, "motivo en texto: 'terms' sin casilla, null con casilla");
  s = run([{ type: "ORDER_SUBMIT" }], s);
  check(s.step === "creating-order" && submitBlockReason(s, { name: "Ana", email: "a@b.co", acceptTerms: true }) === "busy", "confirming → creating-order (botón ocupado)");
  check(run([{ type: "OPEN_PANEL" }, { type: "ORDER_SUBMIT" }, { type: "CODE_SUBMIT" }], s) === s, "mientras se crea la orden, otros eventos se ignoran (doble clic incluido)");
  check(run([{ type: "SELECTION_CHANGED" }], s) === s, "cambiar la selección mientras se crea la orden no cambia el estado");
  const ok = run([{ type: "ORDER_OK", reference: REF }], s);
  check(ok.step === "redirecting" && ok.reference === REF, "creating-order → redirecting con la referencia");
  check(run([{ type: "ORDER_SUBMIT" }], ok) === ok, "en redirecting un segundo clic no hace nada");
  const e1 = run([{ type: "ORDER_FAIL", error: "rate_limited" }], s);
  check(e1.step === "error" && isPanelOpen(e1) && submitBlockReason(e1, { name: "A", email: "a@b.co", acceptTerms: true }) === "error", "error → panel abierto con mensaje; pagar deshabilitado hasta reintentar");
  check(run([{ type: "RETRY" }], e1).step === "confirming", "reintentar vuelve al panel");
  const e2 = run([{ type: "ORDER_FAIL", error: "invalid_code" }], s);
  check(e2.step === "error" && e2.code === null && run([{ type: "RETRY" }], e2).step === "confirming", "código agotado al crear la orden → se quita y se reintenta sin él");
  const nuevo = { ...breakdown, deposit: 300000, balance: 290000, total: 590000, amountInCents: 30000000 };
  const e3 = run([{ type: "ORDER_FAIL", error: "amount_changed", breakdown: nuevo }], s);
  check(e3.step === "error" && e3.breakdown.deposit === 300000, "monto distinto → error y se muestra el desglose del Worker");
  check(run([{ type: "ORDER_FAIL", error: "checkout" }], ok).step === "error", "checkout incoherente → error, sin redirigir");
  check(amountMatches(29500000, { breakdown }) && !amountMatches(29500100, { breakdown }), "amountMatches compara el anticipo mostrado con el de la orden");
  // Volver desde Wompi (bfcache)
  const back = run([{ type: "PAGE_RESTORED" }], ok);
  check(back.step === "confirming" && back.notice === "returned" && back.reference === null, "volver desde Wompi (pageshow persisted) → panel listo para reintentar, con aviso");
  check(run([{ type: "PAGE_RESTORED" }], initialPayState) === initialPayState, "PAGE_RESTORED sin redirección en curso no cambia nada");
  // Cambiar la selección
  const conCodigo = run([{ type: "OPEN_PANEL" }, { type: "CODE_SUBMIT" }, { type: "CODE_OK", code, breakdown }]);
  const cambiado = run([{ type: "SELECTION_CHANGED" }], conCodigo);
  check(cambiado.step === "confirming" && cambiado.code === null && cambiado.breakdown === null && cambiado.notice === "codeCleared", "cambiar la selección quita el código (con aviso) sin cerrar el panel");
  const enVuelo = run([{ type: "SELECTION_CHANGED" }], run([{ type: "OPEN_PANEL" }, { type: "CODE_SUBMIT" }]));
  check(enVuelo.step === "confirming" && run([{ type: "CODE_OK", code, breakdown }], enVuelo).code === null, "cambiar la selección con un código en verificación: la respuesta vieja se ignora");
  const errVisible = run([{ type: "SELECTION_CHANGED" }], run([{ type: "ORDER_FAIL", error: "invalid_token" }], s));
  check(errVisible.step === "error" && errVisible.error === "invalid_token" && errVisible.code === null, "si la verificación vence con el error a la vista, el mensaje se mantiene");
  check(run([{ type: "CLOSE_PANEL" }], run([{ type: "OPEN_PANEL" }])).step === "idle", "cerrar el panel vuelve al estado inicial");
  check(run([{ type: "ORDER_SUBMIT" }]) === initialPayState, "no se crea orden sin abrir el panel");

  // Mensajes: cada error tiene texto en es.json y en.json; los de código usan un mensaje común
  const get = (dict, key) => key.split(".").reduce((o, k) => o?.[k], dict);
  check(ORDER_ERRORS.every((e) => typeof get(es, orderErrorKey(e)) === "string" && typeof get(en, orderErrorKey(e)) === "string"), `los ${ORDER_ERRORS.length} errores tienen mensaje ES y EN`);
  check(codeErrorKey("invalid_code") === "quote.pay.codeInvalid" && codeErrorKey("invalid_request") === "quote.pay.codeInvalid" && codeErrorKey("rate_limited") === "quote.pay.errors.rate_limited", "código mal escrito o agotado → mismo mensaje; 429 → su mensaje");
  const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
  const kEs = flat(es.quote.pay).sort().join();
  check(kEs === flat(en.quote.pay).sort().join(), "quote.pay tiene las mismas claves en es.json y en.json", kEs);
  const vars = (dict) => flat(dict.quote.pay).map((k) => `${k}:${(get(dict.quote.pay, k).match(/\{\{\w+\}\}|<\d>/g) || []).sort().join("")}`).join();
  check(vars(es) === vars(en), "mismas variables {{…}} y enlaces <1>/<2> en ES y EN");
  check(en.quote.pay.consent.includes("Spanish only") && es.quote.pay.consent.includes("<1>Términos y Condiciones</1>") && es.quote.pay.consent.includes("<2>Política de Privacidad</2>"), "casilla: enlaces en ES y aviso 'solo en español' en EN");
  check(es.quote.pay.toggle === "Me gustaría pagar ahora" && en.quote.pay.toggle === "I'd like to pay now" && es.quote.pay.submit === "Pagar anticipo" && en.quote.pay.submit === "Pay deposit", "textos del botón y del interruptor");
  check(es.quote.pay.unverifiedNotice === "No verificaste que eres cliente de Zumia, así que este pago se hace sin descuento de cliente. Si ya contrataste, verifica tu correo antes de pagar.", "aviso de cliente sin verificar, texto exacto");
  check(es.quote.pay.depositNotice.replace("{{amount}}", "$295.000 COP") === "Pagarás el anticipo del 50 % ($295.000 COP), no el total. El saldo restante se paga a la entrega final.", "aviso del anticipo, texto exacto");
  const consentEs = es.quote.pay.consent.replace(/<\/?\d>/g, "");
  check(consentEs === "He leído y acepto los Términos y Condiciones y la Política de Privacidad. Entiendo que pago en línea el anticipo del 50 % del estimado, que el saldo se cobra aparte y que el servicio se formaliza mediante un contrato.", "texto de la casilla, exacto");
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

// ---------- 8) Página de resultado (/payment/result/) ----------
{
  const ID = "12345-1700000000-00001";
  const inp = (search, stored) => JSON.stringify(readResultInputs(search, stored));
  check(inp(`?id=${ID}`, REF) === JSON.stringify({ reference: REF, id: ID }), "lee ?id= y la referencia guardada");
  check(inp("?id=abc%24%25", "ZUM-123") === JSON.stringify({ reference: null, id: null }), "descarta id y referencia con formato inválido");
  check(inp(`?id=${"a".repeat(65)}`, null) === JSON.stringify({ reference: null, id: null }), "id de más de 64 caracteres → descartado");
  check(inp("", null) === JSON.stringify({ reference: null, id: null }), "sin parámetros ni referencia → nada");
  check(inp("?id=abc_DEF-1&otro=x", null) === JSON.stringify({ reference: null, id: "abc_DEF-1" }), "acepta letras, números, _ y - en el id");
  check(JSON.stringify(statusQueryFor({ reference: REF, id: ID })) === JSON.stringify({ reference: REF }), "con referencia e id, consulta por referencia");
  check(JSON.stringify(statusQueryFor({ reference: null, id: ID })) === JSON.stringify({ id: ID }), "sin referencia, consulta por id");
  check(statusQueryFor({ reference: null, id: null }) === null, "sin ninguno, no consulta");

  check(viewForStatus("approved") === "approved" && viewForStatus("pending") === "pending" && viewForStatus("expired") === "expired", "estado → vista");
  check(viewForStatus("declined") === "declined" && viewForStatus("error") === "error" && viewForStatus("voided") === "voided", "rechazado, error y anulado tienen su vista");
  check(viewForError("invalid_reference") === "unknown" && viewForError("invalid_request") === "unknown", "no encontrada o formato inválido → vista neutra 'unknown'");
  check(viewForError("network") === "unavailable" && viewForError("unavailable") === "unavailable" && viewForError("rate_limited") === "unavailable", "red caída, 503 y 429 → 'unavailable' (reintento manual)");

  check(["approved", "declined", "error", "voided", "expired"].every(isFinalView) && !["pending", "checking", "unknown", "unavailable", "pendingTimeout"].some(isFinalView), "solo los estados finales borran la referencia");

  // Sondeo: cada 3 s hasta ~90 s
  check(POLL_INTERVAL_MS === 3000 && POLL_MAX_MS === 90000, "sondeo cada 3 s, máximo 90 s");
  let elapsed = 0;
  let polls = 0;
  let view = "pending";
  while (true) {
    const next = nextAfterPoll(view, elapsed);
    view = next.view;
    if (!next.poll) break;
    polls++;
    elapsed += POLL_INTERVAL_MS;
  }
  check(view === "pendingTimeout" && polls === 30 && elapsed === POLL_MAX_MS, `pending sin resolver → ${polls + 1} consultas en total y luego pendingTimeout`, `polls=${polls} elapsed=${elapsed} view=${view}`);
  check(JSON.stringify(nextAfterPoll("approved", 1000)) === '{"view":"approved","poll":false}', "un estado final deja de sondear");

  // Mensajes: cada vista tiene título y texto en ES y EN; textos exactos pedidos
  check(RESULT_VIEWS.every((v) => ["title", "body"].every((k) => typeof es.payResult.views[v]?.[k] === "string" && typeof en.payResult.views[v]?.[k] === "string")), `las ${RESULT_VIEWS.length} vistas tienen título y texto en ES y EN`);
  check(resultMessageKey("approved") === "payResult.views.approved", "clave del mensaje: payResult.views.<vista>");
  check(es.payResult.views.approved.body === "Pago recibido. Tu anticipo reservó tu cupo. Te escribiremos al correo que indicaste para firmar el contrato dentro de 5 días hábiles.", "texto de aprobado, exacto");
  check(es.payResult.views.pending.body === "Estamos confirmando tu pago…", "texto de pendiente, exacto");
  check(es.payResult.views.unknown.body === "No pudimos identificar tu pago desde esta página. Si pagaste, lo confirmaremos por correo.", "texto de no identificado, exacto");
  const montos = /\$|\bCOP\b|\d{2,}\.\d{3}/;
  check(!Object.values(es.payResult.views).some((v) => montos.test(v.body)) && !Object.values(en.payResult.views).some((v) => montos.test(v.body)), "ningún mensaje de resultado muestra montos");
  check(!/no se te cobr|not charged|no se cobró/i.test(JSON.stringify(es.payResult) + JSON.stringify(en.payResult)), "ningún mensaje afirma que no se cobró");
  const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
  check(flat(es.payResult).sort().join() === flat(en.payResult).sort().join(), "payResult tiene las mismas claves en ES y EN");
}

console.log(fallos ? `✗ ${fallos} pruebas fallaron` : "✓ todas las pruebas pasan");
process.exit(fallos ? 1 : 0);
