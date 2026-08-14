export function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function formatDate(value: string) {
  return parseDate(value).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

export function estadoVigencia(fechaInicio: string, fechaFin: string, activa: boolean): "vigente" | "por-vencer" | "no-vigente" | "programada" {
  if (!activa) return "no-vigente";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicio = parseDate(fechaInicio);
  const fin = parseDate(fechaFin);
  if (hoy < inicio) return "programada";
  if (hoy > fin) return "no-vigente";
  const diasRestantes = Math.ceil((fin.getTime() - hoy.getTime()) / 86400000);
  return diasRestantes <= 5 ? "por-vencer" : "vigente";
}

export function progresoVigencia(fechaInicio: string, fechaFin: string) {
  const hoy = new Date().getTime();
  const inicio = parseDate(fechaInicio).getTime();
  const fin = parseDate(fechaFin).getTime();
  if (hoy <= inicio) return 0;
  if (hoy >= fin) return 100;
  return Math.round(((hoy - inicio) / (fin - inicio)) * 100);
}

export function diasRestantes(fechaFin: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = parseDate(fechaFin);
  return Math.ceil((fin.getTime() - hoy.getTime()) / 86400000);
}

/** yyyy-MM-dd de hoy, para inicializar los filtros de fecha. */
export function hoyISO() {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/**
 * El MVC mandaba FecIni a medianoche y FecFin a las 23:59:59 para que el rango
 * incluyera el ultimo dia completo.
 */
export function rangoDelDia(fechaISO: string, fin = false) {
  return `${fechaISO}T${fin ? "23:59:59" : "00:00:00"}`;
}

/** Formatea una fecha-hora que llega del API .NET. */
export function formatDateTime(valor: string) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** MM-dd-yyyy, el formato que esperan los filtros del API por compañía. */
export function aFormatoApi(fechaISO: string) {
  const [anio, mes, dia] = fechaISO.split("-");
  return `${mes}-${dia}-${anio}`;
}

/**
 * El API por compañía devuelve las fechas de visita en el mismo orden en que
 * las recibe: MM/dd/yyyy (ver `aFormatoApi`). Mostrarlas crudas las dejaba como
 * "08/13/2026" en una interfaz que en todo lo demas usa dd/MM, y con dia <= 12
 * la fecha se lee mal sin que nada lo delate.
 *
 * Si el valor no encaja en el patron se devuelve tal cual: es preferible el
 * dato crudo a inventar una fecha.
 */
function partesFechaVisita(valor: unknown) {
  const texto = String(valor ?? "").trim();
  const partes = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!partes) return null;
  const [, mes, dia, anio] = partes;
  // Un "mes" mayor que 12 solo puede ser un dia: ya viene en dd/MM, no se toca.
  if (Number(mes) > 12) return null;
  return { dia: dia.padStart(2, "0"), mes: mes.padStart(2, "0"), anio };
}

/** dd/MM/yyyy para mostrar. */
export function formatFechaVisita(valor: unknown) {
  const partes = partesFechaVisita(valor);
  if (!partes) return String(valor ?? "").trim();
  return `${partes.dia}/${partes.mes}/${partes.anio}`;
}

/** yyyy-MM-dd: clave para ordenar y buscar, que dd/MM no ordena bien. */
export function ordenFechaVisita(valor: unknown) {
  const partes = partesFechaVisita(valor);
  if (!partes) return String(valor ?? "").trim();
  return `${partes.anio}-${partes.mes}-${partes.dia}`;
}
