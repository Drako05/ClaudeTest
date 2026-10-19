/**
 * El menu de opciones de una casilla del inventario (el autor, 2026-10-19,
 * con una foto: Usar, Dividir, Equipar, Destruir). Aqui solo lo puro —que
 * opciones salen para cada objeto y donde se coloca el menu—, para medirlo en
 * Node; lo dibuja y lo atiende `inventory-ui.ts`.
 */

import { equipOf, foodValue, stackMax, type Resource } from '@verdant/shared';

/** Mantener una casilla abre el menu en el movil: 0,3 s (el autor). */
export const MENU_HOLD_MS = 300;
/** Columnas de la rejilla (el autor, 2026-10-19). */
export const GRID_COLUMNS = 5;
/**
 * En el movil, la parte de cada casilla de la rejilla que responde al dedo: un
 * cuadrado centrado de 48 px de 60 (el autor, 2026-10-19). El anillo de
 * alrededor desliza la rejilla.
 */
export const TOUCH_CORE = 48;
/** Lo que separa el menu de la casilla, en px. **Deduccion mia.** */
export const MENU_GAP = 6;

export type ItemOption = 'use' | 'split' | 'equip' | 'destroy';

/** Su texto en el boton. */
export const OPTION_LABELS: Record<ItemOption, string> = {
  use: 'Usar',
  split: 'Dividir',
  equip: 'Equipar',
  destroy: 'Destruir',
};

/**
 * Las opciones de un objeto, en el orden de la foto del autor: Usar solo lo
 * que se come (`foodValue`), Dividir solo lo apilable, Equipar solo lo que
 * tiene hueco en PERSONAJE (`equipOf`), y Destruir siempre.
 */
export function optionsFor(item: Resource): ItemOption[] {
  const out: ItemOption[] = [];
  if (foodValue(item) > 0) out.push('use');
  if (stackMax(item) > 1) out.push('split');
  if (equipOf(item) !== null) out.push('equip');
  out.push('destroy');
  return out;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Placement {
  left: number;
  top: number;
  /** A que lado de la casilla sale. */
  side: 'left' | 'right';
  /** Como se alinea en vertical con la casilla. */
  align: 'center' | 'top' | 'bottom';
}

/**
 * Donde va el menu de la casilla `slot` (el autor):
 * - las columnas 1-2 lo sacan a la derecha y las 3-5 a la izquierda;
 * - centrado en la altura de la casilla, salvo en la primera o la ultima fila
 *   visible de la rejilla (`view`, la parte deslizada que se ve), donde alinea
 *   su borde de arriba o de abajo con el de la casilla, para no salirse de la
 *   rejilla por encima de las pestanas ni por debajo sobre la descripcion.
 * Todo en las mismas coordenadas (las de la pantalla, por ejemplo).
 */
export function placeMenu(slot: number, cell: Box, view: Box, menu: { width: number; height: number }): Placement {
  const side = slot % GRID_COLUMNS < 2 ? 'right' : 'left';
  const left = side === 'right' ? cell.right + MENU_GAP : cell.left - MENU_GAP - menu.width;
  const rowH = cell.bottom - cell.top;
  // Primera fila visible: no cabe otra fila entera encima, dentro de la vista.
  const firstRow = cell.top - view.top < rowH;
  const lastRow = view.bottom - cell.bottom < rowH;
  let align: Placement['align'] = 'center';
  if (firstRow) align = 'top';
  else if (lastRow) align = 'bottom';
  const top =
    align === 'top'
      ? cell.top
      : align === 'bottom'
        ? cell.bottom - menu.height
        : (cell.top + cell.bottom) / 2 - menu.height / 2;
  return { left, top, side, align };
}

/**
 * Cuanto hay que deslizar una rejilla (`view`, lo que se ve de ella) para que
 * la casilla `cell` quede entera a la vista (el autor, 2026-10-19): lo justo,
 * hacia arriba o hacia abajo, y 0 si ya se ve entera.
 */
export function scrollToShow(cell: Box, view: Box): number {
  if (cell.top < view.top) return cell.top - view.top;
  if (cell.bottom > view.bottom) return cell.bottom - view.bottom;
  return 0;
}

/** Si un punto cae en el cuadrado centrado de lado `core` de una casilla (`TOUCH_CORE`). */
export function inCore(x: number, y: number, cell: Box, core: number): boolean {
  const cx = (cell.left + cell.right) / 2;
  const cy = (cell.top + cell.bottom) / 2;
  return Math.abs(x - cx) <= core / 2 && Math.abs(y - cy) <= core / 2;
}

/** La cantidad de Dividir, ceñida entre 0 y la pila menos 1 (*deduccion*: entera seria moverla). */
export function clampSplit(n: number, stack: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(stack - 1, Math.trunc(n)));
}
