/**
 * Tipos del API de Seguridad.
 *
 * Migrados uno a uno desde SeguimientoOnlineCore/Models/Seguridad. Se conservan
 * los nombres en PascalCase porque son los que serializa el API .NET; renombrar
 * aca obligaria a mapear en cada request y perderiamos la trazabilidad contra
 * el proyecto original.
 */

export interface LoginRequest {
  Email: string;
  Password: string;
}

export interface PermissionDto {
  PermissionId: string;
  PermissionModuleId: string;
  PermissionName: string;
  ModuleName: string;
  CanRead: boolean;
  CanWrite: boolean;
}

export interface ModuleRoleDto {
  ModuleName: string;
}

/** Respuesta comun de todos los endpoints de api/Auth. */
export interface UserManagerResponse {
  /** En Login trae el access_token; en el resto es el mensaje de error o exito. */
  Message: string;
  IsSuccess: boolean;
  Errors: string[] | null;
  ExpireDate: string | null;
  UserId: string;
  UrlEmail: string;
  Role: string;
  Permissions: PermissionDto[] | null;
  Modules: ModuleRoleDto[] | null;
}

export interface ResetPasswordRequest {
  Token: string;
  Email: string;
  NewPassword: string;
  ConfirmPassword: string;
}

export interface ChangedPasswordRequest {
  Email: string;
  CurrentPassword: string;
  NewPassword: string;
  ConfirmPassword: string;
}

/** Compania asignada al usuario, con las credenciales del API de ese tenant. */
export interface TenantDto {
  IDTenant: string;
  IDCompanyTenant: string;
  NameCompanyTenant: string;
  APIUrlTenant: string;
  UserAPITenant: string;
  PwdAPITenant: string;
  DefaultTenant: boolean;
  TimeZone: string;
}

export interface TenantE {
  IDTenant: string;
  NameTenant: string;
  IDCompanyTenant: string;
  NameCompanyTenant: string;
  APIUrlTenant: string;
  UserAPITenant: string;
  PwdAPITenant: string;
  IDApplication: string;
  TimeZone: string;
}

export interface UserTenantDto {
  Id: string;
  Email: string;
  PhoneNumber: string;
  UserName: string;
  NameTenant: string;
  NameCompanyTenant: string;
}

export interface AspNetUserE {
  Id: string;
  Email: string;
  EmailConfirmed: boolean;
  UserName: string;
  FirstName: string;
  LastName: string;
  DNI: string;
  Phone: string;
  PersonId: number;
  Tenant: string;
  Name: string;
  FullName: string;
}

export interface UserViewModel {
  Id: string;
  Email: string;
  EmailConfirmed: boolean;
  UserName: string;
  FirstName: string;
  LastName: string;
  DNI: string;
  Phone: string;
  PersonId: number;
  Tenant: string[];
  Profiles: number[];
  Name: string;
}

export interface RegisterUserRequest {
  Email: string;
  Password: string;
  ConfirmPassword: string;
  Id: string;
  EmailConfirmed: boolean;
  UserName: string;
  FirstName: string;
  LastName: string;
  DNI: string;
  Phone: string;
  PersonId: number;
  Tenant: string[];
  Profiles: number[];
  Rol: string;
}

export interface UserPhotoDto {
  ID: number;
  Photo: string;
}

export interface UserAssigmentDto {
  AssignmentId: number;
  rusu_cmpy: string;
  rusu_codusu: string;
}

export interface UserAssignmentE {
  AssignmentId: number;
  rusu_cmpy: string;
  rusu_codusu: string;
  rusu_nombre: string;
  rusu_codper: string;
  UserId: string;
}

export interface IdentityRole {
  Id: string;
  Name: string;
  NormalizedName: string;
  ConcurrencyStamp: string;
}

export interface ModuleE {
  Id: string;
  Name: string;
  ParentId: string | null;
  ModuleLevel: number;
}

export interface ModuleRoleAccess {
  ModuleId: string;
  RoleName: string;
  /** "read" | "write" segun lo que envia la vista Permissions del MVC. */
  Type: string;
}

export interface PermissionE {
  Id: string;
  Name: string;
  Active: boolean;
}

export interface PermissionModuleE {
  Id: string;
  PermissionId: string;
  ModuleId: string;
  CanRead: boolean;
  CanWrite: boolean;
}

export interface PermissionRoleE {
  Id: string;
  RoleId: string;
  PermissionId: string;
}

export interface PermissionRoleAssigmentE {
  Id: string;
  RoleName: string;
  PermissionName: string;
  Active: boolean;
}

export interface ProfileE {
  IDProfile: number;
  NameProfile: string;
  ParentProfileId: number | null;
  PathProfile: string;
}

export interface UserProfileE {
  UserProfileId: number;
  UserId: string;
  IDProfile: number;
}

export interface AudithE {
  AudithId: number;
  UserName: string;
  Module: string;
  CreatedDate: string;
}

export interface FilterAudith {
  Usuarios: string[];
  FecIni: string;
  FecFin: string;
}

export interface ApplicationConfigE {
  IDApplicationConfig: string | null;
  IDApplication: string | null;
  NameApplicationConfig: string;
  UserApplicationsConfigApi: string;
  PwdApplicationsConfigAPI: string;
  APIKeyApplicationsConfig: string;
  UrlApi: string;
}

export interface ApplicationConfigDto {
  IDApplicationConfig: string;
  NameApplicationConfig: string;
  UserApplicationsConfigApi: string;
  APIKeyApplicationsConfig: string;
  PwdApplicationsConfigAPI: string;
  UrlApi: string;
}

export interface ParamE {
  ParamId: number;
  ParamName: string;
  ParamDescription: string;
  ParamType: string;
  ParamValue: string;
}
