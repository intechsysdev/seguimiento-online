/**
 * Contrato de api/v1/Bonificados (Migracion.Api, BonificadosDtos.cs).
 * Las fechas llegan como "2026-04-01T00:00:00"; en el portal se manejan como
 * yyyy-MM-dd (ver `soloFecha`).
 */

/** A = activa, I = inactiva, B = borrador (la app no la ve). */
export type EstadoCampana = "A" | "I" | "B";

export interface Campana {
  cmpy: string;
  codigo: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoCampana;
  origen?: string | null;
  totalReglas: number;
  usuarioCreacion?: string | null;
  fechaCreacion?: string | null;
  usuarioModificacion?: string | null;
  fechaModificacion?: string | null;
}

export interface CampanaGuardar {
  cmpy: string;
  codigo?: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoCampana;
  usuario: string;
}

export type TipoAgrupacion = "PRODUCTO" | "LINEA" | "SUBLINEA" | "GRUPO_MIXTO";
export type Medida = "UNIDADES" | "MONTO";
export type TipoBeneficio =
  "SPECIFIC_PRODUCT" | "SAME_PRODUCT" | "LOWEST_VALUE" | "MULTIPLE_OPTION";
/** N = sin límite, M = por mes, U = una sola vez por cliente. */
export type Frecuencia = "N" | "M" | "U";

export interface ProductoCantidad {
  productoId: string;
  productoNombre?: string | null;
  cantidad: number;
  /** Solo en niveles: bonifica tantas unidades como se compraron. */
  igualAlTotal?: boolean;
}

export interface Beneficio {
  tipo: TipoBeneficio;
  cantidad: number;
  productoId?: string | null;
  productoNombre?: string | null;
  grupo?: string | null;
  opciones: ProductoCantidad[];
}

export interface Nivel {
  nivel: number;
  desde: number;
  /** Lo calcula el API a partir del nivel siguiente. */
  hasta?: number | null;
  beneficios: ProductoCantidad[];
}

export interface StockProducto {
  productoId: string;
  productoNombre?: string | null;
  asignado: number;
  /** Lo lleva el motor al aplicar bonificados; el portal no lo cambia. */
  consumido: number;
}

export interface Regla {
  cmpy: string;
  codigo?: string;
  campana: string;
  nombre: string;
  activa: boolean;
  prioridad: number;
  acumulable: boolean;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  /** C-01, C-02 o C-03; lo deduce el API. */
  tipo?: string | null;

  canales: string[];
  regiones: string[];
  territorios: string[];

  agrupacion: TipoAgrupacion;
  /** rpr_id, rln_linea, "linea|subl" o el código del grupo. */
  agrupacionValores: string[];

  usaEscalonamiento: boolean;
  medida: Medida;
  cantidadMinima?: number | null;
  montoMinimo?: number | null;
  /** El beneficio se repite por cada N unidades adicionales (Deco 3+1: mínimo 3, múltiplo 3). */
  multiplo?: number | null;
  beneficios: Beneficio[];
  niveles: Nivel[];

  precioMinimoBonificado?: number | null;
  frecuencia: Frecuencia;
  maximoPorCliente?: number | null;
  stockLimitado: boolean;
  stock: StockProducto[];

  usuarioCreacion?: string | null;
  fechaCreacion?: string | null;
  usuarioModificacion?: string | null;
  fechaModificacion?: string | null;
  usuario?: string;
}

export interface OpcionCatalogo {
  codigo: string;
  nombre: string;
}

export interface SublineaCatalogo extends OpcionCatalogo {
  linea: string;
}

export interface ProductoCatalogo extends OpcionCatalogo {
  linea?: string | null;
  sublinea?: string | null;
}

export interface GrupoCatalogo extends OpcionCatalogo {
  activo: boolean;
  elementos: number;
}

export interface Catalogos {
  canales: OpcionCatalogo[];
  regiones: OpcionCatalogo[];
  territorios: OpcionCatalogo[];
  lineas: OpcionCatalogo[];
  sublineas: SublineaCatalogo[];
  productos: ProductoCatalogo[];
  grupos: GrupoCatalogo[];
}

export type NivelElemento = "LINEA" | "SUBLINEA" | "REFERENCIA";

export interface GrupoElemento {
  nivel: NivelElemento;
  /** rln_linea, "linea|subl" o rpr_id. */
  valor: string;
  nombre?: string | null;
}

/** Grupo mixto (mob_rbongrupo + mob_rbongrupodet). */
export interface Grupo {
  cmpy: string;
  codigo?: string;
  nombre: string;
  activo: boolean;
  elementos: GrupoElemento[];
  /** Reglas que lo usan; mientras haya, no se puede borrar. */
  reglas: string[];
  usuario?: string;
}

/** "2026-04-01T00:00:00" → "2026-04-01". */
export function soloFecha(valor?: string | null) {
  return valor ? valor.slice(0, 10) : "";
}
