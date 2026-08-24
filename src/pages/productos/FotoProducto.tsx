import { useEffect, useState } from "react";
import estilos from "./Productos.module.css";

interface FotoProductoProps {
  /** URL absoluta que guarda `rpr_urlimagen`. Vacia = producto sin foto. */
  url?: string;
  alt: string;
  tam?: number;
}

/**
 * Foto de un producto.
 *
 * La URL apunta al servidor de imagenes y no siempre existe el archivo, asi que
 * un `<img>` a secas dejaba el icono roto del navegador en media tabla. Aca el
 * fallo se trata como estado y se muestra un marcador propio.
 */
export function FotoProducto({ url, alt, tam = 48 }: FotoProductoProps) {
  const [fallo, setFallo] = useState(false);

  // Al cambiar de producto (o tras subir una foto nueva) se reintenta.
  useEffect(() => setFallo(false), [url]);

  const limpia = (url ?? "").trim();
  if (!limpia || fallo) {
    return (
      <span
        className={estilos.sinFoto}
        style={{ width: tam, height: tam }}
        title={limpia ? "No se pudo cargar la foto" : "Sin foto"}
        aria-label={limpia ? "No se pudo cargar la foto" : "Sin foto"}
        role="img"
      >
        {limpia ? "!" : "—"}
      </span>
    );
  }

  return (
    <img
      className={estilos.foto}
      src={limpia}
      alt={alt}
      width={tam}
      height={tam}
      style={{ width: tam, height: tam }}
      loading="lazy"
      onError={() => setFallo(true)}
    />
  );
}
