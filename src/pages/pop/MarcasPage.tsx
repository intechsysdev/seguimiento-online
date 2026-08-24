import { useEffect, useState, type FormEvent } from "react";
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
import { lineasService, materialPopService } from "../../services/eva/materialPopService";
import { useAuth } from "../../store/AuthContext";
import type { MobMarcaPop } from "../../types/eva";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "../seguridad/Formularios.module.css";

/** Migra Views/Materialpop/Marcas.cshtml + ConfigMarcas.cshtml. */
export function MarcasPage() {
  const { session, tenant } = useAuth();
  const cmpy = session?.tenantActual ?? "";

  const marcas = useApi(
    () => (tenant && cmpy ? materialPopService.getListMarcas(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );
  const lineas = useApi(
    () => (tenant && cmpy ? lineasService.getList(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );

  const [editando, setEditando] = useState<MobMarcaPop | null>(null);
  const [lineaSel, setLineaSel] = useState("");
  const [sublineaSel, setSublineaSel] = useState("0");
  const [aEliminar, setAEliminar] = useState<MobMarcaPop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // La vista recargaba las sublineas por AJAX al cambiar la linea.
  const sublineas = useApi(
    () =>
      tenant && cmpy && lineaSel
        ? lineasService.getSublineasByLinea(tenant, cmpy, lineaSel)
        : Promise.resolve([]),
    [tenant?.IDTenant, cmpy, lineaSel],
  );

  useEffect(() => {
    if (!editando) return;
    setLineaSel(editando.rmarcapop_linea ?? "");
    setSublineaSel(editando.rmarcapop_subl || "0");
  }, [editando]);

  function nueva(): MobMarcaPop {
    const siguiente = Math.max(0, ...(marcas.datos ?? []).map((m) => m.rmarcapop_idmarca)) + 1;
    return {
      rmarcapop_idmarca: siguiente,
      rmarcapop_cmpy: cmpy,
      rmarcapop_linea: "",
      rmarcapop_subl: "0",
      rmarcapop_marca: "",
      rmarcapop_activo: "S",
      rmarcapop_updatebyuser: "",
      rmarcapop_date: "",
      rmarcapop_time: "",
      rmarcapop_estadoupd: "I",
    };
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!editando || !tenant) return;
    const datos = new FormData(evento.currentTarget);

    // El controller armaba el nombre con la parte derecha de cada descripcion.
    const descLinea = lineas.datos?.find((l) => l.KEY_rln_linea === lineaSel)?.rln_descr ?? "";
    const nombreLinea = descLinea.split("-")[1]?.trim() ?? descLinea.trim();
    const nombreSublinea = sublineaSel !== "0" ? (sublineaSel.split("-")[1]?.trim() ?? "") : "";

    const esNueva = !marcas.datos?.some((m) => m.rmarcapop_idmarca === editando.rmarcapop_idmarca);
    const ahora = new Date();

    const item: MobMarcaPop = {
      ...editando,
      rmarcapop_cmpy: cmpy,
      rmarcapop_linea: lineaSel,
      rmarcapop_subl: sublineaSel,
      rmarcapop_marca: `${nombreLinea} ${nombreSublinea}`.trim(),
      rmarcapop_activo: String(datos.get("activo") ?? "S"),
      rmarcapop_updatebyuser: session?.username ?? "",
      rmarcapop_date: ahora.toISOString(),
      rmarcapop_time: ahora.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
      rmarcapop_estadoupd: esNueva ? "I" : "U",
    };

    setGuardando(true);
    setError(null);
    try {
      if (esNueva) await materialPopService.insertMarca(tenant, item);
      else await materialPopService.updateMarca(tenant, item);
      setEditando(null);
      marcas.recargar();
    } catch {
      setError("No se pudo guardar la marca.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!aEliminar || !tenant) return;
    try {
      await materialPopService.deleteMarca(tenant, aEliminar.rmarcapop_idmarca);
    } finally {
      setAEliminar(null);
      marcas.recargar();
    }
  }

  const columnas: Columna<MobMarcaPop>[] = [
    {
      titulo: "#",
      valor: (m) => m.rmarcapop_idmarca,
      render: (m) => m.rmarcapop_idmarca,
      ancho: "4rem",
    },
    {
      titulo: "Marca",
      valor: (m) => m.rmarcapop_marca,
      render: (m) => <strong>{m.rmarcapop_marca}</strong>,
    },
    { titulo: "Línea", valor: (m) => m.rmarcapop_linea, render: (m) => m.rmarcapop_linea },
    {
      titulo: "Sublínea",
      valor: (m) => m.rmarcapop_subl,
      render: (m) => (m.rmarcapop_subl === "0" ? "—" : m.rmarcapop_subl),
    },
    {
      titulo: "Activa",
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
          <Button variant="ghost" size="icon" onClick={() => setEditando(m)} aria-label="Editar">
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
        title="Marcas"
        description="Marcas POP derivadas de línea y sublínea."
        actions={
          <Button variant="primary" onClick={() => setEditando(nueva())}>
            <IconPlus /> Nueva marca
          </Button>
        }
      />

      <DataTable
        columnas={columnas}
        filas={marcas.datos}
        claveFila={(m) => String(m.rmarcapop_idmarca)}
        cargando={marcas.cargando}
        error={marcas.error}
        vacio="No hay marcas registradas."
      />

      <Modal
        abierto={editando !== null}
        titulo={`Marca #${editando?.rmarcapop_idmarca ?? ""}`}
        onCerrar={() => setEditando(null)}
      >
        {editando ? (
          <form className={formularios.form} onSubmit={guardar}>
            {error ? <Alert tone="critical">{error}</Alert> : null}

            <Field label="Línea" htmlFor="linea">
              <select
                id="linea"
                className={inputs.select}
                value={lineaSel}
                onChange={(evento) => {
                  setLineaSel(evento.target.value);
                  setSublineaSel("0");
                }}
                required
              >
                <option value="">Selecciona una línea</option>
                {lineas.datos?.map((l) => (
                  <option key={l.KEY_rln_linea} value={l.KEY_rln_linea}>
                    {l.rln_descr}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Sublínea" htmlFor="subl" optional>
              <select
                id="subl"
                className={inputs.select}
                value={sublineaSel}
                onChange={(evento) => setSublineaSel(evento.target.value)}
                disabled={!lineaSel || sublineas.cargando}
              >
                <option value="0">Sin sublínea</option>
                {sublineas.datos?.map((s) => (
                  <option key={s.KEY_rsb_subl} value={`${s.KEY_rsb_subl}-${s.rsb_descr}`}>
                    {s.rsb_descr}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Activa" htmlFor="activo">
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
        title="Eliminar marca"
        message={`Se eliminará "${aEliminar?.rmarcapop_marca}".`}
        onConfirm={eliminar}
        onCancel={() => setAEliminar(null)}
      />
    </>
  );
}
