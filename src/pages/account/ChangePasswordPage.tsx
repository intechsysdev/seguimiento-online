import { useState, type FormEvent } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { authService } from "../../services/authService";
import { useAuth } from "../../store/AuthContext";
import { REGLAS_PASSWORD, validarPassword } from "../../utils/password";
import inputs from "../../components/ui/inputs.module.css";
import styles from "./AccountForms.module.css";

/**
 * Migra Views/Account/ChangedPassword.cshtml. Es la unica vista de Account que
 * corre autenticada, por eso usa el shell de la app y no AuthLayout.
 */
export function ChangePasswordPage() {
  const { session } = useAuth();
  const [mensaje, setMensaje] = useState<{ tono: "success" | "critical"; texto: string } | null>(
    null,
  );
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    const nueva = String(datos.get("newPassword") ?? "");
    const confirmar = String(datos.get("confirmPassword") ?? "");

    const problema = validarPassword(nueva, confirmar);
    if (problema) {
      setMensaje({ tono: "critical", texto: problema });
      return;
    }

    setMensaje(null);
    setEnviando(true);
    try {
      const respuesta = await authService.changedPassword({
        // El controller sobrescribia Email con el claim de la sesion.
        Email: session?.username ?? "",
        CurrentPassword: String(datos.get("currentPassword") ?? ""),
        NewPassword: nueva,
        ConfirmPassword: confirmar,
      });
      setMensaje({
        tono: respuesta.IsSuccess ? "success" : "critical",
        texto: respuesta.Message || (respuesta.IsSuccess ? "Contraseña actualizada." : "No se pudo actualizar."),
      });
      if (respuesta.IsSuccess) formulario.reset();
    } catch {
      setMensaje({ tono: "critical", texto: "No se pudo contactar el servicio." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader title="Cambiar contraseña" description={session?.username} />
      <form className={styles.form} onSubmit={onSubmit} style={{ maxWidth: "26rem" }}>
        {mensaje ? <Alert tone={mensaje.tono}>{mensaje.texto}</Alert> : null}

        <Field label="Contraseña actual" htmlFor="currentPassword">
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            className={inputs.input}
            autoComplete="current-password"
            required
          />
        </Field>

        <Field label="Nueva contraseña" htmlFor="newPassword">
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            className={inputs.input}
            autoComplete="new-password"
            required
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
    </>
  );
}
