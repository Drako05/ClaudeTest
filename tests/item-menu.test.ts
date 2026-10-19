import { describe, expect, it } from 'vitest';
import { Resource } from '@verdant/shared';
import { clampSplit, optionsFor, placeMenu, scrollToShow, type Box } from '../packages/client/src/item-menu.js';

/**
 * El menu de una casilla (el autor, 2026-10-19): que opciones salen y donde.
 * Las columnas 1-2 lo sacan a la derecha y las 3-5 a la izquierda; centrado en
 * la casilla, salvo en la primera o la ultima fila visible, donde se alinea
 * con su borde de arriba o de abajo.
 */

/** Una rejilla de 5 columnas de 60 con huecos de 6, vista de 4 filas desde y=100. */
const view: Box = { left: 0, top: 100, right: 324, bottom: 100 + 4 * 60 + 3 * 6 };
const cellAt = (slot: number, scroll = 0): Box => {
  const col = slot % 5;
  const row = Math.floor(slot / 5);
  const left = col * 66;
  const top = view.top + row * 66 - scroll;
  return { left, top, right: left + 60, bottom: top + 60 };
};
const menu = { width: 90, height: 150 };

describe('Las opciones de cada objeto', () => {
  it('Usar lo que se come, Dividir lo apilable, Equipar lo equipable, Destruir siempre; en el orden de la foto', () => {
    expect(optionsFor(Resource.Berries)).toEqual(['use', 'split', 'destroy']);
    expect(optionsFor(Resource.CookedMeat)).toEqual(['use', 'split', 'destroy']);
    expect(optionsFor(Resource.Wood)).toEqual(['split', 'destroy']);
    expect(optionsFor(Resource.RawMeat)).toEqual(['split', 'destroy']);
    expect(optionsFor(Resource.FiberBag)).toEqual(['equip', 'destroy']);
    expect(optionsFor(Resource.IronSword)).toEqual(['equip', 'destroy']);
    expect(optionsFor(Resource.StoneAxe)).toEqual(['destroy']);
  });
});

describe('Donde sale el menu', () => {
  it('las columnas 1-2, a la derecha de la casilla; las 3-5, a la izquierda', () => {
    for (let col = 0; col < 5; col++) {
      const slot = 5 + col;
      const cell = cellAt(slot);
      const at = placeMenu(slot, cell, view, menu);
      if (col < 2) {
        expect(at.side, `${col}`).toBe('right');
        expect(at.left).toBeGreaterThanOrEqual(cell.right);
      } else {
        expect(at.side, `${col}`).toBe('left');
        expect(at.left + menu.width).toBeLessThanOrEqual(cell.left);
      }
    }
  });

  it('en una fila de en medio, centrado en la altura de la casilla', () => {
    const cell = cellAt(7);
    const at = placeMenu(7, cell, view, menu);
    expect(at.align).toBe('center');
    expect(at.top + menu.height / 2).toBeCloseTo((cell.top + cell.bottom) / 2, 6);
  });

  it('en la primera fila visible, alineado con el borde de arriba; en la ultima, con el de abajo', () => {
    const first = cellAt(2);
    const top = placeMenu(2, first, view, menu);
    expect(top.align).toBe('top');
    expect(top.top).toBe(first.top);
    const last = cellAt(17);
    const bottom = placeMenu(17, last, view, menu);
    expect(bottom.align).toBe('bottom');
    expect(bottom.top + menu.height).toBe(last.bottom);
  });

  it('«visible» es de la rejilla deslizada: deslizada una fila, la segunda es la primera visible', () => {
    const cell = cellAt(5, 66);
    expect(placeMenu(5, cell, view, menu).align).toBe('top');
    expect(placeMenu(10, cellAt(10, 66), view, menu).align).toBe('center');
  });
});

describe('Desplazar hasta la casilla elegida', () => {
  it('lo justo para que se vea entera, hacia arriba o hacia abajo; nada si ya se ve', () => {
    expect(scrollToShow(cellAt(7), view)).toBe(0);
    // Cortada por arriba: deslizada 30 px, la fila 0 asoma 30 px por encima.
    expect(scrollToShow(cellAt(0, 30), view)).toBe(-30);
    // La quinta fila, cortada por abajo.
    const low = cellAt(20);
    expect(scrollToShow(low, view)).toBe(low.bottom - view.bottom);
  });
});

describe('La cantidad de Dividir', () => {
  it('entre 0 y la pila menos 1, entera', () => {
    expect(clampSplit(5, 10)).toBe(5);
    expect(clampSplit(10, 10)).toBe(9);
    expect(clampSplit(-4, 10)).toBe(0);
    expect(clampSplit(3.7, 10)).toBe(3);
    expect(clampSplit(Number('abc'), 10)).toBe(0);
  });
});
