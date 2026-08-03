import { useState, type ChangeEvent, type FormEvent } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Modal } from "../../components/ui/Modal";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { IconEdit, IconPlus, IconTrash } from "../../components/icons";
import { useApi } from "../../hooks/useApi";
import { materialPopService } from "../../services/eva/materialPopService";
import { useAuth } from "../../store/AuthContext";
import type { MobMaterialPop } from "../../types/eva";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";
import estilos from "./Pop.module.css";

/** Migra Views/Materialpop/Index.cshtml + ConfigMaterial.cshtml. */
export function MaterialPage() {
  const { session, tenant } = useAuth();
  const cmpy = session?.tenantActual ?? "";

  const materiales = useApi(
    () => (tenant && cmpy ? materialPopService.getList(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );

  const [editando, setEditando] = useState<MobMaterialPop | null>(null);
  const [imagen, setImagen] = useState<string>("");
  const [aEliminar, setAEliminar] = useState<MobMaterialPop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function nuevo(): MobMaterialPop {
    // El controller calculaba el siguiente id como max + 1.
    const siguiente =
      Math.max(0, ...(materiales.datos ?? []).map((m) => m.rmaterialpop_idmaterial)) + 1;
    return {
      rmaterialpop_idmaterial: siguiente,
      rmaterialpop_cmpy: cmpy,
      rmaterialpop_des: "",
      rmaterialpop_image: "",
      rmarcapop_activo: "S",
      rmaterialpop_updatebyuser: "",
      rmaterialpop_date: "",
      rmaterialpop_time: "",
      rmaterialpop_estadoupd: "I",
    };
  }

  function abrir(item: MobMaterialPop | null) {
    const valor = item ?? nuevo();
    setEditando(valor);
    setImagen(valor.rmaterialpop_image ?? "");
    setError(null);
  }

  function elegirImagen(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onloadend = () => setImagen(String(lector.result));
    lector.readAsDataURL(archivo);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!editando || !tenant) return;
    const datos = new FormData(evento.currentTarget);
    const esNuevo = !materiales.datos?.some(
      (m) => m.rmaterialpop_idmaterial === editando.rmaterialpop_idmaterial,
    );

    const ahora = new Date();
    const item: MobMaterialPop = {
      ...editando,
      rmaterialpop_cmpy: cmpy,
      rmaterialpop_des: String(datos.get("des") ?? ""),
      rmarcapop_activo: String(datos.get("activo") ?? "S"),
      rmaterialpop_image: imagen,
      rmaterialpop_updatebyuser: session?.username ?? "",
      rmaterialpop_date: ahora.toISOString(),
      rmaterialpop_time: ahora.toLocaleTimeString("es-EC", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      rmaterialpop_estadoupd: esNuevo ? "I" : "U",
    };

    setGuardando(true);
    setError(null);
    try {
      if (esNuevo) await materialPopService.insert(tenant, item);
      else await materialPopService.update(tenant, item);
      setEditando(null);
      materiales.recargar();
    } catch {
      setError("No se pudo guardar el material.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!aEliminar || !tenant) return;
    try {
      await materialPopService.delete(tenant, aEliminar.rmaterialpop_idmaterial);
    } finally {
      setAEliminar(null);
      materiales.recargar();
    }
  }

  const columnas: Columna<MobMaterialPop>[] = [
    {
      titulo: "#",
      valor: (m) => m.rmaterialpop_idmaterial,
      render: (m) => m.rmaterialpop_idmaterial,
      ancho: "4rem",
    },
    {
      titulo: "Imagen",
      ancho: "5rem",
      render: (m) =>
        m.rmaterialpop_image ? (
          <img src={m.rmaterialpop_image} alt="" className={estilos.miniatura} />
        ) : (
          <span className={estilos.sinImagen} aria-hidden="true" />
        ),
    },
    {
      titulo: "Descripción",
      valor: (m) => m.rmaterialpop_des,
      render: (m) => <strong>{m.rmaterialpop_des}</strong>,
    },
    {
      titulo: "Activo",
      ancho: "6rem",
      valor: (m) => (m.rmarcapop_activo === "S" ? "Sí" : "No"),
      render: (m) => (
        <Badge tone={m.rmarcapop_activo === "S" ? "success" : "neutral"} dot>
          {m.rmarcapop_activo === "S" ? "Sí" : "No"}
        </Badge>
      ),
    },
    {
      titulo: "",
      ancho: "6rem",
      alineacion: "derecha",
      render: (m) => (
        <div className={formularios.accionesFila}>
          <Button variant="ghost" size="icon" onClick={() => abrir(m)} aria-label="Editar">
            <IconEdit />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setAEliminar(m)} aria-label="Eliminar">
            <IconTrash />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Material POP"
        title="Material"
        description="Maestro de materiales publicitarios."
        actions={
          <Button variant="primary" onClick={() => abrir(null)}>
            <IconPlus /> Nuevo material
          </Button>
        }
      />

      <DataTable
        columnas={columnas}
        filas={materiales.datos}
        claveFila={(m) => String(m.rmaterialpop_idmaterial)}
        cargando={materiales.cargando}
        error={materiales.error}
        vacio="No hay materiales registrados."
      />

      <Modal
        abierto={editando !== null}
        titulo={`Material #${editando?.rmaterialpop_idmaterial ?? ""}`}
        onCerrar={() => setEditando(null)}
      >
        {editando ? (
          <form className={formularios.form} onSubmit={guardar}>
            {error ? <Alert tone="critical">{error}</Alert> : null}

            <Field label="Descripción" htmlFor="des">
              <input
                id="des"
                name="des"
                className={inputs.input}
                defaultValue={editando.rmaterialpop_des}
                required
                autoFocus
              />
            </Field>

            <Field label="Activo" htmlFor="activo">
              <select
                id="activo"
                name="activo"
                className={inputs.select}
                defaultValue={editando.rmarcapop_activo ?? "S"}
              >
                <option value="S">Sí</option>
                <option value="N">No</option>
              </select>
            </Field>

            <Field label="Imagen" optional>
              <div className={estilos.filaImagen}>
                {imagen ? (
                  <img src={imagen} alt="Previsualización" className={estilos.preview} />
                ) : (
                  <span className={estilos.sinImagen} aria-hidden="true" />
                )}
                <input type="file" accept="image/*" onChange={elegirImagen} />
              </div>
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
        title="Eliminar material"
        message={`Se eliminará "${aEliminar?.rmaterialpop_des}".`}
        onConfirm={eliminar}
        onCancel={() => setAEliminar(null)}
      />
    </>
  );
}
