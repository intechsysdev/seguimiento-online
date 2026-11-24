import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { DataTable, type Columna } from "../components/ui/DataTable";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { MultiSelect } from "../components/ui/MultiSelect";
import { Switch } from "../components/ui/Switch";
import inputs from "../components/ui/inputs.module.css";
import { IconEdit, IconPlus, IconTrash } from "../components/icons";
import { useApi } from "../hooks/useApi";
import { bonificadosService } from "../services/eva/bonificadosService";
import { useAuth } from "../store/AuthContext";
import type { Grupo, GrupoElemento, NivelElemento } from "../types/bonificados";
import formularios from "./seguridad/Formularios.module.css";

interface Edicion {
  codigo?: string;
  nombre: string;
  activo: boolean;
  lineas: string[];
  sublineas: string[];
  productos: string[];
}

function valoresDe(grupo: Grupo | null, nivel: NivelElemento) {
  return (grupo?.elementos ?? [])
    .filter((e) => e.nivel === nivel)
    .map((e) => e.valor);
}

/**
 * Grupos mixtos: mezclan líneas, sublíneas y referencias sueltas (ej. grupo
 * Tintes). Las reglas los usan como agrupación o para "el de menor valor".
 */
export function GruposPage() {
  const { session, tenant } = useAuth();
  const cmpy = session?.tenantActual ?? "";
  const usuario = session?.username ?? "";

  const datos = useApi(async () => {
    if (!tenant || !cmpy) return undefined;
    const [grupos, catalogos] = await Promise.all([
      bonificadosService.grupos(tenant, cmpy),
      bonificadosService.catalogos(tenant, cmpy),
    ]);
    return { grupos, catalogos };
  }, [tenant?.IDTenant, cmpy]);

  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [aEliminar, setAEliminar] = useState<Grupo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const opciones = useMemo(() => {
    const c = datos.datos?.catalogos;
    if (!c) return { lineas: [], sublineas: [], productos: [] };
    const lineas = new Map(c.lineas.map((l) => [l.codigo, l.nombre]));
    return {
      lineas: c.lineas.map((l) => ({
        valor: l.codigo,
        etiqueta: `${l.nombre} (${l.codigo})`,
      })),
      sublineas: c.sublineas.map((s) => ({
        valor: `${s.linea}|${s.codigo}`,
        etiqueta: `${lineas.get(s.linea) ?? s.linea} › ${s.nombre}`,
      })),
      productos: c.productos.map((p) => ({
        valor: p.codigo,
        etiqueta: `[${p.codigo}] ${p.nombre}`,
      })),
    };
  }, [datos.datos?.catalogos]);

  function abrir(grupo: Grupo | null) {
    setError(null);
    setEdicion({
      codigo: grupo?.codigo,
      nombre: grupo?.nombre ?? "",
      activo: grupo?.activo ?? true,
      lineas: valoresDe(grupo, "LINEA"),
      sublineas: valoresDe(grupo, "SUBLINEA"),
      productos: valoresDe(grupo, "REFERENCIA"),
    });
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!edicion || !tenant) return;
    const elementos: GrupoElemento[] = [
      ...edicion.lineas.map((valor) => ({ nivel: "LINEA" as const, valor })),
      ...edicion.sublineas.map((valor) => ({
        nivel: "SUBLINEA" as const,
        valor,
      })),
      ...edicion.productos.map((valor) => ({
        nivel: "REFERENCIA" as const,
        valor,
      })),
    ];
    if (!edicion.nombre.trim())
      return setError("El nombre del grupo es obligatorio.");
    if (elementos.length === 0)
      return setError("Elige al menos una línea, sublínea o producto.");

    const grupo: Grupo = {
      cmpy,
      codigo: edicion.codigo,
      nombre: edicion.nombre.trim(),
      activo: edicion.activo,
      elementos,
      reglas: [],
      usuario,
    };
    setGuardando(true);
    setError(null);
    try {
      if (edicion.codigo)
        await bonificadosService.actualizarGrupo(tenant, grupo);
      else await bonificadosService.crearGrupo(tenant, grupo);
      setEdicion(null);
      datos.recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el grupo.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!aEliminar?.codigo || !tenant) return;
    const grupo = aEliminar;
    setAEliminar(null);
    setErrorLista(null);
    try {
      await bonificadosService.eliminarGrupo(
        tenant,
        cmpy,
        grupo.codigo!,
        usuario,
      );
      datos.recargar();
    } catch (e) {
      setErrorLista(
        e instanceof Error ? e.message : "No se pudo eliminar el grupo.",
      );
    }
  }

  const contar = (g: Grupo, nivel: NivelElemento) =>
    g.elementos.filter((e) => e.nivel === nivel).length;

  const columnas: Columna<Grupo>[] = [
    {
      titulo: "Grupo",
      valor: (g) => g.nombre,
      render: (g) => (
        <span>
          <strong>{g.nombre}</strong>
          <br />
          <small>{g.codigo}</small>
        </span>
      ),
    },
    {
      titulo: "Contenido",
      valor: (g) => g.elementos.length,
      render: (g) =>
        [
          contar(g, "LINEA") ? `${contar(g, "LINEA")} línea(s)` : "",
          contar(g, "SUBLINEA") ? `${contar(g, "SUBLINEA")} sublínea(s)` : "",
          contar(g, "REFERENCIA")
            ? `${contar(g, "REFERENCIA")} producto(s)`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
    },
    {
      titulo: "Reglas",
      ancho: "7rem",
      valor: (g) => g.reglas.length,
      render: (g) => (g.reglas.length ? g.reglas.length : "—"),
    },
    {
      titulo: "Estado",
      ancho: "7rem",
      valor: (g) => (g.activo ? "Activo" : "Inactivo"),
      render: (g) => (
        <Badge tone={g.activo ? "success" : "neutral"} dot>
          {g.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      titulo: "",
      ancho: "6rem",
      alineacion: "derecha",
      render: (g) => (
        <div className={formularios.accionesFila}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => abrir(g)}
            aria-label={`Editar ${g.nombre}`}
          >
            <IconEdit />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAEliminar(g)}
            aria-label={`Eliminar ${g.nombre}`}
          >
            <IconTrash />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Bonificados"
        title="Grupos mixtos"
        description="Agrupan líneas, sublíneas y productos sueltos para usarlos en las reglas."
        backTo="/bonificados"
        backLabel="Campañas"
        actions={
          <Button
            variant="primary"
            onClick={() => abrir(null)}
            disabled={!datos.datos}
          >
            <IconPlus /> Nuevo grupo
          </Button>
        }
      />

      {errorLista ? <Alert tone="critical">{errorLista}</Alert> : null}

      <DataTable
        columnas={columnas}
        filas={datos.datos?.grupos}
        claveFila={(g) => g.codigo ?? g.nombre}
        cargando={datos.cargando}
        error={datos.error}
        vacio="No hay grupos mixtos. Crea uno para agrupar productos de varias líneas."
      />

      <Modal
        abierto={edicion !== null}
        titulo={
          edicion?.codigo ? `Grupo ${edicion.codigo}` : "Nuevo grupo mixto"
        }
        onCerrar={() => setEdicion(null)}
      >
        {edicion ? (
          <form className={formularios.form} onSubmit={guardar}>
            {error ? <Alert tone="critical">{error}</Alert> : null}
            <Field label="Nombre" htmlFor="nombreGrupo">
              <input
                id="nombreGrupo"
                className={inputs.input}
                value={edicion.nombre}
                maxLength={100}
                onChange={(e) =>
                  setEdicion({ ...edicion, nombre: e.target.value })
                }
                placeholder="Ej: Tintes"
                autoFocus
              />
            </Field>
            <MultiSelect
              etiqueta="Líneas completas"
              opciones={opciones.lineas}
              seleccion={edicion.lineas}
              onChange={(v) => setEdicion({ ...edicion, lineas: v })}
              vacioSignifica="Ninguna"
            />
            <MultiSelect
              etiqueta="Sublíneas"
              opciones={opciones.sublineas}
              seleccion={edicion.sublineas}
              onChange={(v) => setEdicion({ ...edicion, sublineas: v })}
              vacioSignifica="Ninguna"
            />
            <MultiSelect
              etiqueta="Productos sueltos"
              opciones={opciones.productos}
              seleccion={edicion.productos}
              onChange={(v) => setEdicion({ ...edicion, productos: v })}
              vacioSignifica="Ninguno"
            />
            <Switch
              checked={edicion.activo}
              onChange={(v) => setEdicion({ ...edicion, activo: v })}
              label="Grupo activo"
            />
            <div className={formularios.pie}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEdicion(null)}
              >
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
        title={`¿Eliminar "${aEliminar?.nombre}"?`}
        message="Solo se puede eliminar si ninguna regla lo usa."
        onCancel={() => setAEliminar(null)}
        onConfirm={eliminar}
      />
    </>
  );
}
