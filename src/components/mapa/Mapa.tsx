import { useEffect, useRef, useState } from "react";
import { cargarGoogleMaps } from "./googleMapsLoader";
import { Spinner } from "../ui/Spinner";
import { Alert } from "../ui/Alert";
import {
  COLOR_MAPA,
  TAM_MARCADOR,
  TAM_MARCADOR_NUMERADO,
  iconoMarcador,
  type ColorPunto,
  type TipoPunto,
} from "./tiposPunto";
import styles from "./Mapa.module.css";

export interface MarcadorMapa {
  id: string;
  lat: number;
  lng: number;
  titulo: string;
  /** HTML del InfoWindow, como el que armaban las vistas del MVC. */
  detalle?: string;
  color?: ColorPunto;
  /** Forma del marcador: distingue el tipo de punto ademas del color. */
  tipo?: TipoPunto;
  /** Numero de secuencia, para las rutas ordenadas. */
  etiqueta?: string;
}

export interface Trazado {
  /** Puntos en orden de recorrido. */
  puntos: { lat: number; lng: number }[];
  /** Color de la linea; el MVC usaba naranja para la ruta y rojo para visitas. */
  color?: string;
  grosor?: number;
  /** Util cuando varias lineas se superponen sobre las mismas calles. */
  opacidad?: number;
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

/**
 * Fuera del componente a proposito: como valor por defecto en la firma seria un
 * objeto nuevo en cada render, y al estar en las dependencias del efecto este
 * volveria a dibujar el mapa entero cada vez.
 */
const CENTRO_POR_DEFECTO = { lat: 3.53841, lng: -76.30114 };

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

/**
 * Directions limita las peticiones por segundo. Lanzando todos los tramos a la
 * vez (varias capas x varios tramos) Google responde OVER_QUERY_LIMIT y esas
 * lineas simplemente no se dibujaban: por eso no se veian a la vez el
 * recorrido del dispositivo, el de las visitas y el de la ruta.
 *
 * Se encolan de a una, con espera entre peticiones y reintento con espera
 * creciente cuando el limite se alcanza igual.
 */
const ESPERA_MS = 180;
const MAX_REINTENTOS = 4;

function pedirRuta(
  servicio: google.maps.DirectionsService,
  peticion: Record<string, unknown>,
  intento = 0,
): Promise<google.maps.DirectionsResult | null> {
  return new Promise((resolver) => {
    servicio.route(peticion, (respuesta, estado) => {
      if (estado === "OK" && respuesta) {
        resolver(respuesta);
        return;
      }
      if (estado === "OVER_QUERY_LIMIT" && intento < MAX_REINTENTOS) {
        setTimeout(
          () => pedirRuta(servicio, peticion, intento + 1).then(resolver),
          400 * 2 ** intento,
        );
        return;
      }
      resolver(null);
    });
  });
}

export function Mapa({
  apiKey,
  marcadores,
  trazados,
  altura = "26rem",
  centro = CENTRO_POR_DEFECTO,
}: MapaProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<google.maps.Map | null>(null);
  const servicio = useRef<google.maps.DirectionsService | null>(null);
  const dibujados = useRef<google.maps.Marker[]>([]);
  const renderers = useRef<google.maps.DirectionsRenderer[]>([]);
  /** Identifica la tanda de dibujo en curso para descartar respuestas viejas. */
  const generacionActual = useRef(0);
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
      const color = COLOR_MAPA[item.color ?? "azul"];
      const numerado = Boolean(item.etiqueta?.trim());
      const tam = numerado ? TAM_MARCADOR_NUMERADO : TAM_MARCADOR;

      const marcador = new gmaps.Marker({
        position: posicion,
        map: mapa.current,
        title: item.titulo,
        icon: item.tipo
          ? {
              url: iconoMarcador(item.tipo, color, item.etiqueta),
              scaledSize: new gmaps.Size(tam, tam),
              // Punta abajo, que es donde cae la coordenada real.
              anchor: new gmaps.Point(tam / 2, tam),
            }
          : undefined,
        // Sin forma propia no hay donde dibujar el numero: se cae al label.
        label:
          !item.tipo && numerado
            ? { text: item.etiqueta!, color: "#ffffff", fontSize: "12px", fontWeight: "700" }
            : undefined,
        // Los numerados por encima: son los que el usuario viene a leer.
        zIndex: numerado ? 2 : 1,
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

    // Ruta por calles, tramo a tramo y en cola para no exceder el limite.
    const generacion = ++generacionActual.current;

    (async () => {
      for (const trazado of trazados ?? []) {
        for (const tramo of partirEnTramos(trazado.puntos)) {
          // Si el mapa se redibujo mientras tanto, se abandona esta tanda.
          if (generacion !== generacionActual.current) return;

          const origen = tramo[0];
          const destino = tramo[tramo.length - 1];
          const waypoints = tramo.slice(1, -1).map((punto) => ({
            location: `${punto.lat} ${punto.lng}`,
            stopover: false,
          }));

          const respuesta = await pedirRuta(servicio.current!, {
            origin: `${origen.lat} ${origen.lng}`,
            destination: `${destino.lat} ${destino.lng}`,
            waypoints,
            travelMode: "WALKING",
          });

          if (generacion !== generacionActual.current || !respuesta || !mapa.current) continue;

          const renderer = new gmaps.DirectionsRenderer();
          renderer.setMap(mapa.current);
          renderer.setOptions({
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: {
              // Azul primario de la app movil (colors.dart: primaryColor).
              strokeColor: trazado.color ?? "#0377e3",
              strokeWeight: trazado.grosor ?? 4,
              strokeOpacity: trazado.opacidad ?? 0.9,
            },
          });
          renderer.setDirections(respuesta);
          renderers.current.push(renderer);

          await new Promise((r) => setTimeout(r, ESPERA_MS));
        }
      }
    })();

    /*
      Sin esto los marcadores nunca se soltaban: al desmontarse el mapa (una
      pantalla que lo esconde mientras recarga, por ejemplo) quedaban colgados
      del objeto Map anterior, y al volver a montarlo se dibujaban encima los
      nuevos. El resultado era un mapa que acumulaba puntos de consultas viejas
      y parecia ignorar el filtro.
    */
    return () => {
      // Invalida la tanda en curso: Directions responde tarde y sus renderers
      // se engancharian a un mapa que ya no existe.
      generacionActual.current += 1;
      dibujados.current.forEach((m) => m.setMap(null));
      dibujados.current = [];
      renderers.current.forEach((r) => r.setMap(null));
      renderers.current = [];
    };
  }, [listo, marcadores, trazados, centro]);

  if (error) return <Alert tone="warning">{error}</Alert>;
  if (!listo) return <Spinner mensaje="Cargando mapa…" />;

  return <div ref={contenedor} className={styles.mapa} style={{ height: altura }} />;
}
