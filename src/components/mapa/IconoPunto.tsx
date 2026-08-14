import { FORMA_PUNTO, type ColorPunto, type TipoPunto } from "./tiposPunto";
import styles from "./IconoPunto.module.css";

interface IconoPuntoProps {
  tipo: TipoPunto;
  color?: ColorPunto;
  /** Lado del icono en px. */
  tam?: number;
  /**
   * Texto para lectores de pantalla. Sin el, el icono queda como decoracion:
   * es lo correcto cuando al lado ya va el mismo dato en texto.
   */
  etiqueta?: string;
}

/**
 * El simbolo de un tipo de punto dentro de la pagina (leyendas del mapa y
 * celdas de las tablas), con la misma forma que dibuja `Mapa` sobre Google
 * Maps. El color sale de los tokens `--color-punto-*`, que en tema claro
 * coinciden con los del mapa y en oscuro se aclaran para que se vean.
 */
export function IconoPunto({ tipo, color = "azul", tam = 16, etiqueta }: IconoPuntoProps) {
  return (
    <svg
      className={[styles.icono, styles[color]].join(" ")}
      width={tam}
      height={tam}
      viewBox="0 0 28 30"
      role={etiqueta ? "img" : undefined}
      aria-label={etiqueta}
      aria-hidden={etiqueta ? undefined : true}
    >
      <path d={FORMA_PUNTO[tipo]} />
    </svg>
  );
}
