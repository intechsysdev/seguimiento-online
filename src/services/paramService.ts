/** Equivalente a Helpers/Seguridad/ParamHelper.cs */
import { http } from "../api/http";
import type { ParamE } from "../types/seguridad";

/** Id 2: distancia base para decidir si una visita fue presencial. */
export const PARAM_DISTANCIA_PRESENCIAL = 2;

export const paramService = {
  getById: (id: number) => http.get<ParamE>(`api/v1/Params/GetById/${id}`),

  setSyncDate: (id: number) => http.put<boolean>(`api/v1/Params/SetSyncDate/${id}`),
};
