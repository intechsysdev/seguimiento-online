import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { Spinner } from "../components/ui/Spinner";

/**
 * Equivale al atributo [Authorize] de los controllers y, opcionalmente, al
 * chequeo `modules.Any(x => x.ModuleName == ...)` que el _Layout hacia por menu.
 */
export function ProtectedRoute({ modulo }: { modulo?: string }) {
  const { session, cargando, tieneModulo } = useAuth();
  const location = useLocation();

  if (cargando) return <Spinner mensaje="Restaurando sesión…" />;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (modulo && !tieneModulo(modulo)) {
    return <Navigate to="/sin-acceso" replace />;
  }

  return <Outlet />;
}
