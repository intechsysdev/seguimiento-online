import { useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { MultiSelect } from "../../components/ui/MultiSelect";
import { useApi } from "../../hooks/useApi";
import { useUsuariosAsignados } from "../../hooks/useUsuariosAsignados";
import { catalogosEvaService } from "../../services/eva/catalogosEvaService";
import { materialPopService } from "../../services/eva/materialPopService";
import { aFormatoApi, hoyISO } from "../../utils/dates";
import type { MovimientoMaterial } from "../../types/eva";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";
import estilos from "./Pop.module.css";

interface Filtro {
  fecIni: string;
  fecFin: string;
  materiales: string[];
  marcas: string[];
  vendedores: string[];
  perfiles: string[];
  regiones: string[];
  territorios: string[];
}

function filtroInicial(): Filtro {
  // El controller inicializaba ambas fechas en el dia de hoy.
  return {
    fecIni: hoyISO(),
    fecFin: hoyISO(),
    materiales: [],
    marcas: [],
    vendedores: [],
    perfiles: [],
    regiones: [],
    territorios: [],
  };
}

/** Migra Views/Materialpop/Entregas.cshtml. */
export function EntregasPage() {
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
  const materiales = useApi(
    () => (tenant && cmpy ? materialPopService.getList(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const marcas = useApi(
    () => (tenant && cmpy ? materialPopService.getListMarcas(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );

  const [borrador, setBorrador] = useState<Filtro>(filtroInicial);
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const [foto, setFoto] = useState<MovimientoMaterial | null>(null);

  const entregas = useApi(() => {
    if (!tenant || !cmpy || cargandoUsuarios) return Promise.resolve([]);
    return materialPopService.getFiltersList(tenant, {
      Cmpy: cmpy,
      FecIni: aFormatoApi(filtro.fecIni),
      FecFin: aFormatoApi(filtro.fecFin),
      Materiales: filtro.materiales.map(Number),
      Marcas: filtro.marcas.map(Number),
      // Sin seleccion, el controller mandaba los vendedores asignados.
      codUsu: filtro.vendedores.length ? filtro.vendedores : codigosAsignados,
      Perfiles: filtro.perfiles,
      Regiones: filtro.regiones,
      Territorios: filtro.territorios,
    });
  }, [tenant?.IDTenant, cmpy, filtro, codigosAsignados, cargandoUsuarios]);

  const columnas: Columna<MovimientoMaterial>[] = [
    {
      titulo: "Foto",
      ancho: "5rem",
      render: (e) =>
        e.rdetallepop_image ? (
          <img
            src={e.rdetallepop_image}
            alt="Entrega"
            className={estilos.fotoEntrega}
            onClick={() => setFoto(e)}
          />
        ) : (
          <span className={estilos.sinImagen} aria-hidden="true" />
        ),
    },
    {
      titulo: "Fecha",
      valor: (e) => `${e.rpop_date} ${e.rpop_time}`,
      render: (e) => (
        <div>
          {e.rpop_date}
          <div className={formularios.url}>{e.rpop_time}</div>
        </div>
      ),
      ancho: "9rem",
    },
    {
      titulo: "Vendedor",
      valor: (e) => e.rusu_nombre,
      render: (e) => (
        <div>
          <strong>{e.rusu_nombre}</strong>
          <div className={formularios.url}>{e.rpop_codusu}</div>
        </div>
      ),
    },
    {
      titulo: "Cliente",
      valor: (e) => e.rctt_nomcli || e.rctt_razsoc,
      render: (e) => (
        <div>
          {e.rctt_nomcli || e.rctt_razsoc}
          {e.rctt_addr ? <div className={formularios.url}>{e.rctt_addr}</div> : null}
        </div>
      ),
    },
    { titulo: "Marca", valor: (e) => e.rmarcapop_marca, render: (e) => e.rmarcapop_marca },
    { titulo: "Material", valor: (e) => e.rmaterialpop_des, render: (e) => e.rmaterialpop_des },
    { titulo: "Región", valor: (e) => e.reg_desc, render: (e) => e.reg_desc },
    { titulo: "Territorio", valor: (e) => e.ter_desc, render: (e) => e.ter_desc },
    {
      titulo: "Ubicación",
      ancho: "6rem",
      render: (e) =>
        e.rpop_latitud && e.rpop_longitud ? (
          <a
            className={estilos.mapaLink}
            href={`https://www.google.com/maps/search/?api=1&query=${e.rpop_latitud},${e.rpop_longitud}`}
            target="_blank"
            rel="noreferrer"
          >
            Ver mapa
          </a>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Material POP"
        title="Entregas"
        description="Entregas de material registradas por los vendedores."
        actions={<Badge tone="accent">{entregas.datos?.length ?? 0} entregas</Badge>}
      />

      {entregas.error ? (
        <Alert tone="critical">No se pudo consultar el API de la compañía.</Alert>
      ) : null}

      {errorVendedores ? <Alert tone="warning">{errorVendedores}</Alert> : null}

      <div className={formularios.filtros}>
        <Field label="Desde" htmlFor="fecIni">
          <input
            id="fecIni"
            type="date"
            className={inputs.input}
            value={borrador.fecIni}
            onChange={(evento) => setBorrador((p) => ({ ...p, fecIni: evento.target.value }))}
          />
        </Field>

        <Field label="Hasta" htmlFor="fecFin">
          <input
            id="fecFin"
            type="date"
            className={inputs.input}
            value={borrador.fecFin}
            onChange={(evento) => setBorrador((p) => ({ ...p, fecFin: evento.target.value }))}
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

        <MultiSelect
          etiqueta="Marcas"
          opciones={(marcas.datos ?? []).map((m) => ({
            valor: String(m.rmarcapop_idmarca),
            // La vista mostraba "id - nombre".
            etiqueta: `${m.rmarcapop_idmarca} - ${m.rmarcapop_marca}`,
          }))}
          seleccion={borrador.marcas}
          onChange={(marcas) => setBorrador((p) => ({ ...p, marcas }))}
        />

        <MultiSelect
          etiqueta="Materiales"
          opciones={(materiales.datos ?? []).map((m) => ({
            valor: String(m.rmaterialpop_idmaterial),
            etiqueta: `${m.rmaterialpop_idmaterial} - ${m.rmaterialpop_des}`,
          }))}
          seleccion={borrador.materiales}
          onChange={(materiales) => setBorrador((p) => ({ ...p, materiales }))}
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
          <Button variant="primary" onClick={() => setFiltro(borrador)}>
            Buscar
          </Button>
        </div>
      </div>

      <DataTable
        columnas={columnas}
        filas={entregas.datos}
        claveFila={(e) => `${e.rpop_idpop}-${e.rdetallepop_idmaterial}-${e.rdetallepop_idmarca}`}
        cargando={entregas.cargando || cargandoUsuarios}
        vacio="No hay entregas para los filtros seleccionados."
        porPagina={25}
      />

      <Modal
        abierto={foto !== null}
        titulo={foto?.rctt_nomcli || foto?.rctt_razsoc || "Entrega"}
        descripcion={foto ? `${foto.rmarcapop_marca} · ${foto.rmaterialpop_des}` : undefined}
        onCerrar={() => setFoto(null)}
        ancho="42rem"
      >
        {foto?.rdetallepop_image ? (
          <img src={foto.rdetallepop_image} alt="Entrega" className={estilos.fotoGrande} />
        ) : null}
        {foto?.rpop_observacion ? <p>{foto.rpop_observacion}</p> : null}
      </Modal>
    </>
  );
}
