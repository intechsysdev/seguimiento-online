/** Equivalente a Helpers/Seguridad/ProfileHelper.cs */
import { http } from "../api/http";
import type { ProfileE, UserProfileE } from "../types/seguridad";

export const profileService = {
  getList: () => http.get<ProfileE[]>("api/v1/Profiles/GetList"),

  getById: (id: number) => http.get<ProfileE>(`api/v1/Profiles/GetById/${id}`),

  getListByUserId: (userId: string) =>
    http.get<UserProfileE[]>(`api/v1/Profiles/GetListByUserId/${userId}`),

  insert: (item: ProfileE) => http.post<number>("api/v1/Profiles/Insert", item),

  update: (item: ProfileE) => http.put<boolean>("api/v1/Profiles/Update", item),

  delete: (id: number) => http.delete<boolean>(`api/v1/Profiles/Delete/${id}`),
};
