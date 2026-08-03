import { useCallback, useEffect, useState } from "react";

interface EstadoApi<T> {
  datos: T | undefined;
  cargando: boolean;
  error: string | null;
}

/**
 * Carga datos de un servicio y expone `recargar()`.
 *
 * Sustituye al patron del MVC donde el controller cargaba el modelo antes de
 * renderizar la vista y cada accion terminaba en RedirectToAction.
 *
 * `deps` controla cuando se vuelve a pedir (por ejemplo, al cambiar de compania).
 */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []): EstadoApi<T> & {
  recargar: () => void;
} {
  const [estado, setEstado] = useState<EstadoApi<T>>({
    datos: undefined,
    cargando: true,
    error: null,
  });
  const [contador, setContador] = useState(0);

  const recargar = useCallback(() => setContador((n) => n + 1), []);

  useEffect(() => {
    let cancelado = false;
    setEstado((previo) => ({ ...previo, cargando: true, error: null }));

    fn()
      .then((datos) => {
        if (!cancelado) setEstado({ datos, cargando: false, error: null });
      })
      .catch((error: unknown) => {
        if (cancelado) return;
        const mensaje = error instanceof Error ? error.message : "Error al cargar los datos";
        setEstado({ datos: undefined, cargando: false, error: mensaje });
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, contador]);

  return { ...estado, recargar };
}
