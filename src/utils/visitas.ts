/**
 * Consolidacion de visitas efectuadas por cliente.
 *
 * `GetListCompuestoGroup` agrupa por registro de visita, no por cliente: si un
 * funcionario entra dos veces al mismo cliente en el dia, el cliente sale
 * repetido. La vista los junta en una sola fila y suma el tiempo.
 */
import type { MobVisitaGrupoDto } from "../types/eva";
import { normalizarCodigo } from "./movimientos";

function trozos(valor: unknown): number[] | null {
  const partes = String(valor ?? "").trim().split(":");
  if (partes.length < 2 || partes.length > 3) return null;
  const numeros = partes.map((p) => Number(p));
  if (numeros.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return numeros;
}

/**
 * Segundos de una DURACION ("HH:mm:ss", o "mm:ss" si vienen dos trozos).
 * Devuelve null si no se puede leer, para distinguirlo de una duracion cero.
 */
export function segundosDeTiempo(valor: unknown): number | null {
  const partes = trozos(valor);
  if (!partes) return null;
  const [a, b, c] = partes;
  return partes.length === 3 ? a * 3600 + b * 60 + c : a * 60 + b;
}

/**
 * Segundos desde medianoche de una HORA DEL DIA.
 *
 * Ojo con la diferencia respecto a una duracion: aqui dos trozos son "HH:mm",
 * no "mm:ss". El API mezcla las dos precisiones en la misma columna ("10:07"
 * junto a "09:34:51"), y leer "10:07" como diez minutos hacia que la ultima
 * salida del cliente saliera mal al consolidar.
 */
export function segundosDelDia(valor: unknown): number | null {
  const partes = trozos(valor);
  if (!partes) return null;
  const [h, m, s] = partes;
  return h * 3600 + m * 60 + (partes.length === 3 ? s : 0);
}

/** De vuelta a "HH:mm:ss", que es como el API entrega los tiempos. */
export function tiempoDeSegundos(total: number): string {
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = Math.floor(total % 60);
  return [horas, minutos, segundos].map((n) => String(n).padStart(2, "0")).join(":");
}

/**
 * Clave del consolidado: el mismo cliente, del mismo funcionario, el mismo dia.
 * No se agrupa solo por cliente porque el filtro admite rango de fechas y
 * varios funcionarios, y se mezclarian jornadas distintas en una fila.
 */
function claveConsolidado(v: MobVisitaGrupoDto) {
  const cliente = normalizarCodigo(v.rvis_cust) || normalizarCodigo(v.rctt_cust);
  return [
    normalizarCodigo(v.rvis_fecvis),
    normalizarCodigo(v.rvis_enter) || normalizarCodigo(v.rvis_codusu),
    cliente,
    normalizarCodigo(v.rctt_succli) || "0",
  ].join("|");
}

/**
 * Deja una fila por cliente.
 *
 * - `tiempoVis`: suma de las duraciones de cada visita al cliente. Es tiempo
 *   efectivamente dedicado, no el lapso entre la primera entrada y la ultima
 *   salida, que incluiria los huecos en que el funcionario no estuvo ahi.
 * - `rvis_horinivis` / `rvis_horfinvis`: primera entrada y ultima salida.
 * - `VisitasConsolidadas`: cuantos registros se fundieron, para poder decirlo
 *   en pantalla y que la fila no parezca una sola visita larga.
 *
 * Los movimientos NO se tocan aqui: se cruzan despues, ya por cliente.
 */
export function consolidarPorCliente(filas: MobVisitaGrupoDto[]): MobVisitaGrupoDto[] {
  const consolidadas = new Map<string, MobVisitaGrupoDto>();
  /** Suma aparte: si alguna duracion no se pudo leer, no se pisa el original. */
  const tiempos = new Map<string, { segundos: number; completo: boolean }>();

  for (const fila of filas) {
    const clave = claveConsolidado(fila);
    const segundos = segundosDeTiempo(fila.tiempoVis);
    const previa = consolidadas.get(clave);

    if (!previa) {
      consolidadas.set(clave, { ...fila, VisitasConsolidadas: 1 });
      tiempos.set(clave, { segundos: segundos ?? 0, completo: segundos !== null });
      continue;
    }

    previa.VisitasConsolidadas = (previa.VisitasConsolidadas ?? 1) + 1;

    const acumulado = tiempos.get(clave)!;
    acumulado.segundos += segundos ?? 0;
    acumulado.completo = acumulado.completo && segundos !== null;

    const inicioNuevo = segundosDelDia(fila.rvis_horinivis);
    const inicioPrevio = segundosDelDia(previa.rvis_horinivis);
    if (inicioNuevo !== null && (inicioPrevio === null || inicioNuevo < inicioPrevio)) {
      previa.rvis_horinivis = fila.rvis_horinivis;
    }

    const finNuevo = segundosDelDia(fila.rvis_horfinvis);
    const finPrevio = segundosDelDia(previa.rvis_horfinvis);
    if (finNuevo !== null && (finPrevio === null || finNuevo > finPrevio)) {
      previa.rvis_horfinvis = fila.rvis_horfinvis;
    }

    // Datos que pueden venir en una fila y faltar en otra (coordenadas de la
    // visita, direccion, ruta): se conserva el primero que llegue con valor.
    previa.rvis_latitud ||= fila.rvis_latitud;
    previa.rvis_longitud ||= fila.rvis_longitud;
    previa.rctt_latitud ||= fila.rctt_latitud;
    previa.rctt_longitud ||= fila.rctt_longitud;
    previa.rctt_addr ||= fila.rctt_addr;
    previa.rctt_ruta ||= fila.rctt_ruta;
    previa.rctt_sec ||= fila.rctt_sec;
  }

  for (const [clave, fila] of consolidadas) {
    const acumulado = tiempos.get(clave)!;
    // Con una sola visita se respeta el valor original del API tal cual.
    if ((fila.VisitasConsolidadas ?? 1) > 1 && acumulado.completo) {
      fila.tiempoVis = tiempoDeSegundos(acumulado.segundos);
    }
  }

  return [...consolidadas.values()];
}
