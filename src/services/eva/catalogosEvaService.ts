/**
 * Catalogos del API por compania.
 * Equivale a los helpers RegionesHelper, CiudadesHelper, CanalesHelper,
 * PerfilesHelper y TerritoriosHelper de Helpers/IBES.
 */
import { tenantHttp } from "../../api/tenantHttp";
import type {
  MobAccion,
  MobCustType,
  MobDistrict,
  MobMedioVisita,
  MobMotivo,
  MobMotivoVisita,
  MobPerfil,
  MobTipoMovimiento,
  RegionE,
  TerritorioE,
} from "../../types/eva";
import type { TenantDto } from "../../types/seguridad";

export const catalogosEvaService = {
  regiones: (tenant: TenantDto) => tenantHttp.get<RegionE[]>(tenant, "api/v1/Regiones/GetList"),

  territorios: (tenant: TenantDto) =>
    tenantHttp.get<TerritorioE[]>(tenant, "api/v1/Territorios/GetList"),

  /** El API los llama "Ciudades"; el modelo subyacente es district. */
  ciudades: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobDistrict[]>(tenant, `api/v1/Ciudades/GetList/${cmpy}`),

  canales: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobCustType[]>(tenant, `api/v1/Canales/GetList/${cmpy}`),

  perfiles: (tenant: TenantDto) => tenantHttp.get<MobPerfil[]>(tenant, "api/v1/Perfiles/GetList"),

  mediosVisita: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobMedioVisita[]>(tenant, `api/v1/MediosVisitas/GetList/${cmpy}`),

  /** Motivos de no compra. */
  motivos: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobMotivo[]>(tenant, `api/v1/Motivos/GetList/${cmpy}`),

  motivosVisita: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobMotivoVisita[]>(tenant, `api/v1/MotivosVisita/GetList/${cmpy}`),

  acciones: (tenant: TenantDto, cmpy: string) =>
    tenantHttp.get<MobAccion[]>(tenant, `api/v1/Acciones/GetList/${cmpy}`),

  tiposMovimiento: (tenant: TenantDto) =>
    tenantHttp.get<MobTipoMovimiento[]>(tenant, "api/v1/TiposMovimientos/GetList"),
};
