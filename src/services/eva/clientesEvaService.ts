/** Equivalente a Helpers/IBES/ClientesHelper.cs */
import { tenantHttp } from "../../api/tenantHttp";
import type { FilterCliente, MobCliente } from "../../types/eva";
import type { TenantDto } from "../../types/seguridad";

export const clientesEvaService = {
  getList: (tenant: TenantDto, filtro: FilterCliente) =>
    tenantHttp.post<MobCliente[]>(tenant, "api/v1/Clientes/GetList", filtro),

  getListByCodUsu: (tenant: TenantDto, cmpy: string, codUsu: string) =>
    tenantHttp.get<MobCliente[]>(tenant, `api/v1/Clientes/GetListByCodUsu/${cmpy}/${codUsu}`),
};
