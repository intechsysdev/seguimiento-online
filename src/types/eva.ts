/**
 * Tipos del API por compania (Models/Eva del proyecto MVC).
 *
 * Ojo con los [JsonPropertyName]: varias claves viajan con prefijo KEY_.
 */

export interface MobRusuario {
  KEY_rusu_cmpy: string;
  KEY_rusu_codusu: string;
  rusu_passwd: string;
  rusu_nombre: string;
  rusu_codper: string;
  rusu_correo: string;
  rusu_reg: string;
  rusu_teri: string;
  rusu_date: string;
  rusu_time: string;
  rusu_estadoupd: string;
}

export interface RegionE {
  reg_cmpy: string;
  reg_regi: string;
  reg_desc: string;
}

export interface TerritorioE {
  ter_cmpy: string;
  ter_teri: string;
  ter_desc: string;
}

export interface MobDistrict {
  KEY_dis_cmpy: string;
  KEY_dis_dist: string;
  dis_desc: string;
}

export interface MobCustType {
  KEY_cu_cmpy: string;
  KEY_cu_type: string;
  cu_desc: string;
  cu_pedminnuevo: string;
}

export interface MobPerfil {
  KEY_rper_cmpy: string;
  KEY_rper_codper: string;
  rper_desper: string;
  rper_estadoupd: string;
  rper_date: string;
  rper_time: string;
}

export interface MobCliente {
  KEY_rctt_cmpy: string;
  KEY_rctt_reg: string;
  KEY_rctt_cust: string;
  KEY_rctt_tipdoc: string;
  KEY_rctt_succli: string;
  rctt_resal: string;
  rctt_razsoc: string;
  rctt_nomcli: string;
  rctt_addr: string;
  rctt_tele: string;
  rctt_celular: string;
  rctt_dist: string;
  rctt_codusu: string;
  rctt_ruta: string;
  rctt_sec: string;
  rctt_latitud: string;
  rctt_longitud: string;
  rctt_frevisita: string;
  rctt_type: string;
  rctt_nomcan: string;
  rctt_diavisita: string;
  rctt_estrato: string;
}

export interface FilterCliente {
  regiones: string[];
  ciudades: string[];
  usuarios: string[];
  canales: string[];
  cmpy: string;
}

export interface MobRutaDto {
  rruta_cmpy: string;
  rruta_codusu: string;
  rruta_cus: string;
  rruta_succli: string;
  rruta_ruta: string;
  rruta_sec: string;
  rruta_fecha: string;
  rusu_nombre: string;
  rusu_codper: string;
  rctt_razsoc: string;
  rctt_nomcli: string;
  rctt_reg: string;
  reg_desc: string;
  rctt_tele: string;
  rctt_celular: string;
  rctt_dist: string;
  dis_desc: string;
  rctt_ruta: string;
  rctt_sec: string;
  rctt_latitud: string;
  rctt_longitud: string;
  rctt_frevisita: string;
  rctt_type: string;
  cu_desc: string;
  ter_desc: string;
  FueVisita: boolean | null;
  FuePresencial: boolean | null;
  latvis: string;
  longvis: string;
  rvis_fecvis: string;
  rvis_horinivis: string;
  rvis_horfinvis: string;
  order: number | null;
}

export interface FiltersRuta {
  cmpy: string;
  codUsu: string[];
  codPer: string[];
  fecRuta: string;
  rruta_ruta: string[];
}

export interface MobLinea {
  rln_cmpy: string;
  rln_linea: string;
  rln_descr: string;
}

export interface MobSublinea {
  rsb_cmpy: string;
  rsb_linea: string;
  rsb_subl: string;
  rsb_descr: string;
}

export interface MobMaterialPop {
  rmaterialpop_idmaterial: number;
  rmaterialpop_cmpy: string;
  rmaterialpop_des: string;
  rmaterialpop_image: string;
  rmarcapop_activo: string;
  rmaterialpop_updatebyuser: string;
  rmaterialpop_date: string;
  rmaterialpop_time: string;
  rmaterialpop_estadoupd: string;
}

export interface MobMarcaPop {
  rmarcapop_idmarca: number;
  rmarcapop_cmpy: string;
  rmarcapop_linea: string;
  rmarcapop_subl: string;
  rmarcapop_marca: string;
  rmarcapop_activo: string;
  rmarcapop_updatebyuser: string;
  rmarcapop_date: string;
  rmarcapop_time: string;
  rmarcapop_estadoupd: string;
}

export interface MovimientoMaterial {
  rpop_idpop: number;
  rdetallepop_cmpy: string;
  rdetallepop_idpop: number;
  rdetallepop_idmarca: number;
  rdetallepop_idmaterial: number;
  rdetallepop_image: string;
  rdetallepop_date: string;
  rdetallepop_time: string;
  rpop_latitud: string;
  rpop_longitud: string;
  rusu_nombre: string;
  rusu_reg: string;
  reg_desc: string;
  rusu_teri: string;
  ter_desc: string;
  rpop_codper: string;
  rper_desper: string;
  rpop_codusu: string;
  rmarcapop_marca: string;
  rmarcapop_activo: string;
  rpop_observacion: string;
  rpop_createbyemail: string;
  rpop_createbydevice: string;
  rpop_date: string;
  rpop_time: string;
  rctt_razsoc: string;
  rctt_nomcli: string;
  rctt_addr: string;
  rctt_latitud: string;
  rctt_longitud: string;
  rmaterialpop_des: string;
}

export interface FilterMaterialPop {
  Materiales: number[];
  Marcas: number[];
  codUsu: string[];
  Territorios: string[];
  Regiones: string[];
  Perfiles: string[];
  /** El MVC formateaba estas fechas como MM-dd-yyyy. */
  FecIni: string;
  FecFin: string;
  Cmpy: string;
}

/**
 * Visita detallada (un movimiento). Se listan solo los campos que usan las
 * vistas migradas; el DTO original tiene el maestro de cliente completo.
 */
export interface MobVisitaDto {
  rvis_cmpy: string;
  rvis_consec: string;
  rvis_codusu: string;
  /** Codigo del funcionario que registro la visita (el MVC lo muestra como "Usuario"). */
  rvis_enter: string;
  rvis_codmedvis: string;
  rmedio_desmedvis: string;
  movdesc: string;
  motdes: string;
  accdesc: string;
  rvis_fecvis: string;
  rvis_horinivis: string;
  rvis_horfinvis: string;
  rvis_obsvis: string;
  rvis_urlimagen: string;
  rvis_latitud: string;
  rvis_longitud: string;
  rctt_reg: string;
  rctt_cust: string;
  rctt_succli: string;
  rctt_razsoc: string;
  rctt_nomcli: string;
  rctt_addr: string;
  rctt_tele: string;
  rctt_celular: string;
  rctt_dist: string;
  rctt_codusu: string;
  rctt_ruta: string;
  rctt_sec: string;
  rctt_latitud: string;
  rctt_longitud: string;
  rctt_type: string;
  reg_desc: string;
  tiempoVis: string;
  dis_desc: string;
  docvis_desc: string;
  ter_desc: string;
  cu_desc: string;
  rusu_nombre: string;
  rusu_codper: string;
  order: number | null;
}

/** Visita consolidada por cliente (GetListCompuestoGroup / RutasGroup). */
export interface MobVisitaGrupoDto extends Omit<MobVisitaDto, "rmedio_desmedvis" | "movdesc" | "motdes" | "accdesc"> {
  /** Cliente de la visita; en el DTO agrupado viene aparte de rctt_cust. */
  rvis_cust: string;
  /**
   * Tipos de documento generados, unidos por coma. El API no lo llena en el
   * endpoint agrupado: se arma en el SPA cruzando con el detalle, igual que
   * hacia RutasController.
   */
  Movimientos: string;
  /**
   * Cuantos movimientos se registraron en el cliente. No existe en el API: se
   * cuenta en el SPA sobre el detalle. `undefined` cuando esa consulta fallo,
   * para no mostrar un 0 que se leeria como "no hubo movimientos".
   */
  CantMovimientos?: number;
  /**
   * Cuantos registros de visita se fundieron en esta fila. Tampoco existe en el
   * API: el endpoint agrupa por registro y la vista consolida por cliente (ver
   * utils/visitas.ts). 1 salvo que el funcionario haya entrado varias veces.
   */
  VisitasConsolidadas?: number;
}

export interface FiltersDetalle {
  Territorios: string[];
  Regiones: string[];
  MedioVisita: string[];
  MotivoVisita: string[];
  Acciones: string[];
  noCompra: string[];
  Tipomovimiento: string[];
  Ciudades: string[];
  duracionVisitaDesde: number;
  duracionVisitaHasta: number;
  horaDesde: string;
  horaHasta: string;
  cantVisitaDesde: number;
  cantVisitaHasta: number;
  codUsu: string[];
  /**
   * OJO: no filtra. En el API elige la tabla de clientes segun el perfil
   * (1 = rcustrans, 3 = rcustases, resto = rcustmain). Para filtrar por cliente
   * va `custFiltro`; el SPA manda "" y se queda con la tabla por defecto.
   */
  codCust: string;
  /** Cliente al que se limita la consulta. Vacio = todos. */
  custFiltro: string;
  /** Sucursal del cliente de `custFiltro`. Vacio = cualquiera. */
  succliFiltro: string;
  /** MM-dd-yyyy, igual que el resto de filtros del API por compañía. */
  fecIni: string;
  fecFin: string;
}

export interface MobMedioVisita {
  rmedio_cmpy: string;
  KEY_rmedio_codmedvis: string;
  rmedio_desmedvis: string;
}

/** Motivos de no compra. */
export interface MobMotivo {
  cmpy: string;
  movcod: string;
  movdesc: string;
}

/** Motivos de visita. */
export interface MobMotivoVisita {
  cmpy: string;
  motcod: string;
  motdes: string;
}

export interface MobAccion {
  KEY_cmpy: string;
  KEY_acctip: string;
  accdesc: string;
}

/** Tipos de movimiento (documentos generados en la visita). */
export interface MobTipoMovimiento {
  docvis_coddoc: string;
  docvis_desc: string;
}

/** Resumen de visitas por vendedor y día (GetListSummary). */
export interface MobVisitaResumen {
  rvis_cmpy: string;
  rusu_nombre: string;
  rusu_codper: string;
  rper_desper: string;
  rusu_reg: string;
  rusu_teri: string;
  rvis_fecvis: string;
  minrvis_horinivis: string;
  maxrvis_horinivis: string;
  rvis_enter: string;
  /** Clientes distintos visitados en el dia (visitas efectuadas). */
  cantvisitas: string;
  /** Movimientos registrados en el dia. Es lo que `cantvisitas` traia antes. */
  cantmovimientos: string;
  tiempoVis: string;
  reg_desc: string;
  ter_desc: string;
}

export interface FiltersResumen {
  fecIni: string;
  fecFin: string;
  Territorios: string[];
  Regiones: string[];
  Perfiles: string[];
  Vendedores: string[];
  duracionVisitaDesde: number;
  duracionVisitaHasta: number;
  horaDesde: string;
  horaHasta: string;
  cantVisitaDesde: number;
  cantVisitaHasta: number;
}
