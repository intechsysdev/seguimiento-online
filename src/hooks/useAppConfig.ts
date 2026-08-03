import { useApi } from "./useApi";
import { applicationConfigService } from "../services/applicationConfigService";
import { mobicontrolService } from "../services/mobicontrolService";
import type { ApplicationConfigDto } from "../types/seguridad";

/**
 * Configuracion de un servicio externo, leida del API de Seguridad.
 *
 * Reemplaza a `_ApplicationConfig.GetValueByName(token, "...")`, que los
 * controllers llamaban antes de hablar con MobiControl o Google Maps.
 */
export function useAppConfig(nombre: string) {
  return useApi(() => applicationConfigService.getValueByName(nombre), [nombre]);
}

/** API key de Google Maps ("GoogleMaps" en ApplicationConfig). */
export function useGoogleMapsKey() {
  const config = useAppConfig("GoogleMaps");
  return {
    apiKey: config.datos?.APIKeyApplicationsConfig ?? "",
    cargando: config.cargando,
    error: config.error,
  };
}

/**
 * Configuracion de MobiControl mas su token OAuth.
 *
 * El token se pide una vez por carga de la pagina, igual que hacia cada
 * request del controller.
 */
export function useMobiControl() {
  const config = useAppConfig("MobiControl");

  const token = useApi(
    () =>
      config.datos
        ? mobicontrolService.getToken(config.datos).then((r) => r.access_token)
        : Promise.resolve(""),
    [config.datos?.IDApplicationConfig],
  );

  return {
    config: config.datos as ApplicationConfigDto | undefined,
    token: token.datos ?? "",
    cargando: config.cargando || token.cargando,
    error: config.error ?? token.error,
  };
}
