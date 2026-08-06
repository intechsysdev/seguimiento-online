import type { ReactNode } from "react";
import {
  IconBuilding,
  IconResumen,
  IconEfectuadas,
  IconDetalle,
  IconGift,
  IconHistory,
  IconIdCard,
  IconMap,
  IconMapPin,
  IconRoute,
  IconShield,
  IconTools,
  IconUser,
  IconUsers,
} from "../components/icons";

export interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  /** Nombre del modulo en el claim Modules; si falta, el item se oculta. */
  modulo?: string;
}

export interface NavGrupo {
  tipo: "grupo";
  label: string;
  icon: ReactNode;
  /** Modulo que habilita el grupo completo. */
  modulo?: string;
  items: NavItem[];
}

export interface NavEnlace extends NavItem {
  tipo: "enlace";
}

export type NavEntrada = NavGrupo | NavEnlace;

/**
 * Migra el sidebar de Views/Shared/_Layout.cshtml.
 *
 * Se respeta la estructura original: Administración, Visitas y Mercadeo eran
 * submenus plegables (`data-toggle="collapse"`), mientras que Ubicaciones,
 * Rutas y Clientes eran enlaces sueltos.
 *
 * Exhibiciones queda fuera a proposito: el modulo se deprecia en esta version.
 */
export const NAVEGACION: NavEntrada[] = [
  {
    tipo: "grupo",
    label: "Administración",
    icon: <IconTools />,
    modulo: "Administración",
    items: [
      { label: "Compañías", to: "/seguridad/companias", icon: <IconBuilding /> },
      { label: "Usuarios", to: "/seguridad/usuarios", icon: <IconUser /> },
      { label: "Usuarios asignados", to: "/seguridad/asignaciones", icon: <IconUsers /> },
      { label: "Permisos / Roles", to: "/seguridad/permisos", icon: <IconShield /> },
      { label: "Roles", to: "/seguridad/roles", icon: <IconShield /> },
      { label: "Configuración APIs", to: "/administracion/apis", icon: <IconTools /> },
      { label: "Perfiles", to: "/administracion/perfiles", icon: <IconIdCard /> },
      { label: "Auditoría", to: "/administracion/auditoria", icon: <IconHistory /> },
    ],
  },
  {
    tipo: "grupo",
    label: "Visitas",
    icon: <IconMapPin />,
    modulo: "Visitas",
    // Un icono distinto por tipo de consulta, para diferenciarlas de un vistazo.
    items: [
      { label: "Consolidadas", to: "/visitas/consolidadas", icon: <IconResumen /> },
      { label: "Efectuadas", to: "/visitas/efectuadas", icon: <IconEfectuadas /> },
      { label: "Detalladas", to: "/visitas/detalladas", icon: <IconDetalle /> },
    ],
  },
  { tipo: "enlace", label: "Ubicaciones", to: "/ubicaciones", icon: <IconMap />, modulo: "Ubicaciones" },
  { tipo: "enlace", label: "Rutas", to: "/rutas", icon: <IconRoute />, modulo: "Rutas" },
  { tipo: "enlace", label: "Clientes", to: "/clientes", icon: <IconUser />, modulo: "Clientes" },
  /*
   * Bonificados sale como enlace suelto y ya no exige el modulo "POP": estaba
   * anidado bajo Mercadeo > POP, asi que un usuario con permiso de Mercadeo
   * pero sin POP (p. ej. auditor) no lo veia.
   *
   * Entregas POP, Marcas y Material quedan ocultos por decision de producto;
   * las rutas siguen registradas en App.tsx para poder reactivarlos con solo
   * devolver estas entradas al menu.
   */
  { tipo: "enlace", label: "Bonificados", to: "/bonificados", icon: <IconGift />, modulo: "Mercadeo" },
];
