import { useMemo, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Alert } from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { MultiSelect } from "../../components/ui/MultiSelect";
import { Mapa, type MarcadorMapa } from "../../components/mapa/Mapa";
import { IconoPunto } from "../../components/mapa/IconoPunto";
import { colorEstado } from "../../components/mapa/tiposPunto";
import { useApi } from "../../hooks/useApi";
import { useGoogleMapsKey, useMobiControl } from "../../hooks/useAppConfig";
import { useUsuariosAsignados } from "../../hooks/useUsuariosAsignados";
import { catalogosEvaService } from "../../services/eva/catalogosEvaService";
import { mobicontrolService } from "../../services/mobicontrolService";
import { formatDateTime } from "../../utils/dates";
import formularios from "../seguridad/Formularios.module.css";

interface Filtro {
  regiones: string[];
  perfiles: string[];
  vendedores: string[];
  enLinea: boolean;
  desconectados: boolean;
}

const SIN_FILTRO: Filtro = {
  regiones: [],
  perfiles: [],
  vendedores: [],
  enLinea: false,
  desconectados: false,
};

interface FilaUbicacion {
  deviceId: string;
  codusu: string;
  nombre: string;
  perfil: string;
  enLinea: boolean;
  bateria: number;
  ultimaConexion: string;
  lat: number;
  lng: number;
  momento: string;
}

/** Migra Views/Ubicaciones/Index.cshtml. */
export function UbicacionesPage() {
  const {
    usuarios,
    cargando: cargandoUsuarios,
    error: errorVendedores,
    tenant,
  } = useUsuariosAsignados();
  const mobi = useMobiControl();
  const google = useGoogleMapsKey();

  const regiones = useApi(
    () => (tenant ? catalogosEvaService.regiones(tenant) : Promise.resolve([])),
    [tenant?.IDTenant],
  );
  const perfiles = useApi(
    () => (tenant ? catalogosEvaService.perfiles(tenant) : Promise.resolve([])),
    [tenant?.IDTenant],
  );

  const [borrador, setBorrador] = useState<Filtro>(SIN_FILTRO);
  const [filtro, setFiltro] = useState<Filtro>(SIN_FILTRO);

  /** Vendedores que quedan tras aplicar los filtros del ERP. */
  const vendedoresFiltrados = useMemo(() => {
    let lista = usuarios;
    if (filtro.regiones.length) lista = lista.filter((u) => filtro.regiones.includes(u.rusu_reg));
    if (filtro.perfiles.length) lista = lista.filter((u) => filtro.perfiles.includes(u.rusu_codper));
    if (filtro.vendedores.length)
      lista = lista.filter((u) => filtro.vendedores.includes(u.KEY_rusu_codusu));
    return lista;
  }, [usuarios, filtro]);

  /**
   * El controller solo consultaba MobiControl si habia al menos un filtro
   * aplicado; se mantiene para no traer toda la flota por accidente.
   */
  const hayFiltro =
    filtro.regiones.length > 0 || filtro.perfiles.length > 0 || filtro.vendedores.length > 0;

  const ubicaciones = useApi<FilaUbicacion[]>(async () => {
    if (!hayFiltro || !mobi.config || !mobi.token || vendedoresFiltrados.length === 0) return [];

    // Filtro de MobiControl: "DeviceName%3Acod%2C" por cada vendedor.
    const filtroDispositivos = vendedoresFiltrados
      .map((u) => `DeviceName%3A${u.KEY_rusu_codusu}%2C`)
      .join("");

    const dispositivos = await mobicontrolService.getAllDevices(
      mobi.config,
      filtroDispositivos,
      mobi.token,
    );

    const nombrePerfil = (codper: string) =>
      perfiles.datos?.find((p) => p.KEY_rper_codper === codper)?.rper_desper ?? codper;

    const filas = await Promise.all(
      (dispositivos ?? []).map(async (dispositivo) => {
        // El controller pedia "Locate" antes de leer la ultima posicion.
        await mobicontrolService
          .updateLocate(mobi.config!, dispositivo.DeviceId, mobi.token)
          .catch(() => undefined);

        const ultima = await mobicontrolService
          .getLastLocationByDeviceId(mobi.config!, dispositivo.DeviceId, mobi.token)
          .catch(() => null);

        const vendedor = usuarios.find((u) => u.KEY_rusu_codusu === dispositivo.DeviceName);

        return {
          deviceId: dispositivo.DeviceId,
          codusu: dispositivo.DeviceName,
          nombre: vendedor?.rusu_nombre ?? dispositivo.DeviceName,
          perfil: nombrePerfil(vendedor?.rusu_codper ?? ""),
          enLinea: dispositivo.IsAgentOnline,
          bateria: dispositivo.BatteryStatus,
          ultimaConexion: dispositivo.LastAgentConnectTime,
          // Sin posicion conocida el MVC caia al centro de Cali.
          lat: Number(ultima?.Latitude ?? 3.53841),
          lng: Number(ultima?.Longitude ?? -76.30114),
          momento: ultima?.CollectionTimestamp ?? "",
        } satisfies FilaUbicacion;
      }),
    );

    if (filtro.enLinea && !filtro.desconectados) return filas.filter((f) => f.enLinea);
    if (!filtro.enLinea && filtro.desconectados) return filas.filter((f) => !f.enLinea);
    return filas;
  }, [hayFiltro, mobi.config?.IDApplicationConfig, mobi.token, vendedoresFiltrados, filtro, perfiles.datos]);

  /* Cada fila es un equipo, asi que el marcador va con el icono Dispositivo y
     el estado en color: azul en linea, rojo desconectado. */
  const marcadores: MarcadorMapa[] = (ubicaciones.datos ?? []).map((fila) => ({
    id: fila.deviceId,
    lat: fila.lat,
    lng: fila.lng,
    titulo: fila.nombre,
    tipo: "dispositivo",
    color: colorEstado(fila.enLinea),
    detalle: `<strong>${fila.nombre}</strong><br/>${fila.codusu} · ${fila.perfil}<br/>${
      fila.enLinea ? "En línea" : "Desconectado"
    }<br/>${fila.momento ? formatDateTime(fila.momento) : "Sin última posición"}`,
  }));

  const columnas: Columna<FilaUbicacion>[] = [
    {
      titulo: "Funcionario",
      valor: (f) => f.nombre,
      render: (f) => (
        <div className={formularios.conIcono}>
          {/* El mismo icono y el mismo color que lleva el punto en el mapa. */}
          <IconoPunto
            tipo="dispositivo"
            color={colorEstado(f.enLinea)}
            tam={18}
            etiqueta={`Dispositivo ${f.enLinea ? "en línea" : "desconectado"}`}
          />
          <span>
            <strong>{f.nombre}</strong>
            <div className={formularios.url}>{f.codusu}</div>
          </span>
        </div>
      ),
    },
    { titulo: "Perfil", valor: (f) => f.perfil, render: (f) => f.perfil },
    {
      titulo: "Estado",
      ancho: "8rem",
      valor: (f) => (f.enLinea ? "En línea" : "Desconectado"),
      // Azul en linea / rojo desconectado, igual que el marcador del mapa.
      render: (f) => (
        <Badge tone={f.enLinea ? "accent" : "critical"} dot>
          {f.enLinea ? "En línea" : "Desconectado"}
        </Badge>
      ),
    },
    {
      titulo: "Batería",
      ancho: "6rem",
      alineacion: "derecha",
      valor: (f) => f.bateria,
      render: (f) => `${f.bateria}%`,
    },
    {
      titulo: "Última posición",
      valor: (f) => f.momento,
      render: (f) => (f.momento ? formatDateTime(f.momento) : "—"),
      ancho: "12rem",
    },
  ];

  return (
    <>
      <PageHeader
        title="Ubicaciones"
        eyebrow={tenant?.NameCompanyTenant}
        description="Última posición reportada por los dispositivos."
        actions={<Badge tone="accent">{ubicaciones.datos?.length ?? 0} dispositivos</Badge>}
      />

      {mobi.error ? (
        <Alert tone="critical">No se pudo conectar con MobiControl.</Alert>
      ) : null}
      {google.error ? (
        <Alert tone="warning">No se pudo leer la API key de Google Maps.</Alert>
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
          etiqueta="Perfiles"
          opciones={(perfiles.datos ?? []).map((p) => ({
            valor: p.KEY_rper_codper,
            etiqueta: p.rper_desper,
          }))}
          seleccion={borrador.perfiles}
          onChange={(perfiles) => setBorrador((p) => ({ ...p, perfiles }))}
        />

        <MultiSelect
          etiqueta="Funcionarios"
          opciones={usuarios.map((u) => ({
            valor: u.KEY_rusu_codusu,
            etiqueta: `${u.KEY_rusu_codusu} — ${u.rusu_nombre}`,
          }))}
          seleccion={borrador.vendedores}
          onChange={(vendedores) => setBorrador((p) => ({ ...p, vendedores }))}
        />

        <div className={formularios.checkEstado}>
          <label className={formularios.check}>
            <input
              type="checkbox"
              checked={borrador.enLinea}
              onChange={(e) => setBorrador((p) => ({ ...p, enLinea: e.target.checked }))}
            />
            En línea
          </label>
          <label className={formularios.check}>
            <input
              type="checkbox"
              checked={borrador.desconectados}
              onChange={(e) => setBorrador((p) => ({ ...p, desconectados: e.target.checked }))}
            />
            Desconectados
          </label>
        </div>

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
          <Button
            variant="primary"
            onClick={() => setFiltro(borrador)}
            disabled={mobi.cargando || cargandoUsuarios}
          >
            Buscar
          </Button>
        </div>
      </div>

      {!hayFiltro ? (
        <Alert tone="info">
          Selecciona al menos una región, perfil o vendedor para consultar los dispositivos.
        </Alert>
      ) : ubicaciones.cargando || mobi.cargando ? (
        <Spinner mensaje="Consultando dispositivos…" />
      ) : (
        <>
          {google.apiKey ? (
            <Mapa apiKey={google.apiKey} marcadores={marcadores} altura="28rem" />
          ) : null}

          <div style={{ marginTop: "var(--space-5)" }}>
            <DataTable
              columnas={columnas}
              filas={ubicaciones.datos}
              claveFila={(f) => f.deviceId}
              vacio="No hay dispositivos para los filtros seleccionados."
              porPagina={15}
              exportar="ubicaciones"
            />
          </div>
        </>
      )}
    </>
  );
}
