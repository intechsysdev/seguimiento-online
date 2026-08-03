import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { Field } from "../../components/ui/Field";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { MultiSelect } from "../../components/ui/MultiSelect";
import { useApi } from "../../hooks/useApi";
import { useUsuariosAsignados } from "../../hooks/useUsuariosAsignados";
import { catalogosEvaService } from "../../services/eva/catalogosEvaService";
import { visitasEvaService } from "../../services/eva/visitasEvaService";
import { aFormatoApi, hoyISO } from "../../utils/dates";
import type { MobVisitaResumen } from "../../types/eva";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";

interface Filtro {
  fecIni: string;
  fecFin: string;
  territorios: string[];
  regiones: string[];
  perfiles: string[];
  vendedores: string[];
  duracionDesde: number;
  duracionHasta: number;
  horaDesde: string;
  horaHasta: string;
  cantDesde: number;
  cantHasta: number;
}

function filtroInicial(): Filtro {
  return {
    fecIni: hoyISO(),
    fecFin: hoyISO(),
    territorios: [],
    regiones: [],
    perfiles: [],
    vendedores: [],
    duracionDesde: 0,
    duracionHasta: 0,
    horaDesde: "",
    horaHasta: "",
    cantDesde: 0,
    cantHasta: 0,
  };
}

/** Migra Views/Visitas/Index.cshtml (menú "Consolidadas"). */
export function ConsolidadasPage() {
  const {
    usuarios,
    codigosAsignados,
    cargando: cargandoUsuarios,
    error: errorVendedores,
    cmpy,
    tenant,
  } = useUsuariosAsignados();

  const regiones = useApi(
    () => (tenant ? catalogosEvaService.regiones(tenant) : Promise.resolve([])),
    [tenant?.IDTenant],
  );
  const territorios = useApi(
    () => (tenant ? catalogosEvaService.territorios(tenant) : Promise.resolve([])),
    [tenant?.IDTenant],
  );
  const perfiles = useApi(
    () => (tenant ? catalogosEvaService.perfiles(tenant) : Promise.resolve([])),
    [tenant?.IDTenant],
  );

  const [borrador, setBorrador] = useState<Filtro>(filtroInicial);
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);

  const resumen = useApi(() => {
    if (!tenant || !cmpy || cargandoUsuarios) return Promise.resolve([]);
    return visitasEvaService.getListSummary(tenant, {
      fecIni: aFormatoApi(filtro.fecIni),
      fecFin: aFormatoApi(filtro.fecFin),
      Territorios: filtro.territorios,
      Regiones: filtro.regiones,
      Perfiles: filtro.perfiles,
      // Sin seleccion, el controller mandaba los vendedores asignados.
      Vendedores: filtro.vendedores.length ? filtro.vendedores : codigosAsignados,
      duracionVisitaDesde: filtro.duracionDesde,
      duracionVisitaHasta: filtro.duracionHasta,
      horaDesde: filtro.horaDesde,
      horaHasta: filtro.horaHasta,
      cantVisitaDesde: filtro.cantDesde,
      cantVisitaHasta: filtro.cantHasta,
    });
  }, [tenant?.IDTenant, cmpy, filtro, codigosAsignados, cargandoUsuarios]);

  const filas = resumen.datos ?? [];
  const totalVisitas = filas.reduce((suma, f) => suma + Number(f.cantvisitas || 0), 0);
  const promedio = filas.length ? Math.ceil(totalVisitas / filas.length) : 0;

  const columnas: Columna<MobVisitaResumen>[] = [
    {
      titulo: "Fecha",
      valor: (v) => v.rvis_fecvis,
      render: (v) => v.rvis_fecvis,
      ancho: "8rem",
    },
    {
      titulo: "Vendedor",
      valor: (v) => v.rusu_nombre,
      render: (v) => (
        <div>
          <strong>{v.rusu_nombre}</strong>
          <div className={formularios.url}>{v.rper_desper}</div>
        </div>
      ),
    },
    { titulo: "Región", valor: (v) => v.reg_desc, render: (v) => v.reg_desc },
    { titulo: "Territorio", valor: (v) => v.ter_desc, render: (v) => v.ter_desc },
    {
      titulo: "Primera",
      valor: (v) => v.minrvis_horinivis,
      render: (v) => v.minrvis_horinivis,
      ancho: "7rem",
    },
    {
      titulo: "Última",
      valor: (v) => v.maxrvis_horinivis,
      render: (v) => v.maxrvis_horinivis,
      ancho: "7rem",
    },
    {
      titulo: "Tiempo",
      valor: (v) => v.tiempoVis,
      render: (v) => v.tiempoVis,
      ancho: "7rem",
    },
    {
      titulo: "Visitas",
      alineacion: "derecha",
      ancho: "6rem",
      valor: (v) => Number(v.cantvisitas || 0),
      render: (v) => <strong>{v.cantvisitas}</strong>,
    },
    {
      titulo: "",
      ancho: "7rem",
      alineacion: "derecha",
      render: (v) => (
        <Link
          to={`/visitas/detalladas?codUsu=${encodeURIComponent(
            codigoDeVendedor(usuarios, v.rusu_nombre),
          )}&fecIni=${filtro.fecIni}&fecFin=${filtro.fecFin}`}
        >
          Ver detalle
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Visitas"
        title="Consolidadas"
        description="Resumen de visitas por vendedor y día."
        actions={
          <div className={formularios.accionesFila}>
            <Badge tone="accent">{totalVisitas} visitas</Badge>
            <Badge tone="tier">Promedio {promedio}</Badge>
          </div>
        }
      />

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
          etiqueta="Vendedores"
          opciones={usuarios.map((u) => ({
            valor: u.KEY_rusu_codusu,
            etiqueta: `${u.KEY_rusu_codusu} — ${u.rusu_nombre}`,
          }))}
          seleccion={borrador.vendedores}
          onChange={(vendedores) => setBorrador((p) => ({ ...p, vendedores }))}
          vacioSignifica="Asignados"
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

        <Field label="Visitas desde" htmlFor="cantDesde" optional>
          <input
            id="cantDesde"
            type="number"
            min={0}
            className={inputs.input}
            value={borrador.cantDesde}
            onChange={(e) => setBorrador((p) => ({ ...p, cantDesde: Number(e.target.value) }))}
          />
        </Field>

        <Field label="Visitas hasta" htmlFor="cantHasta" optional>
          <input
            id="cantHasta"
            type="number"
            min={0}
            className={inputs.input}
            value={borrador.cantHasta}
            onChange={(e) => setBorrador((p) => ({ ...p, cantHasta: Number(e.target.value) }))}
          />
        </Field>

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
          <Button variant="primary" onClick={() => setFiltro(borrador)}>
            Buscar
          </Button>
        </div>
      </div>

      <DataTable
        columnas={columnas}
        filas={filas}
        claveFila={(v) => `${v.rvis_fecvis}-${v.rusu_nombre}-${v.rusu_teri}`}
        cargando={resumen.cargando || cargandoUsuarios}
        error={resumen.error}
        vacio="No hay visitas para los filtros seleccionados."
        porPagina={25}
      />
    </>
  );
}

/** El resumen no trae el codigo del vendedor, solo el nombre. */
function codigoDeVendedor(
  usuarios: { KEY_rusu_codusu: string; rusu_nombre: string }[],
  nombre: string,
) {
  return usuarios.find((u) => u.rusu_nombre === nombre)?.KEY_rusu_codusu ?? "";
}
