import { useEffect, useState, type ChangeEvent } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { usuariosService } from "../../services/usuariosService";
import { useAuth } from "../../store/AuthContext";
import styles from "./FotoPerfil.module.css";
import formularios from "./Formularios.module.css";

const MAX_BYTES = 800 * 1024;

/** Migra Views/Seguridad/Profile.cshtml: la foto viaja como data URL en base64. */
export function FotoPerfilPage() {
  const { session } = useAuth();
  const email = session?.username ?? "";

  const foto = useApi(
    () => (email ? usuariosService.getPhotoByEmail(email) : Promise.resolve(undefined)),
    [email],
  );

  const [previsualizacion, setPrevisualizacion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tono: "success" | "critical"; texto: string } | null>(
    null,
  );
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (foto.datos?.Photo) setPrevisualizacion(foto.datos.Photo);
  }, [foto.datos]);

  function seleccionar(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    if (archivo.size > MAX_BYTES) {
      setMensaje({ tono: "critical", texto: "La imagen supera el máximo de 800 KB." });
      return;
    }

    const lector = new FileReader();
    lector.onloadend = () => {
      setPrevisualizacion(String(lector.result));
      setMensaje(null);
    };
    lector.readAsDataURL(archivo);
  }

  async function guardar() {
    if (!previsualizacion) return;
    setGuardando(true);
    try {
      const ok = await usuariosService.updatePhoto({
        ID: foto.datos?.ID ?? 0,
        Photo: previsualizacion,
      });
      setMensaje(
        ok
          ? { tono: "success", texto: "Foto actualizada correctamente" }
          : { tono: "critical", texto: "No se pudo actualizar la foto." },
      );
    } catch {
      setMensaje({ tono: "critical", texto: "No se pudo actualizar la foto." });
    } finally {
      setGuardando(false);
    }
  }

  if (foto.cargando) return <Spinner mensaje="Cargando…" />;

  return (
    <>
      <PageHeader title="Foto de perfil" description={email} />

      <div className={formularios.form} style={{ maxWidth: "30rem" }}>
        {mensaje ? <Alert tone={mensaje.tono}>{mensaje.texto}</Alert> : null}

        <div className={styles.fila}>
          {previsualizacion ? (
            <img src={previsualizacion} alt="Foto de perfil" className={styles.avatar} />
          ) : (
            <div className={styles.avatarVacio} aria-hidden="true" />
          )}
          <div>
            <p className={styles.titulo}>Tu foto</p>
            <p className={styles.ayuda}>JPG, GIF o PNG. Máximo 800 KB.</p>
          </div>
        </div>

        <input type="file" accept="image/*" onChange={seleccionar} aria-label="Seleccionar foto" />

        <div className={formularios.pie}>
          <Button variant="primary" onClick={guardar} disabled={!previsualizacion || guardando}>
            {guardando ? "Guardando…" : "Guardar foto"}
          </Button>
        </div>
      </div>
    </>
  );
}
