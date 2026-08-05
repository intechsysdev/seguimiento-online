import { useMemo } from "react";
import { useApi } from "../../hooks/useApi";
import { useUsuariosAsignados } from "../../hooks/useUsuariosAsignados";
import { useMobiControl } from "../../hooks/useAppConfig";
import { clientesEvaService } from "../../services/eva/clientesEvaService";
import { rutasEvaService, visitasEvaService } from "../../services/eva/visitasEvaService";
import { mobicontrolService } from "../../services/mobicontrolService";
import { aFormatoApi } from "../../utils/dates";
import type { MobRutaDto, MobVisitaGrupoDto } from "../../types/eva";

const FILTRO_VACIO = {
  MedioVisita: [] as string[],
  MotivoVisita: [] as string[],
  Acciones: [] as string[],
  noCompra: [] as string[],
  Tipomovimiento: [] as string[],
  Regiones: [] as string[],
  Territorios: [] as string[],
  Ciudades: [] as string[],
  codCust: "",
  duracionVisitaDesde: 0,
  duracionVisitaHasta: 0,
  horaDesde: "",
  horaHasta: "",
  cantVisitaDesde: 0,
  cantVisitaHasta: 0,
};

export interface FilaFuncionario {
  codusu: string;
  nombre: string;
  programadas: number;
  realizadas: number;
  extrarutas: number;
  efectividad: number;
  /** Estado del dispositivo en MobiControl; null si no tiene equipo. */
  enLinea: boolean | null;
  ultimaConexion: string;
  lat?: number;
  lng?: number;
}

/**
 * Datos del tablero de campo.
 *
 * Todo sale de endpoints que ya existen: la ruta planificada del dia
 * (Rutas/GetDetailDataCliente), las visitas efectuadas
 * (Visitas/GetListCompuestoRutasGroup) y el estado de los equipos en
 * MobiControl. La efectividad y el cumplimiento se calculan cruzando las dos
 * primeras, igual que hace la pantalla de Rutas.
 */
export function useDashboard(fecha: string, funcionariosFiltro: string[]) {
  const { usuarios, codigosAsignados, cargando: cargandoUsuarios, cmpy, tenant, error } =
    useUsuariosAsignados();
  const mobi = useMobiControl();

  const codigos = funcionariosFiltro.length ? funcionariosFiltro : codigosAsignados;

  const dia = useApi(async () => {
    if (!tenant || !cmpy || cargandoUsuarios || codigos.length === 0) {
      return { rutas: [] as MobRutaDto[], visitas: [] as MobVisitaGrupoDto[] };
    }

    const fecApi = aFormatoApi(fecha);

    const visitas = await visitasEvaService.getListCompuestoRutasGroup(tenant, {
      ...FILTRO_VACIO,
      codUsu: codigos,
      fecIni: fecApi,
      fecFin: fecApi,
    });

    const rutas = await rutasEvaService.getDetailDataCliente(tenant, {
      cmpy,
      codPer: usuarios.map((u) => u.rusu_codper),
      codUsu: codigos,
      fecRuta: fecApi,
      rruta_ruta: [],
    });

    return { rutas: rutas ?? [], visitas: visitas ?? [] };
  }, [tenant?.IDTenant, cmpy, fecha, codigos, cargandoUsuarios, usuarios]);

  /** Estado de los equipos: quien esta en linea y su ultima posicion. */
  const dispositivos = useApi(async () => {
    if (!mobi.config || !mobi.token || codigos.length === 0) return [];

    const filtro = codigos.map((c) => `DeviceName%3A${c}%2C`).join("");
    const lista = await mobicontrolService
      .getAllDevices(mobi.config, filtro, mobi.token)
      .catch(() => []);

    return await Promise.all(
      (lista ?? []).map(async (d) => {
        const ultima = await mobicontrolService
          .getLastLocationByDeviceId(mobi.config!, d.DeviceId, mobi.token)
          .catch(() => null);
        return {
          codusu: d.DeviceName,
          enLinea: d.IsAgentOnline,
          ultimaConexion: d.LastAgentConnectTime,
          lat: ultima ? Number(ultima.Latitude) : undefined,
          lng: ultima ? Number(ultima.Longitude) : undefined,
        };
      }),
    );
  }, [mobi.config?.IDApplicationConfig, mobi.token, codigos]);

  /** Cobertura de cartera del mes: clientes asignados vs. clientes visitados. */
  const cobertura = useApi(async () => {
    if (!tenant || !cmpy || codigos.length === 0) return { cartera: 0, visitados: 0 };

    const primero = `${fecha.slice(0, 8)}01`;
    const clientes = await clientesEvaService
      .getList(tenant, { cmpy, regiones: [], ciudades: [], canales: [], usuarios: codigos })
      .catch(() => []);

    const delMes = await visitasEvaService
      .getListCompuestoGroup(tenant, {
        ...FILTRO_VACIO,
        codUsu: codigos,
        fecIni: aFormatoApi(primero),
        fecFin: aFormatoApi(fecha),
      })
      .catch(() => []);

    const visitados = new Set(
      (delMes ?? []).map((v) => `${v.rvis_cust}|${v.rctt_succli}`),
    );

    return { cartera: (clientes ?? []).length, visitados: visitados.size };
  }, [tenant?.IDTenant, cmpy, fecha, codigos]);

  const resumen = useMemo(() => {
    const rutas = dia.datos?.rutas ?? [];
    const visitas = dia.datos?.visitas ?? [];

    const enRuta = new Set(rutas.map((r) => `${r.rruta_cus}|${r.rruta_succli}`));
    const extrarutas = visitas.filter((v) => !enRuta.has(`${v.rvis_cust}|${v.rctt_succli}`));

    const visitadas = new Set(visitas.map((v) => `${v.rvis_cust}|${v.rctt_succli}`));
    const realizadas = rutas.filter((r) => visitadas.has(`${r.rruta_cus}|${r.rruta_succli}`)).length;

    const programadas = rutas.length;
    const efectividad = programadas ? Math.round((realizadas / programadas) * 100) : 0;

    const estado = new Map(dispositivos.datos?.map((d) => [d.codusu, d]) ?? []);

    // Ranking por funcionario.
    const porFuncionario: FilaFuncionario[] = usuarios
      .filter((u) => codigos.includes(u.KEY_rusu_codusu))
      .map((u) => {
        const suyas = rutas.filter((r) => r.rruta_codusu === u.KEY_rusu_codusu);
        const hechas = suyas.filter((r) =>
          visitadas.has(`${r.rruta_cus}|${r.rruta_succli}`),
        ).length;
        const equipo = estado.get(u.KEY_rusu_codusu);

        return {
          codusu: u.KEY_rusu_codusu,
          nombre: u.rusu_nombre,
          programadas: suyas.length,
          realizadas: hechas,
          extrarutas: extrarutas.filter((v) => v.rvis_codusu === u.KEY_rusu_codusu).length,
          efectividad: suyas.length ? Math.round((hechas / suyas.length) * 100) : 0,
          enLinea: equipo ? equipo.enLinea : null,
          ultimaConexion: equipo?.ultimaConexion ?? "",
          lat: equipo?.lat,
          lng: equipo?.lng,
        };
      })
      .sort((a, b) => b.efectividad - a.efectividad);

    const conEquipo = porFuncionario.filter((f) => f.enLinea !== null);

    return {
      programadas,
      realizadas,
      pendientes: Math.max(0, programadas - realizadas),
      efectividad,
      extrarutas,
      porcentajeExtrarutas: visitas.length
        ? Math.round((extrarutas.length / visitas.length) * 1000) / 10
        : 0,
      totalFuncionarios: porFuncionario.length,
      enCampo: conEquipo.filter((f) => f.enLinea).length,
      inactivos: conEquipo.filter((f) => !f.enLinea).length,
      porFuncionario,
      rutas,
      visitas,
    };
  }, [dia.datos, dispositivos.datos, usuarios, codigos]);

  return {
    resumen,
    cobertura: cobertura.datos ?? { cartera: 0, visitados: 0 },
    usuarios,
    cargando: dia.cargando || cargandoUsuarios,
    cargandoMapa: dispositivos.cargando,
    error: error ?? dia.error,
    tenant,
  };
}
