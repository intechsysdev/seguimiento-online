/** Identidad y datos de version que se muestran al ingresar al aplicativo. */

export const APP_NOMBRE = "Seguimiento Online";

/** Se inyecta desde la version de package.json (ver vite.config.ts). */
export const APP_VERSION = __APP_VERSION__;

export const APP_EMPRESA = "Intechsys S.A.S.";

const ANIO_INICIAL = 2021;
const ANIO_ACTUAL = Number(APP_VERSION.split(".")[0]) || ANIO_INICIAL;

export const APP_COPYRIGHT = `Copyright © ${ANIO_INICIAL}-${ANIO_ACTUAL} ${APP_EMPRESA}`;

/** Linea completa: "Copyright © 2021-2026 Intechsys S.A.S. · Versión: 2026.1.1" */
export const APP_PIE = `${APP_COPYRIGHT} · Versión: ${APP_VERSION}`;
