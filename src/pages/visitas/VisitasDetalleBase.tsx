import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { visitasEvaService } from "../../services/eva/visitasEvaService";
import { mobicontrolService } from "../../services/mobicontrolService";
import { aFormatoApi, hoyISO } from "../../utils/dates";
import type { FiltersDetalle, MobVisitaDto, MobVisitaGrupoDto } from "../../types/eva";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";

interface Filtro {
  fecIni: string;
  fecFin: string;
  codUsu: string;
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

function filtroInicial(codUsu = "", fecIni = hoyISO(), fecFin = hoyISO()): Filtro {
  return {
    fecIni,
    fecFin,
    codUsu,
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
    params.get("codUsu") ?? "",
    params.get("fecIni") ?? hoyISO(),
    params.get("fecFin") ?? hoyISO(),
  );

  const [borrador, setBorrador] = useState<Filtro>(inicial);
  const [filtro, setFiltro] = useState<Filtro>(inicial);

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
      codUsu: filtro.codUsu ? [filtro.codUsu] : codigosAsignados,
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

    return modo === "agrupada"
      ? visitasEvaService.getListCompuestoGroup(tenant, filtroApi)
      : visitasEvaService.getListCompuesto(tenant, filtroApi);
  }, [tenant?.IDTenant, filtro, codigosAsignados, cargandoUsuarios, modo]);

  /** Recorrido GPS: solo tiene sentido con un vendedor concreto. */
  const recorrido = useApi(async () => {
    if (!filtro.codUsu || !mobi.config || !mobi.token) return [];

    const dispositivos = await mobicontrolService
      .getDevices(mobi.config, filtro.codUsu, mobi.token)
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
  }, [filtro.codUsu, filtro.fecIni, filtro.fecFin, mobi.config?.IDApplicationConfig, mobi.token]);

  const marcadores: MarcadorMapa[] = useMemo(
    () =>
      (visitas.datos ?? [])
        .filter((v) => Number(v.rvis_latitud) && Number(v.rvis_longitud))
        .map((v, indice) => ({
          id: `${v.rctt_cust}-${v.rctt_succli}-${indice}`,
          lat: Number(v.rvis_latitud),
          lng: Number(v.rvis_longitud),
          titulo: v.rctt_nomcli || v.rctt_razsoc,
          etiqueta: String(indice + 1),
          color: "azul",
          detalle: `<strong>${v.rctt_nomcli || v.rctt_razsoc}</strong><br/>${v.rctt_addr ?? ""}<br/>${
            v.rvis_horinivis
          } - ${v.rvis_horfinvis} (${v.tiempoVis ?? ""})`,
        })),
    [visitas.datos],
  );

  /**
   * Dos rutas: el orden de las visitas (rojo, como el MVC) y el recorrido real
   * del dispositivo (azul). Ambas se dibujan siguiendo las calles.
   */
  const trazados: Trazado[] = useMemo(() => {
    const lista: Trazado[] = [];

    const puntosVisitas = (visitas.datos ?? [])
      .filter((v) => Number(v.rvis_latitud) && Number(v.rvis_longitud))
      .map((v) => ({ lat: Number(v.rvis_latitud), lng: Number(v.rvis_longitud) }));
    if (puntosVisitas.length >= 2) lista.push({ puntos: puntosVisitas, color: "red", grosor: 4 });

    const gps = recorrido.datos ?? [];
    if (gps.length >= 2) lista.push({ puntos: gps, color: "#1a73e8", grosor: 4 });

    return lista;
  }, [visitas.datos, recorrido.datos]);

  const columnas: Columna<Fila>[] = [
    {
      titulo: "Fecha",
      valor: (v) => v.rvis_fecvis,
      render: (v) => v.rvis_fecvis,
      ancho: "8rem",
    },
    {
      titulo: "Vendedor",
      valor: (v) => v.rusu_nombre ?? "",
      render: (v) => (
        <div>
          <strong>{v.rusu_nombre}</strong>
          <div className={formularios.url}>{v.rvis_codusu}</div>
        </div>
      ),
    },
    {
      titulo: "Cliente",
      valor: (v) => v.rctt_nomcli || v.rctt_razsoc,
      render: (v) => (
        <div>
          {v.rctt_nomcli || v.rctt_razsoc}
          {v.rctt_addr ? <div className={formularios.url}>{v.rctt_addr}</div> : null}
        </div>
      ),
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

      {mobi.error && filtro.codUsu ? (
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

        <Field label="Vendedor" htmlFor="codUsu" hint="Requerido para ver el recorrido GPS.">
          <select
            id="codUsu"
            className={inputs.select}
            value={borrador.codUsu}
            onChange={(e) => setBorrador((p) => ({ ...p, codUsu: e.target.value }))}
          >
            <option value="">Todos los asignados</option>
            {usuarios.map((u) => (
              <option key={u.KEY_rusu_codusu} value={u.KEY_rusu_codusu}>
                {u.KEY_rusu_codusu} — {u.rusu_nombre}
              </option>
            ))}
          </select>
        </Field>

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
          {google.apiKey && marcadores.length ? (
            <Mapa
              apiKey={google.apiKey}
              marcadores={marcadores}
              trazados={trazados}
              altura="28rem"
            />
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
            />
          </div>
        </>
      )}
    </>
  );
}
