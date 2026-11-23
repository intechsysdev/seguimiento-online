import { Fragment, useMemo, type ReactNode } from "react";
import styles from "./Markdown.module.css";

/**
 * Markdown mínimo para las respuestas del asistente: párrafos, títulos, listas,
 * tablas, bloques de código, negrita y código en línea.
 *
 * Se construyen elementos de React, nunca HTML: el texto viene de un modelo que
 * cita datos de la base (nombres de clientes, comentarios), así que nada de lo
 * que llegue puede interpretarse como marcado.
 */

type Bloque =
  | { tipo: "parrafo"; lineas: string[] }
  | { tipo: "titulo"; texto: string }
  | { tipo: "lista"; ordenada: boolean; items: string[] }
  | { tipo: "tabla"; encabezado: string[]; filas: string[][]; derecha: boolean[] }
  | { tipo: "codigo"; texto: string };

const ES_VINETA = /^\s*[-*•]\s+(.*)$/;
const ES_NUMERADA = /^\s*\d+[.)]\s+(.*)$/;
const ES_TITULO = /^\s*#{1,6}\s+(.*)$/;
const ES_SEPARADOR_TABLA = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function celdas(linea: string) {
  return linea
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((celda) => celda.trim());
}

function analizar(texto: string): Bloque[] {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n");
  const bloques: Bloque[] = [];
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i];

    if (linea.trim() === "") {
      i++;
      continue;
    }

    if (linea.trim().startsWith("```")) {
      const cuerpo: string[] = [];
      i++;
      while (i < lineas.length && !lineas[i].trim().startsWith("```")) cuerpo.push(lineas[i++]);
      i++; // la valla de cierre (si no llegó todavía, no pasa nada)
      bloques.push({ tipo: "codigo", texto: cuerpo.join("\n") });
      continue;
    }

    // Tabla: fila de encabezado seguida de la fila de guiones.
    if (linea.includes("|") && i + 1 < lineas.length && ES_SEPARADOR_TABLA.test(lineas[i + 1])) {
      const encabezado = celdas(linea);
      const derecha = celdas(lineas[i + 1]).map((c) => c.endsWith(":") && !c.startsWith(":"));
      const filas: string[][] = [];
      i += 2;
      while (i < lineas.length && lineas[i].includes("|") && lineas[i].trim() !== "") {
        filas.push(celdas(lineas[i++]));
      }
      bloques.push({ tipo: "tabla", encabezado, filas, derecha });
      continue;
    }

    const titulo = ES_TITULO.exec(linea);
    if (titulo) {
      bloques.push({ tipo: "titulo", texto: titulo[1] });
      i++;
      continue;
    }

    if (ES_VINETA.test(linea) || ES_NUMERADA.test(linea)) {
      const ordenada = ES_NUMERADA.test(linea);
      const patron = ordenada ? ES_NUMERADA : ES_VINETA;
      const items: string[] = [];
      while (i < lineas.length && patron.test(lineas[i])) items.push(patron.exec(lineas[i++])![1]);
      bloques.push({ tipo: "lista", ordenada, items });
      continue;
    }

    const parrafo: string[] = [];
    while (
      i < lineas.length &&
      lineas[i].trim() !== "" &&
      !lineas[i].trim().startsWith("```") &&
      !ES_TITULO.test(lineas[i]) &&
      !ES_VINETA.test(lineas[i]) &&
      !ES_NUMERADA.test(lineas[i]) &&
      !(lineas[i].includes("|") && i + 1 < lineas.length && ES_SEPARADOR_TABLA.test(lineas[i + 1]))
    ) {
      parrafo.push(lineas[i++]);
    }
    bloques.push({ tipo: "parrafo", lineas: parrafo });
  }

  return bloques;
}

/** Negrita (**texto**) y código (`texto`) dentro de una línea. */
function enLinea(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).map((trozo, indice) => {
    if (trozo.length > 4 && trozo.startsWith("**") && trozo.endsWith("**"))
      return <strong key={indice}>{trozo.slice(2, -2)}</strong>;
    if (trozo.length > 2 && trozo.startsWith("`") && trozo.endsWith("`"))
      return <code key={indice}>{trozo.slice(1, -1)}</code>;
    return <Fragment key={indice}>{trozo}</Fragment>;
  });
}

/** Una columna se alinea a la derecha si todas sus celdas son números (dinero, cantidades). */
const ES_NUMERO = /^[-+]?[$S/.\s]*[\d.,]+\s*%?$/;

function Tabla({ bloque }: { bloque: Extract<Bloque, { tipo: "tabla" }> }) {
  const numerica = bloque.encabezado.map(
    (_, columna) =>
      bloque.derecha[columna] ||
      (bloque.filas.length > 0 &&
        bloque.filas.every((fila) => !fila[columna] || ES_NUMERO.test(fila[columna]))),
  );

  return (
    // tabIndex: con teclado se puede desplazar una tabla más ancha que el panel.
    <div className={styles.tablaCaja} tabIndex={0} role="group" aria-label="Tabla de resultados">
      <table className={styles.tabla}>
        <thead>
          <tr>
            {bloque.encabezado.map((celda, columna) => (
              <th key={columna} scope="col" className={numerica[columna] ? styles.numero : undefined}>
                {enLinea(celda)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bloque.filas.map((fila, indice) => (
            <tr key={indice}>
              {bloque.encabezado.map((_, columna) => (
                <td key={columna} className={numerica[columna] ? styles.numero : undefined}>
                  {enLinea(fila[columna] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Markdown({ texto }: { texto: string }) {
  const bloques = useMemo(() => analizar(texto), [texto]);

  return (
    <div className={styles.markdown}>
      {bloques.map((bloque, indice) => {
        switch (bloque.tipo) {
          case "titulo":
            return (
              <p key={indice} className={styles.titulo}>
                {enLinea(bloque.texto)}
              </p>
            );
          case "lista": {
            const Lista = bloque.ordenada ? "ol" : "ul";
            return (
              <Lista key={indice}>
                {bloque.items.map((item, n) => (
                  <li key={n}>{enLinea(item)}</li>
                ))}
              </Lista>
            );
          }
          case "tabla":
            return <Tabla key={indice} bloque={bloque} />;
          case "codigo":
            return (
              <pre key={indice} className={styles.codigo}>
                {bloque.texto}
              </pre>
            );
          default:
            return (
              <p key={indice}>
                {bloque.lineas.map((linea, n) => (
                  <Fragment key={n}>
                    {n > 0 ? <br /> : null}
                    {enLinea(linea)}
                  </Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
