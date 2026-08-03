/** Equivalente a Helpers/Seguridad/SeguridadHelper.cs */
import { http } from "../api/http";
import type {
  AspNetUserE,
  IdentityRole,
  ModuleRoleDto,
  UserAssigmentDto,
  UserAssignmentE,
  UserPhotoDto,
  UserViewModel,
} from "../types/seguridad";

export const usuariosService = {
  getList: () => http.get<AspNetUserE[]>("api/v1/Users/GetList"),

  getById: (userId: string) => http.get<AspNetUserE>(`api/v1/Users/GetById/${userId}`),

  getPhotoByEmail: (email: string) =>
    http.get<UserPhotoDto>(`api/v1/Users/GetPhotoByEmail/${encodeURIComponent(email)}`),

  getRoles: () => http.get<IdentityRole[]>("api/v1/Users/GetListRoles"),

  getModulesByRole: (role: string) =>
    http.get<ModuleRoleDto[]>(`api/v1/Users/GetModulesByRole?role=${encodeURIComponent(role)}`),

  update: (item: UserViewModel) => http.put<boolean>("api/v1/Users/Update", item),

  updatePhoto: (item: UserPhotoDto) => http.put<boolean>("api/v1/Users/UpdatePhoto", item),

  delete: (id: string) => http.delete<boolean>(`api/v1/Users/Delete/${id}`),

  getUserAssignments: (user: string, cmpy: string) =>
    http.get<UserAssigmentDto[]>(`api/v1/Users/GetUserAssignments/${user}/${cmpy}`),

  insertAssignments: (items: UserAssignmentE[]) =>
    http.post<number>("api/v1/Users/InsertAssignments", items),

  deleteAssignment: (cmpy: string, codUsu: string, userId: string) =>
    http.delete<boolean>(`api/v1/Users/DeleteAssigment/${cmpy}/${codUsu}/${userId}`),
};
