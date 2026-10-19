/**
 * De los dibujos de `world-art.ts` a lienzos: lo que pinta el pixelart del
 * mundo (el autor, 2026-10-19; guia de arte, directriz 7), a un pixel de
 * lienzo por pixel de arte. Quien lo ponga en el mundo lo escala a 24 pixeles
 * por bloque (`WORLD_PX`), siempre por un entero.
 *
 * `treeArt` es pura: compone la copa de una especie con el tronco desnudo de
 * cada arbol, que tiene trece largos y su grosor, y por eso no se guarda
 * dibujado sino que se pinta con `barkTrunk`.
 */

import { Feature } from '@verdant/shared';
import { hash2DFloat, mulberry32 } from '@verdant/sim';
import { barkTrunk, blank, toRows } from './pixel-paint.js';
import { CROWNS, WORLD_PX, type WorldArt } from './world-art.js';

/**
 * Un arbol entero: la copa de su especie sobre `bare` bloques de tronco
 * desnudo de `width` bloques de grueso en el pie, que estrecha hasta el grueso
 * con que lo recibe la copa. Las grietas de la corteza salen de una semilla
 * fija por especie y largo: el mismo arbol se pinta siempre igual (regla 3).
 */
export function treeArt(feature: Feature, bare: number, width: number): (WorldArt & { footX: number }) | null {
  const crown = CROWNS[feature];
  if (!crown) return null;
  const trunk = Math.round(bare * WORLD_PX);
  const wBase = Math.max(2, Math.round(width * WORLD_PX));
  const crownW = crown.rows[0]!.length;
  // Las raices se abren unos pixeles a cada lado: que quepan.
  const W = Math.max(crownW, wBase + 12);
  const off = Math.floor((W - crownW) / 2);
  const H = crown.rows.length + trunk;
  const g = blank(W, H);
  crown.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') g[y]![x + off] = row[x]!;
  });
  const rng = mulberry32(Math.floor(hash2DFloat(feature, trunk, wBase) * 2 ** 31));
  barkTrunk(g, rng, crown.trunkX + off, H - 1, crown.rows.length, wBase, crown.trunkW, 'efgh');
  return { rows: toRows(g), palette: crown.palette, footX: crown.trunkX + off };
}

/** Un dibujo en un lienzo, a un pixel por pixel de arte; `light` lo oscurece (las paredes del suelo). */
export function artCanvas(art: WorldArt, light = 1): HTMLCanvasElement {
  const h = art.rows.length;
  const w = art.rows[0]!.length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  art.rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const color = art.palette[row[x]!];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  if (light < 1) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0,0,0,${1 - light})`;
    ctx.fillRect(0, 0, w, h);
  }
  return canvas;
}
