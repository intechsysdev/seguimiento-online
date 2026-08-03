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
