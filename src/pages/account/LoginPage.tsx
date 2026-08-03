import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { useAuth } from "../../store/AuthContext";
import inputs from "../../components/ui/inputs.module.css";
import styles from "./AccountForms.module.css";

/** Migra Views/Account/Index.cshtml + AccountController.Validate. */
export function LoginPage() {
  const { session, cargando, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const destino = (location.state as { from?: string } | null)?.from ?? "/";

  if (!cargando && session) return <Navigate to={destino} replace />;

  async function onSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setError(null);
    setEnviando(true);
    const resultado = await login(
      String(datos.get("username") ?? ""),
      String(datos.get("password") ?? ""),
    );
    setEnviando(false);
    if (resultado.ok) navigate(destino, { replace: true });
    else setError(resultado.error ?? "No fue posible iniciar sesión.");
  }

  return (
    <AuthLayout
      titulo="Iniciar sesión"
      descripcion="Ingresa con tu cuenta corporativa para continuar."
      pie={<Link to="/forgot-password">¿Olvidaste la contraseña?</Link>}
    >
      <form className={styles.form} onSubmit={onSubmit}>
        {error ? <Alert tone="critical">{error}</Alert> : null}

        <Field label="Usuario" htmlFor="username">
          <input
            id="username"
            name="username"
            type="email"
            className={inputs.input}
            placeholder="usuario@empresa.com"
            autoComplete="username"
            required
            autoFocus
          />
        </Field>

        <Field label="Contraseña" htmlFor="password">
          <input
            id="password"
            name="password"
            type="password"
            className={inputs.input}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </Field>

        <Button type="submit" variant="primary" disabled={enviando}>
          {enviando ? "Validando…" : "Iniciar sesión"}
        </Button>
      </form>
    </AuthLayout>
  );
}
