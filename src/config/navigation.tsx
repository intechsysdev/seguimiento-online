import type { ReactNode } from "react";
import {
  IconBox,
  IconBuilding,
  IconClipboard,
  IconGift,
  IconHistory,
  IconIdCard,
  IconMap,
  IconMapPin,
  IconRoute,
  IconShield,
  IconStore,
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
    items: [
      { label: "Consolidadas", to: "/visitas/consolidadas", icon: <IconClipboard /> },
      { label: "Efectuadas", to: "/visitas/efectuadas", icon: <IconClipboard /> },
      { label: "Detalladas", to: "/visitas/detalladas", icon: <IconClipboard /> },
    ],
  },
  { tipo: "enlace", label: "Ubicaciones", to: "/ubicaciones", icon: <IconMap />, modulo: "Ubicaciones" },
  { tipo: "enlace", label: "Rutas", to: "/rutas", icon: <IconRoute />, modulo: "Rutas" },
  { tipo: "enlace", label: "Clientes", to: "/clientes", icon: <IconUser />, modulo: "Clientes" },
  {
    tipo: "grupo",
    label: "Mercadeo",
    icon: <IconStore />,
    modulo: "Mercadeo",
    items: [
      { label: "Entregas POP", to: "/pop/entregas", icon: <IconBox />, modulo: "POP" },
      { label: "Marcas", to: "/pop/marcas", icon: <IconStore />, modulo: "POP" },
      { label: "Material", to: "/pop/material", icon: <IconBox />, modulo: "POP" },
      { label: "Bonificados", to: "/bonificados", icon: <IconGift />, modulo: "POP" },
    ],
  },
];
