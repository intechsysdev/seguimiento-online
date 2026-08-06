import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Alert } from "../../components/ui/Alert";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { IconCamera } from "../../components/icons";
import { Field } from "../../components/ui/Field";
import { Spinner } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { authService } from "../../services/authService";
import { profileService } from "../../services/profileService";
import { usuariosService } from "../../services/usuariosService";
import { useAuth } from "../../store/AuthContext";
import { REGLAS_PASSWORD, validarPassword } from "../../utils/password";
import inputs from "../../components/ui/inputs.module.css";
import estilos from "./Perfil.module.css";

const MAX_BYTES = 800 * 1024;

/**
 * Mi perfil: reúne en una sola pantalla lo que antes estaba repartido entre
 * Seguridad/Profile (foto) y Account/ChangedPassword, y añade los datos del
 * usuario, sus perfiles y sus compañías, que no se veían en ningún sitio.
 */
export function PerfilPage() {
  const { session, tenant } = useAuth();
  const email = session?.username ?? "";

  const usuario = useApi(
    () => (session?.userId ? usuariosService.getById(session.userId) : Promise.resolve(undefined)),
    [session?.userId],
  );
  const perfiles = useApi(
    () =>
      session?.userId ? profileService.getListByUserId(session.userId) : Promise.resolve([]),
    [session?.userId],
  );
  const catalogoPerfiles = useApi(() => profileService.getList());
  const foto = useApi(
    () => (email ? usuariosService.getPhotoByEmail(email) : Promise.resolve(undefined)),
    [email],
  );

  const [previsualizacion, setPrevisualizacion] = useState<string | null>(null);
  const [avisoFoto, setAvisoFoto] = useState<{ tono: "success" | "critical"; texto: string } | null>(
    null,
  );
  /** Solo se ofrece guardar cuando el usuario elige una imagen nueva. */
  const [fotoCambiada, setFotoCambiada] = useState(false);
  const [guardandoFoto, setGuardandoFoto] = useState(false);

  const [avisoClave, setAvisoClave] = useState<{
    tono: "success" | "critical";
    texto: string;
  } | null>(null);
  const [guardandoClave, setGuardandoClave] = useState(false);

  useEffect(() => {
    if (foto.datos?.Photo) setPrevisualizacion(foto.datos.Photo);
  }, [foto.datos]);

  function elegirFoto(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    if (archivo.size > MAX_BYTES) {
      setAvisoFoto({ tono: "critical", texto: "La imagen supera el máximo de 800 KB." });
      return;
    }
    const lector = new FileReader();
    lector.onloadend = () => {
      setPrevisualizacion(String(lector.result));
      setFotoCambiada(true);
      setAvisoFoto(null);
    };
    lector.readAsDataURL(archivo);
  }

  async function guardarFoto() {
    if (!previsualizacion) return;
    setGuardandoFoto(true);
    try {
      const ok = await usuariosService.updatePhoto({
        ID: foto.datos?.ID ?? 0,
        Photo: previsualizacion,
      });
      setAvisoFoto(
        ok
          ? { tono: "success", texto: "Foto actualizada. Se verá al recargar la página." }
          : { tono: "critical", texto: "No se pudo actualizar la foto." },
      );
      if (ok) setFotoCambiada(false);
    } catch {
      setAvisoFoto({ tono: "critical", texto: "No se pudo actualizar la foto." });
    } finally {
      setGuardandoFoto(false);
    }
  }

  async function cambiarClave(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    const nueva = String(datos.get("newPassword") ?? "");
    const confirmar = String(datos.get("confirmPassword") ?? "");

    const problema = validarPassword(nueva, confirmar);
    if (problema) {
      setAvisoClave({ tono: "critical", texto: problema });
      return;
    }

    setAvisoClave(null);
    setGuardandoClave(true);
    try {
      const respuesta = await authService.changedPassword({
        Email: email,
        CurrentPassword: String(datos.get("currentPassword") ?? ""),
        NewPassword: nueva,
        ConfirmPassword: confirmar,
      });
      setAvisoClave({
        tono: respuesta.IsSuccess ? "success" : "critical",
        texto:
          respuesta.Message ||
          (respuesta.IsSuccess ? "Contraseña actualizada." : "No se pudo actualizar."),
      });
      if (respuesta.IsSuccess) formulario.reset();
    } catch {
      setAvisoClave({ tono: "critical", texto: "No se pudo contactar el servicio." });
    } finally {
      setGuardandoClave(false);
    }
  }

  if (usuario.cargando) return <Spinner mensaje="Cargando tu perfil…" />;

  const item = usuario.datos;
  const nombre = item ? `${item.FirstName} ${item.LastName}`.trim() : email;

  const nombresPerfiles = (perfiles.datos ?? []).map(
    (p) =>
      catalogoPerfiles.datos?.find((c) => c.IDProfile === p.IDProfile)?.NameProfile ??
      `Perfil ${p.IDProfile}`,
  );

  return (
    <>
      <PageHeader title="Mi perfil" description="Tus datos, accesos y seguridad." />

      {/*
        La foto se edita aqui y en ningun otro sitio: antes aparecia tambien en
        un panel aparte, con la misma imagen repetida dos veces en pantalla.
      */}
      <div className={estilos.encabezado}>
        <div className={estilos.avatarZona}>
          {previsualizacion ? (
            <img src={previsualizacion} alt={`Foto de ${nombre}`} className={estilos.foto} />
          ) : (
            <Avatar email={email} nombre={nombre} size={84} />
          )}
          <label className={estilos.cambiarFoto}>
            <IconCamera />
            <span>Cambiar</span>
            <input type="file" accept="image/*" onChange={elegirFoto} />
          </label>
        </div>

        <div className={estilos.encabezadoDatos}>
          <h3 className={estilos.nombre}>{nombre}</h3>
          <p className={estilos.correo}>{email}</p>
          <div className={estilos.etiquetas}>
            <Badge tone="accent">{session?.role || "Usuario"}</Badge>
            {tenant ? <Badge tone="neutral">{tenant.NameCompanyTenant}</Badge> : null}
            {item?.EmailConfirmed ? (
              <Badge tone="success" dot>
                Correo confirmado
              </Badge>
            ) : (
              <Badge tone="warning" dot>
                Correo sin confirmar
              </Badge>
            )}
          </div>

          {avisoFoto ? <Alert tone={avisoFoto.tono}>{avisoFoto.texto}</Alert> : null}

          {/* El boton de guardar solo aparece cuando hay una foto nueva. */}
          {fotoCambiada ? (
            <div className={estilos.accionesFoto}>
              <Button
                variant="ghost"
                onClick={() => {
                  setPrevisualizacion(foto.datos?.Photo ?? null);
                  setFotoCambiada(false);
                  setAvisoFoto(null);
                }}
              >
                Cancelar
              </Button>
              <Button variant="primary" onClick={guardarFoto} disabled={guardandoFoto}>
                {guardandoFoto ? "Guardando…" : "Guardar foto"}
              </Button>
            </div>
          ) : (
            <p className={estilos.nota}>JPG, GIF o PNG. Máximo 800 KB.</p>
          )}
        </div>
      </div>

      <div className={estilos.grid}>
        <section className={estilos.panel}>
          <h3 className={estilos.panelTitulo}>Datos del usuario</h3>
          <dl className={estilos.datos}>
            <div>
              <dt>Nombres</dt>
              <dd>{item?.FirstName || "—"}</dd>
            </div>
            <div>
              <dt>Apellidos</dt>
              <dd>{item?.LastName || "—"}</dd>
            </div>
            <div>
              <dt>Cédula</dt>
              <dd>{item?.DNI || "—"}</dd>
            </div>
            <div>
              <dt>Celular</dt>
              <dd>{item?.Phone || "—"}</dd>
            </div>
            <div>
              <dt>Usuario</dt>
              <dd>{item?.UserName || email}</dd>
            </div>
          </dl>
          <p className={estilos.nota}>
            Estos datos los administra Seguridad. Si algo no coincide, solicita el cambio en
            Administración → Usuarios.
          </p>
        </section>

        <section className={estilos.panel}>
          <h3 className={estilos.panelTitulo}>Perfiles y compañías</h3>

          <p className={estilos.subtitulo}>Perfiles</p>
          {perfiles.cargando ? (
            <Spinner />
          ) : nombresPerfiles.length ? (
            <ul className={estilos.chips}>
              {nombresPerfiles.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : (
            <p className={estilos.vacio}>Sin perfiles asignados.</p>
          )}

          <p className={estilos.subtitulo}>Compañías</p>
          {session?.tenants.length ? (
            <ul className={estilos.chips}>
              {session.tenants.map((t) => (
                <li key={t.IDTenant} className={t.IDCompanyTenant === session.tenantActual ? estilos.chipActivo : undefined}>
                  {t.NameCompanyTenant}
                  {t.IDCompanyTenant === session.tenantActual ? " · activa" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className={estilos.vacio}>Sin compañías asignadas.</p>
          )}

          <p className={estilos.subtitulo}>Módulos con acceso</p>
          {session?.modules.length ? (
            <ul className={estilos.chips}>
              {session.modules.map((m) => (
                <li key={m.ModuleName}>{m.ModuleName}</li>
              ))}
            </ul>
          ) : (
            <p className={estilos.vacio}>Sin módulos asignados.</p>
          )}
        </section>

        <section className={estilos.panel}>
          <h3 className={estilos.panelTitulo}>Cambiar contraseña</h3>
          <form className={estilos.form} onSubmit={cambiarClave}>
            {avisoClave ? <Alert tone={avisoClave.tono}>{avisoClave.texto}</Alert> : null}

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

            <ul className={estilos.reglas}>
              {REGLAS_PASSWORD.map((regla) => (
                <li key={regla}>{regla}</li>
              ))}
            </ul>

            <div className={estilos.acciones}>
              <Button type="submit" variant="primary" disabled={guardandoClave}>
                {guardandoClave ? "Guardando…" : "Cambiar contraseña"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
