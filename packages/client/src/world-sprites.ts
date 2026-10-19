/**
 * De los dibujos de `world-art.ts` a lienzos y texturas: lo que pone en el
 * mundo el pixelart (el autor, 2026-10-19; guia de arte, directriz 7), a 24
 * pixeles de arte por bloque (`WORLD_PX`) siempre, sea suelo, arbol, roca o el
 * jugador: el pixel se ve del mismo tamano en todo.
 *
 * `treeArt` es pura: compone la copa de una especie con el tronco desnudo de
 * cada arbol, que tiene trece largos y su grosor, y por eso no se guarda
 * dibujado sino que se pinta con `barkTrunk`.
 */

import { CanvasTexture, NearestFilter, NoColorSpace, SRGBColorSpace, type Texture } from 'three';
import { Feature, isSapling, Terrain } from '@verdant/shared';
import { hash2DFloat, mulberry32 } from '@verdant/sim';
import { barkTrunk, blank, toRows } from './pixel-paint.js';
import type { TileRect } from './terrain-mesh.js';
import { BUSHES, CROWNS, PEBBLES, PLAYER, SAPLINGS, TERRAIN_TILES, WORLD_PX, type WorldArt } from './world-art.js';

/** Las letras de la corteza en la paleta de una copa (`world-art.ts`). */
export const BARK = 'efgh';

/**
 * Las filas de abajo de una copa que, en la columna del tronco, no son
 * follaje: el tallo que sigue dentro de ella hasta donde empiezan las hojas.
 */
function crownGap(rows: readonly string[], x: number): number {
  let gap = 0;
  for (let y = rows.length - 1; y >= 0; y--) {
    const ch = rows[y]![Math.floor(x)]!;
    if (ch !== '.' && !BARK.includes(ch)) break;
    gap++;
  }
  return gap;
}

/**
 * Un arbol entero: la copa de su especie sobre `bare` bloques de tronco
 * desnudo de `width` bloques de grueso en el pie, que estrecha hasta el grueso
 * con que lo recibe la copa. Las grietas de la corteza salen de una semilla
 * fija por especie y largo: el mismo arbol se pinta siempre igual (regla 3).
 *
 * El tronco desnudo es **el del nucleo** (`treeTrunkAt`, que es tambien su
 * hitbox): la copa se apoya donde empiezan sus hojas en la columna del
 * tronco, no en el borde de abajo de su dibujo, que en el roble y el cerezo
 * deja ver unos pixeles de tallo hasta la horquilla.
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
  const top = crown.rows.length - crownGap(crown.rows, crown.trunkX);
  const H = top + trunk;
  const g = blank(W, Math.max(H, crown.rows.length));
  const rng = mulberry32(Math.floor(hash2DFloat(feature, trunk, wBase) * 2 ** 31));
  barkTrunk(g, rng, crown.trunkX + off, H - 1, top, wBase, crown.trunkW, BARK);
  // La copa encima: su tallo y sus ramas tapan el tronco donde se cruzan.
  crown.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== '.' && y < H) g[y]![x + off] = row[x]!;
  });
  return { rows: toRows(g).slice(0, H), palette: crown.palette, footX: crown.trunkX + off };
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

/**
 * Un lienzo como textura de pixeles: sin filtrar, que suavizar el pixelart lo
 * emborrona. `srgb` dice que sus colores son los de la pantalla: asi se ven
 * tal cual en lo que no se ilumina (aspas, estaciones, agua). El suelo va sin
 * el, como iban los colores por vertice a los que sustituye: la luz de la
 * escena los oscurece y la salida en sRGB los vuelve a aclarar, y el suelo se
 * ve como se veia (medido: la roca del suelo, 120,120,116 en pantalla con los
 * colores por vertice y lo mismo con la textura).
 */
export function pixelTexture(canvas: HTMLCanvasElement, srgb: boolean): Texture {
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  return texture;
}

/** Un objeto dibujado y su punto de apoyo en el lienzo, en fraccion (0-1). */
export interface SpriteArt {
  canvas: HTMLCanvasElement;
  anchorX: number;
  anchorY: number;
}

/** Lo dibujado se apoya en el centro de su fila de abajo. */
const standing = (art: WorldArt, footX = art.rows[0]!.length / 2): SpriteArt => {
  const canvas = artCanvas(art);
  return { canvas, anchorX: footX / canvas.width, anchorY: 1 };
};

/**
 * El dibujo de una feature que va en aspa (o tumbada, los guijarros): matas,
 * brotes y guijarros. Los arboles, con su tronco, salen de `treeArt`; las
 * rocas y los minerales son voxeles (`rock-mesh.ts`); las estaciones, cajas.
 */
export function featureSprite(feature: Feature): SpriteArt | null {
  if (feature === Feature.Pebbles) return { ...standing(PEBBLES), anchorY: 0.5 };
  const art = isSapling(feature) ? SAPLINGS[feature] : BUSHES[feature];
  return art ? standing(art) : null;
}

/** El arbol entero, listo para el aspa. */
export function treeSprite(feature: Feature, bare: number, width: number): SpriteArt | null {
  const art = treeArt(feature, bare, width);
  return art ? standing(art, art.footX) : null;
}

/** El jugador, de frente. */
export function playerArt(): SpriteArt {
  return standing(PLAYER);
}

/**
 * El atlas del suelo: todas las variantes de todos los suelos en un lienzo,
 * una fila por suelo. `rect(terrain, variant)` dice donde cae cada una; `v0`
 * es su borde de arriba en la imagen (three.js da la vuelta al lienzo, asi que
 * es la `v` mas alta).
 */
export function terrainAtlas(): { canvas: HTMLCanvasElement; rect: (terrain: Terrain, variant: number) => TileRect; variants: (terrain: Terrain) => number } {
  const terrains = Object.keys(TERRAIN_TILES).map(Number) as Terrain[];
  const cols = Math.max(...terrains.map((t) => TERRAIN_TILES[t].length));
  const rows = Math.max(...terrains) + 1;
  const canvas = document.createElement('canvas');
  canvas.width = cols * WORLD_PX;
  canvas.height = rows * WORLD_PX;
  const ctx = canvas.getContext('2d')!;
  for (const t of terrains) TERRAIN_TILES[t].forEach((art, i) => ctx.drawImage(artCanvas(art), i * WORLD_PX, t * WORLD_PX));
  return {
    canvas,
    variants: (t) => TERRAIN_TILES[t]?.length ?? 1,
    rect: (t, i) => ({
      u0: (i * WORLD_PX) / canvas.width,
      u1: ((i + 1) * WORLD_PX) / canvas.width,
      v0: 1 - (t * WORLD_PX) / canvas.height,
      v1: 1 - ((t + 1) * WORLD_PX) / canvas.height,
    }),
  };
}
