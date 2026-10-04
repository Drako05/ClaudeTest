/**
 * Los iconos de las casillas de PERSONAJE (decision del autor, 2026-10-04): una
 * silueta por casilla en vez de su nombre escrito, que se oculta al equipar
 * algo. Siguen la **directriz 3 de `docs/guia-de-arte.md`**: siluetas rellenas
 * de un color, minimalistas, de armadura y equipo de aventurero medieval y de
 * fantasia, como la referencia del autor. Los detalles van calados
 * (`fill-rule: evenodd`). Toman el color de la pista (`currentColor`). **Los
 * dibujos son mios.**
 *
 * Indexados por `Equip`: el mismo orden que la rejilla.
 */

import { Equip } from '@verdant/shared';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Espejo horizontal en la caja de 24: el par de hombreras y de grebas. */
const MIRROR = 'matrix(-1 0 0 1 24 0)';

/** El contenido de cada icono, en una caja de 24 × 24. */
const ICONS: Record<Equip, string> = {
  // Capa con capucha: la cara y la abertura del frente, caladas.
  [Equip.Cape]:
    '<path d="M12 1.5C8.6 1.5 7 4 7 7.2v2C5.2 11.5 3.6 16 3 22h18c-.6-6-2.2-10.5-4-12.8v-2C17 4 15.4 1.5 12 1.5z' +
    'M12 4.5c-1.4 0-2.4 1.3-2.4 3.1 0 2 1.1 3.4 2.4 3.4s2.4-1.4 2.4-3.4c0-1.8-1-3.1-2.4-3.1z' +
    'M11.5 13h1l.4 9h-1.8z"/>',
  // Yelmo cerrado con rendija en cruz y penacho.
  [Equip.Helmet]:
    '<path d="M6 9.5C6 6 8.5 4.2 12 4.2S18 6 18 9.5V19c0 1.5-1.5 2.5-6 3-4.5-.5-6-1.5-6-3z' +
    'M7.5 11h9v1.6h-9zM11.3 12.6h1.4V18h-1.4z"/>' +
    '<path d="M11.4 4.3C11 2.2 13.2.6 17.5 1.2c-1.6.7-2.6 1.8-3 3.1z"/>',
  // Par de hombreras de laminas, con puas.
  [Equip.Shoulders]: [
    '',
    ` transform="${MIRROR}"`,
  ]
    .map(
      (t) =>
        `<g${t}><path d="M.8 15.5C.8 10.5 3.8 7.5 8.6 7.5c.7 0 1 .4 1 1.1V14c-3.6 0-5.8.8-6.9 2.5z` +
        'M1.8 19.5c1-2.2 3.4-3.5 7.8-3.7v2c-3.7.2-5.3 1.1-5.9 2.7z"/>' +
        '<path d="M2.6 10.4 1.6 7.6l2.6 1.5zM5.2 8.3l.1-3 1.9 2.4z"/></g>',
    )
    .join(''),
  // Mochila de aventurero: la manta enrollada encima, la solapa y la hebilla.
  [Equip.Bag]:
    '<path d="M5.5 3h13a2 2 0 0 1 0 4h-13a2 2 0 0 1 0-4zM8 3h1v4H8zM15 3h1v4h-1z"/>' +
    '<path d="M6 8.3h12c1.1 0 2 .9 2 2V20c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-9.7c0-1.1.9-2 2-2z' +
    'M4.6 13.8c3.2 1.8 11.6 1.8 14.8 0v1.2c-3.2 1.8-11.6 1.8-14.8 0z' +
    'M10.8 16.9h2.4v2.8h-2.4zM11.5 17.6v1.4h1v-1.4z"/>',
  // Peto con la arista central y el faldar.
  [Equip.Chest]:
    '<path d="M7 3l2.5 1.5c1 1.5 4 1.5 5 0L17 3l3.5 2.5-1 4.5c-1 .2-1.7 1-1.7 2v6.5c0 1.5-2.3 3-5.8 3.5' +
    '-3.5-.5-5.8-2-5.8-3.5V12c0-1-.7-1.8-1.7-2l-1-4.5z' +
    'M11.6 7.5h.8v7.8h-.8zM7.3 16.2c1.7 1 7.7 1 9.4 0v.9c-1.7 1-7.7 1-9.4 0z"/>',
  // Amuleto: la cadena y el medallon con su gema calada.
  [Equip.Necklace]:
    '<path d="M3.6 2.5h1.7l7 9.6-1.3.6zM20.4 2.5h-1.7l-7 9.6 1.3.6z"/>' +
    '<path d="M12 11.8a5.1 5.1 0 1 1 0 10.2 5.1 5.1 0 0 1 0-10.2zM12 14.4 14.5 17 12 19.6 9.5 17z"/>',
  // Cinturon de cuero, hebilla grande y una bolsita colgada.
  [Equip.Belt]:
    '<path d="M1 9.5h7v4.5H1zM16 9.5h7v4.5h-7z"/>' +
    '<path d="M8.3 7.8h7.4v7.9H8.3zM9.8 9.3v4.9h4.4V9.3z"/>' +
    '<path d="M11.4 9.3h1.2v4.9h-1.2z"/>' +
    '<path d="M16.6 14.5h4.6v4.8c0 1.5-1.1 2.7-2.3 2.7s-2.3-1.2-2.3-2.7z"/>',
  // Grebas: el par de protecciones de pierna, con la rodillera.
  [Equip.Pants]:
    '<path d="M4.3 2.5h6.2l-.5 8.4c.6.8.6 2 0 2.8l-.4 6.3 1.4 2H4.8l1.1-2-.6-6.3c-.6-.8-.6-2 0-2.8z' +
    'M5.1 9.8h5.2v.8H5.1z"/>' +
    `<path transform="${MIRROR}" d="M4.3 2.5h6.2l-.5 8.4c.6.8.6 2 0 2.8l-.4 6.3 1.4 2H4.8l1.1-2-.6-6.3c-.6-.8-.6-2 0-2.8z` +
    'M5.1 9.8h5.2v.8H5.1z"/>',
  // Anillo de sello con una gema grande.
  [Equip.Ring]:
    '<path d="M12 8.6a6.7 6.7 0 1 1 0 13.4 6.7 6.7 0 0 1 0-13.4zM12 11a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6z"/>' +
    '<path d="M12 1.5l4.2 3.7L12 10 7.8 5.2zM9.3 4.9h5.4v.7H9.3z"/>',
  // Bota alta de cuero, con el doblez arriba, la correa y la suela.
  [Equip.Boots]:
    '<path d="M6 2h10v2.5h-1.5v8.3l5.1 3.6c1 .7 1.4 1.7 1.4 2.8V22H7V4.5H6z' +
    'M7 8.8h7.5V10H7zM7 19.9h14v.8H7z"/>',
  // Huella de bestia (un lobo), con sus garras.
  [Equip.Pet]:
    '<path d="M12 12.6c3 0 5.6 3.1 5.6 5.7 0 2-2 3.2-3.6 2.7-1-.3-1.5-.7-2-.7s-1 .4-2 .7c-1.6.5-3.6-.7-3.6-2.7 0-2.6 2.6-5.7 5.6-5.7z"/>' +
    '<circle cx="5.3" cy="11.6" r="2.1"/><circle cx="9.3" cy="7.6" r="2.1"/>' +
    '<circle cx="14.7" cy="7.6" r="2.1"/><circle cx="18.7" cy="11.6" r="2.1"/>' +
    '<path d="M8.4 5.8 9.4 2.4l1 3.4zM13.6 5.8l1-3.4 1 3.4zM3.8 10.2l-1.6-3 3.1 1.6zM20.2 10.2l1.6-3-3.1 1.6z"/>',
  // Cabeza de caballo, como el caballo del ajedrez.
  [Equip.Mount]:
    '<path d="M6.5 22h12v-1.6c0-.9-.6-1.5-1.4-1.7-.3-2.8.2-5.6 1-8.2.9-3-.1-5.6-2.6-7l-.8-1.9-1.4 1.4' +
    'c-2.6-.2-4.8 1-6.3 3.5l-3 4.7c-.5.8-.2 1.8.7 2.1l1.1.4c.6.2 1.3 0 1.7-.5l1.6-1.6c.7-.2 1.4-.4 2-1' +
    '-.2 2.9-2.1 4.9-3 8.2-.8.2-1.6.8-1.6 1.6z' +
    'M12.6 5.4a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z"/>',
  // Espada en diagonal: el canal calado, el gavilan y el pomo.
  [Equip.Weapon]:
    '<g transform="rotate(45 12 12) translate(12 12) scale(1.18) translate(-12 -12)">' +
    '<path d="M10.4 3 12 .2 13.6 3v12h-3.2zM11.6 4.2v9.6h.8V4.2z"/>' +
    '<path d="M6.6 15h10.8v2.1H6.6zM11 17.1h2v4h-2z"/>' +
    '<circle cx="12" cy="22.3" r="1.6"/></g>',
  // Escudo de blason con una cruz heraldica calada.
  [Equip.Emblem]:
    '<path d="M4 2.5h16v7.5c0 5.5-3.5 9.5-8 12-4.5-2.5-8-6.5-8-12z' +
    'M11 4.5h2v14.5h-2zM6.3 8.5H11v2H6.3zM13 8.5h4.7v2H13z"/>',
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
