// Cliente del Worker de verificación (worker/). Solo habla con VERIFY_API_URL por POST con cuerpo JSON:
// el correo, el código y el token nunca van en la URL. No guarda nada ni escribe en consola.

import { VERIFY_API_URL } from "@/config/site";
import { PLANS, type PlanId } from "@/data/plans";

const TIMEOUT_MS = 10_000;

/** ok = respuesta esperada; invalid = rechazada (código, correo o token); rateLimited = 429; network = sin respuesta o error del servidor. */
export type ApiResult<T> = { status: "ok"; data: T } | { status: "invalid" | "rateLimited" | "network" };

export type VerifiedProject = { id: string; name: string; plan: PlanId; extrasDiscount: number };
export type ConfirmData = { token: string; expiresIn: number; projects: VerifiedProject[] };
export type DiscountData = { projectId: string; plan: PlanId; extrasDiscount: number };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isPlanId = (value: unknown): value is PlanId => PLANS.some((plan) => plan.id === value);

const post = async (path: string, body: unknown): Promise<{ status: number; json: unknown } | null> => {
  if (!VERIFY_API_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${VERIFY_API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return { status: response.status, json };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Traduce un status HTTP que no es 200 al resultado genérico. */
const failure = (status: number): { status: "invalid" | "rateLimited" | "network" } =>
  status === 429 ? { status: "rateLimited" } : status === 400 ? { status: "invalid" } : { status: "network" };

/** POST /verify/request: el Worker responde igual exista o no el correo. */
export const requestCode = async (email: string): Promise<ApiResult<null>> => {
  const response = await post("/verify/request", { email });
  if (!response) return { status: "network" };
  return response.status === 200 ? { status: "ok", data: null } : failure(response.status);
};

const parseProject = (value: unknown): VerifiedProject | null => {
  if (!isRecord(value)) return null;
  const { id, name, plan, extrasDiscount } = value;
  if (typeof id !== "string" || typeof name !== "string" || !isPlanId(plan) || typeof extrasDiscount !== "number") return null;
  return { id, name, plan, extrasDiscount };
};

/** POST /verify/confirm: código correcto → token y proyectos activos del cliente. */
export const confirmCode = async (email: string, code: string): Promise<ApiResult<ConfirmData>> => {
  const response = await post("/verify/confirm", { email, code });
  if (!response) return { status: "network" };
  if (response.status !== 200) return failure(response.status);
  const json = response.json;
  if (!isRecord(json) || json.ok !== true || typeof json.token !== "string" || typeof json.expiresIn !== "number" || !Array.isArray(json.projects)) {
    return { status: "network" };
  }
  const projects = json.projects.map(parseProject);
  if (projects.length === 0 || projects.some((project) => project === null)) return { status: "network" };
  return { status: "ok", data: { token: json.token, expiresIn: json.expiresIn, projects: projects as VerifiedProject[] } };
};

/** POST /verify/discount: el Worker relee el proyecto y devuelve su plan y descuento actuales. */
export const getDiscount = async (token: string, projectId: string): Promise<ApiResult<DiscountData>> => {
  const response = await post("/verify/discount", { token, projectId });
  if (!response) return { status: "network" };
  if (response.status !== 200) return failure(response.status);
  const json = response.json;
  if (!isRecord(json) || json.ok !== true || typeof json.projectId !== "string" || !isPlanId(json.plan) || typeof json.extrasDiscount !== "number") {
    return { status: "network" };
  }
  return { status: "ok", data: { projectId: json.projectId, plan: json.plan, extrasDiscount: json.extrasDiscount } };
};
