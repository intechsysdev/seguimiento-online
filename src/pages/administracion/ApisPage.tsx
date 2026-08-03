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
import { applicationConfigService } from "../../services/applicationConfigService";
import type { ApplicationConfigE } from "../../types/seguridad";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";

const VACIO: ApplicationConfigE = {
  IDApplicationConfig: null,
  IDApplication: null,
  NameApplicationConfig: "",
  UserApplicationsConfigApi: "",
  PwdApplicationsConfigAPI: "",
  APIKeyApplicationsConfig: "",
  UrlApi: "",
};

/** Migra Views/Applications/Index.cshtml, Insert.cshtml y Update.cshtml. */
export function ApisPage() {
  const configuraciones = useApi(() => applicationConfigService.getList());
  const [editando, setEditando] = useState<ApplicationConfigE | null>(null);
  const [aEliminar, setAEliminar] = useState<ApplicationConfigE | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!editando) return;
    const datos = new FormData(evento.currentTarget);

    const item: ApplicationConfigE = {
      ...editando,
      NameApplicationConfig: String(datos.get("NameApplicationConfig") ?? ""),
      UserApplicationsConfigApi: String(datos.get("UserApplicationsConfigApi") ?? ""),
      PwdApplicationsConfigAPI: String(datos.get("PwdApplicationsConfigAPI") ?? ""),
      APIKeyApplicationsConfig: String(datos.get("APIKeyApplicationsConfig") ?? ""),
      UrlApi: String(datos.get("UrlApi") ?? ""),
    };

    setError(null);
    setGuardando(true);
    try {
      if (item.IDApplicationConfig) {
        // El controller regeneraba IDApplication en cada Update; se conserva.
        await applicationConfigService.update({ ...item, IDApplication: crypto.randomUUID() });
      } else {
        await applicationConfigService.insert({
          ...item,
          IDApplication: crypto.randomUUID(),
          IDApplicationConfig: crypto.randomUUID(),
        });
      }
      setEditando(null);
      configuraciones.recargar();
    } catch {
      setError("No se pudo guardar la configuración.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!aEliminar?.IDApplicationConfig) return;
    try {
      await applicationConfigService.delete(aEliminar.IDApplicationConfig);
    } finally {
      setAEliminar(null);
      configuraciones.recargar();
    }
  }

  const columnas: Columna<ApplicationConfigE>[] = [
    {
      titulo: "Nombre",
      valor: (a) => a.NameApplicationConfig,
      render: (a) => <strong>{a.NameApplicationConfig}</strong>,
    },
    {
      titulo: "URL",
      valor: (a) => a.UrlApi,
      render: (a) => <span className={formularios.url}>{a.UrlApi}</span>,
    },
    {
      titulo: "Usuario",
      valor: (a) => a.UserApplicationsConfigApi,
      render: (a) => a.UserApplicationsConfigApi,
    },
    {
      titulo: "",
      ancho: "6rem",
      alineacion: "derecha",
      render: (a) => (
        <div className={formularios.accionesFila}>
          <Button variant="ghost" size="icon" onClick={() => setEditando(a)} aria-label="Editar">
            <IconEdit />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setAEliminar(a)} aria-label="Eliminar">
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
        title="Configuración de APIs"
        description="Servicios externos usados por la aplicación (correo, integraciones)."
        actions={
          <Button variant="primary" onClick={() => setEditando(VACIO)}>
            <IconPlus /> Nueva configuración
          </Button>
        }
      />

      <DataTable
        columnas={columnas}
        filas={configuraciones.datos}
        claveFila={(a) => a.IDApplicationConfig ?? a.NameApplicationConfig}
        cargando={configuraciones.cargando}
        error={configuraciones.error}
        vacio="No hay configuraciones registradas."
      />

      <Modal
        abierto={editando !== null}
        titulo={editando?.IDApplicationConfig ? "Editar configuración" : "Nueva configuración"}
        onCerrar={() => setEditando(null)}
      >
        {editando ? (
          <form className={formularios.form} onSubmit={guardar}>
            {error ? <Alert tone="critical">{error}</Alert> : null}

            <Field label="Nombre" htmlFor="NameApplicationConfig">
              <input
                id="NameApplicationConfig"
                name="NameApplicationConfig"
                className={inputs.input}
                defaultValue={editando.NameApplicationConfig}
                required
              />
            </Field>

            <Field label="URL del API" htmlFor="UrlApi">
              <input
                id="UrlApi"
                name="UrlApi"
                type="url"
                className={inputs.input}
                defaultValue={editando.UrlApi}
                required
              />
            </Field>

            <div className={formularios.fila}>
              <Field label="Usuario" htmlFor="UserApplicationsConfigApi">
                <input
                  id="UserApplicationsConfigApi"
                  name="UserApplicationsConfigApi"
                  className={inputs.input}
                  defaultValue={editando.UserApplicationsConfigApi}
                  autoComplete="off"
                />
              </Field>
              <Field label="Contraseña" htmlFor="PwdApplicationsConfigAPI">
                <input
                  id="PwdApplicationsConfigAPI"
                  name="PwdApplicationsConfigAPI"
                  type="password"
                  className={inputs.input}
                  defaultValue={editando.PwdApplicationsConfigAPI}
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <Field label="API Key" htmlFor="APIKeyApplicationsConfig">
              <input
                id="APIKeyApplicationsConfig"
                name="APIKeyApplicationsConfig"
                className={inputs.input}
                defaultValue={editando.APIKeyApplicationsConfig}
                autoComplete="off"
              />
            </Field>

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
        title="Eliminar configuración"
        message={`Se eliminará "${aEliminar?.NameApplicationConfig}".`}
        onConfirm={eliminar}
        onCancel={() => setAEliminar(null)}
      />
    </>
  );
}
