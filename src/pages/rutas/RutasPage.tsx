import { useMemo, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { Field } from "../../components/ui/Field";
import { Spinner } from "../../components/ui/Spinner";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { MultiSelect } from "../../components/ui/MultiSelect";
import { Mapa, type MarcadorMapa, type Trazado } from "../../components/mapa/Mapa";
import { useApi } from "../../hooks/useApi";
import { useGoogleMapsKey, useMobiControl } from "../../hooks/useAppConfig";
import { useUsuariosAsignados } from "../../hooks/useUsuariosAsignados";
import { catalogosEvaService } from "../../services/eva/catalogosEvaService";
import { rutasEvaService, visitasEvaService } from "../../services/eva/visitasEvaService";
import { mobicontrolService } from "../../services/mobicontrolService";
import { paramService, PARAM_DISTANCIA_PRESENCIAL } from "../../services/paramService";
import { esVisitaPresencial } from "../../utils/geo";
import { aFormatoApi, hoyISO } from "../../utils/dates";
import type { MobRutaDto, MobVisitaGrupoDto } from "../../types/eva";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";
import estilos from "../visitas/Visitas.module.css";

interface Filtro {
  fecha: string;
  vendedores: string[];
  perfiles: string[];
  regiones: string[];
  territorios: string[];
  ciudades: string[];
  rutas: string[];
}

function filtroInicial(): Filtro {
  return {
    fecha: hoyISO(),
    vendedores: [],
    perfiles: [],
    regiones: [],
    territorios: [],
    ciudades: [],
    rutas: [],
  };
}

const FILTRO_VACIO = {
  MedioVisita: [],
  MotivoVisita: [],
  Acciones: [],
  noCompra: [],
  Tipomovimiento: [],
  duracionVisitaDesde: 0,
  duracionVisitaHasta: 0,
  horaDesde: "",
  horaHasta: "",
  cantVisitaDesde: 0,
  cantVisitaHasta: 0,
};

/** Migra Views/Rutas/Index.cshtml. */
export function RutasPage() {
  const {
    usuarios,
    cargando: cargandoUsuarios,
    error: errorVendedores,
    cmpy,
    tenant,
  } = useUsuariosAsignados();
  const mobi = useMobiControl();
  const google = useGoogleMapsKey();

  const regiones = useApi(
    () => (tenant ? catalogosEvaService.regiones(tenant) : Promise.resolve([])),
    [tenant?.IDTenant],
  );
  const territorios = useApi(
    () => (tenant ? catalogosEvaService.territorios(tenant) : Promise.resolve([])),
    [tenant?.IDTenant],
  );
  const ciudades = useApi(
    () => (tenant && cmpy ? catalogosEvaService.ciudades(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const perfiles = useApi(
    () => (tenant ? catalogosEvaService.perfiles(tenant) : Promise.resolve([])),
    [tenant?.IDTenant],
  );
  const numerosRuta = useApi(
    () => (tenant && cmpy ? rutasEvaService.getListDistinct(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );

  /** Distancia base del parametro 2, para marcar la visita como presencial. */
  const distanciaBase = useApi(() =>
    paramService.getById(PARAM_DISTANCIA_PRESENCIAL).then((p) => Number(p.ParamValue)),
  );

  const [borrador, setBorrador] = useState<Filtro>(filtroInicial);
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);

  /** Capas visibles del mapa. */
  const [capas, setCapas] = useState({
    cliente: true,
    visita: true,
    dispositivo: true,
    extraruta: true,
  });

  // El controller solo consultaba cuando habia vendedores seleccionados.
  const hayVendedores = filtro.vendedores.length > 0;

  const datos = useApi(async () => {
    if (!tenant || !cmpy || !hayVendedores) {
      return { rutas: [] as MobRutaDto[], extra: [], recorrido: [] };
    }

    const fecha = aFormatoApi(filtro.fecha);

    const filtroVisitas = {
      ...FILTRO_VACIO,
      codCust: "",
      codUsu: filtro.vendedores,
      fecIni: fecha,
      fecFin: fecha,
      Regiones: filtro.regiones,
      Territorios: filtro.territorios,
      Ciudades: filtro.ciudades,
    };

    // El agrupado no trae `Movimientos`; el controller lo completaba pidiendo
    // tambien el detalle y uniendo los docvis_desc por cliente.
    const [agrupadas, detalle] = await Promise.all([
      visitasEvaService.getListCompuestoRutasGroup(tenant, filtroVisitas),
      visitasEvaService.getListCompuesto(tenant, filtroVisitas).catch(() => []),
    ]);

    const movimientosPorCliente = new Map<string, Set<string>>();
    (detalle ?? []).forEach((d) => {
      if (!d.docvis_desc) return;
      const clave = `${d.rctt_cust}|${d.rctt_succli}`;
      if (!movimientosPorCliente.has(clave)) movimientosPorCliente.set(clave, new Set());
      movimientosPorCliente.get(clave)!.add(d.docvis_desc);
    });

    const visitas = (agrupadas ?? []).map((v) => ({
      ...v,
      Movimientos:
        v.Movimientos ||
        [...(movimientosPorCliente.get(`${v.rvis_cust}|${v.rctt_succli}`) ?? [])].join(", "),
    }));

    const rutas = await rutasEvaService.getDetailDataCliente(tenant, {
      cmpy,
      // Sin perfiles elegidos, el controller mandaba los de todos los asignados.
      codPer: filtro.perfiles.length
        ? filtro.perfiles
        : usuarios.map((u) => u.rusu_codper),
      codUsu: filtro.vendedores,
      fecRuta: fecha,
      rruta_ruta: filtro.rutas,
    });

    const base = distanciaBase.datos ?? 0;

    // Cruce ruta planificada ↔ visita efectuada, como hacia el controller.
    const cruzadas: MobRutaDto[] = (rutas ?? []).map((ruta) => {
      const visita = (visitas ?? []).find(
        (v) => v.rvis_cust === ruta.rruta_cus && v.rctt_succli === ruta.rruta_succli,
      );

      if (!visita) return { ...ruta, FueVisita: false, rvis_horinivis: "", rvis_horfinvis: "" };

      return {
        ...ruta,
        FueVisita: true,
        latvis: visita.rvis_latitud,
        longvis: visita.rvis_longitud,
        rvis_fecvis: visita.rvis_fecvis,
        ter_desc: visita.ter_desc,
        rvis_horinivis: visita.rvis_horinivis,
        rvis_horfinvis: visita.rvis_horfinvis,
        order: visita.order,
        FuePresencial: esVisitaPresencial(
          visita.rctt_latitud,
          visita.rctt_longitud,
          visita.rvis_latitud,
          visita.rvis_longitud,
          base,
        ),
      };
    });

    // Visitas que no estaban en la ruta planificada.
    const clientesRuta = new Set((rutas ?? []).map((r) => `${r.rruta_cus}|${r.rruta_succli}`));
    const extra = (visitas ?? []).filter(
      (v) => !clientesRuta.has(`${v.rvis_cust}|${v.rctt_succli}`),
    );

    // Traza GPS del dia: se pide un dispositivo por vendedor.
    const recorrido: { lat: number; lng: number }[] = [];
    if (mobi.config && mobi.token) {
      for (const codusu of filtro.vendedores) {
        const dispositivos = await mobicontrolService
          .getDevices(mobi.config, codusu, mobi.token)
          .catch(() => []);
        const dispositivo = dispositivos?.[0];
        if (!dispositivo) continue;

        const puntos = await mobicontrolService
          .getLocations(mobi.config, dispositivo.DeviceId, filtro.fecha, filtro.fecha, mobi.token)
          .catch(() => []);

        (puntos ?? [])
          .slice()
          .sort((a, b) => a.Timestamp.localeCompare(b.Timestamp))
          .forEach((p) => recorrido.push({ lat: Number(p.Latitude), lng: Number(p.Longitude) }));
      }
    }

    return { rutas: cruzadas.sort(porSecuencia), extra, recorrido };
  }, [
    tenant?.IDTenant,
    cmpy,
    filtro,
    hayVendedores,
    usuarios,
    distanciaBase.datos,
    mobi.config?.IDApplicationConfig,
    mobi.token,
  ]);

  /**
   * Capas del mapa. Ademas de las tres del MVC (Cliente, Visita, Dispositivo)
   * se añade Extraruta: las visitas que no estaban en la ruta planificada.
   */
  const marcadores: MarcadorMapa[] = useMemo(() => {
    const lista: MarcadorMapa[] = [];
    const rutas = datos.datos?.rutas ?? [];

    if (capas.cliente) {
      rutas
        .filter((r) => Number(r.rctt_latitud) && Number(r.rctt_longitud))
        .forEach((r, indice) =>
          lista.push({
            id: `cli-${r.rruta_cus}-${r.rruta_succli}`,
            tipo: "cliente" as const,
            lat: Number(r.rctt_latitud),
            lng: Number(r.rctt_longitud),
            titulo: r.rctt_nomcli || r.rctt_razsoc,
            etiqueta: String(indice + 1),
            color: !r.FueVisita ? "rojo" : r.FuePresencial ? "verde" : "ambar",
            detalle: `<strong>${r.rctt_nomcli || r.rctt_razsoc}</strong><br/>${r.rruta_cus}<br/>${
              r.FueVisita
                ? `Visitada ${r.rvis_horinivis ?? ""} - ${r.rvis_horfinvis ?? ""}${
                    r.FuePresencial ? " (presencial)" : " (fuera de radio)"
                  }`
                : "Sin visita"
            }`,
          }),
        );
    }

    if (capas.visita) {
      rutas
        .filter((r) => r.FueVisita && Number(r.latvis) && Number(r.longvis))
        .forEach((r) =>
          lista.push({
            id: `vis-${r.rruta_cus}-${r.rruta_succli}`,
            tipo: "visita" as const,
            lat: Number(r.latvis),
            lng: Number(r.longvis),
            titulo: `Visita · ${r.rctt_nomcli || r.rctt_razsoc}`,
            color: "rojo",
            detalle: `<strong>Punto de la visita</strong><br/>${r.rctt_nomcli || r.rctt_razsoc}<br/>${r.rvis_horinivis ?? ""} - ${r.rvis_horfinvis ?? ""}`,
          }),
        );
    }

    if (capas.extraruta) {
      (datos.datos?.extra ?? [])
        .filter((v) => Number(v.rvis_latitud) && Number(v.rvis_longitud))
        .forEach((v, indice) =>
          lista.push({
            id: `extra-${v.rvis_cust}-${v.rctt_succli}-${indice}`,
            tipo: "extraruta" as const,
            lat: Number(v.rvis_latitud),
            lng: Number(v.rvis_longitud),
            titulo: `Extraruta · ${v.rctt_nomcli || v.rctt_razsoc}`,
            color: "morado",
            detalle: `<strong>Extraruta</strong><br/>${v.rctt_nomcli || v.rctt_razsoc}<br/>${v.rvis_cust}<br/>${v.rvis_horinivis ?? ""} - ${v.rvis_horfinvis ?? ""}`,
          }),
        );
    }

    return lista;
  }, [datos.datos, capas]);

  /**
   * Naranja la ruta planificada (orden de los clientes) y azul el recorrido
   * real del GPS, como en el MVC.
   */
  const trazados: Trazado[] = useMemo(() => {
    const lista: Trazado[] = [];

    if (capas.cliente) {
      const clientes = (datos.datos?.rutas ?? [])
        .filter((r) => Number(r.rctt_latitud) && Number(r.rctt_longitud))
        .map((r) => ({ lat: Number(r.rctt_latitud), lng: Number(r.rctt_longitud) }));
      if (clientes.length >= 2)
        lista.push({ puntos: clientes, color: "#f57c00", grosor: 5, opacidad: 0.6 });
    }

    // Orden real en que se efectuaron las visitas.
    if (capas.visita) {
      const visitadas = (datos.datos?.rutas ?? [])
        .filter((r) => r.FueVisita && Number(r.latvis) && Number(r.longvis))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((r) => ({ lat: Number(r.latvis), lng: Number(r.longvis) }));
      if (visitadas.length >= 2)
        lista.push({ puntos: visitadas, color: "#d93025", grosor: 3, opacidad: 0.95 });
    }

    if (capas.dispositivo) {
      const recorrido = datos.datos?.recorrido ?? [];
      if (recorrido.length >= 2)
        lista.push({ puntos: recorrido, color: "#1a73e8", grosor: 3, opacidad: 0.85 });
    }

    return lista;
  }, [datos.datos, capas]);

  const columnas: Columna<MobRutaDto>[] = [
    {
      titulo: "Sec.",
      ancho: "4rem",
      valor: (r) => Number(r.rctt_sec ?? 0),
      render: (r) => r.rctt_sec,
    },
    {
      titulo: "Cliente",
      valor: (r) => r.rctt_nomcli || r.rctt_razsoc,
      render: (r) => (
        <div>
          <strong>{r.rctt_nomcli || r.rctt_razsoc}</strong>
          <div className={formularios.url}>
            {r.rruta_cus}
            {r.rruta_succli && r.rruta_succli !== "0" ? `-${r.rruta_succli}` : ""}
          </div>
        </div>
      ),
    },
    { titulo: "Funcionario", valor: (r) => r.rusu_nombre ?? "", render: (r) => r.rusu_nombre },
    { titulo: "Ciudad", valor: (r) => r.dis_desc ?? "", render: (r) => r.dis_desc },
    { titulo: "Ruta", valor: (r) => r.rruta_ruta ?? "", render: (r) => r.rruta_ruta, ancho: "5rem" },
    {
      titulo: "Visita",
      ancho: "10rem",
      valor: (r) => (r.FueVisita ? "Visitada" : "Sin visita"),
      render: (r) =>
        r.FueVisita ? (
          <Badge tone={r.FuePresencial ? "success" : "warning"} dot>
            {r.FuePresencial ? "Presencial" : "Fuera de radio"}
          </Badge>
        ) : (
          <Badge tone="critical" dot>
            Sin visita
          </Badge>
        ),
    },
    {
      titulo: "Horario",
      ancho: "10rem",
      valor: (r) => r.rvis_horinivis ?? "",
      render: (r) =>
        r.rvis_horinivis ? `${r.rvis_horinivis} — ${r.rvis_horfinvis}` : "—",
    },
  ];

  const extrarutas = datos.datos?.extra ?? [];

  const columnasExtra: Columna<MobVisitaGrupoDto>[] = [
    {
      titulo: "Cód. funcionario",
      ancho: "7rem",
      valor: (v) => v.rvis_enter ?? v.rvis_codusu ?? "",
      render: (v) => <code>{v.rvis_enter || v.rvis_codusu}</code>,
    },
    { titulo: "Funcionario", valor: (v) => v.rusu_nombre ?? "", render: (v) => v.rusu_nombre },
    {
      titulo: "Cód. cliente",
      ancho: "7rem",
      valor: (v) => v.rvis_cust ?? "",
      render: (v) => <code>{v.rvis_cust}</code>,
    },
    {
      titulo: "Cliente",
      valor: (v) => v.rctt_nomcli || v.rctt_razsoc,
      render: (v) => (
        <div>
          {v.rctt_nomcli || v.rctt_razsoc}
          {v.rctt_addr ? <div className={formularios.sub}>{v.rctt_addr}</div> : null}
        </div>
      ),
    },
    { titulo: "Ciudad", valor: (v) => v.dis_desc ?? "", render: (v) => v.dis_desc },
    {
      titulo: "Horario",
      ancho: "10rem",
      valor: (v) => v.rvis_horinivis ?? "",
      render: (v) => `${v.rvis_horinivis ?? ""} — ${v.rvis_horfinvis ?? ""}`,
    },
    { titulo: "Tiempo", ancho: "6rem", valor: (v) => v.tiempoVis ?? "", render: (v) => v.tiempoVis },
    {
      titulo: "Movimientos",
      valor: (v) => v.Movimientos ?? "",
      render: (v) => v.Movimientos || "—",
    },
  ];

  const total = datos.datos?.rutas.length ?? 0;
  const visitadas = datos.datos?.rutas.filter((r) => r.FueVisita).length ?? 0;

  return (
    <>
      <PageHeader
        title="Rutas"
        eyebrow={tenant?.NameCompanyTenant}
        description="Ruta planificada del día contra lo efectivamente visitado."
        actions={
          <div className={formularios.accionesFila}>
            <Badge tone="accent">{total} planificados</Badge>
            <Badge tone="success">{visitadas} visitados</Badge>
            {datos.datos?.extra.length ? (
              <Badge tone="warning">{datos.datos.extra.length} fuera de ruta</Badge>
            ) : null}
          </div>
        }
      />

      {mobi.error ? (
        <Alert tone="warning">
          No se pudo conectar con MobiControl: el mapa no mostrará el recorrido GPS.
        </Alert>
      ) : null}

      {errorVendedores ? <Alert tone="warning">{errorVendedores}</Alert> : null}

      <div className={formularios.filtros}>
        <Field label="Fecha" htmlFor="fecha">
          <input
            id="fecha"
            type="date"
            className={inputs.input}
            value={borrador.fecha}
            onChange={(evento) => setBorrador((p) => ({ ...p, fecha: evento.target.value }))}
          />
        </Field>

        <MultiSelect
          etiqueta="Funcionarios"
          opciones={usuarios.map((u) => ({
            valor: u.KEY_rusu_codusu,
            etiqueta: `${u.KEY_rusu_codusu} — ${u.rusu_nombre}`,
          }))}
          seleccion={borrador.vendedores}
          onChange={(vendedores) => setBorrador((p) => ({ ...p, vendedores }))}
          vacioSignifica="Requerido"
        />

        <MultiSelect
          etiqueta="Perfiles"
          opciones={(perfiles.datos ?? []).map((p) => ({
            valor: p.KEY_rper_codper,
            etiqueta: p.rper_desper,
          }))}
          seleccion={borrador.perfiles}
          onChange={(perfiles) => setBorrador((p) => ({ ...p, perfiles }))}
        />

        <MultiSelect
          etiqueta="Regiones"
          opciones={(regiones.datos ?? []).map((r) => ({
            valor: r.reg_regi,
            etiqueta: r.reg_desc,
          }))}
          seleccion={borrador.regiones}
          onChange={(regiones) => setBorrador((p) => ({ ...p, regiones }))}
        />

        <MultiSelect
          etiqueta="Territorios"
          opciones={(territorios.datos ?? []).map((t) => ({
            valor: t.ter_teri,
            etiqueta: t.ter_desc,
          }))}
          seleccion={borrador.territorios}
          onChange={(territorios) => setBorrador((p) => ({ ...p, territorios }))}
        />

        <MultiSelect
          etiqueta="Ciudades"
          opciones={(ciudades.datos ?? []).map((c) => ({
            valor: c.KEY_dis_dist,
            etiqueta: c.dis_desc,
          }))}
          seleccion={borrador.ciudades}
          onChange={(ciudades) => setBorrador((p) => ({ ...p, ciudades }))}
        />

        <MultiSelect
          etiqueta="Rutas"
          opciones={(numerosRuta.datos ?? []).map((r) => ({
            valor: String(r),
            etiqueta: String(r),
          }))}
          seleccion={borrador.rutas}
          onChange={(rutas) => setBorrador((p) => ({ ...p, rutas }))}
        />

        <div className={formularios.accionesFila}>
          <Button
            variant="ghost"
            onClick={() => {
              setBorrador(filtroInicial());
              setFiltro(filtroInicial());
            }}
          >
            Limpiar
          </Button>
          <Button
            variant="primary"
            onClick={() => setFiltro(borrador)}
            disabled={borrador.vendedores.length === 0 || cargandoUsuarios}
          >
            Buscar
          </Button>
        </div>
      </div>

      {!hayVendedores ? (
        <Alert tone="info">Selecciona al menos un funcionario para consultar su ruta.</Alert>
      ) : datos.cargando ? (
        <Spinner mensaje="Consultando ruta y recorrido…" />
      ) : (
        <>
          {google.apiKey ? (
            <>
              <div className={estilos.capas}>
                <span className={estilos.capasTitulo}>Mostrar en el mapa</span>
                <label className={estilos.capa}>
                  <input
                    type="checkbox"
                    checked={capas.dispositivo}
                    onChange={(e) => setCapas((c) => ({ ...c, dispositivo: e.target.checked }))}
                  />
                  <span className={estilos.puntoAzul} /> Dispositivo
                </label>
                <label className={estilos.capa}>
                  <input
                    type="checkbox"
                    checked={capas.visita}
                    onChange={(e) => setCapas((c) => ({ ...c, visita: e.target.checked }))}
                  />
                  <span className={estilos.puntoRojo} /> Visita
                </label>
                <label className={estilos.capa}>
                  <input
                    type="checkbox"
                    checked={capas.cliente}
                    onChange={(e) => setCapas((c) => ({ ...c, cliente: e.target.checked }))}
                  />
                  <span className={estilos.puntoVerde} /> Cliente / ruta
                </label>
                <label className={estilos.capa}>
                  <input
                    type="checkbox"
                    checked={capas.extraruta}
                    onChange={(e) => setCapas((c) => ({ ...c, extraruta: e.target.checked }))}
                  />
                  <span className={estilos.puntoMorado} /> Extraruta
                </label>
              </div>

              <Mapa
                apiKey={google.apiKey}
                marcadores={marcadores}
                trazados={trazados}
                altura="30rem"
              />
            </>
          ) : null}

          <div style={{ marginTop: "var(--space-5)" }}>
            <DataTable
              columnas={columnas}
              filas={datos.datos?.rutas}
              claveFila={(r) => `${r.rruta_cus}-${r.rruta_succli}-${r.rruta_codusu}`}
              error={datos.error}
              vacio="No hay ruta planificada para la fecha y filtros seleccionados."
              porPagina={25}
              exportar="rutas"
            />
          </div>

          {/* Extrarutas: visitas efectuadas que no estaban en la ruta del dia. */}
          {extrarutas.length > 0 ? (
            <div style={{ marginTop: "var(--space-6)" }}>
              <h3 className={formularios.subtitulo}>Extrarutas ({extrarutas.length})</h3>
              <p className={formularios.sub} style={{ marginBottom: "var(--space-3)" }}>
                Visitas registradas fuera de la ruta planificada del día.
              </p>
              <DataTable
                columnas={columnasExtra}
                filas={extrarutas}
                claveFila={(v) => `${v.rvis_cust}-${v.rctt_succli}-${v.rvis_horinivis}`}
                vacio="Sin extrarutas."
                porPagina={15}
                exportar="extrarutas"
              />
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

function porSecuencia(a: MobRutaDto, b: MobRutaDto) {
  return Number(a.rctt_sec ?? 0) - Number(b.rctt_sec ?? 0);
}
