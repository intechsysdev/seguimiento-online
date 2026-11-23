import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { IconAlert, IconChat, IconExpand, IconPlus, IconSend, IconStop, IconX } from "../icons";
import { useApi } from "../../hooks/useApi";
import { asistenteService, type EstadoAsistente } from "../../services/asistenteService";
import { useAuth } from "../../store/AuthContext";
import { Markdown } from "./Markdown";
import styles from "./Asistente.module.css";

interface Mensaje {
  id: number;
  rol: "user" | "assistant";
  contenido: string;
  /** La respuesta terminó pero quedó incompleta (o el usuario la detuvo). */
  aviso?: string;
  /** La respuesta falló; no se reenvía como parte de la conversación. */
  error?: string;
}

/** Lo que se muestra mientras el asistente consulta cada herramienta de EVA. */
const ACTIVIDAD: Record<string, string> = {
  eva_listar_vendedores: "Buscando vendedores",
  eva_listar_regiones_territorios: "Consultando regiones y territorios",
  eva_buscar_clientes: "Buscando clientes",
  eva_obtener_cliente: "Consultando el cliente",
  eva_consultar_cartera: "Consultando cartera",
  eva_listar_pagos: "Consultando pagos",
  eva_ultimos_pedidos_cliente: "Consultando pedidos",
  eva_obtener_pedido: "Consultando el pedido",
  eva_buscar_productos: "Buscando productos",
  eva_consultar_inventario: "Consultando inventario",
  eva_resumen_visitas: "Consultando visitas",
  eva_listar_visitas: "Consultando visitas",
  eva_tablero_indicadores: "Consultando indicadores",
};

const SUGERENCIAS = [
  "Resumen de visitas de ayer por vendedor",
  "Cartera vencida de un vendedor",
  "Inventario de un producto",
  "Indicadores de este mes de un vendedor",
];

const NO_CONFIGURADO: EstadoAsistente = { Disponible: false };

/**
 * Chat flotante del asistente. Vive en el AppShell, así queda disponible en
 * todas las pantallas; el AppShell lo remonta al cambiar de compañía para que
 * una conversación nunca mezcle datos de dos compañías.
 */
export function Asistente() {
  const { session, tenant } = useAuth();
  const compania = tenant?.IDCompanyTenant;

  const estado = useApi(
    () => (compania ? asistenteService.estado(compania) : Promise.resolve(NO_CONFIGURADO)),
    [compania],
  );

  const [abierto, setAbierto] = useState(false);
  const [amplio, setAmplio] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [entrada, setEntrada] = useState("");
  const [enCurso, setEnCurso] = useState(false);
  const [actividad, setActividad] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState("");

  const siguienteId = useRef(1);
  const control = useRef<AbortController | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const lanzador = useRef<HTMLButtonElement>(null);
  /** Si el usuario subió a leer algo, no se le arrastra al final con cada trozo nuevo. */
  const pegadoAlFinal = useRef(true);
  const estabaAbierto = useRef(false);

  // Una respuesta en curso no debe seguir llegando a un componente desmontado.
  useEffect(() => () => control.current?.abort(), []);

  useEffect(() => {
    if (abierto) campo.current?.focus();
    else if (estabaAbierto.current) lanzador.current?.focus();
    estabaAbierto.current = abierto;
  }, [abierto]);

  useEffect(() => {
    const caja = lista.current;
    if (caja && pegadoAlFinal.current) caja.scrollTop = caja.scrollHeight;
  }, [mensajes, actividad, abierto]);

  const enviar = useCallback(
    async (texto: string, previos: Mensaje[]) => {
      const pregunta = texto.trim();
      if (!pregunta || !compania || control.current) return;

      const delUsuario: Mensaje = { id: siguienteId.current++, rol: "user", contenido: pregunta };
      const respuesta: Mensaje = { id: siguienteId.current++, rol: "assistant", contenido: "" };
      const conversacion = [...previos.filter((m) => !m.error && m.contenido), delUsuario];

      const cambiarRespuesta = (cambio: (m: Mensaje) => Mensaje) =>
        setMensajes((actuales) => actuales.map((m) => (m.id === respuesta.id ? cambio(m) : m)));

      const abortar = new AbortController();
      control.current = abortar;
      pegadoAlFinal.current = true;
      setMensajes([...previos, delUsuario, respuesta]);
      setEntrada("");
      setEnCurso(true);
      setActividad("Pensando");
      setAnuncio("");

      try {
        await asistenteService.preguntar(
          compania,
          conversacion.map(({ rol, contenido }) => ({ rol, contenido })),
          {
            alTexto: (trozo) => {
              setActividad(null);
              cambiarRespuesta((m) => ({ ...m, contenido: m.contenido + trozo }));
            },
            alConsultar: (herramienta) => setActividad(ACTIVIDAD[herramienta] ?? "Consultando EVA"),
            alAviso: (aviso) => cambiarRespuesta((m) => ({ ...m, aviso })),
          },
          abortar.signal,
        );
        setAnuncio("Respuesta lista.");
      } catch (error) {
        if (abortar.signal.aborted) {
          cambiarRespuesta((m) => ({ ...m, aviso: "Respuesta detenida." }));
        } else {
          const motivo = error instanceof Error ? error.message : "No se pudo obtener la respuesta.";
          cambiarRespuesta((m) => ({ ...m, error: motivo }));
          setAnuncio(motivo);
        }
      } finally {
        control.current = null;
        setEnCurso(false);
        setActividad(null);
      }
    },
    [compania],
  );

  function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    void enviar(entrada, mensajes);
  }

  function alTeclear(evento: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envía; Shift+Enter hace salto de línea. isComposing: no cortar un acento a medias.
    if (evento.key === "Enter" && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault();
      void enviar(entrada, mensajes);
    }
  }

  /** Repite la última pregunta, quitando la respuesta que falló. */
  function reintentar() {
    const indice = mensajes.map((m) => m.rol).lastIndexOf("user");
    if (indice < 0) return;
    void enviar(mensajes[indice].contenido, mensajes.slice(0, indice));
  }

  function nuevaConversacion() {
    control.current?.abort();
    setMensajes([]);
    setAnuncio("");
    campo.current?.focus();
  }

  const disponible = estado.datos?.Disponible === true;

  // Sin configuración el chat solo lo ve un administrador, con el motivo, para que sepa qué falta.
  if (!session || !compania || estado.cargando) return null;
  if (!disponible && !session.isAdmin) return null;

  const motivo =
    estado.datos?.Motivo ?? (estado.error ? "No se pudo consultar el estado del asistente." : "El asistente no está configurado para esta compañía.");
  const ultimo = mensajes[mensajes.length - 1];

  return (
    <>
      <button
        ref={lanzador}
        type="button"
        className={styles.lanzador}
        hidden={abierto}
        onClick={() => setAbierto(true)}
        aria-label="Abrir el asistente"
        aria-haspopup="dialog"
      >
        <IconChat width={24} height={24} />
      </button>

      {abierto ? (
        <section
          className={[styles.panel, amplio ? styles.amplio : ""].join(" ")}
          role="dialog"
          aria-label="Asistente de EVA"
          onKeyDown={(evento) => {
            if (evento.key === "Escape") setAbierto(false);
          }}
        >
          <header className={styles.cabecera}>
            <div className={styles.titulos}>
              <h2 className={styles.titulo}>Asistente</h2>
              <p className={styles.subtitulo}>{tenant?.NameCompanyTenant}</p>
            </div>
            <button
              type="button"
              className={styles.accion}
              onClick={nuevaConversacion}
              disabled={mensajes.length === 0}
              aria-label="Nueva conversación"
              title="Nueva conversación"
            >
              <IconPlus />
            </button>
            <button
              type="button"
              className={[styles.accion, styles.accionAmpliar].join(" ")}
              onClick={() => setAmplio((valor) => !valor)}
              aria-pressed={amplio}
              aria-label="Ampliar el chat"
              title={amplio ? "Reducir" : "Ampliar"}
            >
              <IconExpand />
            </button>
            <button
              type="button"
              className={styles.accion}
              onClick={() => setAbierto(false)}
              aria-label="Cerrar el asistente"
              title="Cerrar"
            >
              <IconX />
            </button>
          </header>

          <div
            ref={lista}
            className={styles.mensajes}
            onScroll={(evento) => {
              const caja = evento.currentTarget;
              pegadoAlFinal.current = caja.scrollHeight - caja.scrollTop - caja.clientHeight < 80;
            }}
          >
            {!disponible ? (
              <div className={styles.noDisponible}>
                <IconAlert />
                <p>{motivo}</p>
              </div>
            ) : mensajes.length === 0 ? (
              <div className={styles.vacio}>
                <p className={styles.saludo}>
                  Pregunta por vendedores, clientes, cartera, pedidos, inventario, visitas o indicadores de{" "}
                  {tenant?.NameCompanyTenant}.
                </p>
                <ul className={styles.sugerencias}>
                  {SUGERENCIAS.map((sugerencia) => (
                    <li key={sugerencia}>
                      <button type="button" onClick={() => void enviar(sugerencia, [])}>
                        {sugerencia}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              mensajes.map((mensaje) =>
                mensaje.rol === "user" ? (
                  <div key={mensaje.id} className={styles.delUsuario}>
                    <p>{mensaje.contenido}</p>
                  </div>
                ) : mensaje.contenido || mensaje.aviso || mensaje.error ? (
                  <div key={mensaje.id} className={styles.delAsistente}>
                    {mensaje.contenido ? <Markdown texto={mensaje.contenido} /> : null}
                    {mensaje.aviso ? <p className={styles.aviso}>{mensaje.aviso}</p> : null}
                    {mensaje.error ? (
                      <div className={styles.error} role="alert">
                        <p>{mensaje.error}</p>
                        {mensaje === ultimo && !enCurso ? (
                          <button type="button" onClick={reintentar}>
                            Reintentar
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null,
              )
            )}

            {actividad ? (
              <p className={styles.actividad}>
                <span className={styles.puntos} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                {actividad}…
              </p>
            ) : null}
          </div>

          <form className={styles.redactar} onSubmit={alEnviar}>
            <label htmlFor="asistente-pregunta" className={styles.soloLector}>
              Escribe tu pregunta
            </label>
            <textarea
              id="asistente-pregunta"
              ref={campo}
              className={styles.campo}
              value={entrada}
              onChange={(evento) => setEntrada(evento.target.value)}
              onKeyDown={alTeclear}
              placeholder={disponible ? "Escribe tu pregunta…" : "Asistente no disponible"}
              rows={2}
              maxLength={4000}
              disabled={!disponible}
            />
            {enCurso ? (
              <button
                type="button"
                className={styles.enviar}
                onClick={() => control.current?.abort()}
                aria-label="Detener la respuesta"
                title="Detener"
              >
                <IconStop />
              </button>
            ) : (
              <button
                type="submit"
                className={styles.enviar}
                disabled={!disponible || entrada.trim() === ""}
                aria-label="Enviar la pregunta"
                title="Enviar"
              >
                <IconSend />
              </button>
            )}
          </form>

          <p className={styles.pie}>Respuestas generadas por IA con datos de EVA. Verifica las cifras importantes.</p>

          {/* El texto llega por trozos: al lector de pantalla solo se le avisa cuando termina. */}
          <span className={styles.soloLector} role="status">
            {anuncio}
          </span>
        </section>
      ) : null}
    </>
  );
}
