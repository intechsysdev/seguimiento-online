/** Equivalente a Helpers/Seguridad/ApplicationConfigHelper.cs */
import { http } from "../api/http";
import type { ApplicationConfigDto, ApplicationConfigE } from "../types/seguridad";

export const applicationConfigService = {
  getList: () => http.get<ApplicationConfigE[]>("api/v1/ApplicationConfig/GetList"),

  getDetail: (id: string) => http.get<ApplicationConfigE>(`api/v1/ApplicationConfig/GetDetail/${id}`),

  getValueByName: (name: string) =>
    http.get<ApplicationConfigDto>(`api/v1/ApplicationConfig/GetValueByName/${name}`),

  insert: (item: ApplicationConfigE) => http.post<number>("api/v1/ApplicationConfig/Insert", item),

  update: (item: ApplicationConfigE) => http.put<boolean>("api/v1/ApplicationConfig/Update", item),

  delete: (id: string) => http.delete<boolean>(`api/v1/ApplicationConfig/Delete/${id}`),
};
