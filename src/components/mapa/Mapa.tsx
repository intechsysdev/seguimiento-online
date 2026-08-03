import { useEffect, useRef, useState } from "react";
import { cargarGoogleMaps } from "./googleMapsLoader";
import { Spinner } from "../ui/Spinner";
import { Alert } from "../ui/Alert";
import styles from "./Mapa.module.css";

export interface MarcadorMapa {
  id: string;
  lat: number;
  lng: number;
  titulo: string;
  /** HTML del InfoWindow, como el que armaban las vistas del MVC. */
  detalle?: string;
  /** Icono de Google: green-dot.png, red-dot.png, etc. */
  color?: "verde" | "rojo" | "azul" | "ambar" | "morado" | "naranja";
  /** Numero de secuencia, para las rutas ordenadas. */
  etiqueta?: string;
}

export interface Trazado {
  /** Puntos en orden de recorrido. */
  puntos: { lat: number; lng: number }[];
  /** Color de la linea; el MVC usaba naranja para la ruta y rojo para visitas. */
  color?: string;
  grosor?: number;
}

interface MapaProps {
  apiKey: string;
  marcadores: MarcadorMapa[];
  /** Rutas a dibujar siguiendo las calles (Directions API). */
  trazados?: Trazado[];
  altura?: string;
  /** Centro por defecto cuando no hay marcadores (Cali, como el MVC). */
  centro?: { lat: number; lng: number };
}

const ICONOS: Record<NonNullable<MarcadorMapa["color"]>, string> = {
  verde: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  rojo: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  azul: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  ambar: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
  morado: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png",
  naranja: "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
};

/**
 * Directions acepta como maximo 25 paradas por peticion (23 waypoints + origen
 * + destino), asi que el recorrido se parte en tramos. Los tramos comparten un
 * punto con el siguiente para que la linea quede continua; es el mismo calculo
 * del MVC: `for (i = 0, max = 25 - 1; ...; i += max) parts.push(slice(i, i + max + 1))`.
 */
const MAX_PARADAS = 25;

function partirEnTramos<T>(puntos: T[]): T[][] {
  const paso = MAX_PARADAS - 1;
  const tramos: T[][] = [];
  for (let i = 0; i < puntos.length; i += paso) {
    tramos.push(puntos.slice(i, i + paso + 1));
  }
  return tramos.filter((tramo) => tramo.length >= 2);
}

export function Mapa({
  apiKey,
  marcadores,
  trazados,
  altura = "26rem",
  centro = { lat: 3.53841, lng: -76.30114 },
}: MapaProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<google.maps.Map | null>(null);
  const servicio = useRef<google.maps.DirectionsService | null>(null);
  const dibujados = useRef<google.maps.Marker[]>([]);
  const renderers = useRef<google.maps.DirectionsRenderer[]>([]);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);

  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    cargarGoogleMaps(apiKey)
      .then(() => {
        if (!cancelado) setListo(true);
      })
      .catch((e: Error) => {
        if (!cancelado) setError(e.message);
      });
    return () => {
      cancelado = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!listo || !contenedor.current || !window.google) return;
    const gmaps = window.google.maps;

    mapa.current ??= new gmaps.Map(contenedor.current, {
      center: centro,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
    });
    servicio.current ??= new gmaps.DirectionsService();
    infoWindow.current ??= new gmaps.InfoWindow();

    // Se redibuja todo en cada cambio: los volumenes por pantalla son bajos
    // (dispositivos de un equipo, clientes de una ruta) y evita estado extra.
    dibujados.current.forEach((m) => m.setMap(null));
    dibujados.current = [];
    renderers.current.forEach((r) => r.setMap(null));
    renderers.current = [];

    const limites = new gmaps.LatLngBounds();

    marcadores.forEach((item) => {
      const posicion = { lat: item.lat, lng: item.lng };
      const marcador = new gmaps.Marker({
        position: posicion,
        map: mapa.current,
        title: item.titulo,
        icon: item.color ? { url: ICONOS[item.color] } : undefined,
        label: item.etiqueta ? { text: item.etiqueta, color: "#fff", fontSize: "11px" } : undefined,
      });

      if (item.detalle) {
        marcador.addListener("click", () => {
          infoWindow.current!.setContent(item.detalle!);
          infoWindow.current!.open(mapa.current!, marcador);
        });
      }

      dibujados.current.push(marcador);
      limites.extend(posicion);
    });

    // Encuadre antes de pedir las rutas: Directions responde async y el MVC
    // dejaba `preserveViewport` para no moverlo despues.
    trazados?.forEach((trazado) => trazado.puntos.forEach((p) => limites.extend(p)));

    if (!limites.isEmpty()) {
      mapa.current.fitBounds(limites, 48);
    } else {
      mapa.current.setCenter(centro);
      mapa.current.setZoom(11);
    }

    // Ruta por calles, tramo a tramo.
    trazados?.forEach((trazado) => {
      partirEnTramos(trazado.puntos).forEach((tramo) => {
        const origen = tramo[0];
        const destino = tramo[tramo.length - 1];
        const waypoints = tramo.slice(1, -1).map((punto) => ({
          location: `${punto.lat} ${punto.lng}`,
          stopover: false,
        }));

        servicio.current!.route(
          {
            origin: `${origen.lat} ${origen.lng}`,
            destination: `${destino.lat} ${destino.lng}`,
            waypoints,
            travelMode: "WALKING",
          },
          (respuesta, estado) => {
            // El MVC ignoraba los fallos (p. ej. OVER_QUERY_LIMIT) en silencio.
            if (estado !== "OK" || !respuesta || !mapa.current) return;

            const renderer = new gmaps.DirectionsRenderer();
            renderer.setMap(mapa.current);
            renderer.setOptions({
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: {
                // Azul primario de la app movil (colors.dart: primaryColor).
                strokeColor: trazado.color ?? "#0377e3",
                strokeWeight: trazado.grosor ?? 4,
              },
            });
            renderer.setDirections(respuesta);
            renderers.current.push(renderer);
          },
        );
      });
    });
  }, [listo, marcadores, trazados, centro]);

  if (error) return <Alert tone="warning">{error}</Alert>;
  if (!listo) return <Spinner mensaje="Cargando mapa…" />;

  return <div ref={contenedor} className={styles.mapa} style={{ height: altura }} />;
}
