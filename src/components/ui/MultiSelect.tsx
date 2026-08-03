import { useEffect, useId, useMemo, useRef, useState } from "react";
import { IconCheck, IconChevronRight, IconSearch, IconX } from "../icons";
import styles from "./MultiSelect.module.css";

export interface OpcionMulti {
  valor: string;
  etiqueta: string;
}

interface MultiSelectProps {
  etiqueta: string;
  opciones: OpcionMulti[];
  seleccion: string[];
  onChange: (valores: string[]) => void;
  /** Texto cuando no hay nada elegido; el MVC interpretaba vacio como "todos". */
  vacioSignifica?: string;
  /** Deshabilita el control mientras se cargan las opciones. */
  cargando?: boolean;
}

/** Con listas muy largas solo se pintan las primeras coincidencias. */
const MAX_VISIBLES = 300;

/**
 * Reemplaza a los selects multiples con Choices.js de las vistas del MVC.
 *
 * Un `<select multiple>` nativo se renderiza como una lista siempre abierta y
 * obliga a Ctrl+clic; este control usa un desplegable con buscador y casillas.
 */
export function MultiSelect({
  etiqueta,
  opciones,
  seleccion,
  onChange,
  vacioSignifica = "Todos",
  cargando = false,
}: MultiSelectProps) {
  const id = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const buscadorRef = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Cerrar al hacer clic fuera o con Escape, como cualquier desplegable.
  useEffect(() => {
    if (!abierto) return;

    function alClicFuera(evento: MouseEvent) {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    }
    function alTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }

    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alTeclado);
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alTeclado);
    };
  }, [abierto]);

  useEffect(() => {
    if (abierto) buscadorRef.current?.focus();
    else setBusqueda("");
  }, [abierto]);

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return opciones;
    return opciones.filter((o) => o.etiqueta.toLowerCase().includes(termino));
  }, [opciones, busqueda]);

  const visibles = filtradas.slice(0, MAX_VISIBLES);
  const elegidas = useMemo(() => new Set(seleccion), [seleccion]);

  function alternar(valor: string) {
    onChange(elegidas.has(valor) ? seleccion.filter((v) => v !== valor) : [...seleccion, valor]);
  }

  /** "Todos" opera sobre lo que hay filtrado, que es lo que el usuario ve. */
  function seleccionarVisibles() {
    const nuevos = visibles.map((o) => o.valor).filter((v) => !elegidas.has(v));
    onChange([...seleccion, ...nuevos]);
  }

  const resumen = () => {
    if (seleccion.length === 0) return vacioSignifica;
    if (seleccion.length === 1) {
      return opciones.find((o) => o.valor === seleccion[0])?.etiqueta ?? "1 seleccionado";
    }
    return `${seleccion.length} seleccionados`;
  };

  return (
    <div className={styles.wrap} ref={contenedor}>
      {/* Un <label for> apuntando al boton se convertiria en su nombre
          accesible y ocultaria el resumen; por eso va como texto etiquetado. */}
      <span className={styles.label} id={`${id}-label`}>
        {etiqueta}
      </span>

      <button
        id={id}
        type="button"
        className={[styles.trigger, abierto ? styles.triggerAbierto : ""].join(" ")}
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        aria-labelledby={`${id}-label ${id}`}
        disabled={cargando}
      >
        <span className={seleccion.length ? styles.resumenActivo : styles.resumen}>
          {cargando ? "Cargando…" : resumen()}
        </span>
        <span className={styles.flecha} aria-hidden="true">
          <IconChevronRight />
        </span>
      </button>

      {seleccion.length > 0 ? (
        <button
          type="button"
          className={styles.limpiar}
          onClick={() => onChange([])}
          aria-label={`Limpiar ${etiqueta}`}
        >
          <IconX /> Limpiar
        </button>
      ) : null}

      {abierto ? (
        <div className={styles.panel} role="listbox" aria-multiselectable="true">
          <div className={styles.buscador}>
            <IconSearch />
            <input
              ref={buscadorRef}
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar…"
              aria-label={`Buscar en ${etiqueta}`}
            />
          </div>

          <div className={styles.opciones}>
            {visibles.length === 0 ? (
              <p className={styles.vacio}>Sin coincidencias.</p>
            ) : (
              visibles.map((opcion) => {
                const activa = elegidas.has(opcion.valor);
                return (
                  <button
                    key={opcion.valor}
                    type="button"
                    role="option"
                    aria-selected={activa}
                    className={[styles.opcion, activa ? styles.opcionActiva : ""].join(" ")}
                    onClick={() => alternar(opcion.valor)}
                  >
                    <span className={[styles.casilla, activa ? styles.casillaActiva : ""].join(" ")}>
                      {activa ? <IconCheck /> : null}
                    </span>
                    <span className={styles.texto}>{opcion.etiqueta}</span>
                  </button>
                );
              })
            )}
            {filtradas.length > MAX_VISIBLES ? (
              <p className={styles.vacio}>
                Mostrando {MAX_VISIBLES} de {filtradas.length}. Afina la búsqueda.
              </p>
            ) : null}
          </div>

          <div className={styles.pie}>
            <button type="button" onClick={seleccionarVisibles}>
              Seleccionar todos
            </button>
            <span className={styles.contador}>{seleccion.length} de {opciones.length}</span>
            <button type="button" onClick={() => onChange([])}>
              Ninguno
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
