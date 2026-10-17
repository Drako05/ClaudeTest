import { describe, expect, it } from 'vitest';
import { RESOURCE_COUNT, type Resource } from '@verdant/shared';
import { CLEAR, PIXEL_GRID, pixelPaths, pixelSvg, type PixelArt } from '../packages/client/src/pixel-art.js';
import { ITEM_PALETTE, itemArt } from '../packages/client/src/item-icons.js';
import { BUTTON_ICONS, buttonArt, CATEGORY_ICONS, categoryArt, equipArt, SILHOUETTE_PALETTE } from '../packages/client/src/silhouette-icons.js';
import { RECIPES } from '@verdant/shared';
import { Equip, EQUIP_COUNT } from '@verdant/shared';

/**
 * Los iconos en pixelart (el autor, 2026-10-17: «aspecto pixelart HD», rejilla
 * de 24 × 24; guia de arte, directriz 5). El formato es puro y se mide aqui;
 * como se ven, en la hoja de `?iconos=1`.
 */

/** Lo que tiene que cumplir toda rejilla: su tamano y sus caracteres. */
function wellFormed(art: PixelArt, where: string): void {
  expect(art.rows.length, where).toBe(PIXEL_GRID);
  art.rows.forEach((row, y) => {
    expect(row.length, `${where}, fila ${y}`).toBe(PIXEL_GRID);
    for (const ch of row) {
      if (ch !== CLEAR) expect(art.palette[ch], `${where}: «${ch}» no esta en su paleta`).toBeDefined();
    }
  });
}

describe('El formato de pixelart', () => {
  it('junta cada tramo de un color en un rectangulo de alto 1, un trazado por color', () => {
    const art: PixelArt = { rows: ['aab.', '.bb.'], palette: { a: '#111', b: '#222' } };
    expect(pixelPaths(art)).toEqual([
      { color: '#111', d: 'M0 0h2v1h-2z' },
      { color: '#222', d: 'M2 0h1v1h-1zM1 1h2v1h-2z' },
    ]);
    const svg = pixelSvg(art, 'x');
    expect(svg).toContain('class="x"');
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('shape-rendering="crispEdges"');
  });

  it('lo transparente no se dibuja', () => {
    expect(pixelPaths({ rows: ['....'], palette: {} })).toEqual([]);
  });
});

describe('Los iconos de los objetos', () => {
  const all = Array.from({ length: RESOURCE_COUNT }, (_, i) => itemArt(i as Resource));

  it('hay uno por objeto, de 24 × 24, con caracteres de la paleta comun', () => {
    expect(all.length).toBe(30);
    all.forEach((art, i) => {
      expect(art.palette).toBe(ITEM_PALETTE);
      wellFormed(art, `objeto ${i}`);
    });
  });

  it('cada color de la paleta lo usa algun icono: al rehacer un dibujo no quedan huerfanos', () => {
    const used = new Set(all.flatMap((art) => [...art.rows.join('')]));
    expect(Object.keys(ITEM_PALETTE).filter((k) => !used.has(k))).toEqual([]);
  });

  it('ninguno esta vacio, y todos dejan un pixel de margen', () => {
    all.forEach((art, i) => {
      expect(art.rows.join('').replaceAll(CLEAR, '').length, `objeto ${i}`).toBeGreaterThan(40);
      expect(art.rows[0], `objeto ${i}`).toBe(CLEAR.repeat(PIXEL_GRID));
      expect(art.rows[PIXEL_GRID - 1], `objeto ${i}`).toBe(CLEAR.repeat(PIXEL_GRID));
      for (const row of art.rows) {
        expect(row[0], `objeto ${i}`).toBe(CLEAR);
        expect(row[PIXEL_GRID - 1], `objeto ${i}`).toBe(CLEAR);
      }
    });
  });

  it('el contorno lo rodea todo: lo que toca lo transparente es contorno (deduccion de la referencia)', () => {
    all.forEach((art, i) => {
      const at = (x: number, y: number) => art.rows[y]?.[x] ?? CLEAR;
      art.rows.forEach((row, y) => {
        [...row].forEach((ch, x) => {
          if (ch === CLEAR || ch === 'o') return;
          const touches = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].includes(CLEAR);
          expect(touches, `objeto ${i}: el pixel (${x}, ${y}) toca lo transparente sin contorno`).toBe(false);
        });
      });
    });
  });

  it('cada uno es distinto de los demas', () => {
    const seen = new Set(all.map((art) => art.rows.join('\n')));
    expect(seen.size).toBe(all.length);
  });
});

describe('Las siluetas: los huecos de PERSONAJE, los botones y las categorias', () => {
  const equip = Array.from({ length: EQUIP_COUNT }, (_, i) => equipArt(i as Equip));
  const buttons = BUTTON_ICONS.map((b) => buttonArt(b));
  const categories = CATEGORY_ICONS.map((c) => categoryArt(c) as PixelArt);

  it('hay una por hueco (14) y una por boton, cada pieza del ojo aparte (20)', () => {
    expect(equip.length).toBe(14);
    expect(buttons.length).toBe(20);
  });

  it('cada categoria de las recetas tiene la suya (el autor, 2026-10-17), y no sobra ninguna', () => {
    const used = new Set(RECIPES.map((r) => r.category));
    expect(new Set(CATEGORY_ICONS)).toEqual(used);
    for (const c of used) expect(categoryArt(c), c).not.toBeNull();
  });

  it('son de 24 × 24 y de UN solo color, el del texto (directriz 3: siluetas monocromaticas)', () => {
    expect(SILHOUETTE_PALETTE).toEqual({ '#': 'currentColor' });
    [...equip, ...buttons, ...categories].forEach((art, i) => {
      wellFormed(art, `silueta ${i}`);
      expect(art.palette).toBe(SILHOUETTE_PALETTE);
      expect(new Set(art.rows.join('').replaceAll(CLEAR, '')), `silueta ${i}`).toEqual(new Set(['#']));
    });
  });

  it('cada una es distinta de las demas, salvo INVENTARIO, que es el hueco Bolso (el autor, 2026-10-17)', () => {
    expect(buttonArt('inventory').rows).toBe(equipArt(Equip.Bag).rows);
    const all = [...equip, ...buttons.filter((_, i) => BUTTON_ICONS[i] !== 'inventory'), ...categories];
    expect(new Set(all.map((art) => art.rows.join('\n'))).size).toBe(all.length);
  });
});
