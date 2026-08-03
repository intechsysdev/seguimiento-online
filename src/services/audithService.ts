/** Equivalente a Helpers/Seguridad/AudithHelper.cs */
import { http } from "../api/http";
import type { AudithE, FilterAudith } from "../types/seguridad";

export const audithService = {
  /** El listado va por POST porque recibe el filtro en el cuerpo. */
  list: (filter: FilterAudith) => http.post<AudithE[]>("api/v1/Audiths/List", filter),

  insert: (item: AudithE) => http.post<number>("api/v1/Audiths/Insert", item),
};
