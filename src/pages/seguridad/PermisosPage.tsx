import { useState, type FormEvent } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";
import { IconPlus, IconShield, IconTrash } from "../../components/icons";
import { useApi } from "../../hooks/useApi";
import { permissionService } from "../../services/permissionService";
import type { PermissionE, PermissionRoleAssigmentE } from "../../types/seguridad";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "./Formularios.module.css";

/**
 * Migra Views/Seguridad/Permissions.cshtml, InsertPermission y ListRoles.cshtml.
 * Los roles de un permiso se administran en un modal en lugar de otra pantalla.
 */
export function PermisosPage() {
  const permisos = useApi(() => permissionService.getList());
  const [creando, setCreando] = useState(false);
  const [verRoles, setVerRoles] = useState<PermissionE | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nombre = String(new FormData(evento.currentTarget).get("Name") ?? "");
    setError(null);
    try {
      // El controller forzaba Active = true al insertar.
      await permissionService.insert({ Id: "", Name: nombre, Active: true });
      setCreando(false);
      permisos.recargar();
    } catch {
      setError("No se pudo crear el permiso.");
    }
  }

  const columnas: Columna<PermissionE>[] = [
    { titulo: "Permiso", valor: (p) => p.Name, render: (p) => <strong>{p.Name}</strong> },
    {
      titulo: "Estado",
      valor: (p) => (p.Active ? "Activo" : "Inactivo"),
      render: (p) => (
        <Badge tone={p.Active ? "success" : "neutral"} dot>
          {p.Active ? "Activo" : "Inactivo"}
        </Badge>
      ),
      ancho: "9rem",
    },
    {
      titulo: "",
      ancho: "10rem",
      alineacion: "derecha",
      render: (p) => (
        <Button variant="ghost" size="sm" onClick={() => setVerRoles(p)}>
          <IconShield /> Roles
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Permisos"
        description="Permisos disponibles y los roles que los tienen asignados."
        actions={
          <Button variant="primary" onClick={() => setCreando(true)}>
            <IconPlus /> Nuevo permiso
          </Button>
        }
      />

      <DataTable
        columnas={columnas}
        filas={permisos.datos}
        claveFila={(p) => p.Id}
        cargando={permisos.cargando}
        error={permisos.error}
        vacio="No hay permisos registrados."
      />

      <Modal abierto={creando} titulo="Nuevo permiso" onCerrar={() => setCreando(false)}>
        <form className={formularios.form} onSubmit={crear}>
          {error ? <Alert tone="critical">{error}</Alert> : null}
          <Field label="Nombre" htmlFor="Name">
            <input id="Name" name="Name" className={inputs.input} required autoFocus />
          </Field>
          <div className={formularios.pie}>
            <Button type="button" variant="ghost" onClick={() => setCreando(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        abierto={verRoles !== null}
        titulo={`Roles de "${verRoles?.Name ?? ""}"`}
        onCerrar={() => setVerRoles(null)}
        ancho="38rem"
      >
        {verRoles ? <RolesDePermiso permiso={verRoles} /> : null}
      </Modal>
    </>
  );
}

/** Migra ListRoles.cshtml + ProcesarRoles + DeleteRole. */
function RolesDePermiso({ permiso }: { permiso: PermissionE }) {
  const asignados = useApi(
    () => permissionService.getRolesByPermissionList(permiso.Id),
    [permiso.Id],
  );
  const disponibles = useApi(
    () => permissionService.getRolesWithOutPermission(permiso.Id),
    [permiso.Id],
  );
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  async function agregar() {
    if (!seleccion.length) return;
    setError(null);
    setProcesando(true);
    try {
      // El controller insertaba uno por uno; se mantiene por compatibilidad.
      for (const roleId of seleccion) {
        await permissionService.insertPermissionRole({
          Id: "",
          RoleId: roleId,
          PermissionId: permiso.Id,
        });
      }
      setSeleccion([]);
      asignados.recargar();
      disponibles.recargar();
    } catch {
      setError("No se pudieron asignar los roles.");
    } finally {
      setProcesando(false);
    }
  }

  async function quitar(item: PermissionRoleAssigmentE) {
    setError(null);
    try {
      await permissionService.deletePermissionRole(item.Id);
    } catch {
      setError("No se pudo quitar el rol.");
    } finally {
      asignados.recargar();
      disponibles.recargar();
    }
  }

  if (asignados.cargando || disponibles.cargando) return <Spinner mensaje="Cargando roles…" />;

  return (
    <div className={formularios.form}>
      {error ? <Alert tone="critical">{error}</Alert> : null}

      <div>
        <p className={formularios.subtitulo}>Asignados</p>
        {asignados.datos?.length ? (
          <ul className={formularios.listaRoles}>
            {asignados.datos.map((item) => (
              <li key={item.Id}>
                <span>{item.RoleName}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => quitar(item)}
                  aria-label={`Quitar ${item.RoleName}`}
                >
                  <IconTrash />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={formularios.url}>Ningún rol tiene este permiso.</p>
        )}
      </div>

      <div>
        <p className={formularios.subtitulo}>Disponibles</p>
        {disponibles.datos?.length ? (
          <>
            <div className={formularios.checkList}>
              {disponibles.datos.map((rol) => (
                <label key={rol.Id} className={formularios.check}>
                  <input
                    type="checkbox"
                    checked={seleccion.includes(rol.Id)}
                    onChange={() =>
                      setSeleccion((previo) =>
                        previo.includes(rol.Id)
                          ? previo.filter((x) => x !== rol.Id)
                          : [...previo, rol.Id],
                      )
                    }
                  />
                  {rol.Name}
                </label>
              ))}
            </div>
            <div className={formularios.pie}>
              <Button
                variant="primary"
                onClick={agregar}
                disabled={seleccion.length === 0 || procesando}
              >
                Asignar {seleccion.length || ""}
              </Button>
            </div>
          </>
        ) : (
          <p className={formularios.url}>Todos los roles ya tienen este permiso.</p>
        )}
      </div>
    </div>
  );
}
