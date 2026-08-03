import { useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { MultiSelect } from "../../components/ui/MultiSelect";
import { useApi } from "../../hooks/useApi";
import { useUsuariosAsignados } from "../../hooks/useUsuariosAsignados";
import { catalogosEvaService } from "../../services/eva/catalogosEvaService";
import { clientesEvaService } from "../../services/eva/clientesEvaService";
import type { MobCliente } from "../../types/eva";
import formularios from "../seguridad/Formularios.module.css";

interface Filtro {
  regiones: string[];
  ciudades: string[];
  usuarios: string[];
  canales: string[];
}

const SIN_FILTRO: Filtro = { regiones: [], ciudades: [], usuarios: [], canales: [] };

/** Migra Views/Clientes/Index.cshtml. */
export function ClientesPage() {
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
  const ciudades = useApi(
    () => (tenant && cmpy ? catalogosEvaService.ciudades(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const canales = useApi(
    () => (tenant && cmpy ? catalogosEvaService.canales(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );

  const [borrador, setBorrador] = useState<Filtro>(SIN_FILTRO);
  const [filtro, setFiltro] = useState<Filtro>(SIN_FILTRO);

  const clientes = useApi(() => {
    if (!tenant || !cmpy || cargandoUsuarios) return Promise.resolve([]);
    return clientesEvaService.getList(tenant, {
      cmpy,
      regiones: filtro.regiones,
      ciudades: filtro.ciudades,
      canales: filtro.canales,
      // Sin seleccion el controller mandaba todos los vendedores asignados.
      usuarios: filtro.usuarios.length ? filtro.usuarios : codigosAsignados,
    });
  }, [tenant?.IDTenant, cmpy, filtro, codigosAsignados, cargandoUsuarios]);

  const columnas: Columna<MobCliente>[] = [
    {
      titulo: "Código",
      valor: (c) => c.KEY_rctt_cust,
      render: (c) => (
        <code>
          {c.KEY_rctt_cust}
          {c.KEY_rctt_succli && c.KEY_rctt_succli !== "0" ? `-${c.KEY_rctt_succli}` : ""}
        </code>
      ),
      ancho: "9rem",
    },
    {
      titulo: "Cliente",
      valor: (c) => c.rctt_nomcli || c.rctt_razsoc,
      render: (c) => (
        <div>
          <strong>{c.rctt_nomcli || c.rctt_razsoc}</strong>
          {c.rctt_addr ? <div className={formularios.url}>{c.rctt_addr}</div> : null}
        </div>
      ),
    },
    { titulo: "Vendedor", valor: (c) => c.rctt_codusu, render: (c) => c.rctt_codusu },
    { titulo: "Canal", valor: (c) => c.rctt_nomcan ?? "", render: (c) => c.rctt_nomcan },
    {
      titulo: "Teléfono",
      valor: (c) => c.rctt_tele ?? "",
      render: (c) => c.rctt_celular || c.rctt_tele,
    },
    {
      titulo: "Ruta / Sec.",
      valor: (c) => `${c.rctt_ruta ?? ""}-${c.rctt_sec ?? ""}`,
      render: (c) => `${c.rctt_ruta ?? ""} / ${c.rctt_sec ?? ""}`,
      ancho: "8rem",
    },
    {
      titulo: "GPS",
      alineacion: "centro",
      ancho: "6rem",
      valor: (c) => (tieneCoordenadas(c) ? "Sí" : "No"),
      render: (c) => (
        <Badge tone={tieneCoordenadas(c) ? "success" : "neutral"} dot>
          {tieneCoordenadas(c) ? "Sí" : "No"}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Clientes"
        eyebrow={tenant?.NameCompanyTenant}
        description="Clientes de los vendedores asignados a tu usuario."
        actions={<Badge tone="accent">{clientes.datos?.length ?? 0} clientes</Badge>}
      />

      {clientes.error ? (
        <Alert tone="critical">No se pudo consultar el API de la compañía.</Alert>
      ) : null}

      {errorVendedores ? <Alert tone="warning">{errorVendedores}</Alert> : null}

      <div className={formularios.filtros}>
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
          etiqueta="Ciudades"
          opciones={(ciudades.datos ?? []).map((c) => ({
            valor: c.KEY_dis_dist,
            etiqueta: c.dis_desc,
          }))}
          seleccion={borrador.ciudades}
          onChange={(ciudades) => setBorrador((p) => ({ ...p, ciudades }))}
        />

        <MultiSelect
          etiqueta="Vendedores"
          opciones={usuarios.map((u) => ({
            valor: u.KEY_rusu_codusu,
            etiqueta: `${u.KEY_rusu_codusu} — ${u.rusu_nombre}`,
          }))}
          seleccion={borrador.usuarios}
          onChange={(usuarios) => setBorrador((p) => ({ ...p, usuarios }))}
          vacioSignifica="Asignados"
        />

        <MultiSelect
          etiqueta="Canales"
          opciones={(canales.datos ?? []).map((c) => ({
            valor: c.KEY_cu_type,
            etiqueta: c.cu_desc,
          }))}
          seleccion={borrador.canales}
          onChange={(canales) => setBorrador((p) => ({ ...p, canales }))}
        />

        <div className={formularios.accionesFila}>
          <Button
            variant="ghost"
            onClick={() => {
              setBorrador(SIN_FILTRO);
              setFiltro(SIN_FILTRO);
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
        filas={clientes.datos}
        claveFila={(c) => `${c.KEY_rctt_cust}-${c.KEY_rctt_succli}-${c.KEY_rctt_reg}`}
        cargando={clientes.cargando || cargandoUsuarios}
        vacio="No hay clientes para los filtros seleccionados."
        porPagina={25}
      />
    </>
  );
}

function tieneCoordenadas(cliente: MobCliente) {
  const lat = Number(cliente.rctt_latitud);
  const lon = Number(cliente.rctt_longitud);
  return Boolean(lat) && Boolean(lon) && !Number.isNaN(lat) && !Number.isNaN(lon);
}
