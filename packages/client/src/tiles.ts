/**
 * Pintado procedural en vista isometrica.
 *
 * No hay ni un solo asset externo: cada bioma y cada feature se dibuja por
 * codigo sobre un canvas 2D.
 *
 * El terreno de un chunk entero se pinta en un unico canvas que sube a la GPU
 * como una sola textura, asi que dibujar el suelo cuesta un sprite por chunk
 * visible en vez de mil por tile. Las features, en cambio, NO se hornean ahi:
 * necesitan ordenarse por profundidad junto al personaje para que este pueda
 * pasar por detras de un arbol, y algo horneado en el suelo no puede hacer eso.
 */

import { CHUNK_SIZE, Feature, Terrain } from '@verdant/shared';
import { hash2DFloat } from '@verdant/sim';
import type { Chunk } from '@verdant/sim';
import { TILE_H, TILE_W, worldToScreen } from './projection.js';

/** Caja que ocupa el rombo de un chunk completo, en pixeles. */
export const CHUNK_TEX_W = CHUNK_SIZE * TILE_W;
export const CHUNK_TEX_H = CHUNK_SIZE * TILE_H;
/** El rombo se extiende a izquierda y derecha del origen: hay que recentrarlo. */
export const CHUNK_TEX_OFFSET_X = CHUNK_TEX_W / 2;

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
const SPECKLE = 14;

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function shade(rgb: [number, number, number], delta: number): string {
  return `rgb(${clampByte(rgb[0] + delta)},${clampByte(rgb[1] + delta)},${clampByte(rgb[2] + delta)})`;
}

/**
 * Traza el rombo de un tile cuya esquina norte esta en (px, py).
 *
 * Se agranda medio pixel: dos rombos exactamente adyacentes dejan costuras
 * visibles por el antialiasing del canvas, y solaparlos un poco las elimina.
 */
function traceDiamond(ctx: CanvasRenderingContext2D, px: number, py: number): void {
  const hw = TILE_W / 2 + 0.5;
  const hh = TILE_H / 2 + 0.5;
  ctx.beginPath();
  ctx.moveTo(px, py - 0.5);
  ctx.lineTo(px + hw, py + hh);
  ctx.lineTo(px, py + TILE_H + 0.5);
  ctx.lineTo(px - hw, py + hh);
  ctx.closePath();
}

/** Pinta el terreno de un chunk. Las features van aparte, como sprites. */
export function paintChunkTerrain(
  chunk: Chunk,
  ctx: CanvasRenderingContext2D,
  seed: number,
): void {
  const baseX = chunk.cx * CHUNK_SIZE;
  const baseY = chunk.cy * CHUNK_SIZE;
  ctx.clearRect(0, 0, CHUNK_TEX_W, CHUNK_TEX_H);

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const terrain = chunk.terrain[ly * CHUNK_SIZE + lx] as Terrain;
      const rgb = TERRAIN_RGB[terrain] ?? TERRAIN_RGB[Terrain.Grass];
      const jitter = (hash2DFloat(seed ^ 0x1f2e3d4c, baseX + lx, baseY + ly) - 0.5) * 2 * SPECKLE;

      const p = worldToScreen(lx, ly);
      ctx.fillStyle = shade(rgb, jitter);
      traceDiamond(ctx, p.x + CHUNK_TEX_OFFSET_X, p.y);
      ctx.fill();
    }
  }
}

/** Tamano del lienzo de una feature y donde se apoya sobre el tile. */
export interface FeatureArt {
  canvas: HTMLCanvasElement;
  /** Punto de apoyo dentro del lienzo, en fraccion (0-1). */
  anchorX: number;
  anchorY: number;
  /** Pixeles que el dibujo se eleva sobre su punto de apoyo. */
  riseAbove: number;
}

/**
 * Dibuja cada feature una sola vez a un lienzo propio, que luego se reutiliza
 * como textura en todos los sprites de ese tipo.
 *
 * En isometrica los objetos tienen altura: se dibujan hacia ARRIBA desde su
 * punto de apoyo, que es el centro del tile. De ahi viene la sensacion de
 * volumen sin necesidad de 3D real.
 */
export function makeFeatureArt(feature: Feature): FeatureArt | null {
  const width = 40;
  const height = 52;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Punto de apoyo: centro horizontal, cerca del borde inferior.
  const footX = width / 2;
  const footY = height - 6;

  const shadow = () => {
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.beginPath();
    ctx.ellipse(footX, footY, TILE_W / 2.6, TILE_H / 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  switch (feature) {
    case Feature.Tree: {
      shadow();
      ctx.fillStyle = '#5a3f26';
      ctx.fillRect(footX - 2.5, footY - 16, 5, 16);
      ctx.fillStyle = '#24501f';
      ctx.beginPath();
      ctx.arc(footX, footY - 24, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#31672a';
      ctx.beginPath();
      ctx.arc(footX, footY - 30, 10.5, 0, Math.PI * 2);
      ctx.fill();
      // Luz por el noroeste, coherente en todas las features.
      ctx.fillStyle = '#488c39';
      ctx.beginPath();
      ctx.arc(footX - 4, footY - 33, 6.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case Feature.RockNode: {
      shadow();
      ctx.fillStyle = '#6f6f78';
      ctx.beginPath();
      ctx.moveTo(footX - 11, footY);
      ctx.lineTo(footX - 5, footY - 15);
      ctx.lineTo(footX + 4, footY - 12);
      ctx.lineTo(footX + 11, footY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#9a9aa4';
      ctx.beginPath();
      ctx.moveTo(footX - 5, footY - 15);
      ctx.lineTo(footX + 4, footY - 12);
      ctx.lineTo(footX - 1, footY);
      ctx.lineTo(footX - 11, footY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b8b8c2';
      ctx.beginPath();
      ctx.moveTo(footX - 5, footY - 15);
      ctx.lineTo(footX - 1, footY - 6);
      ctx.lineTo(footX - 8, footY - 4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case Feature.BerryBush: {
      shadow();
      ctx.fillStyle = '#2f5a28';
      ctx.beginPath();
      ctx.ellipse(footX, footY - 7, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7534';
      ctx.beginPath();
      ctx.ellipse(footX - 2.5, footY - 10, 7, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8384a';
      for (const [dx, dy] of [
        [-5, -6],
        [4, -9],
        [1, -3],
        [7, -4],
      ]) {
        ctx.beginPath();
        ctx.arc(footX + dx, footY + dy, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default:
      return null;
  }

  return { canvas, anchorX: footX / width, anchorY: footY / height, riseAbove: footY };
}

/** El personaje, con el mismo criterio de apoyo y luz que las features. */
export function makePlayerArt(): FeatureArt | null {
  const width = 32;
  const height = 44;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const footX = width / 2;
  const footY = height - 5;

  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(footX, footY, TILE_W / 3, TILE_H / 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2b3d5e';
  ctx.fillRect(footX - 5, footY - 13, 10, 13);
  ctx.fillStyle = '#3a5480';
  ctx.fillRect(footX - 5, footY - 13, 5, 13);

  ctx.fillStyle = '#f2d7b0';
  ctx.beginPath();
  ctx.arc(footX, footY - 18, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8c5a3c';
  ctx.beginPath();
  ctx.arc(footX, footY - 20.5, 6, Math.PI, 0);
  ctx.fill();

  return { canvas, anchorX: footX / width, anchorY: footY / height, riseAbove: footY };
}
