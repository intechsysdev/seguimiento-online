/** Equivalente a Helpers/IBES/MaterialPopHelper.cs y LineasHelper.cs */
import { tenantHttp } from "../../api/tenantHttp";
import type {
  FilterMaterialPop,
  MobLinea,
  MobMarcaPop,
  MobMaterialPop,
  MobSublinea,
  MovimientoMaterial,
} from "../../types/eva";
import type { TenantDto } from "../../types/seguridad";

export const materialPopService = {
  getList: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobMaterialPop[]>(tenant, `api/v1/MaterialPOP/GetList/${cmpy}`),

  insert: (tenant: TenantDto, item: MobMaterialPop) =>
    tenantHttp.post<unknown>(tenant, "api/v1/MaterialPOP/Insert", item),

  update: (tenant: TenantDto, item: MobMaterialPop) =>
    tenantHttp.put<unknown>(tenant, "api/v1/MaterialPOP/Update", item),

  delete: (tenant: TenantDto, id: number) =>
    tenantHttp.delete<unknown>(tenant, `api/v1/MaterialPOP/Delete/${id}`),

  getListMarcas: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobMarcaPop[]>(tenant, `api/v1/MaterialPOP/GetListMarcas/${cmpy}`),

  insertMarca: (tenant: TenantDto, item: MobMarcaPop) =>
    tenantHttp.post<unknown>(tenant, "api/v1/MaterialPOP/InsertMarca", item),

  updateMarca: (tenant: TenantDto, item: MobMarcaPop) =>
    tenantHttp.put<unknown>(tenant, "api/v1/MaterialPOP/UpdateMarca", item),

  deleteMarca: (tenant: TenantDto, id: number) =>
    tenantHttp.delete<unknown>(tenant, `api/v1/MaterialPOP/DeleteMarca/${id}`),

  /** Entregas: el listado filtrado va por POST porque el filtro es un objeto. */
  getFiltersList: (tenant: TenantDto, filtro: FilterMaterialPop) =>
    tenantHttp.post<MovimientoMaterial[]>(tenant, "api/v1/MaterialPOP/GetFiltersList", filtro),
};

export const lineasService = {
  getList: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobLinea[]>(tenant, `api/v1/Lineas/GetList/${cmpy}`),

  getSublineas: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobSublinea[]>(tenant, `api/v1/SubLineas/GetList/${cmpy}`),

  getSublineasByLinea: (tenant: TenantDto, cmpy: string, linea: string) =>
    tenantHttp.get<MobSublinea[]>(tenant, `api/v1/SubLineas/GetListByLinea/${cmpy}/${linea}`),
};
