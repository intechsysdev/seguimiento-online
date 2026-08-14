import { useMemo, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { MultiSelect } from "../../components/ui/MultiSelect";
import { Mapa, type MarcadorMapa } from "../../components/mapa/Mapa";
import { IconoPunto } from "../../components/mapa/IconoPunto";
import { useApi } from "../../hooks/useApi";
import { useGoogleMapsKey } from "../../hooks/useAppConfig";
import { useUsuariosAsignados } from "../../hooks/useUsuariosAsignados";
import { catalogosEvaService } from "../../services/eva/catalogosEvaService";
import { clientesEvaService } from "../../services/eva/clientesEvaService";
import { coordenadaInvalida, esCoordenada } from "../../utils/geo";
import type { MobCliente } from "../../types/eva";
import formularios from "../seguridad/Formularios.module.css";
import estilos from "../visitas/Visitas.module.css";

/**
 * Tope de marcadores. Una region completa puede traer miles de clientes y el
 * mapa se vuelve inmanejable; se dibujan los primeros y se avisa cuantos
 * quedaron fuera, que es preferible a recortar en silencio.
 */
const MAX_MARCADORES = 500;

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

  const google = useGoogleMapsKey();

  /**
   * Clientes ubicables. Los que no tienen coordenadas no pueden ir al mapa,
   * asi que se cuentan aparte para poder decirlo en pantalla.
   */
  const ubicables = useMemo(
    () => (clientes.datos ?? []).filter(tieneCoordenadas),
    [clientes.datos],
  );

  const marcadores: MarcadorMapa[] = useMemo(
    () =>
      ubicables.slice(0, MAX_MARCADORES).map((c) => ({
        id: `${c.KEY_rctt_cust}-${c.KEY_rctt_succli}-${c.KEY_rctt_reg}`,
        tipo: "cliente" as const,
        lat: Number(c.rctt_latitud),
        lng: Number(c.rctt_longitud),
        titulo: c.rctt_nomcli || c.rctt_razsoc,
        color: "verde" as const,
        detalle: detalleHtml(c),
      })),
    [ubicables],
  );

  /*
    Se separan los dos motivos por los que un cliente no llega al mapa: no
    tener GPS es normal, tenerlo mal capturado (invertido, fuera de rango) es
    un dato que alguien deberia corregir en el ERP.
  */
  const invalidos = useMemo(
    () => (clientes.datos ?? []).filter((c) => coordenadaInvalida(c.rctt_latitud, c.rctt_longitud)),
    [clientes.datos],
  ).length;
  const sinCoordenadas = (clientes.datos?.length ?? 0) - ubicables.length - invalidos;
  const recortados = Math.max(0, ubicables.length - MAX_MARCADORES);

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
          {c.rctt_addr ? <div className={formularios.sub}>{c.rctt_addr}</div> : null}
        </div>
      ),
    },
    { titulo: "Funcionario", valor: (c) => c.rctt_codusu, render: (c) => c.rctt_codusu },
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
        description="Clientes de los funcionarios asignados a tu usuario."
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
          etiqueta="Funcionarios"
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

      {/*
        Mapa de los clientes que quedaron tras el filtro.
        La condicion NO mira `cargando`: al hacerlo, cada busqueda desmontaba y
        volvia a montar el mapa, y los marcadores de la consulta anterior se
        quedaban pegados. Mientras recarga se mantiene el mapa anterior y se
        avisa en la nota.
      */}
      {(clientes.datos?.length ?? 0) > 0 ? (
        <>
          <div className={estilos.capas}>
            <span className={estilos.capasTitulo}>En el mapa</span>
            <span className={estilos.capa}>
              <IconoPunto tipo="cliente" color="verde" /> Cliente
            </span>
            <span className={estilos.nota}>
              {clientes.cargando || cargandoUsuarios ? (
                "Actualizando…"
              ) : (
                <>
                  {marcadores.length} de {clientes.datos?.length} ubicados
                  {sinCoordenadas > 0 ? ` · ${sinCoordenadas} sin coordenadas` : ""}
                  {invalidos > 0 ? ` · ${invalidos} con coordenadas erradas` : ""}
                  {recortados > 0 ? ` · ${recortados} sin dibujar, afina el filtro` : ""}
                </>
              )}
            </span>
          </div>

          {marcadores.length === 0 ? (
            <p className={estilos.sinCapas}>
              Ninguno de los clientes filtrados tiene coordenadas registradas.
            </p>
          ) : google.error ? (
            <Alert tone="warning">No se pudo leer la API key de Google Maps.</Alert>
          ) : google.apiKey ? (
            <Mapa apiKey={google.apiKey} marcadores={marcadores} altura="28rem" />
          ) : null}
        </>
      ) : null}

      <div style={{ marginTop: "var(--space-5)" }}>
        <DataTable
          columnas={columnas}
          filas={clientes.datos}
          claveFila={(c) => `${c.KEY_rctt_cust}-${c.KEY_rctt_succli}-${c.KEY_rctt_reg}`}
          cargando={clientes.cargando || cargandoUsuarios}
          vacio="No hay clientes para los filtros seleccionados."
          porPagina={25}
          exportar="clientes"
        />
      </div>
    </>
  );
}

/** Ficha del cliente en el globo del mapa. */
function detalleHtml(c: MobCliente) {
  const codigo = [c.KEY_rctt_cust, c.KEY_rctt_succli !== "0" ? c.KEY_rctt_succli : ""]
    .filter(Boolean)
    .join("-");
  const ruta = c.rctt_ruta ? `Ruta ${c.rctt_ruta} / ${c.rctt_sec ?? ""}` : "";
  const lineas = [
    [codigo, c.rctt_addr].filter(Boolean).join(" · "),
    [c.rctt_nomcan, ruta].filter(Boolean).join(" · "),
    [c.rctt_codusu, c.rctt_celular || c.rctt_tele].filter(Boolean).join(" · "),
  ].filter(Boolean);

  return (
    `<strong>${c.rctt_nomcli || c.rctt_razsoc}</strong>` +
    (lineas.length ? `<br/>${lineas.join("<br/>")}` : "")
  );
}

function tieneCoordenadas(cliente: MobCliente) {
  return esCoordenada(cliente.rctt_latitud, cliente.rctt_longitud);
}
