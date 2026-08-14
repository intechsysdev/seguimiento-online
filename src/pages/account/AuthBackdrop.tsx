import styles from "./AuthBackdrop.module.css";

/**
 * Fondo de las pantallas de acceso.
 *
 * Reemplaza la ilustracion generica `signin.svg` de la plantilla Volt (gente
 * frente a un portatil, sin relacion con el producto) por la jornada de un
 * asesor dibujada sobre un plano: la ruta planificada, la traza GPS real que la
 * sigue con sus desvios, las visitas numeradas del dia, el radio con el que se
 * valida la visita presencial y la posicion en curso. Son los mismos conceptos
 * que muestran Rutas, Visitas y Ubicaciones una vez dentro, asi que el acceso
 * ya adelanta de que va la aplicacion.
 *
 * Va en SVG en linea: no depende de descargas ni de los assets de la plantilla
 * original, escala a cualquier pantalla y toma los colores de los tokens, de
 * modo que sigue el tema claro/oscuro sin duplicar imagenes.
 *
 * El lienzo es de 1600x900 y se recorta con `slice`. La tarjeta de acceso tapa
 * la franja central, asi que lo narrativo se reparte hacia las esquinas.
 */

/** Visitas del dia. Las hechas van en verde; las pendientes, con el acento. */
const VISITAS = [
  { n: 1, x: 186, y: 806, hecha: true },
  { n: 2, x: 398, y: 700, hecha: true },
  { n: 3, x: 560, y: 566, hecha: true },
  { n: 4, x: 1058, y: 452, hecha: true },
  { n: 5, x: 1268, y: 344, hecha: false },
  { n: 6, x: 1474, y: 196, hecha: false },
];

/** Ruta planificada: cada visita es el fin de un tramo, asi cae sobre la linea. */
const RUTA_PLAN =
  "M -70 878 Q 66 852, 186 806 Q 300 762, 398 700 Q 492 640, 560 566 " +
  "Q 664 442, 806 466 Q 950 490, 1058 452 Q 1176 411, 1268 344 " +
  "Q 1372 268, 1474 196 L 1690 132";

/** Traza GPS: sigue el plan con desvios y se corta en la posicion actual. */
const RUTA_GPS =
  "M -70 894 Q 70 868, 192 822 Q 306 778, 406 716 Q 500 656, 572 582 " +
  "Q 674 460, 814 484 Q 958 508, 1068 468 Q 1130 445, 1180 424";

/** Posicion actual: ultimo punto de RUTA_GPS, camino a la visita 5. */
const POSICION = { x: 1180, y: 424 };

/** Radio con el que se valida la visita presencial, sobre la proxima visita. */
const GEOCERCA = { x: 1268, y: 344, r: 96 };

/**
 * Segundo asesor en terreno: cruza el lienzo en diagonal contraria para ocupar
 * las esquinas que deja libre la ruta principal y recordar que el seguimiento
 * es de toda la fuerza de ventas, no de una sola persona.
 */
const RUTA_SECUNDARIA =
  "M -60 92 Q 150 56, 306 148 Q 448 228, 590 214 Q 764 196, 900 320 " +
  "Q 1040 448, 1120 620 Q 1196 784, 1236 940";

const PUNTOS_SECUNDARIOS = [
  { x: 306, y: 148 },
  { x: 1120, y: 620 },
];

/** Vias principales: van con reborde para leerse como calles y no como brillos. */
const AVENIDAS = [
  "M -40 250 C 300 236, 620 268, 960 244 S 1400 196, 1660 214",
  "M 300 -40 C 292 140, 320 300, 268 470 S 210 720, 196 960",
  "M 1330 -40 C 1318 180, 1352 380, 1300 600 S 1230 840, 1214 960",
];

/** Manzanas alineadas a la rejilla: dan textura de plano sin robar atencion. */
const MANZANAS = [
  { x: 80, y: 120, w: 160, h: 120 },
  { x: 280, y: 120, w: 120, h: 120 },
  { x: 80, y: 320, w: 120, h: 80 },
  { x: 440, y: 80, w: 160, h: 120 },
  { x: 680, y: 120, w: 120, h: 160 },
  { x: 880, y: 80, w: 200, h: 120 },
  { x: 1160, y: 120, w: 160, h: 120 },
  { x: 1400, y: 80, w: 160, h: 160 },
  { x: 1360, y: 320, w: 120, h: 120 },
  { x: 80, y: 560, w: 120, h: 120 },
  { x: 400, y: 800, w: 160, h: 80 },
  { x: 640, y: 760, w: 160, h: 120 },
  { x: 880, y: 720, w: 160, h: 120 },
  { x: 1120, y: 720, w: 200, h: 120 },
  { x: 1400, y: 600, w: 160, h: 120 },
];

export function AuthBackdrop() {
  return (
    <div className={styles.escena} aria-hidden="true">
      <svg
        className={styles.mapa}
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="so-calles" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0v40" fill="none" stroke="currentColor" strokeWidth="0.7" />
          </pattern>
          <pattern id="so-arterias" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M200 0H0v200" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </pattern>
          {/* La traza nace tenue y se satura hacia la posicion actual. */}
          <linearGradient id="so-traza" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" className={styles.trazaIni} />
            <stop offset="55%" className={styles.trazaMed} />
            <stop offset="100%" className={styles.trazaFin} />
          </linearGradient>
        </defs>

        {/* La rejilla llena todo el lienzo; el resto se reencuadra en movil. */}
        <g className={styles.rejilla}>
          <rect width="1600" height="900" fill="url(#so-calles)" />
        </g>
        <g className={styles.arterias}>
          <rect width="1600" height="900" fill="url(#so-arterias)" />
        </g>

        <g className={styles.lienzo}>
          <g className={styles.manzanas}>
            {MANZANAS.map((m) => (
              <rect key={`${m.x}-${m.y}`} x={m.x} y={m.y} width={m.w} height={m.h} rx="6" />
            ))}
          </g>

          <g className={styles.avenidas}>
            {AVENIDAS.map((d) => (
              <path key={d} d={d} className={styles.avenidaBorde} />
            ))}
            {AVENIDAS.map((d) => (
              <path key={d} d={d} className={styles.avenidaAsfalto} />
            ))}
          </g>

          <g className={styles.secundaria}>
            <path d={RUTA_SECUNDARIA} className={styles.trazaSecundaria} />
            {PUNTOS_SECUNDARIOS.map((p) => (
              <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r="9" />
            ))}
          </g>

          {/* Radio de validacion de la visita presencial. */}
          <g className={styles.geocerca}>
            <circle cx={GEOCERCA.x} cy={GEOCERCA.y} r={GEOCERCA.r} className={styles.geoRelleno} />
            <circle cx={GEOCERCA.x} cy={GEOCERCA.y} r={GEOCERCA.r} className={styles.geoBorde} />
          </g>

          <path d={RUTA_PLAN} className={styles.plan} />
          <path d={RUTA_GPS} className={styles.traza} />

          <g className={styles.visitas}>
            {VISITAS.map((v) => (
              <g key={v.n}>
                <circle cx={v.x} cy={v.y} r="27" className={styles.pinHalo} />
                <circle
                  cx={v.x}
                  cy={v.y}
                  r="21"
                  className={v.hecha ? styles.pinHecha : styles.pinPendiente}
                />
                <text
                  x={v.x}
                  y={v.y}
                  className={`${styles.numero} ${v.hecha ? styles.numeroHecha : styles.numeroPendiente}`}
                >
                  {v.n}
                </text>
              </g>
            ))}
          </g>

          {/* Posicion actual: el punto queda fijo, solo late el halo. */}
          <g className={styles.posicion}>
            <circle cx={POSICION.x} cy={POSICION.y} r="34" className={styles.pulso} />
            <circle cx={POSICION.x} cy={POSICION.y} r="15" className={styles.puntoBorde} />
            <circle cx={POSICION.x} cy={POSICION.y} r="9" className={styles.punto} />
          </g>
        </g>
      </svg>

      {/* Atenua el plano bajo la tarjeta para no restarle legibilidad. */}
      <div className={styles.velo} />
    </div>
  );
}
