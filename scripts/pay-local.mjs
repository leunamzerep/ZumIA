// Prueba /pay/code y /pay/orders contra `wrangler dev` con una D1 LOCAL aislada y llaves FALSAS.
// No llama a Wompi (estas rutas no lo necesitan). Los secretos falsos deben ser los mismos que se pasan
// a wrangler dev con --var (ver abajo). Uso, desde worker/ (PowerShell o bash):
//   npx wrangler d1 migrations apply zumia-verificacion --local --persist-to <carpeta>
//   npx wrangler d1 execute zumia-verificacion --local --persist-to <carpeta> --file=./seed.example.sql
//   npx wrangler d1 execute zumia-verificacion --local --persist-to <carpeta> --file=../scripts/pay-local.sql
//   npx wrangler dev --port 8799 --persist-to <carpeta> --var VERIFY_PEPPER:pepper-falso-1 --var TOKEN_SECRET:token-falso-2
//     --var WOMPI_ENV:test --var WOMPI_PUBLIC_KEY:pub_test_FALSO000 --var WOMPI_PRIVATE_KEY:prv_test_FALSO789
//     --var WOMPI_EVENTS_SECRET:test_events_FALSO456 --var WOMPI_INTEGRITY_SECRET:test_integrity_FALSO123
//     --var PAY_REDIRECT_BASE:https://zumia.dev --var ALLOWED_ORIGINS:https://zumia.dev
//   node ../scripts/pay-local.mjs        (otra terminal; API=http://localhost:8799 por defecto)
import { createHash, createHmac } from "node:crypto";

const API = process.env.API ?? "http://localhost:8799";
const TOKEN_SECRET = "token-falso-2";
const INTEGRITY_SECRET = "test_integrity_FALSO123";

let fallos = 0;
const check = (ok, texto, extra = "") => {
  if (!ok) fallos++;
  console.log(ok ? "✓" : "✗", texto, ok ? "" : extra);
};

// Cada petición con una IP distinta (CF-Connecting-IP), salvo que se pida una fija para probar el límite
let ipN = 0;
const post = async (path, body, { ip, origin = "https://zumia.dev" } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, "CF-Connecting-IP": ip ?? `203.0.113.${(ipN++ % 250) + 1}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, json: await res.json().catch(() => null) };
};

// Token igual al del Worker (token.ts): base64url(payload).base64url(HMAC-SHA256)
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const token = (email, pids, exp = Math.floor(Date.now() / 1000) + 600) => {
  const body = b64u(JSON.stringify({ sub: email, iat: Math.floor(Date.now() / 1000), exp, pids, jti: crypto.randomUUID() }));
  return `${body}.${b64u(createHmac("sha256", TOKEN_SECRET).update(body).digest())}`;
};
const sha = (s) => createHash("sha256").update(s).digest("hex");

const tool = { mode: "zumiaClient", planId: null, extras: { faq: 1 } }; // una herramienta de 49.000
const esencial = { mode: "normal", planId: "esencial", extras: {} };
let emailN = 0;
const cliente = (extra = {}) => ({ name: "Cliente Prueba", email: `prueba${emailN++}@example.com`, acceptTerms: true, lang: "es", ...extra });

// ---------- /pay/code ----------
{
  const r = await post("/pay/code", { code: " mitad ", selection: esencial });
  check(r.status === 200 && r.json.code.code === "MITAD" && r.json.breakdown.total === 295_000, "code: MITAD (normaliza espacios y minúsculas) en Esencial → 295.000", JSON.stringify(r.json));
  check(r.headers.get("cache-control") === "no-store" && r.headers.get("x-content-type-options") === "nosniff", "code: cabeceras no-store y nosniff");
  check(r.headers.get("access-control-allow-origin") === "https://zumia.dev", "code: CORS para https://zumia.dev");
  const evil = await post("/pay/code", { code: "MITAD", selection: esencial }, { origin: "https://evil.example" });
  check(!evil.headers.get("access-control-allow-origin"), "code: sin Allow-Origin para otro origen");
}
{
  // Cliente verificado Profesional (20 %): 39.200; con 50 % se recorta por el piso
  const t = token("cliente9@example.com", ["proj_pro"]);
  const r = await post("/pay/code", { code: "MITAD", selection: tool, token: t, projectId: "proj_pro" });
  const b = r.json?.breakdown;
  check(
    r.status === 200 && b.subtotal === 39_200 && b.discountApplied === 15_200 && b.reducedBy === 4_400 && b.floorApplied && b.total === 24_000 && b.deposit === 12_000,
    "code: 39.200 con 50 % → aplicado 15.200, reducido 4.400, total 24.000, anticipo 12.000",
    JSON.stringify(b),
  );
}
for (const c of ["NOEXISTE", "AGOTADO", "VENCIDO", "INACTIVO", "x!", ""]) {
  const r = await post("/pay/code", { code: c, selection: esencial });
  check(r.status === 400 && r.json?.error === "invalid_code" && Object.keys(r.json).length === 2, `code: "${c}" → mismo 400 invalid_code`, JSON.stringify(r.json));
}
{
  const sinToken = await post("/pay/code", { code: "EJEMPLO-CLIENTE", selection: tool });
  check(sinToken.json?.error === "invalid_code", "code restringido sin token → invalid_code");
  const otro = await post("/pay/code", { code: "EJEMPLO-CLIENTE", selection: tool, token: token("cliente2@example.com", ["proj_ac4"]), projectId: "proj_ac4" });
  check(otro.json?.error === "invalid_code", "code restringido con token de OTRO correo → invalid_code");
  const bien = await post("/pay/code", { code: "EJEMPLO-CLIENTE", selection: tool, token: token("cliente1@example.com", ["proj_jotu"]), projectId: "proj_jotu" });
  check(bien.status === 200 && bien.json.breakdown.subtotal === 44_100, "code restringido con token del correo correcto → 200 (A la Medida 10 %: 44.100)", JSON.stringify(bien.json));
}
{
  const malo = await post("/pay/code", { code: "MITAD", selection: tool, token: "abc.def", projectId: "proj_jotu" });
  check(malo.json?.error === "invalid_token", "code con token falso → invalid_token");
  const vencido = await post("/pay/code", { code: "MITAD", selection: tool, token: token("cliente1@example.com", ["proj_jotu"], 1000), projectId: "proj_jotu" });
  check(vencido.json?.error === "invalid_token", "code con token vencido → invalid_token");
  const ajeno = await post("/pay/code", { code: "MITAD", selection: tool, token: token("cliente1@example.com", ["proj_jotu"]), projectId: "proj_ac4" });
  check(ajeno.json?.error === "invalid_token", "code con proyecto que no es del token → invalid_token");
}
for (const mode of ["redesign", "external"]) {
  const r = await post("/pay/code", { code: "MITAD", selection: { mode, planId: "esencial", extras: { faq: 1 } } });
  check(r.json?.error === "payment_not_available", `code en modo ${mode} → payment_not_available`);
}
{
  const montos = await post("/pay/code", { code: "MITAD", selection: esencial, total: 1 });
  check(montos.json?.error === "invalid_request", "code con campo extra (total) → invalid_request");
  const raro = await post("/pay/code", { code: "MITAD", selection: { ...esencial, extras: { faq: 2 } } });
  check(raro.json?.error === "invalid_request", "code con cantidad inválida (faq: 2) → invalid_request");
  const idioma = await post("/pay/code", { code: "MITAD", selection: { ...esencial, extras: { translation: 6 } } });
  check(idioma.json?.error === "invalid_request", "code con 6 idiomas (máx. 5) → invalid_request");
}

// ---------- /pay/orders ----------
const order = (body, opts) => post("/pay/orders", body, opts);
{
  const r = await order({ selection: esencial, ...cliente() });
  const f = r.json?.checkout?.fields;
  check(r.status === 200 && r.json.breakdown.total === 590_000 && r.json.breakdown.deposit === 295_000, "orden normal: Esencial, total 590.000, anticipo 295.000", JSON.stringify(r.json));
  check(/^ZUM-[0-9A-F]{32}$/.test(r.json?.reference ?? ""), "orden normal: referencia ZUM- + 32 hex");
  check(f && f["amount-in-cents"] === "29500000" && f.currency === "COP" && f["public-key"] === "pub_test_FALSO000", "orden normal: centavos, moneda y llave pública");
  const esperado = sha(`${r.json.reference}29500000COP${f["expiration-time"]}${INTEGRITY_SECRET}`);
  check(f["signature:integrity"] === esperado, "orden normal: firma = SHA-256(referencia + centavos + COP + expiración + secreto)");
  check(r.json.expiresAt - Math.floor(Date.now() / 1000) <= 1800 && r.json.expiresAt - Math.floor(Date.now() / 1000) > 1790, "orden normal: vence en 30 min");
  check(new Date(f["expiration-time"]).getTime() === r.json.expiresAt * 1000, "orden normal: expiration-time = expiresAt en ISO UTC");
  check(f["redirect-url"] === "https://zumia.dev/payment/result/", "orden normal: redirect-url en español");
  const texto = JSON.stringify(r.json);
  check(!texto.includes("@example.com") && !texto.includes("Cliente Prueba") && !texto.includes("customer-data"), "orden normal: la respuesta no lleva nombre, correo ni customer-data");
}
{
  const en = await order({ selection: esencial, ...cliente({ lang: "en" }) });
  check(en.json?.checkout?.fields["redirect-url"] === "https://zumia.dev/en/payment/result/", "orden en inglés: redirect-url /en/");
  const montos = await order({ selection: esencial, ...cliente(), amountInCents: 100 });
  check(montos.json?.error === "invalid_request", "orden con monto del navegador → invalid_request (nunca se acepta)");
}
{
  const r = await order({ selection: esencial, code: "fijo-10k", ...cliente() });
  check(r.status === 200 && r.json.breakdown.discountApplied === 10_000 && r.json.breakdown.total === 580_000, "orden con código fijo 10.000 → 580.000", JSON.stringify(r.json));
  const t = token("cliente9@example.com", ["proj_pro"]);
  const piso = await order({ selection: tool, code: "MITAD", token: t, projectId: "proj_pro", ...cliente() });
  const b = piso.json?.breakdown;
  check(piso.status === 200 && piso.json.verified === true && b.total === 24_000 && b.deposit === 12_000 && piso.json.checkout.fields["amount-in-cents"] === "1200000", "orden recortada por el piso: verificado, total 24.000, 1.200.000 centavos", JSON.stringify(piso.json));
  const lista = await order({ selection: tool, ...cliente() });
  check(lista.status === 200 && lista.json.verified === false && lista.json.mode === "zumiaClient" && lista.json.breakdown.total === 49_000, "orden cliente sin token: precio de lista 49.000, verified=false");
}
{
  const r1 = await order({ selection: esencial, code: "UNO-SOLO", ...cliente() });
  const r2 = await order({ selection: esencial, code: "UNO-SOLO", ...cliente() });
  check(r1.status === 200 && r2.json?.error === "invalid_code", "código de un solo uso: la 1ª orden lo reserva, la 2ª → invalid_code");
  const agotado = await order({ selection: esencial, code: "AGOTADO", ...cliente() });
  check(agotado.json?.error === "invalid_code", "orden con código agotado → invalid_code");
}
{
  const [a, b] = await Promise.all([
    order({ selection: esencial, code: "CARRERA", ...cliente() }),
    order({ selection: esencial, code: "CARRERA", ...cliente() }),
  ]);
  const oks = [a, b].filter((r) => r.status === 200).length;
  const codes = [a, b].filter((r) => r.json?.error === "invalid_code").length;
  check(oks === 1 && codes === 1, `dos reservas simultáneas de CARRERA (1 uso): ${oks} ok y ${codes} invalid_code`, JSON.stringify([a.json, b.json]));
}
{
  const otro = await order({ selection: tool, code: "EJEMPLO-CLIENTE", token: token("cliente2@example.com", ["proj_ac4"]), projectId: "proj_ac4", ...cliente() });
  check(otro.json?.error === "invalid_code", "orden: token de otro correo con código restringido → invalid_code");
}
for (const mode of ["redesign", "external"]) {
  const r = await order({ selection: { mode, planId: "alamedida", extras: { faq: 1 } }, ...cliente() });
  check(r.status === 400 && r.json?.error === "payment_not_available", `orden en modo ${mode} → payment_not_available`);
}
{
  const r = await order({ selection: esencial, ...cliente({ acceptTerms: false }) });
  check(r.json?.error === "terms_required", "orden con acceptTerms false → terms_required");
  const s = await order({ selection: esencial, ...cliente({ acceptTerms: "true" }) });
  check(s.json?.error === "terms_required", "orden con acceptTerms \"true\" (texto) → terms_required");
  for (const name of ["   ", "x".repeat(121), undefined]) {
    const n = await order({ selection: esencial, ...cliente({ name }) });
    check(n.json?.error === "invalid_request", `orden con nombre inválido (${name === undefined ? "sin nombre" : name.length + " caracteres"}) → invalid_request`);
  }
  const mail = await order({ selection: esencial, ...cliente({ email: "no-es-correo" }) });
  check(mail.json?.error === "invalid_request", "orden con correo inválido → invalid_request");
  const sinPlan = await order({ selection: { mode: "normal", planId: null, extras: {} }, ...cliente() });
  check(sinPlan.json?.error === "invalid_request", "orden normal sin plan → invalid_request");
}
{
  // Correo con mayúsculas: se guarda en minúsculas y cuenta para el límite de pendientes (máx. 3)
  const mail = `Mayus${Date.now()}@Example.com`;
  const res = [];
  for (let i = 0; i < 4; i++) res.push(await order({ selection: esencial, ...cliente({ email: mail }) }));
  check(res.slice(0, 3).every((r) => r.status === 200) && res[3].status === 429, "máx. 3 órdenes pendientes por correo (la 4ª → 429), con el correo normalizado");
}
{
  // Límite por IP: 10 órdenes por hora desde la misma IP
  const ip = "198.51.100.7";
  const res = [];
  for (let i = 0; i < 11; i++) res.push(await order({ selection: esencial, ...cliente() }, { ip }));
  check(res.slice(0, 10).every((r) => r.status === 200) && res[10].status === 429, "límite por IP: la 11ª orden desde la misma IP → 429", res.map((r) => r.status).join(","));
}
{
  // Límite por correo: 5 por hora (la base de pendientes es 3, así que se prueba con peticiones que fallan después)
  const mail = `limite${Date.now()}@example.com`;
  const res = [];
  for (let i = 0; i < 6; i++) res.push(await order({ selection: esencial, code: "NOEXISTE", ...cliente({ email: mail }) }));
  check(res.slice(0, 5).every((r) => r.json?.error === "invalid_code") && res[5].status === 429, "límite por correo: la 6ª petición con el mismo correo → 429", res.map((r) => r.status).join(","));
}

console.log(fallos ? `✗ ${fallos} pruebas fallaron` : "✓ todas las pruebas pasan");
process.exit(fallos ? 1 : 0);
