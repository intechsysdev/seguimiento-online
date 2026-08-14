/**
 * Tipado minimo del SDK de Google Maps: solo lo que usan las vistas migradas.
 * Evita agregar @types/google.maps por unas pocas clases.
 */
declare namespace google.maps {
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  class LatLngBounds {
    extend(punto: LatLngLiteral): void;
    isEmpty(): boolean;
  }

  /** Tamaño en pixeles del icono de un marcador (`scaledSize`). */
  class Size {
    constructor(ancho: number, alto: number);
  }

  /** Punto del icono que se ancla a la coordenada (`anchor`). */
  class Point {
    constructor(x: number, y: number);
  }

  class Map {
    constructor(elemento: HTMLElement, opciones: Record<string, unknown>);
    fitBounds(limites: LatLngBounds, relleno?: number): void;
    setCenter(punto: LatLngLiteral): void;
    setZoom(nivel: number): void;
  }

  class Marker {
    constructor(opciones: Record<string, unknown>);
    setMap(mapa: Map | null): void;
    addListener(evento: string, handler: () => void): void;
  }

  class InfoWindow {
    constructor(opciones?: Record<string, unknown>);
    setContent(contenido: string): void;
    open(mapa: Map, ancla?: Marker): void;
    close(): void;
  }

  interface DirectionsResult {
    routes: unknown[];
  }

  class DirectionsService {
    route(
      peticion: Record<string, unknown>,
      callback: (respuesta: DirectionsResult | null, estado: string) => void,
    ): void;
  }

  class DirectionsRenderer {
    constructor(opciones?: Record<string, unknown>);
    setMap(mapa: Map | null): void;
    setOptions(opciones: Record<string, unknown>): void;
    setDirections(resultado: DirectionsResult): void;
  }
}

interface Window {
  google?: typeof google;
}
