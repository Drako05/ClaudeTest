/**
 * Pintado procedural de tiles.
 *
 * No hay ni un solo asset externo: cada bioma y cada feature se dibuja por
 * codigo sobre un canvas 2D. Un chunk entero se pinta en un unico canvas que
 * luego sube a la GPU como una sola textura, asi que el coste de dibujar el
 * terreno es un sprite por chunk visible en vez de mil sprites por tile.
 */

import { CHUNK_SIZE, Feature, Terrain } from '@verdant/shared';
import { hash2DFloat } from '@verdant/sim';
import type { Chunk } from '@verdant/sim';

/** Pixeles por tile en la textura base. El zoom escala esto despues. */
export const TILE_PX = 16;
export const CHUNK_PX = CHUNK_SIZE * TILE_PX;

/** Color base de cada terreno, como [r, g, b]. */
const TERRAIN_RGB: Record<Terrain, [number, number, number]> = {
  [Terrain.DeepWater]: [22, 48, 82],
  [Terrain.Water]: [41, 96, 148],
  [Terrain.Sand]: [214, 197, 142],
  [Terrain.Grass]: [88, 140, 72],
  [Terrain.Forest]: [56, 100, 52],
  [Terrain.Rock]: [116, 116, 124],
  [Terrain.Snow]: [226, 234, 242],
  [Terrain.Tundra]: [150, 156, 130],
};

/** Cuanto varia el brillo tile a tile. Sin esto el terreno parece plastico. */
const SPECKLE = 16;

function shade(rgb: [number, number, number], delta: number): string {
  const r = clampByte(rgb[0] + delta);
  const g = clampByte(rgb[1] + delta);
  const b = clampByte(rgb[2] + delta);
  return `rgb(${r},${g},${b})`;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/** Pinta un chunk completo en el canvas dado (que debe ser CHUNK_PX x CHUNK_PX). */
export function paintChunk(chunk: Chunk, ctx: CanvasRenderingContext2D, seed: number): void {
  const baseX = chunk.cx * CHUNK_SIZE;
  const baseY = chunk.cy * CHUNK_SIZE;

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const idx = ly * CHUNK_SIZE + lx;
      const wx = baseX + lx;
      const wy = baseY + ly;
      const px = lx * TILE_PX;
      const py = ly * TILE_PX;

      const terrain = chunk.terrain[idx] as Terrain;
      const rgb = TERRAIN_RGB[terrain] ?? TERRAIN_RGB[Terrain.Grass];
      const jitter = (hash2DFloat(seed ^ 0x1f2e3d4c, wx, wy) - 0.5) * 2 * SPECKLE;

      ctx.fillStyle = shade(rgb, jitter);
      ctx.fillRect(px, py, TILE_PX, TILE_PX);

      const feature = chunk.feature[idx] as Feature;
      if (feature !== Feature.None) {
        paintFeature(ctx, feature, px, py, hash2DFloat(seed ^ 0x77aa33cc, wx, wy));
      }
    }
  }
}

function paintFeature(
  ctx: CanvasRenderingContext2D,
  feature: Feature,
  px: number,
  py: number,
  r: number,
): void {
  const cx = px + TILE_PX / 2;
  const cy = py + TILE_PX / 2;

  switch (feature) {
    case Feature.Tree: {
      // Sombra, tronco y copa en dos tonos: da volumen con cuatro primitivas.
      ctx.fillStyle = 'rgba(0,0,0,0.20)';
      ctx.beginPath();
      ctx.ellipse(cx + 1, cy + 5, 5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5a3f26';
      ctx.fillRect(cx - 1, cy + 1, 2, 5);

      const size = 4.6 + r * 1.6;
      ctx.fillStyle = '#2c5a26';
      ctx.beginPath();
      ctx.arc(cx, cy - 1, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7a33';
      ctx.beginPath();
      ctx.arc(cx - 1.2, cy - 2.4, size * 0.62, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case Feature.RockNode: {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(cx + 1, cy + 4, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#8d8d95';
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy + 4);
      ctx.lineTo(cx - 2.5, cy - 3 - r * 1.5);
      ctx.lineTo(cx + 2, cy - 2);
      ctx.lineTo(cx + 5, cy + 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#adadb6';
      ctx.beginPath();
      ctx.moveTo(cx - 2.5, cy - 3 - r * 1.5);
      ctx.lineTo(cx + 2, cy - 2);
      ctx.lineTo(cx - 1, cy + 4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case Feature.BerryBush: {
      ctx.fillStyle = '#3c6b32';
      ctx.beginPath();
      ctx.arc(cx, cy + 1, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8384a';
      for (let i = 0; i < 3; i++) {
        const a = r * Math.PI * 2 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 2.2, cy + 1 + Math.sin(a) * 2.2, 1.25, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default:
      break;
  }
}
