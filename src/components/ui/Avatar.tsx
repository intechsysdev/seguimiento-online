import { useEffect, useState } from "react";
import { fotoEnCache, obtenerFoto } from "../../services/fotosUsuarios";
import styles from "./Avatar.module.css";

interface AvatarProps {
  /** Correo con el que se consulta la foto en el API de Seguridad. */
  email?: string;
  /** Nombre para las iniciales de respaldo y el texto alternativo. */
  nombre?: string;
  size?: number;
}

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Migra Views/Shared/Components/UserPhoto/Default.cshtml: muestra la foto del
 * usuario y, cuando no tiene, un marcador con sus iniciales en vez del
 * photo.PNG generico del MVC.
 */
export function Avatar({ email, nombre = "", size = 32 }: AvatarProps) {
  const [foto, setFoto] = useState<string | null>(() =>
    email ? (fotoEnCache(email) ?? null) : null,
  );

  useEffect(() => {
    if (!email) return;

    const cacheada = fotoEnCache(email);
    if (cacheada !== undefined) {
      setFoto(cacheada);
      return;
    }

    let cancelado = false;
    obtenerFoto(email).then((valor) => {
      if (!cancelado) setFoto(valor);
    });
    return () => {
      cancelado = true;
    };
  }, [email]);

  const estilo = { width: size, height: size, fontSize: Math.max(10, size * 0.36) };

  if (foto) {
    return (
      <img
        src={foto}
        alt={nombre ? `Foto de ${nombre}` : "Foto de perfil"}
        className={styles.avatar}
        style={estilo}
      />
    );
  }

  return (
    <span className={styles.iniciales} style={estilo} aria-hidden={!nombre} title={nombre}>
      {iniciales(nombre || email || "")}
    </span>
  );
}
