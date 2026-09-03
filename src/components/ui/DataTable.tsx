import { useMemo, useState, type ReactNode } from "react";
import { IconSearch } from "../icons";
import { Spinner } from "./Spinner";
import { Alert } from "./Alert";
import { copiarTabla, exportarCsv, exportarExcel } from "../../utils/exportar";
import styles from "./DataTable.module.css";

export interface Columna<T> {
  /** Titulo de la cabecera. */
  titulo: string;
  /** Contenido de la celda. */
  render: (fila: T) => ReactNode;
  /** Texto plano usado para buscar y ordenar; si falta, la columna no ordena. */
  valor?: (fila: T) => string | number;
  ancho?: string;
  alineacion?: "izquierda" | "derecha" | "centro";
  /**
   * Ancla la columna a un borde: con scroll horizontal el resto de la tabla
   * pasa por debajo y la columna sigue a la vista. Pensada para la columna de
   * acciones, que si no obliga a desplazarse por cada fila.
   */
  fija?: "izquierda" | "derecha";
}

interface DataTableProps<T> {
  columnas: Columna<T>[];
  filas: T[] | undefined;
  claveFila: (fila: T) => string;
  cargando?: boolean;
  error?: string | null;
  /** Texto del estado vacio. */
  vacio?: string;
  buscador?: boolean;
  porPagina?: number;
  acciones?: ReactNode;
  /**
   * Nombre base del archivo. Al indicarlo se muestran los botones de copiar,
   * CSV y Excel, equivalentes a los de DataTables en el MVC.
   */
  exportar?: string;
  /**
   * Claves marcadas (las de `claveFila`). Al pasarla junto con `onSeleccion`
   * aparece la columna de casillas, anclada a la izquierda para que siga a la
   * vista con scroll horizontal.
   */
  seleccion?: string[];
  onSeleccion?: (claves: string[]) => void;
}

/** Reemplaza a jquery.dataTables, que el MVC inicializaba en cada vista. */
export function DataTable<T>({
  columnas,
  filas,
  claveFila,
  cargando = false,
  error = null,
  vacio = "No hay registros para mostrar.",
  buscador = true,
  porPagina = 15,
  acciones,
  exportar,
  seleccion,
  onSeleccion,
}: DataTableProps<T>) {
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const [orden, setOrden] = useState<{ indice: number; asc: boolean } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const filtradas = useMemo(() => {
    const base = filas ?? [];
    const termino = busqueda.trim().toLowerCase();

    const conFiltro = termino
      ? base.filter((fila) =>
          columnas.some((columna) =>
            String(columna.valor?.(fila) ?? "").toLowerCase().includes(termino),
          ),
        )
      : base;

    if (!orden) return conFiltro;

    const columna = columnas[orden.indice];
    if (!columna?.valor) return conFiltro;

    return [...conFiltro].sort((a, b) => {
      const va = columna.valor!(a);
      const vb = columna.valor!(b);
      const comparacion =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "es", { numeric: true });
      return orden.asc ? comparacion : -comparacion;
    });
  }, [filas, columnas, busqueda, orden]);

  const seleccionable = Boolean(seleccion && onSeleccion);
  const marcadas = useMemo(() => new Set(seleccion ?? []), [seleccion]);

  /*
    La casilla de la cabecera actua sobre todo lo filtrado y no sobre la pagina
    visible: filtrar es la forma de acotar, y marcar pagina por pagina obligaria
    a recorrer el paginador entero.
  */
  const clavesFiltradas = useMemo(() => filtradas.map(claveFila), [filtradas, claveFila]);
  const marcadasEnFiltro = clavesFiltradas.filter((clave) => marcadas.has(clave)).length;
  const todasMarcadas = clavesFiltradas.length > 0 && marcadasEnFiltro === clavesFiltradas.length;

  function alternarFila(clave: string) {
    if (!onSeleccion) return;
    const proxima = new Set(marcadas);
    if (proxima.has(clave)) proxima.delete(clave);
    else proxima.add(clave);
    onSeleccion([...proxima]);
  }

  function alternarTodas() {
    if (!onSeleccion) return;
    // Lo marcado fuera del filtro se conserva: asi se puede ir sumando de a
    // grupos, cambiando el filtro entre uno y otro.
    const proxima = new Set(marcadas);
    clavesFiltradas.forEach((clave) =>
      todasMarcadas ? proxima.delete(clave) : proxima.add(clave),
    );
    onSeleccion([...proxima]);
  }

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const visibles = filtradas.slice(paginaActual * porPagina, (paginaActual + 1) * porPagina);

  /**
   * Se exportan las filas ya filtradas y ordenadas (lo que ve el usuario), y
   * solo las columnas con `valor`: las de acciones no tienen contenido util.
   */
  function datosExport() {
    const exportables = columnas.filter((c) => c.valor);
    return {
      encabezados: exportables.map((c) => c.titulo),
      filas: filtradas.map((fila) => exportables.map((c) => String(c.valor!(fila) ?? ""))),
    };
  }

  async function copiar() {
    try {
      await copiarTabla(datosExport());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  function alternarOrden(indice: number) {
    if (!columnas[indice]?.valor) return;
    setOrden((previo) =>
      previo?.indice === indice ? { indice, asc: !previo.asc } : { indice, asc: true },
    );
  }

  return (
    <div className={styles.wrap}>
      {(buscador || acciones || exportar) && (
        <div className={styles.barra}>
          {buscador && (
            <label className={styles.buscador}>
              <IconSearch />
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => {
                  setBusqueda(evento.target.value);
                  setPagina(0);
                }}
                placeholder="Buscar…"
                aria-label="Buscar en la tabla"
              />
            </label>
          )}
          <div className={styles.acciones}>
            {exportar && filtradas.length > 0 ? (
              <div className={styles.exportar}>
                <button type="button" onClick={copiar}>
                  {copiado ? "Copiado" : "Copiar"}
                </button>
                <button type="button" onClick={() => exportarCsv(datosExport(), exportar)}>
                  CSV
                </button>
                <button type="button" onClick={() => exportarExcel(datosExport(), exportar)}>
                  Excel
                </button>
              </div>
            ) : null}
            {acciones}
          </div>
        </div>
      )}

      {error ? <Alert tone="critical">{error}</Alert> : null}

      {cargando ? (
        <Spinner mensaje="Cargando…" />
      ) : visibles.length === 0 ? (
        <p className={styles.vacio}>{error ? "No se pudieron cargar los datos." : vacio}</p>
      ) : (
        <div className={styles.scroll}>
          <table
            className={[styles.tabla, seleccionable ? styles.conSeleccion : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <thead>
              <tr>
                {seleccionable ? (
                  <th className={styles.seleccion}>
                    <input
                      type="checkbox"
                      checked={todasMarcadas}
                      // Marcado parcial: hay filas elegidas pero no todas.
                      ref={(casilla) => {
                        if (casilla) casilla.indeterminate = marcadasEnFiltro > 0 && !todasMarcadas;
                      }}
                      onChange={alternarTodas}
                      aria-label="Seleccionar todas las filas del filtro"
                      title="Seleccionar todas las filas del filtro"
                    />
                  </th>
                ) : null}
                {columnas.map((columna, indice) => (
                  <th
                    key={columna.titulo}
                    className={claseFija(columna.fija)}
                    style={{ width: columna.ancho, textAlign: alinear(columna.alineacion) }}
                    aria-sort={
                      orden?.indice === indice ? (orden.asc ? "ascending" : "descending") : undefined
                    }
                  >
                    {columna.valor ? (
                      <button
                        type="button"
                        className={styles.thBtn}
                        onClick={() => alternarOrden(indice)}
                      >
                        {columna.titulo}
                        <span className={styles.flecha}>
                          {orden?.indice === indice ? (orden.asc ? "▲" : "▼") : ""}
                        </span>
                      </button>
                    ) : (
                      columna.titulo
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map((fila) => (
                <tr key={claveFila(fila)}>
                  {seleccionable ? (
                    <td className={styles.seleccion}>
                      <input
                        type="checkbox"
                        checked={marcadas.has(claveFila(fila))}
                        onChange={() => alternarFila(claveFila(fila))}
                        aria-label="Seleccionar la fila"
                      />
                    </td>
                  ) : null}
                  {columnas.map((columna) => (
                    <td
                      key={columna.titulo}
                      className={claseFija(columna.fija)}
                      style={{ textAlign: alinear(columna.alineacion) }}
                    >
                      {columna.render(fila)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPaginas > 1 && !cargando ? (
        <div className={styles.paginador}>
          <button
            type="button"
            onClick={() => setPagina(paginaActual - 1)}
            disabled={paginaActual === 0}
          >
            Anterior
          </button>
          <span>
            Página {paginaActual + 1} de {totalPaginas} · {filtradas.length} registros
          </span>
          <button
            type="button"
            onClick={() => setPagina(paginaActual + 1)}
            disabled={paginaActual >= totalPaginas - 1}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}

function claseFija(fija?: Columna<unknown>["fija"]) {
  if (!fija) return undefined;
  return [styles.fija, fija === "izquierda" ? styles.fijaIzquierda : styles.fijaDerecha].join(" ");
}

function alinear(alineacion?: Columna<unknown>["alineacion"]) {
  if (alineacion === "derecha") return "right";
  if (alineacion === "centro") return "center";
  return "left";
}
