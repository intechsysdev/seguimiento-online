import { useMemo } from "react";
import { useApi } from "./useApi";
import { usuariosService } from "../services/usuariosService";
import { usuariosEvaService } from "../services/eva/usuariosEvaService";
import { useAuth } from "../store/AuthContext";
import type { MobRusuario } from "../types/eva";

/**
 * Vendedores del ERP visibles para el usuario en sesion.
 *
 * Todos los modulos operativos (Clientes, Ubicaciones, Rutas, Visitas) repetian
 * este bloque en su controller: traer los usuarios de la compañía y dejar solo
 * los que estan asignados a la cuenta que consulta.
 */
export function useUsuariosAsignados() {
  const { session, tenant } = useAuth();
  const cmpy = session?.tenantActual ?? "";
  const userId = session?.userId ?? "";

  const todos = useApi(
    () => (tenant && cmpy ? usuariosEvaService.getListAll(tenant, cmpy) : Promise.resolve([])),
    [tenant?.IDTenant, cmpy],
  );

  const asignaciones = useApi(
    () => (userId && cmpy ? usuariosService.getUserAssignments(userId, cmpy) : Promise.resolve([])),
    [userId, cmpy],
  );

  const usuarios = useMemo<MobRusuario[]>(() => {
    const codigos = new Set((asignaciones.datos ?? []).map((a) => a.rusu_codusu));
    return (todos.datos ?? []).filter((u) => codigos.has(u.KEY_rusu_codusu));
  }, [todos.datos, asignaciones.datos]);

  /** Codigos asignados: es el filtro por defecto cuando el usuario no elige a nadie. */
  const codigosAsignados = useMemo(
    () => usuarios.map((u) => u.KEY_rusu_codusu),
    [usuarios],
  );

  /**
   * Mensaje listo para mostrar. Sin esto, un fallo del API dejaba el
   * desplegable de vendedores vacio y sin explicacion.
   */
  let error: string | null = null;
  if (!tenant) {
    error =
      "No hay una compañía activa con API configurada. Revisa Administración → Compañías.";
  } else if (todos.error) {
    error = `No se pudieron cargar los vendedores desde ${tenant.APIUrlTenant} — ${todos.error}`;
  } else if (asignaciones.error) {
    error = `No se pudieron cargar las asignaciones del usuario — ${asignaciones.error}`;
  } else if (!todos.cargando && !asignaciones.cargando && usuarios.length === 0) {
    error =
      (todos.datos?.length ?? 0) === 0
        ? "El API de la compañía no devolvió vendedores."
        : "Tu usuario no tiene vendedores asignados en esta compañía. Asígnalos en Administración → Usuarios asignados.";
  }

  return {
    usuarios,
    codigosAsignados,
    cargando: todos.cargando || asignaciones.cargando,
    error,
    cmpy,
    tenant,
  };
}
