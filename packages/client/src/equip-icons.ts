/**
 * Los iconos de las casillas de PERSONAJE (decision del autor, 2026-10-04): una
 * silueta por casilla en vez de su nombre escrito, que se oculta al equipar
 * algo. Siguen la **directriz 3 de `docs/guia-de-arte.md`**: siluetas de un
 * color, minimalistas, de armadura y equipo de aventurero medieval y de
 * fantasia, con los detalles calados. Desde el 2026-10-17 (el autor), en
 * pixelart de 24 × 24 (`silhouette-icons.ts`, directriz 5). Toman el color de
 * la pista (`currentColor`).
 *
 * Indexados por `Equip`: el mismo orden que la rejilla.
 */

import type { Equip } from '@verdant/shared';
import { pixelIcon } from './pixel-art.js';
import { equipArt } from './silhouette-icons.js';

/** El icono de una casilla de PERSONAJE, listo para meter en su boton. */
export function equipIcon(e: Equip): SVGSVGElement {
  return pixelIcon(equipArt(e), 'equipIcon');
}
