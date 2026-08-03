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
import { profileService } from "../../services/profileService";
import type { ProfileE } from "../../types/seguridad";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";

const VACIO: ProfileE = {
  IDProfile: 0,
  NameProfile: "",
  ParentProfileId: null,
  PathProfile: "",
};

/** Migra Views/Perfiles/Index.cshtml, Insert.cshtml y Update.cshtml. */
export function PerfilesPage() {
  const perfiles = useApi(() => profileService.getList());
  const [editando, setEditando] = useState<ProfileE | null>(null);
  const [aEliminar, setAEliminar] = useState<ProfileE | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!editando) return;
    const datos = new FormData(evento.currentTarget);
    const padre = String(datos.get("ParentProfileId") ?? "");

    const item: ProfileE = {
      ...editando,
      NameProfile: String(datos.get("NameProfile") ?? ""),
      PathProfile: String(datos.get("PathProfile") ?? ""),
      ParentProfileId: padre === "" ? null : Number(padre),
    };

    setError(null);
    setGuardando(true);
    try {
      if (item.IDProfile) await profileService.update(item);
      else await profileService.insert(item);
      setEditando(null);
      perfiles.recargar();
    } catch {
      setError("No se pudo guardar el perfil.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!aEliminar) return;
    try {
      await profileService.delete(aEliminar.IDProfile);
    } finally {
      setAEliminar(null);
      perfiles.recargar();
    }
  }

  const nombrePadre = (id: number | null) =>
    perfiles.datos?.find((p) => p.IDProfile === id)?.NameProfile ?? "";

  const columnas: Columna<ProfileE>[] = [
    { titulo: "#", valor: (p) => p.IDProfile, render: (p) => p.IDProfile, ancho: "5rem" },
    {
      titulo: "Perfil",
      valor: (p) => p.NameProfile,
      render: (p) => <strong>{p.NameProfile}</strong>,
    },
    {
      titulo: "Perfil padre",
      valor: (p) => nombrePadre(p.ParentProfileId),
      render: (p) => nombrePadre(p.ParentProfileId) || "—",
    },
    {
      titulo: "Ruta",
      valor: (p) => p.PathProfile ?? "",
      render: (p) => <span className={formularios.url}>{p.PathProfile}</span>,
    },
    {
      titulo: "",
      ancho: "6rem",
      alineacion: "derecha",
      render: (p) => (
        <div className={formularios.accionesFila}>
          <Button variant="ghost" size="icon" onClick={() => setEditando(p)} aria-label="Editar">
            <IconEdit />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setAEliminar(p)} aria-label="Eliminar">
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
        title="Perfiles"
        description="Perfiles jerárquicos que agrupan a los usuarios del ERP."
        actions={
          <Button variant="primary" onClick={() => setEditando(VACIO)}>
            <IconPlus /> Nuevo perfil
          </Button>
        }
      />

      <DataTable
        columnas={columnas}
        filas={perfiles.datos}
        claveFila={(p) => String(p.IDProfile)}
        cargando={perfiles.cargando}
        error={perfiles.error}
        vacio="No hay perfiles registrados."
      />

      <Modal
        abierto={editando !== null}
        titulo={editando?.IDProfile ? "Editar perfil" : "Nuevo perfil"}
        onCerrar={() => setEditando(null)}
      >
        {editando ? (
          <form className={formularios.form} onSubmit={guardar}>
            {error ? <Alert tone="critical">{error}</Alert> : null}

            <Field label="Nombre" htmlFor="NameProfile">
              <input
                id="NameProfile"
                name="NameProfile"
                className={inputs.input}
                defaultValue={editando.NameProfile}
                required
                autoFocus
              />
            </Field>

            <Field label="Perfil padre" htmlFor="ParentProfileId" optional>
              <select
                id="ParentProfileId"
                name="ParentProfileId"
                className={inputs.select}
                defaultValue={editando.ParentProfileId ?? ""}
              >
                <option value="">Sin perfil padre</option>
                {perfiles.datos
                  ?.filter((p) => p.IDProfile !== editando.IDProfile)
                  .map((p) => (
                    <option key={p.IDProfile} value={p.IDProfile}>
                      {p.NameProfile}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Ruta" htmlFor="PathProfile" optional>
              <input
                id="PathProfile"
                name="PathProfile"
                className={inputs.input}
                defaultValue={editando.PathProfile ?? ""}
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
        title="Eliminar perfil"
        message={`Se eliminará "${aEliminar?.NameProfile}".`}
        onConfirm={eliminar}
        onCancel={() => setAEliminar(null)}
      />
    </>
  );
}
