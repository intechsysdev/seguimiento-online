/** Equivalente a Helpers/Seguridad/TenantHelper.cs */
import { http } from "../api/http";
import type { TenantDto, TenantE, UserTenantDto } from "../types/seguridad";

export const tenantService = {
  /** Companias del usuario, con la URL y credenciales del API de cada tenant. */
  getListByUser: (userId: string) =>
    http.get<TenantDto[]>(`api/v1/Tenants/GetListByUser/${userId}`),

  /** Usuarios que pertenecen a una compania. */
  getListByTenant: (tenant: string) =>
    http.get<UserTenantDto[]>(`api/v1/Tenants/GetListByTenant/${tenant}`),

  getList: () => http.get<TenantE[]>("api/v1/Tenants/GetList"),

  getDetail: (tenantId: string) => http.get<TenantE>(`api/v1/Tenants/GetDetail/${tenantId}`),

  insert: (item: TenantE) => http.post<number>("api/v1/Tenants/Insert", item),

  update: (item: TenantE) => http.put<boolean>("api/v1/Tenants/Update", item),

  delete: (tenantId: string) => http.delete<boolean>(`api/v1/Tenants/Delete/${tenantId}`),

  /** Ojo: en el MVC este endpoint se invoca con verbo DELETE aunque asigna. */
  assignmentCompany: (tenantId: string, userId: string) =>
    http.delete<boolean>(`api/v1/Tenants/AssignmentCompany/${tenantId}/${userId}`),
};
