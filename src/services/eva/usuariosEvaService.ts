/** Equivalente a Helpers/IBES/UsuariosHelper.cs */
import { tenantHttp } from "../../api/tenantHttp";
import type { MobRusuario } from "../../types/eva";
import type { TenantDto } from "../../types/seguridad";

export const usuariosEvaService = {
  /**
   * El MVC llamaba siempre con codper = "%" (todos los perfiles), que en
   * UsuariosQueries.GetListAll significa "sin filtrar por perfil".
   *
   * El comodin DEBE ir codificado como %25: con un `%` suelto en la ruta,
   * http.sys rechaza la peticion con 400 antes de que llegue a ASP.NET
   * (comprobado contra el API: `%` -> 400, `%25` -> 401). ASP.NET decodifica
   * el valor de ruta, asi que la comparacion contra "%" sigue funcionando.
   */
  getListAll: (tenant: TenantDto, cmpy: string, codper = "%") =>
    tenantHttp.get<MobRusuario[]>(
      tenant,
      `api/v1/Usuarios/GetListAll/${cmpy}/${encodeURIComponent(codper)}`,
    ),

  getListCmpy: (tenant: TenantDto, cmpy: string, codusu: string, codper: string) =>
    tenantHttp.get<MobRusuario[]>(
      tenant,
      `api/v1/Usuarios/GetListCmpy/${cmpy}/${codusu}/${encodeURIComponent(codper)}`,
    ),

  getCodUsuByCed: (tenant: TenantDto, cmpy: string, ced: string) =>
    tenantHttp.get<string>(tenant, `api/v1/Usuarios/GetCodUsuByCed/${cmpy}/${ced}`),
};
