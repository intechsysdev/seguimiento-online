import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { IconEdit, IconPlus, IconTrash, IconUsers } from "../../components/icons";
import { useApi } from "../../hooks/useApi";
import { usuariosService } from "../../services/usuariosService";
import type { AspNetUserE } from "../../types/seguridad";
import formularios from "./Formularios.module.css";

/** Migra Views/Seguridad/Users.cshtml. */
export function UsuariosPage() {
  const { datos, cargando, error, recargar } = useApi(() => usuariosService.getList());
  const [aEliminar, setAEliminar] = useState<AspNetUserE | null>(null);
  const navigate = useNavigate();

  async function eliminar() {
    if (!aEliminar) return;
    try {
      await usuariosService.delete(aEliminar.Id);
    } finally {
      setAEliminar(null);
      recargar();
    }
  }

  const columnas: Columna<AspNetUserE>[] = [
    {
      titulo: "Nombre",
      valor: (u) => `${u.FirstName} ${u.LastName}`,
      render: (u) => (
        <strong>
          {u.FirstName} {u.LastName}
        </strong>
      ),
    },
    { titulo: "Correo", valor: (u) => u.Email, render: (u) => u.Email },
    { titulo: "Cédula", valor: (u) => u.DNI, render: (u) => u.DNI },
    { titulo: "Celular", valor: (u) => u.Phone, render: (u) => u.Phone },
    { titulo: "Rol", valor: (u) => u.Name ?? "", render: (u) => u.Name },
    {
      titulo: "Estado",
      valor: (u) => (u.EmailConfirmed ? "Confirmado" : "Pendiente"),
      render: (u) => (
        <Badge tone={u.EmailConfirmed ? "success" : "warning"} dot>
          {u.EmailConfirmed ? "Confirmado" : "Pendiente"}
        </Badge>
      ),
    },
    {
      titulo: "",
      ancho: "9rem",
      alineacion: "derecha",
      render: (u) => (
        <div className={formularios.accionesFila}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/seguridad/asignaciones?userId=${u.Id}`)}
            aria-label="Usuarios asignados"
            title="Usuarios asignados"
          >
            <IconUsers />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/seguridad/usuarios/${u.Id}`)}
            aria-label="Editar"
          >
            <IconEdit />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setAEliminar(u)} aria-label="Eliminar">
            <IconTrash />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description="Usuarios con acceso a Seguimiento Online."
        actions={
          <Button variant="primary" onClick={() => navigate("/seguridad/usuarios/nuevo")}>
            <IconPlus /> Nuevo usuario
          </Button>
        }
      />

      <DataTable
        columnas={columnas}
        filas={datos}
        claveFila={(u) => u.Id}
        cargando={cargando}
        error={error}
        vacio="No hay usuarios registrados."
      />

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar usuario"
        message={`Se eliminará a ${aEliminar?.FirstName} ${aEliminar?.LastName}. Esta acción no se puede deshacer.`}
        onConfirm={eliminar}
        onCancel={() => setAEliminar(null)}
      />
    </>
  );
}
