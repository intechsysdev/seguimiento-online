/**
 * Preparacion de las fotos de producto antes de subirlas.
 *
 * El redimensionado se hace en el navegador y no en el API a proposito: el API
 * es .NET y tendria que sumar una libreria de imagenes (System.Drawing quedo
 * atado a Windows, y ImageSharp/SkiaSharp son dependencias nuevas). Aca el
 * canvas ya viene con el navegador, no cuesta CPU del servidor y lo que viaja
 * por la red es la miniatura, no el original de varios MB.
 */

/** Lado del archivo que va a la carpeta normal (el que lista el catalogo). */
export const LADO_NORMAL = 100;
/** Lado del archivo que va a la carpeta `big` (el que abre la ficha). */
export const LADO_BIG = 400;

/**
 * Redimensiona a un cuadrado de `lado` px.
 *
 * La imagen se ajusta entera dentro del cuadro (sin recortar) y se centra
 * sobre blanco: las fotos del catalogo vienen sobre fondo blanco, asi que
 * rellenar con blanco no se nota, y recortar si mutilaria el producto.
 */
export async function redimensionarCuadrado(
  archivo: File,
  lado: number,
  tipo = "image/jpeg",
  calidad = 0.9,
): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  try {
    const lienzo = document.createElement("canvas");
    lienzo.width = lado;
    lienzo.height = lado;

    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("El navegador no permitió preparar la imagen.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, lado, lado);

    // Escala de ajuste: nunca amplia una foto mas pequeña que el destino,
    // ampliarla solo la vuelve borrosa sin agregar detalle.
    const escala = Math.min(lado / bitmap.width, lado / bitmap.height, 1);
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);
    ctx.drawImage(bitmap, (lado - ancho) / 2, (lado - alto) / 2, ancho, alto);

    return await new Promise<Blob>((resolver, rechazar) => {
      lienzo.toBlob(
        (blob) =>
          blob ? resolver(blob) : rechazar(new Error("No se pudo generar la imagen.")),
        tipo,
        calidad,
      );
    });
  } finally {
    bitmap.close();
  }
}

/**
 * Descompone la URL que guarda `rpr_urlimagen` en la carpeta y el archivo.
 *
 * `FileUpload/Upload` recibe la carpeta relativa a su propia raiz, que es la
 * misma que sirve estas URLs, asi que se recorta el origen y se conserva el
 * resto del path. `base` es la parte del path anterior a la carpeta (por
 * ejemplo "/eva"), que no forma parte del parametro `folder`.
 */
export function partesUrlImagen(url: string, base: string) {
  const limpia = (url ?? "").trim();
  if (!limpia) return null;

  let ruta: string;
  try {
    ruta = new URL(limpia).pathname;
  } catch {
    return null;
  }

  // Prefijo del servidor de imagenes (VITE_URL_PATH): no va en `folder`.
  let prefijo = "";
  try {
    prefijo = new URL(base).pathname.replace(/\/$/, "");
  } catch {
    prefijo = (base ?? "").replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "");
  }
  if (prefijo && ruta.startsWith(prefijo)) ruta = ruta.slice(prefijo.length);

  const corte = ruta.lastIndexOf("/");
  if (corte < 0) return null;

  const archivo = decodeURIComponent(ruta.slice(corte + 1));
  const carpeta = ruta.slice(0, corte).replace(/^\/+/, "");
  if (!archivo) return null;

  return {
    /** Carpeta relativa, tal como la espera el parametro `folder`. */
    carpeta,
    /** Carpeta de la version grande, hermana de la normal (la usa el movil). */
    carpetaBig: carpeta ? `${carpeta}/big` : "big",
    archivo,
  };
}
