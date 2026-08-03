/**
 * Equivalente a Helpers/Mobicontrol/DevicesHelper.cs
 *
 * La configuracion (URL, usuario, clave y APIKey) se lee del API de Seguridad
 * con ApplicationConfig/GetValueByName("MobiControl"), igual que en el MVC.
 */
import { ApiError } from "../api/http";
import { urlDinamica } from "../api/dynamicProxy";
import type { ApplicationConfigDto } from "../types/seguridad";
import type {
  DeviceE,
  DeviceInformationE,
  DeviceLastLocationE,
  LocationE,
  ResponseToken,
} from "../types/mobicontrol";

async function pedir<T>(
  config: ApplicationConfigDto,
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const respuesta = await fetch(urlDinamica(config.UrlApi, path), {
    ...init,
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  const texto = await respuesta.text();
  if (!respuesta.ok) throw new ApiError(respuesta.status, texto);
  if (texto.trim() === "") return undefined as T;

  try {
    return JSON.parse(texto) as T;
  } catch {
    return texto as unknown as T;
  }
}

export const mobicontrolService = {
  /** api/token: form-urlencoded con Basic del APIKey, como hacia RestSharp. */
  async getToken(config: ApplicationConfigDto): Promise<ResponseToken> {
    const cuerpo = new URLSearchParams({
      grant_type: "password",
      username: config.UserApplicationsConfigApi,
      password: config.PwdApplicationsConfigAPI,
    });

    const respuesta = await fetch(urlDinamica(config.UrlApi, "api/token"), {
      method: "POST",
      headers: {
        Authorization: `Basic ${config.APIKeyApplicationsConfig}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: cuerpo.toString(),
    });

    const texto = await respuesta.text();
    if (!respuesta.ok) throw new ApiError(respuesta.status, texto);
    return JSON.parse(texto) as ResponseToken;
  },

  /** Un dispositivo por nombre exacto (el nombre es el codigo del vendedor). */
  getDevices: (config: ApplicationConfigDto, deviceName: string, token: string) =>
    pedir<DeviceE[]>(config, `api/devices?filter=DeviceName%3A${deviceName}`, token),

  /**
   * Varios dispositivos. `filtro` ya viene armado como
   * "DeviceName%3Acod1%2CDeviceName%3Acod2%2C..." igual que en el controller.
   */
  getAllDevices: (config: ApplicationConfigDto, filtro: string, token: string) =>
    pedir<DeviceInformationE[]>(config, `api/devices?filter=${filtro}&take=500`, token),

  getLastLocationByDeviceId: (config: ApplicationConfigDto, deviceId: string, token: string) =>
    pedir<DeviceLastLocationE | null>(config, `api/devices/${deviceId}/lastKnownLocation`, token),

  /** Trazas GPS de un dia. Las fechas van en yyyy-MM-dd. */
  getLocations: (
    config: ApplicationConfigDto,
    deviceId: string,
    startDate: string,
    endDate: string,
    token: string,
  ) =>
    pedir<LocationE[]>(
      config,
      `api/devices/${deviceId}/collectedData?startDate=${startDate}T00:00:00-05:00&endDate=${endDate}T23:59:59-05:00&builtInDataType=Location`,
      token,
    ),

  /** Fuerza al dispositivo a reportar su posicion antes de leerla. */
  updateLocate: (config: ApplicationConfigDto, deviceId: string, token: string) =>
    pedir<string>(config, `api/devices/${deviceId}/actions`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Action: "Locate" }),
    }),
};
