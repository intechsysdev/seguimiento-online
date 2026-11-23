import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AuthProvider } from "./store/AuthContext";

import { LoginPage } from "./pages/account/LoginPage";
import { ForgotPasswordPage } from "./pages/account/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/account/ResetPasswordPage";

import {
  ConfirmEmailPage,
  InternalErrorPage,
  NotFoundPage,
  SinAccesoPage,
} from "./pages/account/StatusPages";

import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { PerfilPage } from "./pages/perfil/PerfilPage";
import { CompaniasPage } from "./pages/seguridad/CompaniasPage";
import { UsuariosPage } from "./pages/seguridad/UsuariosPage";
import { UsuarioFormPage } from "./pages/seguridad/UsuarioFormPage";
import { AsignacionesPage } from "./pages/seguridad/AsignacionesPage";
import { PermisosPage } from "./pages/seguridad/PermisosPage";
import { RolesPage } from "./pages/seguridad/RolesPage";

import { ApisPage } from "./pages/administracion/ApisPage";
import { PerfilesPage } from "./pages/administracion/PerfilesPage";
import { AuditoriaPage } from "./pages/administracion/AuditoriaPage";
import { ClientesPage } from "./pages/clientes/ClientesPage";
import { CatalogoPage } from "./pages/productos/CatalogoPage";
import { LineasPage } from "./pages/productos/LineasPage";
import { ListasPrecioPage } from "./pages/productos/ListasPrecioPage";
import { ConsolidadasPage } from "./pages/visitas/ConsolidadasPage";
import { EfectuadasPage } from "./pages/visitas/EfectuadasPage";
import { DetalladasPage } from "./pages/visitas/DetalladasPage";
import { UbicacionesPage } from "./pages/ubicaciones/UbicacionesPage";
import { RutasPage } from "./pages/rutas/RutasPage";
import { EntregasPage } from "./pages/pop/EntregasPage";
import { MarcasPage } from "./pages/pop/MarcasPage";
import { MaterialPage } from "./pages/pop/MaterialPage";
import { CampanasPage } from "./pages/CampanasPage";
import { CampanaFormPage } from "./pages/CampanaFormPage";
import { ReglasPage } from "./pages/ReglasPage";
import { ReglaFormPage } from "./pages/ReglaFormPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Publicas: equivalen a las vistas de Account con Layout = null. */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/sin-acceso" element={<SinAccesoPage />} />
        <Route path="/error" element={<InternalErrorPage />} />

        {/* Privadas: equivalen a los controllers con [Authorize]. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/accesos" element={<HomePage />} />
            <Route path="/perfil" element={<PerfilPage />} />
            {/* Rutas antiguas: ahora todo vive en Mi perfil. */}
            <Route
              path="/cambiar-password"
              element={<Navigate to="/perfil" replace />}
            />
            <Route
              path="/perfil/foto"
              element={<Navigate to="/perfil" replace />}
            />
          </Route>
        </Route>

        {/* Migra SeguridadController, que exigia el modulo Administración. */}
        <Route element={<ProtectedRoute modulo="Administración" />}>
          <Route element={<AppShell />}>
            <Route path="/seguridad/companias" element={<CompaniasPage />} />
            <Route path="/seguridad/usuarios" element={<UsuariosPage />} />
            <Route
              path="/seguridad/usuarios/nuevo"
              element={<UsuarioFormPage />}
            />
            <Route
              path="/seguridad/usuarios/:id"
              element={<UsuarioFormPage />}
            />
            <Route
              path="/seguridad/asignaciones"
              element={<AsignacionesPage />}
            />
            <Route path="/seguridad/permisos" element={<PermisosPage />} />
            <Route path="/seguridad/roles" element={<RolesPage />} />
            <Route path="/administracion/apis" element={<ApisPage />} />
            <Route path="/administracion/perfiles" element={<PerfilesPage />} />
            <Route
              path="/administracion/auditoria"
              element={<AuditoriaPage />}
            />
          </Route>
        </Route>

        <Route element={<ProtectedRoute modulo="POP" />}>
          <Route element={<AppShell />}>
            <Route path="/pop/entregas" element={<EntregasPage />} />
            <Route path="/pop/marcas" element={<MarcasPage />} />
            <Route path="/pop/material" element={<MaterialPage />} />
          </Route>
        </Route>

        {/* Mismo módulo que el enlace del menú (config/navigation.tsx). */}
        <Route element={<ProtectedRoute modulo="Mercadeo" />}>
          <Route element={<AppShell />}>
            <Route path="/bonificados" element={<CampanasPage />} />
            <Route
              path="/bonificados/campanas/nueva"
              element={<CampanaFormPage />}
            />
            <Route
              path="/bonificados/campanas/:id/editar"
              element={<CampanaFormPage />}
            />
            <Route
              path="/bonificados/campanas/:campanaId"
              element={<ReglasPage />}
            />
            <Route
              path="/bonificados/campanas/:campanaId/reglas/nueva"
              element={<ReglaFormPage />}
            />
            <Route
              path="/bonificados/campanas/:campanaId/reglas/:reglaId"
              element={<ReglaFormPage />}
            />
          </Route>
        </Route>

        <Route element={<ProtectedRoute modulo="Visitas" />}>
          <Route element={<AppShell />}>
            <Route
              path="/visitas/consolidadas"
              element={<ConsolidadasPage />}
            />
            <Route path="/visitas/efectuadas" element={<EfectuadasPage />} />
            <Route path="/visitas/detalladas" element={<DetalladasPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute modulo="Ubicaciones" />}>
          <Route element={<AppShell />}>
            <Route path="/ubicaciones" element={<UbicacionesPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute modulo="Rutas" />}>
          <Route element={<AppShell />}>
            <Route path="/rutas" element={<RutasPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute modulo="Clientes" />}>
          <Route element={<AppShell />}>
            <Route path="/clientes" element={<ClientesPage />} />
          </Route>
        </Route>

        {/* Catalogo de productos: mismos endpoints que consume la app movil.
              Sin `modulo`: sigue exigiendo sesion, pero no el permiso
              "Productos", que aun no existe en Seguridad. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/productos" element={<CatalogoPage />} />
            <Route path="/productos/lineas" element={<LineasPage />} />
            <Route path="/productos/precios" element={<ListasPrecioPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
