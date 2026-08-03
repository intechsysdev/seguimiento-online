import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { authService } from "../../services/authService";
import { REGLAS_PASSWORD, validarPassword } from "../../utils/password";
import inputs from "../../components/ui/inputs.module.css";
import styles from "./AccountForms.module.css";

/** Migra Views/Account/ResetPassword.cshtml (token y email llegan por query). */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const nueva = String(datos.get("newPassword") ?? "");
    const confirmar = String(datos.get("confirmPassword") ?? "");

    const problema = validarPassword(nueva, confirmar);
    if (problema) {
      setError(problema);
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      const respuesta = await authService.resetPassword({
        Token: token,
        Email: email,
        NewPassword: nueva,
        ConfirmPassword: confirmar,
      });
      if (respuesta.IsSuccess) {
        navigate("/login", { replace: true });
      } else {
        setError(respuesta.Message || "No se pudo restablecer la contraseña.");
      }
    } catch {
      setError("No se pudo contactar el servicio. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (!token || !email) {
    return (
      <AuthLayout titulo="Enlace no válido">
        <Alert tone="critical">
          El enlace está incompleto o expiró. Solicita uno nuevo desde recuperar contraseña.
        </Alert>
        <div className={styles.form}>
          <Link to="/forgot-password">Solicitar nuevo enlace</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout titulo="Nueva contraseña" descripcion={`Cuenta: ${email}`}>
      <form className={styles.form} onSubmit={onSubmit}>
        {error ? <Alert tone="critical">{error}</Alert> : null}

        <Field label="Nueva contraseña" htmlFor="newPassword">
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            className={inputs.input}
            autoComplete="new-password"
            required
            autoFocus
          />
        </Field>

        <Field label="Confirmar contraseña" htmlFor="confirmPassword">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className={inputs.input}
            autoComplete="new-password"
            required
          />
        </Field>

        <ul className={styles.reglas}>
          {REGLAS_PASSWORD.map((regla) => (
            <li key={regla}>{regla}</li>
          ))}
        </ul>

        <Button type="submit" variant="primary" disabled={enviando}>
          {enviando ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </form>
    </AuthLayout>
  );
}
