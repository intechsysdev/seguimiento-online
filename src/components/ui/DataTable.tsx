import { useMemo, useState, type ReactNode } from "react";
import { IconSearch } from "../icons";
import { Spinner } from "./Spinner";
import { Alert } from "./Alert";
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
}: DataTableProps<T>) {
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);
  const [orden, setOrden] = useState<{ indice: number; asc: boolean } | null>(null);

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

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const visibles = filtradas.slice(paginaActual * porPagina, (paginaActual + 1) * porPagina);

  function alternarOrden(indice: number) {
    if (!columnas[indice]?.valor) return;
    setOrden((previo) =>
      previo?.indice === indice ? { indice, asc: !previo.asc } : { indice, asc: true },
    );
  }

  return (
    <div className={styles.wrap}>
      {(buscador || acciones) && (
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
          {acciones ? <div className={styles.acciones}>{acciones}</div> : null}
        </div>
      )}

      {error ? <Alert tone="critical">{error}</Alert> : null}

      {cargando ? (
        <Spinner mensaje="Cargando…" />
      ) : visibles.length === 0 ? (
        <p className={styles.vacio}>{error ? "No se pudieron cargar los datos." : vacio}</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                {columnas.map((columna, indice) => (
                  <th
                    key={columna.titulo}
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
                  {columnas.map((columna) => (
                    <td
                      key={columna.titulo}
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

function alinear(alineacion?: Columna<unknown>["alineacion"]) {
  if (alineacion === "derecha") return "right";
  if (alineacion === "centro") return "center";
  return "left";
}
