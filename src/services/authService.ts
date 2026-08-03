/** Equivalente a Helpers/Seguridad/AccountHelper.cs */
import { http } from "../api/http";
import type {
  ChangedPasswordRequest,
  LoginRequest,
  RegisterUserRequest,
  ResetPasswordRequest,
  UserManagerResponse,
} from "../types/seguridad";

/**
 * api/Auth responde 400 con un UserManagerResponse valido cuando el usuario no
 * existe o la clave es incorrecta, asi que el cuerpo se lee igual que hacia
 * RestSharp en el MVC. Ver `aceptarCuerpoDeError` en api/http.ts.
 */
const LEER_ERROR = { aceptarCuerpoDeError: true } as const;

export const authService = {
  login: (model: LoginRequest) =>
    http.post<UserManagerResponse>("api/Auth/Login", model, { auth: false, ...LEER_ERROR }),

  register: (model: RegisterUserRequest) =>
    http.post<UserManagerResponse>("api/Auth/Register", model, LEER_ERROR),

  forgetPassword: (email: string) =>
    http.post<UserManagerResponse>(
      `api/Auth/ForgetPassword?email=${encodeURIComponent(email)}`,
      undefined,
      { auth: false, ...LEER_ERROR },
    ),

  resetPassword: (model: ResetPasswordRequest) =>
    http.post<UserManagerResponse>("api/Auth/ResetPassword", model, { auth: false, ...LEER_ERROR }),

  changedPassword: (model: ChangedPasswordRequest) =>
    http.post<UserManagerResponse>("api/Auth/ChangedPassword", model, LEER_ERROR),

  createRole: (role: string) =>
    http.post<boolean>(`api/Auth/CreateRole/${encodeURIComponent(role)}`),

  editRole: (oldRole: string, newRole: string) =>
    http.post<boolean>(
      `api/Auth/EditRole/${encodeURIComponent(oldRole)}/${encodeURIComponent(newRole)}`,
    ),
};
