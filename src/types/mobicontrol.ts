/** Tipos de MobiControl (SOTI), migrados de Models/MobiControl. */

export interface ResponseToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface DeviceE {
  DeviceId: string;
  DeviceName: string;
}

export interface DeviceInformationE {
  DeviceId: string;
  DeviceName: string;
  IsAgentOnline: boolean;
  LastAgentConnectTime: string;
  NetworkRSSI: number;
  BatteryStatus: number;
}

export interface DeviceLastLocationE {
  DeviceId: string;
  Latitude: number;
  Longitude: number;
  CollectionTimestamp: string;
}

export interface LocationE {
  type: string;
  Latitude: number;
  Longitude: number;
  Altitude: number;
  Speed: number;
  Heading: number;
  Kind: string;
  DeviceId: string;
  Timestamp: string;
}
