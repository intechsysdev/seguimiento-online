import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { DataTable, type Columna } from "../../components/ui/DataTable";
import { IconPlus, IconTrash } from "../../components/icons";
import { useApi } from "../../hooks/useApi";
import { tenantService } from "../../services/tenantService";
import { usuariosService } from "../../services/usuariosService";
import { usuariosEvaService } from "../../services/eva/usuariosEvaService";
import { useAuth } from "../../store/AuthContext";
import type { MobRusuario } from "../../types/eva";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "./Formularios.module.css";

/**
 * Migra Views/Seguridad/ListUserAssignments.cshtml + UsersAssignments.cshtml.
 *
 * En el MVC eran dos pantallas (asignados / disponibles). Aca se muestran juntas
 * porque comparten los mismos dos filtros: usuario y compañía.
 */
export function AsignacionesPage() {
  const { session, tenants } = useDatosSesion();
  const [params, setParams] = useSearchParams();

  const usuarios = useApi(() => usuariosService.getList());

  const userId = params.get("userId") ?? session?.userId ?? "";

  // Companias del usuario seleccionado, no del que tiene la sesion abierta.
  const companiasUsuario = useApi(
    () => (userId ? tenantService.getListByUser(userId) : Promise.resolve([])),
    [userId],
  );

  const [cmpy, setCmpy] = useState("");

  useEffect(() => {
    const lista = companiasUsuario.datos;
    if (!lista?.length) return;
    setCmpy((actual) =>
      lista.some((t) => t.IDCompanyTenant === actual) ? actual : lista[0].IDCompanyTenant,
    );
  }, [companiasUsuario.datos]);

  /** Credenciales del API de la compañía elegida en el filtro. */
  const tenantElegido = useMemo(
    () =>
      companiasUsuario.datos?.find((t) => t.IDCompanyTenant === cmpy) ??
      tenants.find((t) => t.IDCompanyTenant === cmpy),
    [companiasUsuario.datos, tenants, cmpy],
  );

  const usuariosEva = useApi(
    () =>
      tenantElegido && cmpy
        ? usuariosEvaService.getListAll(tenantElegido, cmpy)
        : Promise.resolve([]),
    [tenantElegido?.IDTenant, cmpy],
  );

  const asignaciones = useApi(
    () => (userId && cmpy ? usuariosService.getUserAssignments(userId, cmpy) : Promise.resolve([])),
    [userId, cmpy],
  );

  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const codigosAsignados = useMemo(
    () => new Set((asignaciones.datos ?? []).map((a) => a.rusu_codusu)),
    [asignaciones.datos],
  );

  const asignados = (usuariosEva.datos ?? []).filter((u) =>
    codigosAsignados.has(u.KEY_rusu_codusu),
  );
  const disponibles = (usuariosEva.datos ?? []).filter(
    (u) => !codigosAsignados.has(u.KEY_rusu_codusu),
  );

  async function asignar() {
    if (!seleccionados.length || !userId || !cmpy) return;
    setError(null);
    setProcesando(true);
    try {
      await usuariosService.insertAssignments(
        seleccionados.map((codusu) => {
          const evaUser = disponibles.find((u) => u.KEY_rusu_codusu === codusu);
          return {
            AssignmentId: 0,
            rusu_cmpy: cmpy,
            rusu_codusu: codusu,
            rusu_nombre: evaUser?.rusu_nombre ?? "",
            rusu_codper: evaUser?.rusu_codper ?? "",
            UserId: userId,
          };
        }),
      );
      setSeleccionados([]);
      asignaciones.recargar();
    } catch {
      setError("No se pudieron guardar las asignaciones.");
    } finally {
      setProcesando(false);
    }
  }

  async function quitar(codusu: string) {
    setError(null);
    try {
      await usuariosService.deleteAssignment(cmpy, codusu, userId);
    } catch {
      setError("No se pudo quitar la asignación.");
    } finally {
      asignaciones.recargar();
    }
  }

  const columnasAsignados: Columna<MobRusuario>[] = [
    {
      titulo: "Código",
      valor: (u) => u.KEY_rusu_codusu,
      render: (u) => <code>{u.KEY_rusu_codusu}</code>,
      ancho: "8rem",
    },
    { titulo: "Nombre", valor: (u) => u.rusu_nombre, render: (u) => u.rusu_nombre },
    { titulo: "Perfil", valor: (u) => u.rusu_codper, render: (u) => u.rusu_codper },
    { titulo: "Región", valor: (u) => u.rusu_reg, render: (u) => u.rusu_reg },
    { titulo: "Territorio", valor: (u) => u.rusu_teri, render: (u) => u.rusu_teri },
    {
      titulo: "",
      ancho: "4rem",
      alineacion: "derecha",
      render: (u) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => quitar(u.KEY_rusu_codusu)}
          aria-label="Quitar asignación"
        >
          <IconTrash />
        </Button>
      ),
    },
  ];

  const columnasDisponibles: Columna<MobRusuario>[] = [
    {
      titulo: "",
      ancho: "3rem",
      render: (u) => (
        <input
          type="checkbox"
          checked={seleccionados.includes(u.KEY_rusu_codusu)}
          onChange={() =>
            setSeleccionados((previo) =>
              previo.includes(u.KEY_rusu_codusu)
                ? previo.filter((c) => c !== u.KEY_rusu_codusu)
                : [...previo, u.KEY_rusu_codusu],
            )
          }
          aria-label={`Seleccionar ${u.rusu_nombre}`}
        />
      ),
    },
    {
      titulo: "Código",
      valor: (u) => u.KEY_rusu_codusu,
      render: (u) => <code>{u.KEY_rusu_codusu}</code>,
      ancho: "8rem",
    },
    { titulo: "Nombre", valor: (u) => u.rusu_nombre, render: (u) => u.rusu_nombre },
    { titulo: "Perfil", valor: (u) => u.rusu_codper, render: (u) => u.rusu_codper },
    { titulo: "Región", valor: (u) => u.rusu_reg, render: (u) => u.rusu_reg },
    { titulo: "Territorio", valor: (u) => u.rusu_teri, render: (u) => u.rusu_teri },
  ];

  const errorEva = usuariosEva.error;

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Usuarios asignados"
        description="Vincula usuarios del ERP con una cuenta de Seguimiento Online."
      />

      <div className={formularios.filtros}>
        <Field label="Usuario" htmlFor="userId">
          <select
            id="userId"
            className={inputs.select}
            value={userId}
            onChange={(evento) => {
              setParams({ userId: evento.target.value });
              setSeleccionados([]);
            }}
          >
            {usuarios.datos?.map((u) => (
              <option key={u.Id} value={u.Id}>
                {u.FirstName} {u.LastName} — {u.Email}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Compañía" htmlFor="cmpy">
          <select
            id="cmpy"
            className={inputs.select}
            value={cmpy}
            onChange={(evento) => {
              setCmpy(evento.target.value);
              setSeleccionados([]);
            }}
          >
            {companiasUsuario.datos?.map((t) => (
              <option key={t.IDTenant} value={t.IDCompanyTenant}>
                {t.NameCompanyTenant}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error ? <Alert tone="critical">{error}</Alert> : null}
      {errorEva ? (
        <Alert tone="warning">
          No se pudo consultar el API de la compañía ({tenantElegido?.APIUrlTenant ?? "sin URL"}).
        </Alert>
      ) : null}

      <h3 className={formularios.subtitulo}>Asignados ({asignados.length})</h3>
      <DataTable
        columnas={columnasAsignados}
        filas={asignados}
        claveFila={(u) => u.KEY_rusu_codusu}
        cargando={usuariosEva.cargando || asignaciones.cargando}
        vacio="Este usuario no tiene asignaciones en la compañía seleccionada."
        porPagina={10}
      />

      <h3 className={formularios.subtitulo}>Disponibles ({disponibles.length})</h3>
      <DataTable
        columnas={columnasDisponibles}
        filas={disponibles}
        claveFila={(u) => u.KEY_rusu_codusu}
        cargando={usuariosEva.cargando || asignaciones.cargando}
        vacio="No hay usuarios disponibles para asignar."
        porPagina={10}
        acciones={
          <Button
            variant="primary"
            onClick={asignar}
            disabled={seleccionados.length === 0 || procesando}
          >
            <IconPlus /> Asignar {seleccionados.length || ""}
          </Button>
        }
      />
    </>
  );
}

function useDatosSesion() {
  const { session } = useAuth();
  return { session, tenants: session?.tenants ?? [] };
}
