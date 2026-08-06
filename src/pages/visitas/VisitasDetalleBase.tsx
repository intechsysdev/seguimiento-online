import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { Field } from "../../components/ui/Field";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { MultiSelect } from "../../components/ui/MultiSelect";
import { IconDetalle, IconMap } from "../../components/icons";
import { Mapa, type MarcadorMapa, type Trazado } from "../../components/mapa/Mapa";
import { useApi } from "../../hooks/useApi";
import { useGoogleMapsKey, useMobiControl } from "../../hooks/useAppConfig";
import { useUsuariosAsignados } from "../../hooks/useUsuariosAsignados";
import { catalogosEvaService } from "../../services/eva/catalogosEvaService";
import { visitasEvaService } from "../../services/eva/visitasEvaService";
import { mobicontrolService } from "../../services/mobicontrolService";
import { aFormatoApi, hoyISO } from "../../utils/dates";
import type { FiltersDetalle, MobVisitaDto, MobVisitaGrupoDto } from "../../types/eva";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";
import estilos from "./Visitas.module.css";

interface Filtro {
  fecIni: string;
  fecFin: string;
  funcionarios: string[];
  codCust: string;
  regiones: string[];
  territorios: string[];
  ciudades: string[];
  mediosVisita: string[];
  motivosVisita: string[];
  acciones: string[];
  noCompra: string[];
  tiposMovimiento: string[];
  duracionDesde: number;
  duracionHasta: number;
  horaDesde: string;
  horaHasta: string;
}

function filtroInicial(funcionarios: string[] = [], fecIni = hoyISO(), fecFin = hoyISO()): Filtro {
  return {
    fecIni,
    fecFin,
    funcionarios,
    codCust: "",
    regiones: [],
    territorios: [],
    ciudades: [],
    mediosVisita: [],
    motivosVisita: [],
    acciones: [],
    noCompra: [],
    tiposMovimiento: [],
    duracionDesde: 0,
    duracionHasta: 0,
    horaDesde: "",
    horaHasta: "",
  };
}

type Fila = MobVisitaDto | MobVisitaGrupoDto;

interface Props {
  /** "agrupada" = SummaryGroup (Efectuadas); "detallada" = Summary (Detalladas). */
  modo: "agrupada" | "detallada";
  titulo: string;
  descripcion: string;
}

/**
 * Base compartida de Views/Visitas/Summary.cshtml y SummaryGroup.cshtml.
 *
 * Ambas vistas tenían los mismos filtros, el mismo mapa con el recorrido del
 * vendedor y solo cambiaban el endpoint y las columnas de la tabla.
 */
export function VisitasDetalleBase({ modo, titulo, descripcion }: Props) {
  const [params] = useSearchParams();
  const {
    usuarios,
    codigosAsignados,
    cargando: cargandoUsuarios,
    error: errorVendedores,
    cmpy,
    tenant,
  } = useUsuariosAsignados();
  const mobi = useMobiControl();
  const google = useGoogleMapsKey();

  const inicial = filtroInicial(
    params.get("codUsu") ? [params.get("codUsu")!] : [],
    params.get("fecIni") ?? hoyISO(),
    params.get("fecFin") ?? hoyISO(),
  );
  // El codigo de cliente tambien puede llegar por la URL (desde Efectuadas).
  inicial.codCust = params.get("codCust") ?? "";

  const [borrador, setBorrador] = useState<Filtro>(inicial);
  const [filtro, setFiltro] = useState<Filtro>(inicial);

  /** Capas visibles del mapa (checkDispositivo/checkVisita/checkCliente del MVC). */
  const [capas, setCapas] = useState({ dispositivo: true, visita: true, cliente: true });
  const [visitaEnMapa, setVisitaEnMapa] = useState<Fila | null>(null);

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
  const mediosVisita = useApi(
    () => (tenant && cmpy ? catalogosEvaService.mediosVisita(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const motivosVisita = useApi(
    () => (tenant && cmpy ? catalogosEvaService.motivosVisita(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const motivos = useApi(
    () => (tenant && cmpy ? catalogosEvaService.motivos(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const acciones = useApi(
    () => (tenant && cmpy ? catalogosEvaService.acciones(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const tiposMovimiento = useApi(
    () => (tenant ? catalogosEvaService.tiposMovimiento(tenant) : Promise.resolve([])),
    [tenant?.IDTenant],
  );

  const visitas = useApi<Fila[]>(() => {
    if (!tenant || cargandoUsuarios) return Promise.resolve([]);

    const filtroApi: FiltersDetalle = {
      // Sin vendedor elegido, el controller usaba todos los asignados.
      codUsu: filtro.funcionarios.length ? filtro.funcionarios : codigosAsignados,
      codCust: filtro.codCust,
      fecIni: aFormatoApi(filtro.fecIni),
      fecFin: aFormatoApi(filtro.fecFin),
      Regiones: filtro.regiones,
      Territorios: filtro.territorios,
      Ciudades: filtro.ciudades,
      MedioVisita: filtro.mediosVisita,
      MotivoVisita: filtro.motivosVisita,
      Acciones: filtro.acciones,
      noCompra: filtro.noCompra,
      Tipomovimiento: filtro.tiposMovimiento,
      duracionVisitaDesde: filtro.duracionDesde,
      duracionVisitaHasta: filtro.duracionHasta,
      horaDesde: filtro.horaDesde,
      horaHasta: filtro.horaHasta,
      cantVisitaDesde: 0,
      cantVisitaHasta: 0,
    };

    if (modo === "detallada") return visitasEvaService.getListCompuesto(tenant, filtroApi);

    /*
     * El endpoint agrupado NO devuelve `Movimientos`: el MVC lo armaba pidiendo
     * ademas el detalle y uniendo los `docvis_desc` de cada cliente
     * (RutasController). Sin esta segunda consulta la columna sale vacia.
     */
    return Promise.all([
      visitasEvaService.getListCompuestoGroup(tenant, filtroApi),
      visitasEvaService.getListCompuesto(tenant, filtroApi).catch(() => [] as MobVisitaDto[]),
    ]).then(([grupos, detalle]) => {
      const porCliente = new Map<string, Set<string>>();
      (detalle ?? []).forEach((d) => {
        if (!d.docvis_desc) return;
        const clave = `${d.rctt_cust}|${d.rctt_succli}`;
        if (!porCliente.has(clave)) porCliente.set(clave, new Set());
        porCliente.get(clave)!.add(d.docvis_desc);
      });

      return (grupos ?? []).map((g) => ({
        ...g,
        Movimientos:
          g.Movimientos ||
          [...(porCliente.get(`${g.rvis_cust}|${g.rctt_succli}`) ?? [])].join(", "),
      }));
    });
  }, [tenant?.IDTenant, filtro, codigosAsignados, cargandoUsuarios, modo]);

  /** Recorrido GPS: solo tiene sentido con un vendedor concreto. */
  const recorrido = useApi(async () => {
    // La traza GPS es de un dispositivo: solo aplica con un funcionario.
    if (filtro.funcionarios.length !== 1 || !mobi.config || !mobi.token) return [];

    const dispositivos = await mobicontrolService
      .getDevices(mobi.config, filtro.funcionarios[0], mobi.token)
      .catch(() => []);
    const dispositivo = dispositivos?.[0];
    if (!dispositivo) return [];

    const puntos = await mobicontrolService
      .getLocations(mobi.config, dispositivo.DeviceId, filtro.fecIni, filtro.fecFin, mobi.token)
      .catch(() => []);

    return (puntos ?? [])
      .slice()
      .sort((a, b) => a.Timestamp.localeCompare(b.Timestamp))
      .map((p) => ({ lat: Number(p.Latitude), lng: Number(p.Longitude) }));
  }, [filtro.funcionarios, filtro.fecIni, filtro.fecFin, mobi.config?.IDApplicationConfig, mobi.token]);

  /**
   * En el DTO agrupado el cliente viene en `rvis_cust`, no en `rctt_cust`
   * (asi lo muestra SummaryGroup.cshtml). Por eso en Efectuadas la columna
   * salia vacia.
   */
  function codigoCliente(v: Fila) {
    const grupo = v as MobVisitaGrupoDto;
    return grupo.rvis_cust || v.rctt_cust || "";
  }

  function detalleHtml(v: Fila) {
    return (
      `<strong>${v.rctt_nomcli || v.rctt_razsoc}</strong><br/>` +
      `${v.rctt_cust ?? ""} · ${v.rctt_addr ?? ""}<br/>` +
      `${v.rusu_nombre ?? ""} (${v.rvis_enter || v.rvis_codusu || ""})<br/>` +
      `${v.rvis_fecvis ?? ""} ${v.rvis_horinivis ?? ""} - ${v.rvis_horfinvis ?? ""} (${v.tiempoVis ?? ""})`
    );
  }

  /**
   * Capas del mapa, con los mismos colores del MVC: Visita en rojo, Cliente en
   * verde y Dispositivo en azul (los checkDispositivo/checkVisita/checkCliente
   * de Summary.cshtml).
   */
  const marcadores: MarcadorMapa[] = useMemo(() => {
    const lista: MarcadorMapa[] = [];
    const datos = visitas.datos ?? [];

    if (capas.visita) {
      datos
        .filter((v) => Number(v.rvis_latitud) && Number(v.rvis_longitud))
        .forEach((v, indice) =>
          lista.push({
            id: `vis-${v.rctt_cust}-${v.rctt_succli}-${indice}`,
            tipo: "visita" as const,
            lat: Number(v.rvis_latitud),
            lng: Number(v.rvis_longitud),
            titulo: `Visita · ${v.rctt_nomcli || v.rctt_razsoc}`,
            etiqueta: String(indice + 1),
            color: "rojo",
            detalle: detalleHtml(v),
          }),
        );
    }

    if (capas.cliente) {
      datos
        .filter((v) => Number(v.rctt_latitud) && Number(v.rctt_longitud))
        .forEach((v, indice) =>
          lista.push({
            id: `cli-${v.rctt_cust}-${v.rctt_succli}-${indice}`,
            tipo: "cliente" as const,
            lat: Number(v.rctt_latitud),
            lng: Number(v.rctt_longitud),
            titulo: `Cliente · ${v.rctt_nomcli || v.rctt_razsoc}`,
            color: "verde",
            detalle: detalleHtml(v),
          }),
        );
    }

    return lista;
  }, [visitas.datos, capas]);

  const trazados: Trazado[] = useMemo(() => {
    const lista: Trazado[] = [];

    if (capas.visita) {
      const puntos = (visitas.datos ?? [])
        .filter((v) => Number(v.rvis_latitud) && Number(v.rvis_longitud))
        .map((v) => ({ lat: Number(v.rvis_latitud), lng: Number(v.rvis_longitud) }));
      if (puntos.length >= 2) lista.push({ puntos, color: "red", grosor: 4 });
    }

    if (capas.dispositivo) {
      const gps = recorrido.datos ?? [];
      if (gps.length >= 2) lista.push({ puntos: gps, color: "#1a73e8", grosor: 4 });
    }

    return lista;
  }, [visitas.datos, recorrido.datos, capas]);

  /** Mapa de una sola visita, para el boton "Ver" de cada fila. */
  const marcadoresFila: MarcadorMapa[] = useMemo(() => {
    if (!visitaEnMapa) return [];
    const lista: MarcadorMapa[] = [];
    if (Number(visitaEnMapa.rctt_latitud) && Number(visitaEnMapa.rctt_longitud)) {
      lista.push({
        id: "cliente",
        tipo: "cliente" as const,
        lat: Number(visitaEnMapa.rctt_latitud),
        lng: Number(visitaEnMapa.rctt_longitud),
        titulo: "Ubicación del cliente",
        color: "verde",
        detalle: `<strong>Cliente</strong><br/>${visitaEnMapa.rctt_addr ?? ""}`,
      });
    }
    if (Number(visitaEnMapa.rvis_latitud) && Number(visitaEnMapa.rvis_longitud)) {
      lista.push({
        id: "visita",
        tipo: "visita" as const,
        lat: Number(visitaEnMapa.rvis_latitud),
        lng: Number(visitaEnMapa.rvis_longitud),
        titulo: "Ubicación de la visita",
        color: "rojo",
        detalle: detalleHtml(visitaEnMapa),
      });
    }
    return lista;
  }, [visitaEnMapa]);

  const columnas: Columna<Fila>[] = [
    {
      titulo: "Fecha",
      valor: (v) => v.rvis_fecvis,
      render: (v) => v.rvis_fecvis,
      ancho: "8rem",
    },
    // El MVC mostraba rvis_enter como primera columna ("Usuario").
    {
      titulo: "Cód. funcionario",
      ancho: "7rem",
      valor: (v) => v.rvis_enter ?? v.rvis_codusu ?? "",
      render: (v) => <code>{v.rvis_enter || v.rvis_codusu}</code>,
    },
    {
      titulo: "Funcionario",
      valor: (v) => v.rusu_nombre ?? "",
      render: (v) => <strong>{v.rusu_nombre}</strong>,
    },
    {
      titulo: "Cód. cliente",
      ancho: "7rem",
      valor: (v) => codigoCliente(v),
      render: (v) => (
        <code>
          {codigoCliente(v)}
          {v.rctt_succli && v.rctt_succli !== "0" ? `-${v.rctt_succli}` : ""}
        </code>
      ),
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
    {
      titulo: "Ruta / Sec.",
      ancho: "7rem",
      valor: (v) => `${v.rctt_ruta ?? ""}-${v.rctt_sec ?? ""}`,
      render: (v) => `${v.rctt_ruta ?? ""} / ${v.rctt_sec ?? ""}`,
    },
    { titulo: "Ciudad", valor: (v) => v.dis_desc ?? "", render: (v) => v.dis_desc },
    { titulo: "Región", valor: (v) => v.reg_desc ?? "", render: (v) => v.reg_desc },
    {
      titulo: "Horario",
      ancho: "10rem",
      valor: (v) => v.rvis_horinivis ?? "",
      render: (v) => `${v.rvis_horinivis ?? ""} — ${v.rvis_horfinvis ?? ""}`,
    },
    {
      titulo: "Tiempo",
      ancho: "6rem",
      valor: (v) => v.tiempoVis ?? "",
      render: (v) => v.tiempoVis,
    },
    modo === "agrupada"
      ? {
          titulo: "Movimientos",
          valor: (v) => (v as MobVisitaGrupoDto).Movimientos ?? "",
          render: (v) => (v as MobVisitaGrupoDto).Movimientos || "—",
        }
      : {
          titulo: "Documento",
          valor: (v) => (v as MobVisitaDto).docvis_desc ?? "",
          render: (v) => (v as MobVisitaDto).docvis_desc || "—",
        },
  ];

  // Boton por fila: abre el mapa centrado en esa visita, como ConsultarDetalle().
  columnas.push({
    titulo: "Ubicación",
    ancho: "7rem",
    alineacion: "centro",
    render: (v) =>
      Number(v.rvis_latitud) || Number(v.rctt_latitud) ? (
        <Button variant="ghost" size="sm" onClick={() => setVisitaEnMapa(v)}>
          <IconMap /> Ver
        </Button>
      ) : (
        "—"
      ),
  });

  // Desde Efectuadas se salta al detalle del mismo cliente sin pasar por el menu.
  if (modo === "agrupada") {
    columnas.push({
      titulo: "Detalle",
      ancho: "8rem",
      alineacion: "centro",
      render: (v) => (
        <Link
          to={
            `/visitas/detalladas?codUsu=${encodeURIComponent(v.rvis_enter || v.rvis_codusu || "")}` +
            `&fecIni=${filtro.fecIni}&fecFin=${filtro.fecFin}` +
            `&codCust=${encodeURIComponent(codigoCliente(v))}`
          }
          className={estilos.enlaceDetalle}
        >
          <IconDetalle /> Detalladas
        </Link>
      ),
    });
  }

  if (modo === "detallada") {
    columnas.push(
      {
        titulo: "Medio",
        valor: (v) => (v as MobVisitaDto).rmedio_desmedvis ?? "",
        render: (v) => (v as MobVisitaDto).rmedio_desmedvis,
      },
      {
        titulo: "Motivo",
        valor: (v) => (v as MobVisitaDto).motdes ?? "",
        render: (v) => (v as MobVisitaDto).motdes,
      },
      {
        titulo: "Acción",
        valor: (v) => (v as MobVisitaDto).accdesc ?? "",
        render: (v) => (v as MobVisitaDto).accdesc,
      },
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Visitas"
        title={titulo}
        description={descripcion}
        actions={<Badge tone="accent">{visitas.datos?.length ?? 0} registros</Badge>}
      />

      {mobi.error && filtro.funcionarios.length === 1 ? (
        <Alert tone="warning">
          No se pudo conectar con MobiControl: el mapa no mostrará el recorrido GPS.
        </Alert>
      ) : null}

      {errorVendedores ? <Alert tone="warning">{errorVendedores}</Alert> : null}

      <div className={formularios.filtros}>
        <Field label="Desde" htmlFor="fecIni">
          <input
            id="fecIni"
            type="date"
            className={inputs.input}
            value={borrador.fecIni}
            onChange={(e) => setBorrador((p) => ({ ...p, fecIni: e.target.value }))}
          />
        </Field>

        <Field label="Hasta" htmlFor="fecFin">
          <input
            id="fecFin"
            type="date"
            className={inputs.input}
            value={borrador.fecFin}
            onChange={(e) => setBorrador((p) => ({ ...p, fecFin: e.target.value }))}
          />
        </Field>

        <MultiSelect
          etiqueta="Funcionarios"
          opciones={usuarios.map((u) => ({
            valor: u.KEY_rusu_codusu,
            etiqueta: `${u.KEY_rusu_codusu} — ${u.rusu_nombre}`,
          }))}
          seleccion={borrador.funcionarios}
          onChange={(funcionarios) => setBorrador((p) => ({ ...p, funcionarios }))}
          vacioSignifica="Asignados"
          cargando={cargandoUsuarios}
        />

        <Field label="Cliente" htmlFor="codCust" optional>
          <input
            id="codCust"
            className={inputs.input}
            value={borrador.codCust}
            onChange={(e) => setBorrador((p) => ({ ...p, codCust: e.target.value }))}
            placeholder="Código de cliente"
          />
        </Field>

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
          etiqueta="Medio de visita"
          opciones={(mediosVisita.datos ?? []).map((m) => ({
            valor: m.KEY_rmedio_codmedvis,
            etiqueta: m.rmedio_desmedvis,
          }))}
          seleccion={borrador.mediosVisita}
          onChange={(mediosVisita) => setBorrador((p) => ({ ...p, mediosVisita }))}
        />

        <MultiSelect
          etiqueta="Motivo de visita"
          opciones={(motivosVisita.datos ?? []).map((m) => ({
            valor: m.motcod,
            etiqueta: m.motdes,
          }))}
          seleccion={borrador.motivosVisita}
          onChange={(motivosVisita) => setBorrador((p) => ({ ...p, motivosVisita }))}
        />

        <MultiSelect
          etiqueta="Acciones"
          opciones={(acciones.datos ?? []).map((a) => ({
            valor: a.KEY_acctip,
            etiqueta: a.accdesc,
          }))}
          seleccion={borrador.acciones}
          onChange={(acciones) => setBorrador((p) => ({ ...p, acciones }))}
        />

        <MultiSelect
          etiqueta="Motivo no compra"
          opciones={(motivos.datos ?? []).map((m) => ({
            valor: m.movcod,
            etiqueta: m.movdesc,
          }))}
          seleccion={borrador.noCompra}
          onChange={(noCompra) => setBorrador((p) => ({ ...p, noCompra }))}
        />

        <MultiSelect
          etiqueta="Tipo movimiento"
          opciones={(tiposMovimiento.datos ?? []).map((t) => ({
            valor: t.docvis_coddoc,
            etiqueta: t.docvis_desc,
          }))}
          seleccion={borrador.tiposMovimiento}
          onChange={(tiposMovimiento) => setBorrador((p) => ({ ...p, tiposMovimiento }))}
        />

        <Field label="Hora desde" htmlFor="horaDesde" optional>
          <input
            id="horaDesde"
            type="time"
            className={inputs.input}
            value={borrador.horaDesde}
            onChange={(e) => setBorrador((p) => ({ ...p, horaDesde: e.target.value }))}
          />
        </Field>

        <Field label="Hora hasta" htmlFor="horaHasta" optional>
          <input
            id="horaHasta"
            type="time"
            className={inputs.input}
            value={borrador.horaHasta}
            onChange={(e) => setBorrador((p) => ({ ...p, horaHasta: e.target.value }))}
          />
        </Field>

        <div className={formularios.accionesFila}>
          <Button
            variant="ghost"
            onClick={() => {
              const limpio = filtroInicial();
              setBorrador(limpio);
              setFiltro(limpio);
            }}
          >
            Limpiar
          </Button>
          <Button variant="primary" onClick={() => setFiltro(borrador)}>
            Buscar
          </Button>
        </div>
      </div>

      {visitas.cargando || cargandoUsuarios ? (
        <Spinner mensaje="Consultando visitas…" />
      ) : (
        <>
          {google.apiKey && (marcadores.length > 0 || trazados.length > 0) ? (
            <>
              {/* Capas del mapa: los tres checks del modal del MVC. */}
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
                  <span className={estilos.puntoVerde} /> Cliente
                </label>
                {filtro.funcionarios.length !== 1 ? (
                  <span className={estilos.nota}>
                    El recorrido del dispositivo requiere un solo funcionario.
                  </span>
                ) : null}
              </div>

              <Mapa
                apiKey={google.apiKey}
                marcadores={marcadores}
                trazados={trazados}
                altura="28rem"
              />
            </>
          ) : null}

          <div style={{ marginTop: "var(--space-5)" }}>
            <DataTable
              columnas={columnas}
              filas={visitas.datos}
              claveFila={(v) =>
                `${v.rvis_consec}-${v.rctt_cust}-${v.rctt_succli}-${v.rvis_horinivis}`
              }
              error={visitas.error}
              vacio="No hay visitas para los filtros seleccionados."
              porPagina={25}
              exportar={`visitas-${modo === "agrupada" ? "efectuadas" : "detalladas"}`}
            />
          </div>
        </>
      )}

      {/* Mapa de una visita concreta (boton "Ver" de la fila). */}
      <Modal
        abierto={visitaEnMapa !== null}
        titulo={visitaEnMapa ? visitaEnMapa.rctt_nomcli || visitaEnMapa.rctt_razsoc : "Ubicación"}
        descripcion={
          visitaEnMapa
            ? `${visitaEnMapa.rctt_cust} · ${visitaEnMapa.rvis_fecvis} ${visitaEnMapa.rvis_horinivis ?? ""}`
            : undefined
        }
        onCerrar={() => setVisitaEnMapa(null)}
        ancho="44rem"
      >
        {visitaEnMapa && google.apiKey ? (
          <Mapa apiKey={google.apiKey} marcadores={marcadoresFila} altura="24rem" />
        ) : (
          <Alert tone="warning">Esta visita no tiene coordenadas registradas.</Alert>
        )}
      </Modal>
    </>
  );
}
