import { Link } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Alert } from "../../components/ui/Alert";
import styles from "./AccountForms.module.css";

/** Migra Views/Account/ConfirmEmail.cshtml */
export function ConfirmEmailPage() {
  return (
    <AuthLayout titulo="Cuenta confirmada">
      <Alert tone="success">
        Tu correo fue confirmado correctamente. Ya puedes iniciar sesión.
      </Alert>
      <div className={styles.form}>
        <Link to="/login">Ir al inicio de sesión</Link>
      </div>
    </AuthLayout>
  );
}

/** Migra Views/Account/NotFound.cshtml */
export function NotFoundPage() {
  return (
    <AuthLayout titulo="Página no encontrada" descripcion="Error 404">
      <Alert tone="warning">La página que buscas no existe o fue movida.</Alert>
      <div className={styles.form}>
        <Link to="/">Volver al inicio</Link>
      </div>
    </AuthLayout>
  );
}

/** Migra Views/Account/InternalError.cshtml */
export function InternalErrorPage() {
  return (
    <AuthLayout titulo="Error interno" descripcion="Error 500">
      <Alert tone="critical">
        Ocurrió un error inesperado. Si persiste, contacta al administrador.
      </Alert>
      <div className={styles.form}>
        <Link to="/">Volver al inicio</Link>
      </div>
    </AuthLayout>
  );
}

/** Nueva: el MVC ocultaba el menu, aca la ruta existe pero se bloquea. */
export function SinAccesoPage() {
  return (
    <AuthLayout titulo="Sin acceso">
      <Alert tone="warning">
        Tu usuario no tiene permisos sobre este módulo. Solicítalos al administrador.
      </Alert>
      <div className={styles.form}>
        <Link to="/">Volver al inicio</Link>
      </div>
    </AuthLayout>
  );
}
