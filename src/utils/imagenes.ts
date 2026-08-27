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
        (blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo generar la imagen."))),
        tipo,
        calidad,
      );
    });
  } finally {
    bitmap.close();
  }
}

/** Ruta del recurso dentro del servidor de imagenes, en segmentos. */
function segmentos(url: string): string[] | null {
  const limpia = (url ?? "").trim();
  if (!limpia) return null;
  try {
    return new URL(limpia).pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
}

function origenDe(url: string): string {
  try {
    return new URL((url ?? "").trim()).origin;
  } catch {
    return "";
  }
}

/** Producto reducido a lo que hace falta para deducir donde van las fotos. */
interface ProductoConFoto {
  KEY_rpr_id: string;
  rpr_urlimagen: string;
}

export interface UbicacionImagenes {
  /**
   * Origen de las URLs que sirven las fotos (https://host:puerto). Sale de los
   * datos porque es lo unico que se sabe correcto: `FileSettings.UrlPath` del
   * API es la ruta de disco donde escribe, no la direccion web que se guarda
   * en `rpr_urlimagen`.
   */
  origen: string;
  /**
   * Carpeta comun a todas las fotos, en segmentos. Es la que el API ya tiene
   * configurada en `FileSettings.UrlPath`, asi que NO va en el parametro
   * `folder`: mandarla duplicaba la ruta en el servidor.
   */
  raiz: string[];
  /** Extension con la que se guardan (".jpg" salvo que el catalogo diga otra). */
  extension: string;
  /** Si el nombre del archivo es el codigo del producto. */
  nombrePorCodigo: boolean;
}

/**
 * Deduce de las fotos existentes donde y con que nombre se guardan.
 *
 * La carpeta se saca de los datos y no de `VITE_URL_PATH` porque esa variable
 * puede no coincidir con las URLs reales, y si no coincide el prefijo no se
 * recorta: el `folder` sale con la ruta completa, el API le antepone la suya y
 * termina escribiendo en algo como `C:\Imagenes\eva\imagenes\eva\big\...`.
 *
 * La raiz es el tramo de carpeta comun a todas las fotos. Si el catalogo las
 * tiene sueltas en la raiz, `carpeta` queda vacia y el API escribe donde debe;
 * si estan repartidas en subcarpetas, esas subcarpetas si viajan en `folder`.
 */
export function ubicacionImagenes(productos: ProductoConFoto[]): UbicacionImagenes | null {
  let raiz: string[] | null = null;
  let origen = "";
  let extension = "";
  let coinciden = 0;
  let revisados = 0;

  for (const producto of productos) {
    const partes = segmentos(producto.rpr_urlimagen);
    if (!partes || partes.length === 0) continue;

    const carpeta = partes.slice(0, -1);
    const archivo = partes[partes.length - 1];

    // Prefijo comun con lo visto hasta ahora.
    if (raiz === null) {
      raiz = carpeta;
    } else {
      const comun: string[] = [];
      for (let i = 0; i < Math.min(raiz.length, carpeta.length); i += 1) {
        if (raiz[i] !== carpeta[i]) break;
        comun.push(raiz[i]);
      }
      raiz = comun;
    }

    if (!origen) origen = origenDe(producto.rpr_urlimagen);

    revisados += 1;
    const punto = archivo.lastIndexOf(".");
    if (!extension && punto > 0) extension = archivo.slice(punto);
    const nombre = punto > 0 ? archivo.slice(0, punto) : archivo;
    if (nombre.trim() === (producto.KEY_rpr_id ?? "").trim()) coinciden += 1;
  }

  if (raiz === null || revisados === 0) return null;

  return {
    origen,
    raiz,
    extension: extension || ".jpg",
    // Se exige que la convencion se cumpla en todas: con una excepcion ya no es
    // una regla de la que se pueda deducir el nombre del archivo que falta.
    nombrePorCodigo: coinciden === revisados,
  };
}

export interface DestinoImagen {
  /** Carpeta relativa a la raiz. Vacia = la propia raiz del servidor. */
  carpeta: string;
  /** Hermana `big` de la anterior, donde vive la version grande. */
  carpetaBig: string;
  archivo: string;
}

/**
 * Donde escribir la foto de un producto.
 *
 * Con foto previa se reemplaza su archivo, conservando nombre y subcarpeta, asi
 * la URL guardada sigue siendo valida. Sin foto previa se crea en la raiz con
 * el nombre que marca la convencion del catalogo.
 */
export function destinoImagen(
  urlActual: string,
  codigo: string,
  ubicacion: UbicacionImagenes | null,
): DestinoImagen | null {
  if (!ubicacion) return null;

  const partes = segmentos(urlActual);
  const conBig = (carpeta: string): DestinoImagen["carpetaBig"] =>
    carpeta ? `${carpeta}/big` : "big";

  if (partes && partes.length > 0) {
    const archivo = partes[partes.length - 1];
    // Lo que sobra de la carpeta despues de la raiz; normalmente nada.
    const carpeta = partes.slice(ubicacion.raiz.length, -1).join("/");
    return { carpeta, carpetaBig: conBig(carpeta), archivo };
  }

  const id = (codigo ?? "").trim();
  if (!id || !ubicacion.nombrePorCodigo) return null;
  return { carpeta: "", carpetaBig: "big", archivo: `${id}${ubicacion.extension}` };
}

/**
 * URL con la que hay que dejar `rpr_urlimagen` tras crear una foto.
 *
 * Se arma con el origen y la raiz leidos de las fotos que ya funcionan, no con
 * la configuracion del API: alli `UrlPath` es la carpeta de disco donde se
 * escribe y guardarla como URL dejaria un `C:\...` en la base.
 */
export function urlDeImagen(destino: DestinoImagen, ubicacion: UbicacionImagenes | null) {
  if (!ubicacion || !ubicacion.origen) return "";
  const tramos = [...ubicacion.raiz, ...(destino.carpeta ? destino.carpeta.split("/") : []), destino.archivo];
  return `${ubicacion.origen}/${tramos.filter(Boolean).map(encodeURIComponent).join("/")}`;
}
