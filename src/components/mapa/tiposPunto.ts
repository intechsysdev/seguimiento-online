/**
 * Tipos de punto que aparecen en las consultas con mapa: su forma y su color.
 *
 * Es la unica definicion. `Mapa` la usa para dibujar el marcador sobre Google
 * Maps e `IconoPunto` para pintar el mismo simbolo dentro de la pagina
 * (leyendas y tablas), de modo que lo que se ve en la vista y lo que se ve en
 * el mapa no pueden separarse.
 */

export type TipoPunto = "dispositivo" | "visita" | "cliente" | "extraruta";

export type ColorPunto = "verde" | "rojo" | "azul" | "ambar" | "morado" | "naranja";

/** Formas sobre un lienzo de 28x30, para que todas ocupen lo mismo. */
export const FORMA_PUNTO: Record<TipoPunto, string> = {
  // Telefono: la posicion del dispositivo.
  dispositivo:
    "M9 2h10a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Zm2 20h6v2h-6v-2Z",
  // Rombo: el punto donde se registro la visita.
  visita: "M14 2 26 14 14 26 2 14Z",
  // Pin clasico: la ubicacion del cliente.
  cliente:
    "M14 2c-5 0-9 4-9 9 0 6.5 9 17 9 17s9-10.5 9-17c0-5-4-9-9-9Zm0 12.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z",
  // Estrella: visita fuera de la ruta planificada.
  extraruta: "M14 2l3.6 7.6 8.4 1.1-6.1 5.8 1.5 8.3L14 20.9 6.6 24.8l1.5-8.3L2 10.7l8.4-1.1Z",
};

/**
 * Donde cae el consecutivo dentro de cada forma: no es el centro del lienzo,
 * porque el pin tiene la cabeza arriba y la estrella deja poco cuerpo. `r` es
 * el disco blanco que va detras del numero para que se lea sobre el color.
 */
export const DISCO_ETIQUETA: Record<TipoPunto, { cx: number; cy: number; r: number }> = {
  dispositivo: { cx: 14, cy: 13, r: 5.5 },
  // El rombo tiene poco cuerpo: con un disco mayor deja de leerse como rombo.
  visita: { cx: 14, cy: 14, r: 6.4 },
  cliente: { cx: 14, cy: 11, r: 7 },
  extraruta: { cx: 14, cy: 14.5, r: 6 },
};

/**
 * Colores tal como se dibujan sobre el mapa. Google recibe el icono como data
 * URI, asi que ahi no se pueden usar variables CSS; en la vista se usan los
 * tokens `--color-punto-*`, que en tema claro valen exactamente esto.
 */
export const COLOR_MAPA: Record<ColorPunto, string> = {
  verde: "#2e9e4f",
  rojo: "#d93025",
  azul: "#1a73e8",
  ambar: "#e8871a",
  morado: "#8430ce",
  naranja: "#f57c00",
};

/**
 * Estado de conexion de un dispositivo: en linea azul, desconectado rojo.
 * Sin dato de conexion se trata como desconectado, que es lo que hacia la
 * vista antes de distinguir el estado.
 */
export function colorEstado(enLinea: boolean | null | undefined): ColorPunto {
  return enLinea ? "azul" : "rojo";
}

/** Lado del marcador en pantalla. Los numerados van mas grandes para que quepa
 *  el consecutivo con un tamaño legible. */
export const TAM_MARCADOR = 30;
export const TAM_MARCADOR_NUMERADO = 42;

/** El consecutivo llega como texto: se escapa antes de meterlo en el SVG. */
function escaparSvg(texto: string) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Icono del marcador en SVG embebido (data URI) para no depender de los
 * `*-dot.png` genericos de Google: asi el dispositivo, el cliente, la visita y
 * la extraruta se distinguen por forma ademas de por color, con el mismo
 * dibujo que `IconoPunto` usa dentro de la pagina.
 *
 * El consecutivo se dibuja aqui y no con el `label` de Google: aquel se
 * quedaba en 10px, blanco sobre el color del marcador, y sobre el mapa era
 * practicamente ilegible. Dentro del SVG escala con el icono y se puede poner
 * sobre un disco blanco, que es lo que le da contraste.
 */
export function iconoMarcador(tipo: TipoPunto, color: string, etiqueta?: string) {
  const numero = etiqueta?.trim();
  let consecutivo = "";

  if (numero) {
    const disco = DISCO_ETIQUETA[tipo];
    // La fuente sale del disco de cada forma, y se achica con tres o mas
    // digitos para que el numero no se salga.
    const tamFuente = disco.r * (numero.length > 2 ? 1.15 : 1.55);
    consecutivo =
      `<circle cx="${disco.cx}" cy="${disco.cy}" r="${disco.r}" fill="#ffffff"/>` +
      // La linea base se calcula a mano: `dominant-baseline` no es fiable en
      // un SVG que se usa como imagen.
      `<text x="${disco.cx}" y="${disco.cy + tamFuente * 0.35}" fill="${color}"` +
      ` font-family="Arial, Helvetica, sans-serif" font-size="${tamFuente}"` +
      ` font-weight="700" text-anchor="middle">${escaparSvg(numero)}</text>`;
  }

  // Con width/height explicitos el data URI tiene tamaño natural; sin ellos
  // el navegador tiene que inventarlo y `scaledSize` queda a merced de eso.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 28 30">` +
    `<path d="${FORMA_PUNTO[tipo]}" fill="${color}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>` +
    consecutivo +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
