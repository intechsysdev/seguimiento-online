/**
 * Cliente para los API por compania (los helpers de Helpers/IBES).
 *
 * A diferencia del API de Seguridad, estos usan autenticacion Basic con
 * UserAPITenant:PwdAPITenant y su URL cambia segun la compania activa.
 */
import { ApiError, type RequestOptions } from "./http";
import { urlDinamica } from "./dynamicProxy";
import type { TenantDto } from "../types/seguridad";

function construirUrl(tenant: TenantDto, path: string) {
  return urlDinamica(tenant.APIUrlTenant, path);
}

/**
 * Equivale a `Convert.ToBase64String(UTF8.GetBytes($"{user}:{pwd}"))` del MVC.
 *
 * `btoa` lanza InvalidCharacterError si la cadena tiene caracteres fuera de
 * Latin-1, asi que primero se pasa a bytes UTF-8; una tilde en la contraseña
 * bastaria para tumbar todas las llamadas al API de la compañía.
 */
function basicAuth(tenant: TenantDto) {
  const credenciales = `${tenant.UserAPITenant}:${tenant.PwdAPITenant}`;
  const bytes = new TextEncoder().encode(credenciales);
  let binario = "";
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return `Basic ${btoa(binario)}`;
}

type TenantRequestOptions = Omit<RequestOptions, "auth" | "baseUrl">;

export async function tenantRequest<T>(
  tenant: TenantDto,
  path: string,
  options: TenantRequestOptions = {},
): Promise<T> {
  const { method = "GET", body, signal } = options;

  const headers: Record<string, string> = {
    accept: "application/json",
    Authorization: basicAuth(tenant),
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(construirUrl(tenant, path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const text = await response.text();
  if (!response.ok) throw new ApiError(response.status, text);
  if (text.trim() === "") return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/**
 * Sube un archivo con multipart/form-data.
 *
 * Va aparte de `tenantRequest` porque ese serializa el cuerpo a JSON, y aqui
 * el Content-Type lo tiene que poner el navegador: es el unico que conoce el
 * `boundary` del multipart.
 */
export async function tenantUpload(
  tenant: TenantDto,
  path: string,
  archivo: Blob,
  nombreArchivo: string,
  campo = "file",
): Promise<string> {
  const formulario = new FormData();
  formulario.append(campo, archivo, nombreArchivo);

  const response = await fetch(construirUrl(tenant, path), {
    method: "POST",
    headers: {
      accept: "application/json",
      Authorization: basicAuth(tenant),
    },
    body: formulario,
  });

  const texto = await response.text();
  if (!response.ok) throw new ApiError(response.status, texto);
  // El endpoint responde el texto "1" al guardar; ante un fallo devuelve el
  // mensaje de la excepcion con codigo 200, asi que hay que mirar el cuerpo.
  return texto.trim().replace(/^"|"$/g, "");
}

export const tenantHttp = {
  get: <T>(tenant: TenantDto, path: string, options?: TenantRequestOptions) =>
    tenantRequest<T>(tenant, path, { ...options, method: "GET" }),
  post: <T>(tenant: TenantDto, path: string, body?: unknown, options?: TenantRequestOptions) =>
    tenantRequest<T>(tenant, path, { ...options, method: "POST", body }),
  put: <T>(tenant: TenantDto, path: string, body?: unknown, options?: TenantRequestOptions) =>
    tenantRequest<T>(tenant, path, { ...options, method: "PUT", body }),
  delete: <T>(tenant: TenantDto, path: string, options?: TenantRequestOptions) =>
    tenantRequest<T>(tenant, path, { ...options, method: "DELETE" }),
};
