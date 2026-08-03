/** Equivalente a Helpers/IBES/MobVisitasHelper.cs y RutasHelper.cs */
import { tenantHttp } from "../../api/tenantHttp";
import type {
  FiltersDetalle,
  FiltersResumen,
  FiltersRuta,
  MobRutaDto,
  MobVisitaDto,
  MobVisitaGrupoDto,
  MobVisitaResumen,
} from "../../types/eva";
import type { TenantDto } from "../../types/seguridad";

export const visitasEvaService = {
  /** Visitas detalladas: una fila por movimiento. */
  getListCompuesto: (tenant: TenantDto, filtro: FiltersDetalle) =>
    tenantHttp.post<MobVisitaDto[]>(tenant, "api/v1/Visitas/GetListCompuesto", filtro),

  /** Visitas efectuadas: agrupadas por cliente. */
  getListCompuestoGroup: (tenant: TenantDto, filtro: FiltersDetalle) =>
    tenantHttp.post<MobVisitaGrupoDto[]>(tenant, "api/v1/Visitas/GetListCompuestoGroup", filtro),

  /** Variante usada por Rutas para cruzar la ruta planificada con lo visitado. */
  getListCompuestoRutasGroup: (tenant: TenantDto, filtro: FiltersDetalle) =>
    tenantHttp.post<MobVisitaGrupoDto[]>(
      tenant,
      "api/v1/Visitas/GetListCompuestoRutasGroup",
      filtro,
    ),

  /** Consolidado por vendedor y día; usa su propio filtro (FiltersDto). */
  getListSummary: (tenant: TenantDto, filtro: FiltersResumen) =>
    tenantHttp.post<MobVisitaResumen[]>(tenant, "api/v1/Visitas/GetListSummary", filtro),
};

export const rutasEvaService = {
  /** Números de ruta distintos, para el filtro. */
  getListDistinct: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<number[]>(tenant, `api/v1/Rutas/GetListDistinct/${cmpy}`),

  getListByFecha: (tenant: TenantDto, cmpy: string, fecha: string, codusu: string) =>
    tenantHttp.get<MobRutaDto[]>(tenant, `api/v1/Rutas/GetListByFecha/${cmpy}/${fecha}/${codusu}`),

  /** Ruta planificada con los datos del cliente. */
  getDetailDataCliente: (tenant: TenantDto, filtro: FiltersRuta) =>
    tenantHttp.post<MobRutaDto[]>(tenant, "api/v1/Rutas/GetDetailDataCliente", filtro),
};
