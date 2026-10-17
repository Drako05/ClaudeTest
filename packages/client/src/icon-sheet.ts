/**
 * La hoja de los iconos, para que el autor los revise (`?iconos=1`, 2026-10-17:
 * «hoja con los 30, y luego al juego»). Tapa el juego con un panel del color
 * de las casillas y pone cada icono a su tamano real en una casilla (48 px, el
 * doble exacto de su rejilla) y ampliado ×4, con su nombre debajo, por grupos.
 * No toca el mundo: es solo dibujo.
 */

import { RESOURCE_COUNT, RESOURCE_NAMES, type Resource } from '@verdant/shared';
import { itemArt } from './item-icons.js';
import { pixelIcon, type PixelArt } from './pixel-art.js';

interface SheetGroup {
  title: string;
  icons: { name: string; art: PixelArt }[];
}

function groups(): SheetGroup[] {
  const items = Array.from({ length: RESOURCE_COUNT }, (_, i) => ({
    name: RESOURCE_NAMES[i]!,
    art: itemArt(i as Resource),
  }));
  return [{ title: 'Objetos', icons: items }];
}

/** Pone la hoja encima de todo. Devuelve cuantos iconos tiene. */
export function showIconSheet(): number {
  const sheet = document.createElement('div');
  sheet.id = 'iconSheet';
  let count = 0;
  for (const group of groups()) {
    const h = document.createElement('h2');
    h.textContent = `${group.title} (${group.icons.length})`;
    sheet.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'sheetGrid';
    for (const { name, art } of group.icons) {
      const cell = document.createElement('figure');
      const slot = document.createElement('div');
      slot.className = 'sheetSlot';
      slot.appendChild(pixelIcon(art, 'sheetIcon'));
      const big = pixelIcon(art, 'sheetIcon big');
      const label = document.createElement('figcaption');
      label.textContent = name;
      cell.append(slot, big, label);
      grid.appendChild(cell);
      count++;
    }
    sheet.appendChild(grid);
  }
  document.body.appendChild(sheet);
  return count;
}
