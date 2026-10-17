/**
 * Los iconos en pixelart (el autor, 2026-10-17: «aspecto pixelart HD»; rejilla
 * de 24 × 24, guia de arte, directriz 5).
 *
 * Un icono es **24 lineas de 24 caracteres**: `.` es transparente y cada otro
 * caracter, un color de su paleta. Asi el dibujo se lee y se corrige a ojo en
 * el propio codigo, pixel a pixel. `pixelSvg` lo convierte en un SVG: junta
 * los pixeles seguidos de un mismo color en un solo trazado por color, con
 * `shape-rendering: crispEdges` para que escalado (a 48 px, el doble exacto)
 * los bordes sigan siendo de pixel.
 *
 * Es puro, sin DOM: se mide en Node (`tests/pixel-icons.test.ts`). Lo unico
 * que toca el documento es `pixelIcon`, que crea el elemento.
 */

/** Pixeles de lado de cada icono. */
export const PIXEL_GRID = 24;

/** El caracter de lo transparente. */
export const CLEAR = '.';

/** Un icono: sus filas y la paleta de la que salen sus caracteres. */
export interface PixelArt {
  readonly rows: readonly string[];
  readonly palette: Readonly<Record<string, string>>;
}

/**
 * Los trazados de un icono, uno por color, en el orden en que aparece cada
 * color leyendo de arriba abajo: cada tramo seguido de una fila, un rectangulo
 * de alto 1.
 */
export function pixelPaths(art: PixelArt): { color: string; d: string }[] {
  const byChar = new Map<string, string[]>();
  art.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== CLEAR) {
        let runs = byChar.get(ch);
        if (!runs) byChar.set(ch, (runs = []));
        runs.push(`M${x} ${y}h${end - x}v1h${x - end}z`);
      }
      x = end;
    }
  });
  return [...byChar].map(([ch, runs]) => ({ color: art.palette[ch] ?? 'currentColor', d: runs.join('') }));
}

/** El marcado de dentro del `<svg>`: un `<path>` por color. */
export function pixelInner(art: PixelArt): string {
  return pixelPaths(art)
    .map(({ color, d }) => `<path fill="${color}" d="${d}"/>`)
    .join('');
}

/** El SVG entero, como texto. */
export function pixelSvg(art: PixelArt, className = ''): string {
  const cls = className ? ` class="${className}"` : '';
  return `<svg${cls} viewBox="0 0 ${PIXEL_GRID} ${PIXEL_GRID}" shape-rendering="crispEdges" aria-hidden="true">${pixelInner(art)}</svg>`;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** El icono como elemento, con su clase. */
export function pixelIcon(art: PixelArt, className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${PIXEL_GRID} ${PIXEL_GRID}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', className);
  svg.innerHTML = pixelInner(art);
  return svg;
}
