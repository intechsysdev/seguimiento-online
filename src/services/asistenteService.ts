/**
 * Chat del asistente (api/v1/Asistente del API de Seguridad).
 *
 * El navegador solo habla con Seguridad: la llave de Claude y la del MCP de la
 * compañía se leen allá y nunca llegan aquí.
 */
import { avisarSesionExpirada, http, tokenDeSesion, urlSeguridad } from "../api/http";

export interface MensajeAsistente {
  rol: "user" | "assistant";
  contenido: string;
}

export interface EstadoAsistente {
  Disponible: boolean;
  /** Por qué no está disponible (falta configuración, compañía no asignada...). */
  Motivo?: string;
}

export interface ManejadoresChat {
  /** Un trozo más de la respuesta. */
  alTexto: (texto: string) => void;
  /** El asistente empezó una consulta a EVA (nombre de la herramienta). */
  alConsultar: (herramienta: string) => void;
  /** La respuesta terminó, pero incompleta; el texto explica por qué. */
  alAviso: (texto: string) => void;
}

/** La conversación que se envía: lo último pesa más y el servidor rechaza más de 40. */
const MAXIMO_MENSAJES = 30;

interface EventoServidor {
  tipo: string;
  datos: { texto?: string; herramienta?: string };
}

/** Separa el flujo text/event-stream en eventos completos; devuelve el resto sin terminar. */
function extraerEventos(buffer: string): { eventos: EventoServidor[]; resto: string } {
  const partes = buffer.split(/\r?\n\r?\n/);
  const resto = partes.pop() ?? "";
  const eventos: EventoServidor[] = [];

  for (const parte of partes) {
    let tipo = "message";
    const datos: string[] = [];
    for (const linea of parte.split(/\r?\n/)) {
      if (linea.startsWith("event:")) tipo = linea.slice(6).trim();
      else if (linea.startsWith("data:")) datos.push(linea.slice(5).trimStart());
    }
    if (datos.length === 0) continue;
    try {
      eventos.push({ tipo, datos: JSON.parse(datos.join("\n")) });
    } catch {
      // Un evento que no es JSON no es del asistente: se ignora.
    }
  }

  return { eventos, resto };
}

async function mensajeDeError(respuesta: Response) {
  const cuerpo = await respuesta.text();
  try {
    const json = JSON.parse(cuerpo) as { Mensaje?: string };
    if (json.Mensaje) return json.Mensaje;
  } catch {
    // Respuesta sin JSON (por ejemplo un 502 del proxy): se usa el mensaje genérico.
  }
  return `El asistente no respondió (error ${respuesta.status}).`;
}

export const asistenteService = {
  estado: (compania: string) =>
    http.get<EstadoAsistente>(`api/v1/Asistente/Estado/${encodeURIComponent(compania)}`),

  /**
   * Envía la conversación y entrega la respuesta a medida que llega. Termina
   * cuando el servidor cierra el flujo; lanza Error con un mensaje para mostrar.
   */
  async preguntar(
    compania: string,
    mensajes: MensajeAsistente[],
    manejadores: ManejadoresChat,
    signal: AbortSignal,
  ): Promise<void> {
    const token = tokenDeSesion();
    const respuesta = await fetch(urlSeguridad("api/v1/Asistente/Chat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        Compania: compania,
        Mensajes: mensajes
          .slice(-MAXIMO_MENSAJES)
          .map((m) => ({ Rol: m.rol, Contenido: m.contenido })),
      }),
      signal,
    });

    if (respuesta.status === 401) {
      avisarSesionExpirada();
      throw new Error("La sesión expiró. Vuelve a iniciar sesión.");
    }
    if (!respuesta.ok) throw new Error(await mensajeDeError(respuesta));
    if (!respuesta.body) throw new Error("El navegador no permite leer la respuesta por partes.");

    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();
    let buffer = "";
    let terminado = false;

    while (!terminado) {
      const { value, done } = await lector.read();
      buffer += decodificador.decode(value ?? new Uint8Array(), { stream: !done });
      // Al cerrarse el flujo se fuerza el corte del último evento.
      const { eventos, resto } = extraerEventos(done ? `${buffer}\n\n` : buffer);
      buffer = resto;

      for (const evento of eventos) {
        if (evento.tipo === "texto" && evento.datos.texto) manejadores.alTexto(evento.datos.texto);
        else if (evento.tipo === "herramienta" && evento.datos.herramienta)
          manejadores.alConsultar(evento.datos.herramienta);
        else if (evento.tipo === "aviso" && evento.datos.texto) manejadores.alAviso(evento.datos.texto);
        else if (evento.tipo === "error")
          throw new Error(evento.datos.texto ?? "Ocurrió un error al generar la respuesta.");
        else if (evento.tipo === "fin") terminado = true;
      }

      if (done) break;
    }

    if (!terminado) throw new Error("La conexión se cortó antes de terminar la respuesta. Intenta de nuevo.");
  },
};
