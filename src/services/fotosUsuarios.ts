/**
 * Cache de fotos de usuario.
 *
 * El API de Seguridad solo expone `Users/GetPhotoByEmail/{email}`: no hay
 * endpoint por lotes, asi que un listado de N usuarios implica N peticiones.
 * Para que eso no sature al servidor ni al navegador, aca se deduplican las
 * peticiones en vuelo, se cachea el resultado y se limita la concurrencia.
 */
import { usuariosService } from "./usuariosService";

const MAX_EN_PARALELO = 4;

/** email -> data URL de la foto, o null si el usuario no tiene. */
const cache = new Map<string, string | null>();
const enVuelo = new Map<string, Promise<string | null>>();

let activas = 0;
const cola: (() => void)[] = [];

function adquirirTurno(): Promise<void> {
  if (activas < MAX_EN_PARALELO) {
    activas += 1;
    return Promise.resolve();
  }
  return new Promise((resolver) => cola.push(resolver));
}

function liberarTurno() {
  const siguiente = cola.shift();
  if (siguiente) siguiente();
  else activas -= 1;
}

export function fotoEnCache(email: string) {
  return cache.get(email);
}

export function obtenerFoto(email: string): Promise<string | null> {
  if (cache.has(email)) return Promise.resolve(cache.get(email) ?? null);

  const pendiente = enVuelo.get(email);
  if (pendiente) return pendiente;

  const promesa = adquirirTurno()
    .then(() => usuariosService.getPhotoByEmail(email))
    .then((dto) => dto?.Photo ?? null)
    // Un usuario sin foto responde error o vacio; se cachea como "sin foto"
    // para no reintentar en cada render.
    .catch(() => null)
    .then((foto) => {
      cache.set(email, foto);
      return foto;
    })
    .finally(() => {
      enVuelo.delete(email);
      liberarTurno();
    });

  enVuelo.set(email, promesa);
  return promesa;
}

/** Se limpia al cerrar sesion para no filtrar fotos entre usuarios. */
export function limpiarFotos() {
  cache.clear();
  enVuelo.clear();
}
