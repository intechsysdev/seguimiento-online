import styles from "./Logo.module.css";

/**
 * Marca del aplicativo: un pin de ubicacion recorrido por el trazo de una ruta,
 * que son los dos conceptos del producto (seguimiento en terreno y rutas).
 *
 * Usa `currentColor` para el trazo y el color de acento para el relleno, asi
 * funciona igual sobre fondo claro, oscuro o sobre el azul de marca.
 */
export function LogoMarca({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Seguimiento Online"
    >
      <rect width="40" height="40" rx="11" className={styles.fondo} />
      {/* Ruta: sale de abajo a la izquierda y termina arriba a la derecha. */}
      <path
        d="M9 30c4.5 0 4.5-5 9-5s4.5 5 9 5"
        className={styles.ruta}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Pin */}
      <path
        d="M20 8c-3.6 0-6.5 2.9-6.5 6.5 0 4.6 6.5 10.5 6.5 10.5s6.5-5.9 6.5-10.5C26.5 10.9 23.6 8 20 8Z"
        className={styles.pin}
      />
      <circle cx="20" cy="14.5" r="2.4" className={styles.punto} />
    </svg>
  );
}

/** Marca + nombre, para cabeceras y pantallas de acceso. */
export function LogoCompleto({ size = 36 }: { size?: number }) {
  return (
    <span className={styles.completo}>
      <LogoMarca size={size} />
      <span className={styles.texto}>
        <strong>Seguimiento</strong>
        <span>Online</span>
      </span>
    </span>
  );
}
