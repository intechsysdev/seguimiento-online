/** Equivalente a Helpers/Seguridad/PermissionHelper.cs */
import { http } from "../api/http";
import type {
  IdentityRole,
  ModuleE,
  ModuleRoleAccess,
  PermissionE,
  PermissionModuleE,
  PermissionRoleAssigmentE,
  PermissionRoleE,
} from "../types/seguridad";

export const permissionService = {
  getModulesList: () => http.get<ModuleE[]>("api/v1/Permissions/GetModulesList"),

  getList: () => http.get<PermissionE[]>("api/v1/Permissions/GetList"),

  insert: (item: PermissionE) => http.post<number>("api/v1/Permissions/Insert", item),

  insertPermissionModule: (item: PermissionModuleE) =>
    http.post<number>("api/v1/Permissions/InsertPermissionModule", item),

  insertPermissionRole: (item: PermissionRoleE) =>
    http.post<number>("api/v1/Permissions/InsertPermissionRole", item),

  /** POST en el original, no DELETE. */
  deletePermissionRole: (id: string) =>
    http.post<number>(`api/v1/Permissions/DeletePermissionRole/${id}`),

  getRolesByPermissionList: (permissionId: string) =>
    http.get<PermissionRoleAssigmentE[]>(
      `api/v1/Permissions/GetRolesByPermissionList/${permissionId}`,
    ),

  getRolesWithOutPermission: (permissionId: string) =>
    http.get<IdentityRole[]>(`api/v1/Permissions/GetRolesWithOutPermission/${permissionId}`),

  manageModuleRole: (item: ModuleRoleAccess) =>
    http.post<boolean>("api/v1/Permissions/ManageModuleRole", item),
};
