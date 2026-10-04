/**
 * Los iconos de las casillas de PERSONAJE (decision del autor, 2026-10-04): una
 * silueta por casilla en vez de su nombre escrito, que se oculta al equipar
 * algo. Vectoriales, de un trazo y en `currentColor`, asi toman el color de la
 * pista y se ven nitidos a cualquier tamano. **Los dibujos son mios.**
 *
 * Indexados por `Equip`: el mismo orden que la rejilla.
 */

import { Equip } from '@verdant/shared';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** El contenido de cada icono, en una caja de 24 × 24. */
const ICONS: Record<Equip, string> = {
  [Equip.Cape]:
    '<path d="M8 4h8M8 4c0 4-1.5 9-3 16 4.5 1.5 9.5 1.5 14 0-1.5-7-3-12-3-16"/><path d="M10.5 4v2.5h3V4"/>',
  [Equip.Helmet]:
    '<path d="M4 16a8 8 0 0 1 16 0v3H4z"/><path d="M4 16h16M12 8v8"/>',
  [Equip.Shoulders]:
    '<path d="M2.5 15c0-4 2.5-6.5 6-6.5 1.5 0 2.5.5 3.5 1.5 1-1 2-1.5 3.5-1.5 3.5 0 6 2.5 6 6.5"/><path d="M5 15c0-2.5 1.5-4 3.5-4M19 15c0-2.5-1.5-4-3.5-4M2.5 15h3M18.5 15h3"/>',
  [Equip.Bag]:
    '<path d="M5 9h14l-1 11H6z"/><path d="M9 9V7a3 3 0 0 1 6 0v2M5 9l7 4.5L19 9"/>',
  [Equip.Chest]:
    '<path d="M8 4 4 7l1 5 2-1v9h10v-9l2 1 1-5-4-3c-1 2-2 3-4 3S9 6 8 4z"/>',
  [Equip.Necklace]:
    '<path d="M6 3.5c0 6 3 10.5 6 10.5s6-4.5 6-10.5"/><path d="m12 14-2 3 2 3 2-3z"/>',
  [Equip.Belt]:
    '<path d="M2 10h20v5H2z"/><path d="M9 8.5h6v8H9zM12 12.5h3"/>',
  [Equip.Pants]:
    '<path d="M7 3h10l1 18h-4l-2-11-2 11H6z"/><path d="M7 6.5h10"/>',
  [Equip.Ring]:
    '<circle cx="12" cy="15" r="6"/><path d="m9 6.5 3-3 3 3-3 3z"/>',
  [Equip.Boots]:
    '<path d="M8 3h6v10l5 2.5V20H6v-5l2-1z"/><path d="M8 7h6M6 17.5h13"/>',
  [Equip.Pet]:
    '<path d="M12 20.5c-3 0-5-1.5-5-3.5s2.5-5 5-5 5 3 5 5-2 3.5-5 3.5z"/><circle cx="5.5" cy="10.5" r="1.8"/><circle cx="9.5" cy="6" r="1.8"/><circle cx="14.5" cy="6" r="1.8"/><circle cx="18.5" cy="10.5" r="1.8"/>',
  [Equip.Mount]:
    '<path d="M7 20v-8.5a5 5 0 0 1 10 0V20"/><path d="M4.5 20H9M15 20h4.5M7.5 14h1M15.5 14h1M8.5 9.5h1M14.5 9.5h1"/>',
  [Equip.Weapon]:
    '<path d="M20 3.5V7L10 17l-3-3L17 4z"/><path d="m5 12.5 6.5 6.5M8 17l-3.5 3.5"/>',
  [Equip.Emblem]:
    '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="m12 8 1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z"/>',
};

/** El icono de una casilla de PERSONAJE, listo para meter en su boton. */
export function equipIcon(e: Equip): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('equipIcon');
  svg.innerHTML = ICONS[e];
  return svg;
}
