/**
 * La hoja de los iconos, para que el autor los revise (`?iconos=1`, 2026-10-17:
 * «hoja con los 30, y luego al juego»). Tapa el juego con un panel del color
 * de las casillas y pone cada icono a su tamano real en una casilla (48 px, el
 * doble exacto de su rejilla) y ampliado ×4, con su nombre debajo, por grupos:
 * los objetos, los huecos de PERSONAJE, los botones y las categorias de las
 * recetas. No toca el mundo: es
 * solo dibujo.
 */

import { EQUIP_COUNT, EQUIP_NAMES, RESOURCE_COUNT, RESOURCE_NAMES, type Equip, type Resource } from '@verdant/shared';
import { itemArt } from './item-icons.js';
import { pixelIcon, type PixelArt } from './pixel-art.js';
import { BUTTON_ICONS, BUTTON_NAMES, buttonArt, CATEGORY_ICONS, categoryArt, equipArt } from './silhouette-icons.js';

interface SheetGroup {
  title: string;
  /** La clase de color: los huecos, en el gris azulado de su casilla; los botones, en el blanco de sus iconos. */
  tone: string;
  icons: { name: string; art: PixelArt }[];
}

function groups(): SheetGroup[] {
  const items = Array.from({ length: RESOURCE_COUNT }, (_, i) => ({
    name: RESOURCE_NAMES[i]!,
    art: itemArt(i as Resource),
  }));
  const equip = Array.from({ length: EQUIP_COUNT }, (_, i) => ({
    name: EQUIP_NAMES[i]!,
    art: equipArt(i as Equip),
  }));
  const buttons = BUTTON_ICONS.map((b) => ({ name: BUTTON_NAMES[b], art: buttonArt(b) }));
  const categories = CATEGORY_ICONS.map((c) => ({ name: c, art: categoryArt(c) as PixelArt }));
  return [
    { title: 'Objetos', tone: '', icons: items },
    { title: 'Huecos de PERSONAJE', tone: 'slotTone', icons: equip },
    { title: 'Botones', tone: 'buttonTone', icons: buttons },
    { title: 'Categorias de recetas', tone: 'buttonTone', icons: categories },
  ];
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
    grid.className = `sheetGrid ${group.tone}`.trim();
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
