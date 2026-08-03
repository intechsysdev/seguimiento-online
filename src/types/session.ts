import type { ModuleRoleDto, PermissionDto, TenantDto } from "./seguridad";

/**
 * Lo que en el MVC vivia como claims de la cookie de sesion (AccountController.Validate):
 * username, access_token, id, tenantDefault, urlApi, userApi, pwdApi, timeZone,
 * IsAdmin, Permissions, Modules.
 */
export interface Session {
  username: string;
  userId: string;
  accessToken: string;
  role: string;
  isAdmin: boolean;
  permissions: PermissionDto[];
  modules: ModuleRoleDto[];
  /** Companias a las que tiene acceso el usuario. */
  tenants: TenantDto[];
  /** IDCompanyTenant de la compania activa. */
  tenantActual: string;
  expireDate: string | null;
}

export function tenantActivo(session: Session): TenantDto | undefined {
  return session.tenants.find((t) => t.IDCompanyTenant === session.tenantActual);
}
