/** Identidad y datos de version que se muestran al ingresar al aplicativo. */

export const APP_NOMBRE = "Seguimiento Online";

/** Se inyecta desde la version de package.json (ver vite.config.ts). */
export const APP_VERSION = __APP_VERSION__;

export const APP_EMPRESA = "Intechsys S.A.S.";
export const APP_EMPRESA_URL = "https://intechsyscol.com/";

/** Primer año de publicacion: ahi arranca el rango del copyright. */
export const APP_ANIO_INICIAL = 2021;

/**
 * Rango del copyright, del primer año de publicacion al año en curso.
 *
 * El año de cierre sale del reloj del equipo y no del numero de version, para
 * que el aviso siga vigente aunque un año no se libere ninguna version.
 */
export function rangoCopyright(): string {
  const cierre = Math.max(APP_ANIO_INICIAL, new Date().getFullYear());
  return `${APP_ANIO_INICIAL}-${cierre}`;
}
