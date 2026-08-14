/**
 * Cruce del detalle de visitas (un registro por movimiento) contra el listado
 * agrupado por cliente.
 *
 * Ninguno de los endpoints agrupados devuelve los movimientos: el MVC los
 * completaba pidiendo ademas el detalle y uniendo los `docvis_desc` por
 * cliente (RutasController). Lo usan Efectuadas y la tabla de Extrarutas.
 */
import type { MobVisitaDto } from "../types/eva";

export interface Movimientos {
  cantidad: number;
  /** Tipos de documento distintos generados en el cliente. */
  tipos: Set<string>;
}

/**
 * Los codigos del ERP salen de campos de ancho fijo del AS/400, asi que llegan
 * con espacios de relleno y no siempre iguales entre endpoints: sin normalizar,
 * "900123  " y "900123" no cruzan y la columna sale vacia.
 */
export function normalizarCodigo(valor: unknown) {
  return String(valor ?? "").trim();
}

/** La sucursal vacia y la "0" son la misma: el cliente sin sucursales. */
function normalizarSucursal(valor: unknown) {
  const limpio = normalizarCodigo(valor);
  return limpio === "" ? "0" : limpio;
}

function acumular(mapa: Map<string, Movimientos>, clave: string, fila: MobVisitaDto) {
  const acumulado = mapa.get(clave) ?? { cantidad: 0, tipos: new Set<string>() };
  // Cuenta todos los movimientos: uno sin documento sigue siendo un
  // movimiento, aunque no aporte nada a la lista de tipos.
  acumulado.cantidad += 1;
  if (fila.docvis_desc) acumulado.tipos.add(fila.docvis_desc);
  mapa.set(clave, acumulado);
}

/**
 * Indexa el detalle y devuelve el buscador para cruzarlo con el agrupado.
 *
 * Se indexa por cliente+sucursal y ademas solo por cliente. El respaldo hace
 * falta porque los dos endpoints no siempre traen la sucursal igual (el
 * agrupado la deja vacia en varias filas): sin el, el cruce no encuentra nada
 * y la columna sale en blanco.
 */
export function indexarMovimientos(detalle: MobVisitaDto[] | null | undefined) {
  const porClienteSucursal = new Map<string, Movimientos>();
  const porCliente = new Map<string, Movimientos>();

  (detalle ?? []).forEach((d) => {
    const cliente = normalizarCodigo(d.rctt_cust);
    // Sin codigo de cliente no hay fila del agrupado a la que asociarlo, y
    // todas esas filas colisionarian bajo la misma clave vacia.
    if (!cliente) return;
    acumular(porClienteSucursal, `${cliente}|${normalizarSucursal(d.rctt_succli)}`, d);
    acumular(porCliente, cliente, d);
  });

  return function buscar(cust: unknown, succli: unknown): Movimientos | undefined {
    const cliente = normalizarCodigo(cust);
    if (!cliente) return undefined;
    return (
      porClienteSucursal.get(`${cliente}|${normalizarSucursal(succli)}`) ??
      porCliente.get(cliente)
    );
  };
}
