import { APP_EMPRESA, APP_EMPRESA_URL, APP_VERSION, rangoCopyright } from "../config/app";
import styles from "./PieLegal.module.css";

interface PieLegalProps {
  /** `linea` para las pantallas de acceso; `apilado` para el menu lateral. */
  variante?: "linea" | "apilado";
}

/**
 * Copyright y version del aplicativo.
 *
 * Se muestra en las pantallas de acceso y dentro del aplicativo, asi que el
 * texto se arma en un solo sitio y las dos ubicaciones no se desincronizan.
 */
export function PieLegal({ variante = "linea" }: PieLegalProps) {
  return (
    <p className={[styles.pie, variante === "apilado" ? styles.apilado : styles.linea].join(" ")}>
      <span>
        Copyright © {rangoCopyright()}{" "}
        <a
          className={styles.empresa}
          href={APP_EMPRESA_URL}
          target="_blank"
          rel="noreferrer"
        >
          {APP_EMPRESA}
        </a>
      </span>
      <span className={styles.version}>Versión: {APP_VERSION}</span>
    </p>
  );
}
