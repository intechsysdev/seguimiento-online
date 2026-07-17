export type TipoAgrupacion = "PRODUCTO" | "LINEA" | "SUBLINEA" | "GRUPO_MIXTO";

export interface Campana {
  id: string;
  nombre: string;
  descripcion?: string;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
  fechaCreacion: string;
  usuarioCreacion: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  lineaId: string;
  sublineaId: string;
}

export interface Linea {
  id: string;
  nombre: string;
}

export interface Sublinea {
  id: string;
  nombre: string;
  lineaId: string;
}

export interface GrupoMixto {
  id: string;
  nombre: string;
  descripcion?: string;
  cantidadProductos: number;
}

export interface Beneficio {
  id: string;
  productoCodigo: string;
  productoNombre: string;
  cantidad: number;
  multiOpcion: boolean;
  opciones: string[];
}

export interface Nivel {
  id: string;
  nivel: number;
  cantidadMinima?: number;
  montoMinimo?: number;
  beneficios: Beneficio[];
}

export interface Regla {
  id: string;
  campanaId: string;
  nombreRegla: string;
  descripcion?: string;
  activa: boolean;

  canales: string[];
  regiones: string[];
  territorios: string[];
  tiposCliente: string[];

  tipoAgrupacion: TipoAgrupacion;
  productosSeleccionados: Producto[];
  lineasSeleccionadas: Linea[];
  sublineasSeleccionadas: Sublinea[];
  grupoSeleccionado?: GrupoMixto;

  usaEscalonamiento: boolean;
  cantidadMinima?: number;
  montoMinimo?: number;
  beneficiosSimples: Beneficio[];
  niveles: Nivel[];

  precioMinimoBonificado?: number;
  stockAsignado?: number;
  stockConsumido: number;
  limiteMensualActivo: boolean;
  limiteMensualCantidad?: number;

  fechaCreacion: string;
  usuarioCreacion: string;
}

export interface Catalogos {
  canales: string[];
  regiones: string[];
  territorios: string[];
  tiposCliente: string[];
  productos: Producto[];
  lineas: Linea[];
  sublineas: Sublinea[];
  grupos: GrupoMixto[];
}
