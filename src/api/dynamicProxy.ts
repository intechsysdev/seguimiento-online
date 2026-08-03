/**
 * Destinos con URL dinamica (API por compañía, MobiControl).
 *
 * Ninguno de esos hosts expone CORS para el origen del SPA, y su URL sale de
 * base de datos, asi que no se pueden declarar como proxy estatico en Vite.
 * En desarrollo el destino viaja codificado en la ruta y lo resuelve el
 * middleware `tenantProxy` (ver vite.config.ts).
 */
const USA_PROXY = import.meta.env.DEV;

function base64url(valor: string) {
  return btoa(valor).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function urlDinamica(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/$/, "");
  const ruta = path.startsWith("/") ? path : `/${path}`;
  return USA_PROXY ? `/api-tenant/${base64url(base)}${ruta}` : `${base}${ruta}`;
}
