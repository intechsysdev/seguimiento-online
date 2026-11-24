/** api/v1/Bonificados del API de la compañía (Migracion.Api). */
import { ApiError } from "../../api/http";
import { tenantHttp } from "../../api/tenantHttp";
import type {
  Campana,
  CampanaGuardar,
  Catalogos,
  Grupo,
  Regla,
} from "../../types/bonificados";
import type { TenantDto } from "../../types/seguridad";

const base = "api/v1/Bonificados";
const seg = encodeURIComponent;

/**
 * El API devuelve los errores de negocio como { "mensaje": "..." }; aquí se
 * convierten en un Error con solo ese texto para mostrarlo tal cual.
 */
async function conMensaje<T>(promesa: Promise<T>): Promise<T> {
  try {
    return await promesa;
  } catch (error) {
    if (error instanceof ApiError) {
      try {
        const cuerpo = JSON.parse(error.body) as { mensaje?: string };
        if (cuerpo.mensaje) throw new Error(cuerpo.mensaje);
      } catch (interno) {
        if (interno instanceof Error && !(interno instanceof SyntaxError))
          throw interno;
      }
    }
    throw error;
  }
}

export const bonificadosService = {
  catalogos: (tenant: TenantDto, cmpy: string) =>
    conMensaje(
      tenantHttp.get<Catalogos>(tenant, `${base}/Catalogos/${seg(cmpy)}`),
    ),

  campanas: (tenant: TenantDto, cmpy: string) =>
    conMensaje(
      tenantHttp.get<Campana[]>(tenant, `${base}/Campanas/${seg(cmpy)}`),
    ),

  campana: (tenant: TenantDto, cmpy: string, codigo: string) =>
    conMensaje(
      tenantHttp.get<Campana>(
        tenant,
        `${base}/Campana/${seg(cmpy)}/${seg(codigo)}`,
      ),
    ),

  crearCampana: (tenant: TenantDto, datos: CampanaGuardar) =>
    conMensaje(tenantHttp.post<Campana>(tenant, `${base}/Campana`, datos)),

  actualizarCampana: (tenant: TenantDto, datos: CampanaGuardar) =>
    conMensaje(tenantHttp.put<Campana>(tenant, `${base}/Campana`, datos)),

  duplicarCampana: (
    tenant: TenantDto,
    cmpy: string,
    codigo: string,
    usuario: string,
  ) =>
    conMensaje(
      tenantHttp.post<Campana>(
        tenant,
        `${base}/Campana/${seg(cmpy)}/${seg(codigo)}/Duplicar?usuario=${seg(usuario)}`,
      ),
    ),

  eliminarCampana: (
    tenant: TenantDto,
    cmpy: string,
    codigo: string,
    usuario: string,
  ) =>
    conMensaje(
      tenantHttp.delete<boolean>(
        tenant,
        `${base}/Campana/${seg(cmpy)}/${seg(codigo)}?usuario=${seg(usuario)}`,
      ),
    ),

  reglas: (tenant: TenantDto, cmpy: string, campana: string) =>
    conMensaje(
      tenantHttp.get<Regla[]>(
        tenant,
        `${base}/Reglas/${seg(cmpy)}/${seg(campana)}`,
      ),
    ),

  regla: (tenant: TenantDto, cmpy: string, codigo: string) =>
    conMensaje(
      tenantHttp.get<Regla>(
        tenant,
        `${base}/Regla/${seg(cmpy)}/${seg(codigo)}`,
      ),
    ),

  crearRegla: (tenant: TenantDto, datos: Regla) =>
    conMensaje(tenantHttp.post<Regla>(tenant, `${base}/Regla`, datos)),

  actualizarRegla: (tenant: TenantDto, datos: Regla) =>
    conMensaje(tenantHttp.put<Regla>(tenant, `${base}/Regla`, datos)),

  grupos: (tenant: TenantDto, cmpy: string) =>
    conMensaje(tenantHttp.get<Grupo[]>(tenant, `${base}/Grupos/${seg(cmpy)}`)),

  crearGrupo: (tenant: TenantDto, datos: Grupo) =>
    conMensaje(tenantHttp.post<Grupo>(tenant, `${base}/Grupo`, datos)),

  actualizarGrupo: (tenant: TenantDto, datos: Grupo) =>
    conMensaje(tenantHttp.put<Grupo>(tenant, `${base}/Grupo`, datos)),

  eliminarGrupo: (
    tenant: TenantDto,
    cmpy: string,
    codigo: string,
    usuario: string,
  ) =>
    conMensaje(
      tenantHttp.delete<boolean>(
        tenant,
        `${base}/Grupo/${seg(cmpy)}/${seg(codigo)}?usuario=${seg(usuario)}`,
      ),
    ),

  eliminarRegla: (
    tenant: TenantDto,
    cmpy: string,
    codigo: string,
    usuario: string,
  ) =>
    conMensaje(
      tenantHttp.delete<boolean>(
        tenant,
        `${base}/Regla/${seg(cmpy)}/${seg(codigo)}?usuario=${seg(usuario)}`,
      ),
    ),
};
