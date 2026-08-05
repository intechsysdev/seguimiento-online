import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { setTokenProvider, setUnauthorizedHandler } from "../api/http";
import { authService } from "../services/authService";
import { limpiarFotos } from "../services/fotosUsuarios";
import { tenantService } from "../services/tenantService";
import type { TenantDto } from "../types/seguridad";
import type { Session } from "../types/session";

const STORAGE_KEY = "seguimiento.session";

/**
 * Lo que se guarda en sessionStorage. Deliberadamente NO incluye `tenants`:
 * TenantDto trae UserAPITenant/PwdAPITenant, las credenciales Basic del API de
 * cada compania. En el MVC nunca salian del servidor; aca se mantienen solo en
 * memoria y se vuelven a pedir al arrancar con el access token.
 */
type PersistedSession = Omit<Session, "tenants">;

function loadPersisted(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.accessToken) return null;
    if (parsed.expireDate && new Date(parsed.expireDate).getTime() < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(session: Session) {
  const { tenants: _tenants, ...rest } = session;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  session: Session | null;
  /** true mientras se rehidrata la sesion al arrancar la app. */
  cargando: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  cambiarTenant: (idCompanyTenant: string) => void;
  /** Compania activa, con la URL y credenciales de su API. */
  tenant: TenantDto | undefined;
  /** Equivale a `modules.Any(x => x.ModuleName == nombre)` del _Layout. */
  tieneModulo: (nombre: string) => boolean;
  puedeLeer: (modulo: string) => boolean;
  puedeEscribir: (modulo: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  // El cliente HTTP lee el token de aca sin depender del ciclo de render.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = session?.accessToken ?? null;

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    // Las fotos se cachean en memoria: se descartan para no mostrarlas al
    // siguiente usuario que inicie sesion en la misma pestaña.
    limpiarFotos();
    setSession(null);
  }, []);

  useEffect(() => {
    setTokenProvider(() => tokenRef.current);
    setUnauthorizedHandler(logout);
    return () => {
      setTokenProvider(() => null);
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  // Rehidratacion: recupera la sesion persistida y vuelve a pedir las companias.
  useEffect(() => {
    const persisted = loadPersisted();
    if (!persisted) {
      setCargando(false);
      return;
    }

    let cancelado = false;
    tokenRef.current = persisted.accessToken;

    tenantService
      .getListByUser(persisted.userId)
      .then((tenants) => {
        if (cancelado) return;
        setSession({ ...persisted, tenants: tenants ?? [] });
      })
      .catch(() => {
        if (!cancelado) sessionStorage.removeItem(STORAGE_KEY);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    let respuesta;
    try {
      respuesta = await authService.login({ Email: email, Password: password });
    } catch {
      return { ok: false, error: "No se pudo conectar con el servicio de seguridad." };
    }

    if (!respuesta.IsSuccess) {
      return { ok: false, error: "Error. Usuario o contraseña incorrecta" };
    }

    // En Login el API devuelve el access_token dentro de Message.
    const accessToken = respuesta.Message;
    tokenRef.current = accessToken;

    let tenants: TenantDto[];
    try {
      tenants = (await tenantService.getListByUser(respuesta.UserId)) ?? [];
    } catch {
      tokenRef.current = null;
      return { ok: false, error: "No se pudieron cargar las compañías del usuario." };
    }

    if (tenants.length === 0) {
      tokenRef.current = null;
      return { ok: false, error: "El usuario no tiene compañías asignadas." };
    }

    const porDefecto = tenants.find((t) => t.DefaultTenant) ?? tenants[0];

    const nueva: Session = {
      username: email,
      userId: respuesta.UserId,
      accessToken,
      role: respuesta.Role,
      isAdmin: respuesta.Role === "Administrador",
      permissions: respuesta.Permissions ?? [],
      modules: respuesta.Modules ?? [],
      tenants,
      tenantActual: porDefecto.IDCompanyTenant,
      expireDate: respuesta.ExpireDate,
    };

    persist(nueva);
    setSession(nueva);
    return { ok: true };
  }, []);

  const cambiarTenant = useCallback((idCompanyTenant: string) => {
    setSession((actual) => {
      if (!actual) return actual;
      if (!actual.tenants.some((t) => t.IDCompanyTenant === idCompanyTenant)) return actual;
      const siguiente = { ...actual, tenantActual: idCompanyTenant };
      persist(siguiente);
      return siguiente;
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const permisos = session?.permissions ?? [];
    return {
      session,
      cargando,
      login,
      logout,
      cambiarTenant,
      tenant: session?.tenants.find((t) => t.IDCompanyTenant === session.tenantActual),
      tieneModulo: (nombre) => session?.modules.some((m) => m.ModuleName === nombre) ?? false,
      puedeLeer: (modulo) =>
        permisos.some((p) => p.ModuleName === modulo && p.CanRead),
      puedeEscribir: (modulo) =>
        permisos.some((p) => p.ModuleName === modulo && p.CanWrite),
    };
  }, [session, cargando, login, logout, cambiarTenant]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
