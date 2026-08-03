import { useState, type FormEvent } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";
import { IconEdit, IconLayers, IconPlus } from "../../components/icons";
import { useApi } from "../../hooks/useApi";
import { authService } from "../../services/authService";
import { permissionService } from "../../services/permissionService";
import { usuariosService } from "../../services/usuariosService";
import type { IdentityRole } from "../../types/seguridad";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "./Formularios.module.css";

/** Migra Views/Seguridad/GetRoles.cshtml + InsertRol/UpdateRol + Modules.cshtml. */
export function RolesPage() {
  const roles = useApi(() => usuariosService.getRoles());
  const [editando, setEditando] = useState<IdentityRole | null>(null);
  const [creando, setCreando] = useState(false);
  const [modulosDe, setModulosDe] = useState<IdentityRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nombre = String(new FormData(evento.currentTarget).get("Name") ?? "");
    setError(null);
    try {
      if (editando) await authService.editRole(editando.Name, nombre);
      else await authService.createRole(nombre);
      setEditando(null);
      setCreando(false);
      roles.recargar();
    } catch {
      setError("No se pudo guardar el rol.");
    }
  }

  const columnas: Columna<IdentityRole>[] = [
    { titulo: "Rol", valor: (r) => r.Name, render: (r) => <strong>{r.Name}</strong> },
    {
      titulo: "",
      ancho: "13rem",
      alineacion: "derecha",
      render: (r) => (
        <div className={formularios.accionesFila}>
          <Button variant="ghost" size="sm" onClick={() => setModulosDe(r)}>
            <IconLayers /> Módulos
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setEditando(r)} aria-label="Renombrar">
            <IconEdit />
          </Button>
        </div>
      ),
    },
  ];

  const abierto = creando || editando !== null;

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Roles"
        description="Roles del sistema y los módulos a los que dan acceso."
        actions={
          <Button variant="primary" onClick={() => setCreando(true)}>
            <IconPlus /> Nuevo rol
          </Button>
        }
      />

      <DataTable
        columnas={columnas}
        filas={roles.datos}
        claveFila={(r) => r.Id}
        cargando={roles.cargando}
        error={roles.error}
        vacio="No hay roles registrados."
      />

      <Modal
        abierto={abierto}
        titulo={editando ? "Renombrar rol" : "Nuevo rol"}
        onCerrar={() => {
          setEditando(null);
          setCreando(false);
        }}
      >
        <form className={formularios.form} onSubmit={guardar}>
          {error ? <Alert tone="critical">{error}</Alert> : null}
          <Field label="Nombre del rol" htmlFor="Name">
            <input
              id="Name"
              name="Name"
              className={inputs.input}
              defaultValue={editando?.Name ?? ""}
              required
              autoFocus
            />
          </Field>
          <div className={formularios.pie}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditando(null);
                setCreando(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        abierto={modulosDe !== null}
        titulo={`Módulos de "${modulosDe?.Name ?? ""}"`}
        onCerrar={() => setModulosDe(null)}
        ancho="34rem"
      >
        {modulosDe ? <ModulosDeRol rol={modulosDe} /> : null}
      </Modal>
    </>
  );
}

/** Migra Modules.cshtml: solo se listan los modulos raiz (ParentId == null). */
function ModulosDeRol({ rol }: { rol: IdentityRole }) {
  // El controller pasaba el nombre en mayusculas a ManageModuleRole.
  const nombreRol = rol.Name.toUpperCase();

  const modulos = useApi(() => permissionService.getModulesList());
  const asignados = useApi(() => usuariosService.getModulesByRole(rol.Name), [rol.Name]);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);

  async function alternar(moduleId: string, habilitado: boolean) {
    setError(null);
    setProcesando(moduleId);
    try {
      // type: "0" agrega, "1" elimina (asp-route-type de la vista original).
      await permissionService.manageModuleRole({
        ModuleId: moduleId,
        RoleName: nombreRol,
        Type: habilitado ? "1" : "0",
      });
      asignados.recargar();
    } catch {
      setError("No se pudo actualizar el módulo.");
    } finally {
      setProcesando(null);
    }
  }

  if (modulos.cargando || asignados.cargando) return <Spinner mensaje="Cargando módulos…" />;

  const raiz = (modulos.datos ?? []).filter((m) => !m.ParentId);
  const nombresAsignados = new Set((asignados.datos ?? []).map((m) => m.ModuleName));

  return (
    <div className={formularios.form}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <ul className={formularios.listaRoles}>
        {raiz.map((modulo) => {
          const habilitado = nombresAsignados.has(modulo.Name);
          return (
            <li key={modulo.Id}>
              <span>
                {modulo.Name}{" "}
                <Badge tone={habilitado ? "success" : "neutral"} dot>
                  {habilitado ? "Habilitado" : "No habilitado"}
                </Badge>
              </span>
              <Button
                variant={habilitado ? "danger" : "primary"}
                size="sm"
                onClick={() => alternar(modulo.Id, habilitado)}
                disabled={procesando === modulo.Id}
              >
                {habilitado ? "Quitar" : "Agregar"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
