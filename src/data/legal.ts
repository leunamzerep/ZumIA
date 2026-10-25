// Estructura de Términos y Privacidad, generada desde docs/*.md (Fase 5).
// Los textos viven en es.json (terms.* y privacy.*): una clave por sección,
// párrafo, elemento de lista y celda de tabla. Los datos del proveedor (nombre,
// NIT, dirección, correo, teléfono, dominio, SIC) salen de src/config/site.ts.
// Si cambian los documentos, se vuelven a generar las claves y este archivo.

export type LegalBlock =
  | { type: "p"; key: string }
  | { type: "list"; key: string; count: number }
  | { type: "table"; key: string; cols: number; rows: number };

export type LegalSection = { id: string; blocks: LegalBlock[] };

export const TERMS_SECTIONS: LegalSection[] = [
  { id: "s1", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s2", blocks: [
    { type: "p", key: "b1" },
    { type: "list", key: "b2", count: 6 },
  ] },
  { id: "s3", blocks: [
    { type: "p", key: "b1" },
    { type: "p", key: "b2" },
  ] },
  { id: "s4", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s5", blocks: [
    { type: "p", key: "b1" },
    { type: "p", key: "b2" },
    { type: "p", key: "b3" },
  ] },
  { id: "s6", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s7", blocks: [
    { type: "p", key: "b1" },
    { type: "p", key: "b2" },
    { type: "p", key: "b3" },
    { type: "p", key: "b4" },
    { type: "p", key: "b5" },
    { type: "p", key: "b6" },
  ] },
  { id: "s8", blocks: [
    { type: "p", key: "b1" },
    { type: "p", key: "b2" },
    { type: "p", key: "b3" },
    { type: "table", key: "b4", cols: 2, rows: 5 },
    { type: "p", key: "b5" },
    { type: "p", key: "b6" },
  ] },
  { id: "s9", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s10", blocks: [
    { type: "p", key: "b1" },
    { type: "p", key: "b2" },
  ] },
  { id: "s11", blocks: [
    { type: "p", key: "b1" },
    { type: "p", key: "b2" },
  ] },
  { id: "s12", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s13", blocks: [
    { type: "p", key: "b1" },
    { type: "p", key: "b2" },
  ] },
  { id: "s14", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s15", blocks: [
    { type: "p", key: "b1" },
    { type: "p", key: "b2" },
  ] },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  { id: "s1", blocks: [
    { type: "p", key: "b1" },
    { type: "list", key: "b2", count: 4 },
  ] },
  { id: "s2", blocks: [
    { type: "list", key: "b1", count: 3 },
    { type: "p", key: "b2" },
  ] },
  { id: "s3", blocks: [
    { type: "list", key: "b1", count: 4 },
    { type: "p", key: "b2" },
  ] },
  { id: "s4", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s5", blocks: [
    { type: "p", key: "b1" },
    { type: "list", key: "b2", count: 4 },
    { type: "p", key: "b3" },
  ] },
  { id: "s6", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s7", blocks: [
    { type: "p", key: "b1" },
    { type: "list", key: "b2", count: 6 },
  ] },
  { id: "s8", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s9", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s10", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s11", blocks: [
    { type: "p", key: "b1" },
  ] },
  { id: "s12", blocks: [
    { type: "p", key: "b1" },
  ] },
];
