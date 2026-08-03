import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { authService } from "../../services/authService";
import { profileService } from "../../services/profileService";
import { tenantService } from "../../services/tenantService";
import { usuariosService } from "../../services/usuariosService";
import { REGLAS_PASSWORD, validarPassword } from "../../utils/password";
import inputs from "../../components/ui/inputs.module.css";
import formularios from "./Formularios.module.css";

/**
 * Migra Views/Seguridad/InsertUser.cshtml y UpdateUser.cshtml en una sola vista.
 *
 * En alta el MVC llamaba a Auth/Register y luego enviaba el correo de activacion
 * por InfoBip con el APIKey de ApplicationConfig. Ese envio no puede hacerse
 * desde el navegador; queda pendiente moverlo al API (ver MIGRACION.md).
 */
export function UsuarioFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const companias = useApi(() => tenantService.getList());
  const perfiles = useApi(() => profileService.getList());
  const roles = useApi(() => usuariosService.getRoles());

  const usuario = useApi(
    () => (id ? usuariosService.getById(id) : Promise.resolve(undefined)),
    [id],
  );
  const companiasUsuario = useApi(
    () => (id ? tenantService.getListByUser(id) : Promise.resolve([])),
    [id],
  );
  const perfilesUsuario = useApi(
    () => (id ? profileService.getListByUserId(id) : Promise.resolve([])),
    [id],
  );

  const [companiasSel, setCompaniasSel] = useState<string[]>([]);
  const [perfilesSel, setPerfilesSel] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (companiasUsuario.datos) {
      setCompaniasSel(companiasUsuario.datos.map((t) => t.IDTenant));
    }
  }, [companiasUsuario.datos]);

  useEffect(() => {
    if (perfilesUsuario.datos) {
      setPerfilesSel(perfilesUsuario.datos.map((p) => p.IDProfile));
    }
  }, [perfilesUsuario.datos]);

  const cargando =
    companias.cargando || perfiles.cargando || roles.cargando || (esEdicion && usuario.cargando);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);

    const email = String(datos.get("Email") ?? "");
    const comun = {
      Email: email,
      // El controller siempre igualaba UserName al correo.
      UserName: email,
      FirstName: String(datos.get("FirstName") ?? ""),
      LastName: String(datos.get("LastName") ?? ""),
      DNI: String(datos.get("DNI") ?? ""),
      Phone: String(datos.get("Phone") ?? ""),
      PersonId: Number(datos.get("PersonId") ?? 0),
      Tenant: companiasSel,
      Profiles: perfilesSel,
    };

    setError(null);
    setGuardando(true);
    try {
      if (esEdicion) {
        await usuariosService.update({
          ...comun,
          Id: id!,
          EmailConfirmed: usuario.datos?.EmailConfirmed ?? false,
          Name: String(datos.get("Rol") ?? ""),
        });
      } else {
        const password = String(datos.get("Password") ?? "");
        const confirmar = String(datos.get("ConfirmPassword") ?? "");
        const problema = validarPassword(password, confirmar);
        if (problema) {
          setError(problema);
          return;
        }

        const respuesta = await authService.register({
          ...comun,
          Id: "",
          EmailConfirmed: false,
          Password: password,
          ConfirmPassword: confirmar,
          Rol: String(datos.get("Rol") ?? ""),
        });

        if (!respuesta.IsSuccess) {
          setError(respuesta.Errors?.join(" ") || respuesta.Message || "No se pudo crear el usuario.");
          return;
        }
      }
      navigate("/seguridad/usuarios");
    } catch {
      setError("No se pudo guardar el usuario.");
    } finally {
      setGuardando(false);
    }
  }

  function alternar<T>(lista: T[], valor: T): T[] {
    return lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];
  }

  if (cargando) return <Spinner mensaje="Cargando…" />;

  const item = usuario.datos;

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title={esEdicion ? "Editar usuario" : "Nuevo usuario"}
        description={esEdicion ? item?.Email : "Se enviará un correo de activación."}
        backTo="/seguridad/usuarios"
        backLabel="Usuarios"
      />

      <form className={formularios.form} onSubmit={guardar} style={{ maxWidth: "46rem" }}>
        {error ? <Alert tone="critical">{error}</Alert> : null}

        <div className={formularios.fila}>
          <Field label="Nombres" htmlFor="FirstName">
            <input
              id="FirstName"
              name="FirstName"
              className={inputs.input}
              defaultValue={item?.FirstName}
              required
            />
          </Field>
          <Field label="Apellidos" htmlFor="LastName">
            <input
              id="LastName"
              name="LastName"
              className={inputs.input}
              defaultValue={item?.LastName}
              required
            />
          </Field>
        </div>

        <div className={formularios.fila}>
          <Field label="Cédula" htmlFor="DNI">
            <input id="DNI" name="DNI" className={inputs.input} defaultValue={item?.DNI} required />
          </Field>
          <Field label="Celular" htmlFor="Phone">
            <input
              id="Phone"
              name="Phone"
              className={inputs.input}
              defaultValue={item?.Phone}
              required
            />
          </Field>
        </div>

        <div className={formularios.fila}>
          <Field label="Correo" htmlFor="Email">
            <input
              id="Email"
              name="Email"
              type="email"
              className={inputs.input}
              defaultValue={item?.Email}
              required
            />
          </Field>
          <Field label="Rol" htmlFor="Rol">
            <select id="Rol" name="Rol" className={inputs.select} defaultValue={item?.Name ?? ""}>
              <option value="">Sin rol</option>
              {roles.datos?.map((rol) => (
                <option key={rol.Id} value={rol.Name}>
                  {rol.Name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Person Id" htmlFor="PersonId" hint="Identificador del maestro de personas.">
          <input
            id="PersonId"
            name="PersonId"
            type="number"
            className={inputs.input}
            defaultValue={item?.PersonId ?? 0}
          />
        </Field>

        {!esEdicion && (
          <>
            <div className={formularios.fila}>
              <Field label="Contraseña" htmlFor="Password">
                <input
                  id="Password"
                  name="Password"
                  type="password"
                  className={inputs.input}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field label="Confirmar contraseña" htmlFor="ConfirmPassword">
                <input
                  id="ConfirmPassword"
                  name="ConfirmPassword"
                  type="password"
                  className={inputs.input}
                  autoComplete="new-password"
                  required
                />
              </Field>
            </div>
            <ul className={formularios.url} style={{ listStyle: "disc", paddingLeft: "1rem" }}>
              {REGLAS_PASSWORD.map((regla) => (
                <li key={regla}>{regla}</li>
              ))}
            </ul>
          </>
        )}

        <Field label="Compañías">
          <div className={formularios.checkList}>
            {companias.datos?.map((compania) => (
              <label key={compania.IDTenant} className={formularios.check}>
                <input
                  type="checkbox"
                  checked={companiasSel.includes(compania.IDTenant)}
                  onChange={() => setCompaniasSel((previo) => alternar(previo, compania.IDTenant))}
                />
                {compania.NameCompanyTenant}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Perfiles">
          <div className={formularios.checkList}>
            {perfiles.datos?.map((perfil) => (
              <label key={perfil.IDProfile} className={formularios.check}>
                <input
                  type="checkbox"
                  checked={perfilesSel.includes(perfil.IDProfile)}
                  onChange={() => setPerfilesSel((previo) => alternar(previo, perfil.IDProfile))}
                />
                {perfil.NameProfile}
              </label>
            ))}
          </div>
        </Field>

        <div className={formularios.pie}>
          <Button type="button" variant="ghost" onClick={() => navigate("/seguridad/usuarios")}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </>
  );
}
