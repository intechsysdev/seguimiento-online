/**
 * Cliente HTTP del SPA.
 *
 * Reemplaza a los Helpers de RestSharp del proyecto MVC: alli cada helper
 * construia un RestClient con la URL de AppSettings.UrlSeguridad y el header
 * `Authorization: Bearer {token}`. Aca eso vive en un solo lugar.
 */

export const API_SEGURIDAD = import.meta.env.VITE_API_SEGURIDAD;
export const URL_PATH = import.meta.env.VITE_URL_PATH;

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string, message?: string) {
    // El cuerpo entra en el mensaje (recortado) porque estos errores terminan
    // en un Alert; sin el detalle del servidor no hay forma de diagnosticar.
    const detalle = body.trim().slice(0, 200);
    super(message ?? `Error ${status}${detalle ? `: ${detalle}` : ""}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** El API responde 401 cuando el token expiro; la sesion se cierra desde el AuthContext. */
type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

let tokenProvider: () => string | null = () => null;

export function setTokenProvider(provider: () => string | null) {
  tokenProvider = provider;
}

/**
 * Para las llamadas que no pueden pasar por `request` porque leen la respuesta
 * por partes (el chat del asistente): `request` espera el cuerpo completo.
 */
export function tokenDeSesion() {
  return tokenProvider();
}

export function avisarSesionExpirada() {
  onUnauthorized?.();
}

export function urlSeguridad(path: string) {
  return joinUrl(API_SEGURIDAD, path);
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Por defecto se envia el token de la sesion. Login/ForgetPassword no lo necesitan. */
  auth?: boolean;
  signal?: AbortSignal;
  baseUrl?: string;
  /**
   * Devuelve el cuerpo aunque la respuesta no sea 2xx, siempre que sea JSON.
   *
   * Los endpoints de api/Auth responden 400 con un UserManagerResponse util
   * ("Email no encontrado", "Contraseña incorrecta"). RestSharp deserializaba
   * `response.Content` sin mirar el status, asi que el MVC leia ese cuerpo; sin
   * esta opcion el SPA lo perderia y mostraria un error de conexion generico.
   */
  aceptarCuerpoDeError?: boolean;
}

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const rest = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rest}`;
}

/**
 * Los endpoints de Seguridad no son uniformes: unos devuelven JSON, otros
 * devuelven el escalar plano ("true", "13") y otros no devuelven cuerpo.
 * Esta funcion normaliza los tres casos.
 */
function parseBody<T>(text: string): T {
  if (text.trim() === "") return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

function esJson(texto: string) {
  if (texto.trim() === "") return false;
  try {
    JSON.parse(texto);
    return true;
  } catch {
    return false;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    auth = true,
    signal,
    baseUrl = API_SEGURIDAD,
    aceptarCuerpoDeError = false,
  } = options;

  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  /*
   * POST/PUT sin cuerpo deben viajar igualmente con Content-Length: 0. Sin el,
   * http.sys rechaza la peticion con 411 Length Required antes de que llegue a
   * ASP.NET; era lo que rompia Auth/ForgetPassword (recuperar contraseña).
   * RestSharp lo enviaba siempre, por eso el MVC no tenia el problema.
   */
  const necesitaCuerpoVacio =
    body === undefined && (method === "POST" || method === "PUT");

  if (auth) {
    const token = tokenProvider();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(joinUrl(baseUrl, path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : necesitaCuerpoVacio ? "" : undefined,
    signal,
  });

  const text = await response.text();

  if (response.status === 401 && auth) {
    onUnauthorized?.();
    throw new ApiError(401, text, "La sesion expiro. Vuelve a iniciar sesion.");
  }

  if (!response.ok) {
    if (aceptarCuerpoDeError && esJson(text)) return parseBody<T>(text);
    throw new ApiError(response.status, text);
  }

  return parseBody<T>(text);
}

export const http = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
