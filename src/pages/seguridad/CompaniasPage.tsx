import { useState, type FormEvent } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { IconEdit, IconPlus, IconTrash } from "../../components/icons";
import { useApi } from "../../hooks/useApi";
import { tenantService } from "../../services/tenantService";
import type { TenantE } from "../../types/seguridad";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "./Formularios.module.css";

const VACIO: TenantE = {
  IDTenant: "",
  NameTenant: "",
  IDCompanyTenant: "",
  NameCompanyTenant: "",
  APIUrlTenant: "",
  UserAPITenant: "",
  PwdAPITenant: "",
  IDApplication: "",
  TimeZone: "",
};

/** Migra Views/Seguridad/Tenants.cshtml + InsertCompania.cshtml. */
export function CompaniasPage() {
  const { datos, cargando, error, recargar } = useApi(() => tenantService.getList());
  const [editando, setEditando] = useState<TenantE | null>(null);
  const [aEliminar, setAEliminar] = useState<TenantE | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!editando) return;

    const datosForm = new FormData(evento.currentTarget);
    const item: TenantE = {
      ...editando,
      NameTenant: String(datosForm.get("NameTenant") ?? ""),
      IDCompanyTenant: String(datosForm.get("IDCompanyTenant") ?? ""),
      NameCompanyTenant: String(datosForm.get("NameCompanyTenant") ?? ""),
      APIUrlTenant: String(datosForm.get("APIUrlTenant") ?? ""),
      UserAPITenant: String(datosForm.get("UserAPITenant") ?? ""),
      PwdAPITenant: String(datosForm.get("PwdAPITenant") ?? ""),
      TimeZone: String(datosForm.get("TimeZone") ?? ""),
    };

    setErrorForm(null);
    setGuardando(true);
    try {
      // El controller generaba el Guid cuando IDTenant venia nulo.
      if (item.IDTenant) {
        await tenantService.update(item);
      } else {
        await tenantService.insert({ ...item, IDTenant: crypto.randomUUID() });
      }
      setEditando(null);
      recargar();
    } catch {
      setErrorForm("No se pudo guardar la compañía.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!aEliminar) return;
    try {
      await tenantService.delete(aEliminar.IDTenant);
      recargar();
    } catch {
      // El listado se recarga igual para reflejar el estado real del servidor.
      recargar();
    } finally {
      setAEliminar(null);
    }
  }

  const columnas: Columna<TenantE>[] = [
    {
      titulo: "Código",
      valor: (t) => t.IDCompanyTenant,
      render: (t) => <code>{t.IDCompanyTenant}</code>,
      ancho: "7rem",
    },
    {
      titulo: "Compañía",
      valor: (t) => t.NameCompanyTenant,
      render: (t) => <strong>{t.NameCompanyTenant}</strong>,
    },
    { titulo: "Tenant", valor: (t) => t.NameTenant, render: (t) => t.NameTenant },
    {
      titulo: "URL API",
      valor: (t) => t.APIUrlTenant,
      render: (t) => <span className={formularios.url}>{t.APIUrlTenant}</span>,
    },
    { titulo: "Zona horaria", valor: (t) => t.TimeZone, render: (t) => t.TimeZone },
    {
      titulo: "",
      ancho: "6rem",
      alineacion: "derecha",
      render: (t) => (
        <div className={formularios.accionesFila}>
          <Button variant="ghost" size="icon" onClick={() => setEditando(t)} aria-label="Editar">
            <IconEdit />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setAEliminar(t)} aria-label="Eliminar">
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
        title="Compañías"
        description="Compañías registradas y credenciales de su API."
        actions={
          <Button variant="primary" onClick={() => setEditando(VACIO)}>
            <IconPlus /> Nueva compañía
          </Button>
        }
      />

      <DataTable
        columnas={columnas}
        filas={datos}
        claveFila={(t) => t.IDTenant}
        cargando={cargando}
        error={error}
        vacio="No hay compañías registradas."
      />

      <Modal
        abierto={editando !== null}
        titulo={editando?.IDTenant ? "Editar compañía" : "Nueva compañía"}
        onCerrar={() => setEditando(null)}
      >
        {editando ? (
          <form className={formularios.form} onSubmit={guardar}>
            {errorForm ? <Alert tone="critical">{errorForm}</Alert> : null}

            <Field label="Nombre del tenant" htmlFor="NameTenant">
              <input
                id="NameTenant"
                name="NameTenant"
                className={inputs.input}
                defaultValue={editando.NameTenant}
              />
            </Field>

            <div className={formularios.fila}>
              <Field label="Código compañía" htmlFor="IDCompanyTenant">
                <input
                  id="IDCompanyTenant"
                  name="IDCompanyTenant"
                  className={inputs.input}
                  defaultValue={editando.IDCompanyTenant}
                  required
                />
              </Field>
              <Field label="Zona horaria" htmlFor="TimeZone">
                <input
                  id="TimeZone"
                  name="TimeZone"
                  className={inputs.input}
                  defaultValue={editando.TimeZone}
                  placeholder="SA Pacific Standard Time"
                />
              </Field>
            </div>

            <Field label="Nombre compañía" htmlFor="NameCompanyTenant">
              <input
                id="NameCompanyTenant"
                name="NameCompanyTenant"
                className={inputs.input}
                defaultValue={editando.NameCompanyTenant}
                required
              />
            </Field>

            <Field label="URL API" htmlFor="APIUrlTenant">
              <input
                id="APIUrlTenant"
                name="APIUrlTenant"
                type="url"
                className={inputs.input}
                defaultValue={editando.APIUrlTenant}
                required
              />
            </Field>

            <div className={formularios.fila}>
              <Field label="Usuario API" htmlFor="UserAPITenant">
                <input
                  id="UserAPITenant"
                  name="UserAPITenant"
                  className={inputs.input}
                  defaultValue={editando.UserAPITenant}
                  autoComplete="off"
                  required
                />
              </Field>
              <Field label="Contraseña API" htmlFor="PwdAPITenant">
                <input
                  id="PwdAPITenant"
                  name="PwdAPITenant"
                  type="password"
                  className={inputs.input}
                  defaultValue={editando.PwdAPITenant}
                  autoComplete="new-password"
                  required
                />
              </Field>
            </div>

            <div className={formularios.pie}>
              <Button type="button" variant="ghost" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar compañía"
        message={`Se eliminará "${aEliminar?.NameCompanyTenant}". Esta acción no se puede deshacer.`}
        onConfirm={eliminar}
        onCancel={() => setAEliminar(null)}
      />
    </>
  );
}
