import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { MultiSelect } from "../../components/ui/MultiSelect";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Spinner } from "../../components/ui/Spinner";
import { Mapa, type MarcadorMapa, type Trazado } from "../../components/mapa/Mapa";
import { IconoPunto } from "../../components/mapa/IconoPunto";
import { colorEstado } from "../../components/mapa/tiposPunto";
import { useGoogleMapsKey } from "../../hooks/useAppConfig";
import { useDashboard } from "./useDashboard";
import { esCoordenada } from "../../utils/geo";
import { formatDateTime, hoyISO } from "../../utils/dates";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";
import estilos from "./Dashboard.module.css";

/** Minutos desde la ultima conexion del equipo. */
function minutosDesde(iso: string) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

/**
 * Tablero de campo que se muestra al ingresar.
 *
 * Todos los indicadores se calculan cruzando la ruta planificada del dia con
 * las visitas efectuadas y el estado de los equipos en MobiControl; no hay
 * datos de ejemplo. Ver useDashboard.ts.
 */
export function DashboardPage() {
  const [fecha, setFecha] = useState(hoyISO());
  const [borradorFuncionarios, setBorradorFuncionarios] = useState<string[]>([]);
  const [funcionarios, setFuncionarios] = useState<string[]>([]);

  const { resumen, cobertura, usuarios, cargando, error, tenant } = useDashboard(
    fecha,
    funcionarios,
  );
  const google = useGoogleMapsKey();

  const marcadores: MarcadorMapa[] = useMemo(() => {
    const lista: MarcadorMapa[] = [];

    // Clientes de la ruta: verde si se visitaron, rojo si quedaron pendientes.
    const visitados = new Set(resumen.visitas.map((v) => `${v.rvis_cust}|${v.rctt_succli}`));
    resumen.rutas
      .filter((r) => esCoordenada(r.rctt_latitud, r.rctt_longitud))
      .forEach((r) =>
        lista.push({
          id: `plan-${r.rruta_cus}-${r.rruta_succli}`,
          tipo: "cliente",
          lat: Number(r.rctt_latitud),
          lng: Number(r.rctt_longitud),
          titulo: r.rctt_nomcli || r.rctt_razsoc,
          color: visitados.has(`${r.rruta_cus}|${r.rruta_succli}`) ? "verde" : "rojo",
          detalle: `<strong>${r.rctt_nomcli || r.rctt_razsoc}</strong><br/>${r.rusu_nombre ?? ""}`,
        }),
      );

    resumen.extrarutas
      .filter((v) => esCoordenada(v.rvis_latitud, v.rvis_longitud))
      .forEach((v, i) =>
        lista.push({
          id: `extra-${v.rvis_cust}-${i}`,
          tipo: "extraruta",
          lat: Number(v.rvis_latitud),
          lng: Number(v.rvis_longitud),
          titulo: `Extraruta · ${v.rctt_nomcli || v.rctt_razsoc}`,
          color: "morado",
          detalle: `<strong>Extraruta</strong><br/>${v.rctt_nomcli || v.rctt_razsoc}<br/>${v.rusu_nombre ?? ""}`,
        }),
      );

    // Última posición conocida de cada equipo.
    resumen.porFuncionario
      .filter((f) => f.lat && f.lng)
      .forEach((f) =>
        lista.push({
          id: `disp-${f.codusu}`,
          tipo: "dispositivo",
          lat: f.lat!,
          lng: f.lng!,
          titulo: `${f.nombre} (${f.codusu})`,
          color: colorEstado(f.enLinea),
          detalle: `<strong>${f.nombre}</strong><br/>${f.enLinea ? "En línea" : "Desconectado"}`,
        }),
      );

    return lista;
  }, [resumen]);

  const trazados: Trazado[] = useMemo(() => {
    const plan = resumen.rutas
      .filter((r) => esCoordenada(r.rctt_latitud, r.rctt_longitud))
      .map((r) => ({ lat: Number(r.rctt_latitud), lng: Number(r.rctt_longitud) }));
    return plan.length >= 2 ? [{ puntos: plan, color: "orange", grosor: 3 }] : [];
  }, [resumen.rutas]);

  const maxProgramadas = Math.max(1, ...resumen.porFuncionario.map((f) => f.programadas));

  return (
    <>
      <PageHeader
        eyebrow={tenant?.NameCompanyTenant}
        title="Efectividad de visitas — campo"
        description="Resumen del día cruzando la ruta planificada con lo efectivamente visitado."
        actions={<Badge tone="accent">{fecha.split("-").reverse().join("/")}</Badge>}
      />

      {error ? <Alert tone="warning">{error}</Alert> : null}

      {/* Filtros globales del tablero. */}
      <div className={formularios.filtros}>
        <Field label="Fecha" htmlFor="fecha">
          <input
            id="fecha"
            type="date"
            className={inputs.input}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </Field>

        <MultiSelect
          etiqueta="Funcionarios"
          opciones={usuarios.map((u) => ({
            valor: u.KEY_rusu_codusu,
            etiqueta: `${u.KEY_rusu_codusu} — ${u.rusu_nombre}`,
          }))}
          seleccion={borradorFuncionarios}
          onChange={setBorradorFuncionarios}
          vacioSignifica="Asignados"
        />

        <div className={formularios.accionesFila}>
          <Button
            variant="ghost"
            onClick={() => {
              setBorradorFuncionarios([]);
              setFuncionarios([]);
              setFecha(hoyISO());
            }}
          >
            Limpiar
          </Button>
          <Button variant="primary" onClick={() => setFuncionarios(borradorFuncionarios)}>
            Aplicar
          </Button>
        </div>
      </div>

      {cargando ? (
        <Spinner mensaje="Calculando indicadores del día…" />
      ) : (
        <>
          {/* KPIs de cabecera */}
          <div className={estilos.kpis}>
            <div className={[estilos.kpi, estilos.kpiDestacado].join(" ")}>
              <span className={estilos.kpiTitulo}>Efectividad</span>
              <strong className={estilos.kpiValor}>{resumen.efectividad}%</strong>
              <span className={estilos.kpiPie}>
                {resumen.realizadas} de {resumen.programadas}
              </span>
            </div>

            <div className={estilos.kpi}>
              <span className={estilos.kpiTitulo}>Visitas programadas</span>
              <strong className={estilos.kpiValor}>{resumen.programadas}</strong>
              <span className={estilos.kpiPie}>{resumen.pendientes} pendientes</span>
            </div>

            <div className={estilos.kpi}>
              <span className={estilos.kpiTitulo}>Funcionarios en campo</span>
              <strong className={estilos.kpiValor}>
                {resumen.enCampo} / {resumen.totalFuncionarios}
              </strong>
              <span className={estilos.kpiPie}>{resumen.inactivos} desconectados</span>
            </div>

            <div className={[estilos.kpi, estilos.kpiAviso].join(" ")}>
              <span className={estilos.kpiTitulo}>Extrarutas</span>
              <strong className={estilos.kpiValor}>{resumen.extrarutas.length}</strong>
              <span className={estilos.kpiPie}>{resumen.porcentajeExtrarutas}% de visitas</span>
            </div>

            <div className={estilos.kpi}>
              <span className={estilos.kpiTitulo}>Visitas realizadas</span>
              <strong className={estilos.kpiValor}>
                {resumen.realizadas + resumen.extrarutas.length}
              </strong>
              <span className={estilos.kpiPie}>incluye extrarutas</span>
            </div>
          </div>

          <div className={estilos.grid}>
            {/* Mapa */}
            <section className={estilos.panel}>
              <header className={estilos.panelHead}>
                <h3>Mapa de geolocalización</h3>
                <span className={estilos.leyenda}>
                  <IconoPunto tipo="cliente" color="verde" /> visitado
                  <IconoPunto tipo="cliente" color="rojo" /> pendiente
                  <IconoPunto tipo="extraruta" color="morado" /> extraruta
                  <IconoPunto tipo="dispositivo" color="azul" /> dispositivo
                </span>
              </header>
              {google.apiKey && marcadores.length ? (
                <Mapa
                  apiKey={google.apiKey}
                  marcadores={marcadores}
                  trazados={trazados}
                  altura="22rem"
                />
              ) : (
                <p className={estilos.vacio}>
                  {google.apiKey
                    ? "No hay puntos con coordenadas para la fecha seleccionada."
                    : "No se pudo leer la API key de Google Maps."}
                </p>
              )}
            </section>

            {/* Funcionarios en campo */}
            <section className={estilos.panel}>
              <header className={estilos.panelHead}>
                <h3>Funcionarios en campo</h3>
                <Link to="/ubicaciones" className={estilos.enlace}>
                  Ver mapa
                </Link>
              </header>
              {resumen.porFuncionario.length === 0 ? (
                <p className={estilos.vacio}>Sin funcionarios para los filtros seleccionados.</p>
              ) : (
                <ul className={estilos.lista}>
                  {resumen.porFuncionario.map((f) => {
                    const minutos = minutosDesde(f.ultimaConexion);
                    return (
                      <li key={f.codusu}>
                        <span className={estilos.listaNombre}>
                          {f.nombre}
                          <span className={estilos.listaCodigo}>{f.codusu}</span>
                        </span>
                        {f.enLinea === null ? (
                          <span className={estilos.estadoNeutro}>sin equipo</span>
                        ) : f.enLinea ? (
                          <span className={estilos.estadoActivo}>en línea</span>
                        ) : (
                          <span className={estilos.estadoInactivo}>
                            {minutos !== null ? `inactivo ${minutos} min` : "desconectado"}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Efectividad por funcionario */}
            <section className={estilos.panel}>
              <header className={estilos.panelHead}>
                <h3>Efectividad por funcionario</h3>
                <span className={estilos.leyenda}>realizadas / programadas</span>
              </header>
              {resumen.porFuncionario.length === 0 ? (
                <p className={estilos.vacio}>Sin datos.</p>
              ) : (
                <ul className={estilos.barras}>
                  {resumen.porFuncionario.map((f) => (
                    <li key={f.codusu}>
                      <div className={estilos.barraFila}>
                        <span>{f.nombre}</span>
                        <span className={estilos.barraValor}>
                          {f.realizadas}/{f.programadas} · <strong>{f.efectividad}%</strong>
                        </span>
                      </div>
                      <ProgressBar
                        value={f.efectividad}
                        max={100}
                        tone={f.efectividad >= 80 ? "success" : f.efectividad >= 60 ? "tier" : "warning"}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Cobertura de clientes */}
            <section className={estilos.panel}>
              <header className={estilos.panelHead}>
                <h3>Cobertura de clientes</h3>
                <span className={estilos.leyenda}>mes en curso</span>
              </header>
              <dl className={estilos.datos}>
                <div>
                  <dt>Cartera asignada</dt>
                  <dd>{cobertura.cartera}</dd>
                </div>
                <div>
                  <dt>Visitados este mes</dt>
                  <dd>{cobertura.visitados}</dd>
                </div>
                <div>
                  <dt>Sin visita este mes</dt>
                  <dd className={estilos.datoAviso}>
                    {Math.max(0, cobertura.cartera - cobertura.visitados)}
                  </dd>
                </div>
              </dl>
              <ProgressBar value={cobertura.visitados} max={Math.max(1, cobertura.cartera)} />
              <p className={estilos.pie}>
                {cobertura.cartera
                  ? `${Math.round((cobertura.visitados / cobertura.cartera) * 100)}% de cobertura mensual`
                  : "Sin cartera asignada."}
              </p>
            </section>
          </div>

          {/* Programadas vs. realizadas por funcionario */}
          <section className={estilos.panel} style={{ marginTop: "var(--space-5)" }}>
            <header className={estilos.panelHead}>
              <h3>Programadas vs. realizadas</h3>
              <Link to="/rutas" className={estilos.enlace}>
                Ver rutas
              </Link>
            </header>
            {resumen.porFuncionario.length === 0 ? (
              <p className={estilos.vacio}>Sin datos.</p>
            ) : (
              <ul className={estilos.barras}>
                {resumen.porFuncionario.map((f) => (
                  <li key={f.codusu}>
                    <div className={estilos.barraFila}>
                      <span>
                        {f.nombre}
                        {f.extrarutas > 0 ? (
                          <Badge tone="tier">{f.extrarutas} extraruta{f.extrarutas > 1 ? "s" : ""}</Badge>
                        ) : null}
                      </span>
                      <span className={estilos.barraValor}>
                        {f.realizadas} de {f.programadas}
                      </span>
                    </div>
                    <ProgressBar value={f.realizadas} max={maxProgramadas} tone="accent" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {resumen.porFuncionario.some((f) => f.ultimaConexion) ? (
            <p className={estilos.pie} style={{ marginTop: "var(--space-3)" }}>
              Última lectura de equipos:{" "}
              {formatDateTime(
                resumen.porFuncionario.find((f) => f.ultimaConexion)?.ultimaConexion ?? "",
              )}
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
