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
