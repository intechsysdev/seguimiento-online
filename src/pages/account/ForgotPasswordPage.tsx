import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { authService } from "../../services/authService";
import inputs from "../../components/ui/inputs.module.css";
import styles from "./AccountForms.module.css";

/**
 * Migra Views/Account/ForgotPassword.cshtml.
 *
 * Diferencia con el MVC: alli el controller, tras ForgetPassword, llamaba a
 * InfoBip para enviar el correo con la plantilla 239578. Ese envio usa el
 * APIKey de ApplicationConfig y no debe ejecutarse desde el navegador, asi que
 * queda del lado del API. Ver nota en MIGRACION.md.
 */
export function ForgotPasswordPage() {
  const [estado, setEstado] = useState<"idle" | "enviando" | "listo">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const email = String(new FormData(evento.currentTarget).get("email") ?? "");
    setError(null);
    setEstado("enviando");
    try {
      await authService.forgetPassword(email);
      // Se responde igual haya o no cuenta, para no revelar si el correo existe.
      setEstado("listo");
    } catch {
      setEstado("idle");
      setError("No se pudo contactar el servicio. Intenta de nuevo.");
    }
  }

  if (estado === "listo") {
    return (
      <AuthLayout titulo="Revisa tu correo">
        <Alert tone="success">
          Si el correo está registrado, recibirás un enlace para restablecer la contraseña.
        </Alert>
        <div className={styles.form}>
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      titulo="Recuperar contraseña"
      descripcion="Te enviaremos un enlace para crear una nueva contraseña."
      pie={<Link to="/login">Volver al inicio de sesión</Link>}
    >
      <form className={styles.form} onSubmit={onSubmit}>
        {error ? <Alert tone="critical">{error}</Alert> : null}
        <Field label="Correo" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            className={inputs.input}
            placeholder="usuario@empresa.com"
            required
            autoFocus
          />
        </Field>
        <Button type="submit" variant="primary" disabled={estado === "enviando"}>
          {estado === "enviando" ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
    </AuthLayout>
  );
}
