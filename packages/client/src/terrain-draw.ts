/**
 * Que piezas de terreno se dibujan, donde y **en que orden**.
 *
 * Puro y sin DOM ni PixiJS, como `projection.ts` y `relief-faces.ts`: aqui vive
 * la geometria y el orden, y el renderizador solo convierte la lista en sprites.
 *
 * Existe por un fallo concreto. El suelo se horneaba en una textura por chunk y
 * las paredes vivian en la capa de objetos, que estaba entera por encima; asi
 * que una pared se pintaba sobre cualquier suelo, lo tuviera delante o detras.
 * Con el mundo casi plano apenas se notaba, pero era un error de orden, y un
 * error de orden no lo ve ningun test unitario y tampoco la prueba de humo: lo
 * vio el autor jugando. Sacando el orden a una funcion pura se puede afirmar la
 * regla que lo gobierna y comprobarla sin navegador.
 *
 * La regla: **lo que esta mas al sur o al este tapa a lo que esta al norte o al
 * oeste**, y eso es exactamente `wx + wy` creciente.
 */

import { CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { groundHeight, type Chunk, type World } from '@verdant/sim';
import { collectFaces, type ReliefFace, type TileBounds } from './relief-faces.js';
import { heightOffset, TILE_DIAMOND, TILE_H, TILE_W, worldToScreen } from './projection.js';

/** Rectangulo en coordenadas de pantalla absolutas. */
export interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** Una pieza de terreno lista para dibujar. */
export interface GroundPiece {
  readonly wx: number;
  readonly wy: number;
  /** `top` es la cara de arriba; `east` y `south`, los dos costados que se ven. */
  readonly kind: 'top' | 'east' | 'south';
  readonly terrain: Terrain;
  /** Talud del tile, o `NO_RAMP`. Solo lo usa la cima. */
  readonly rampDir: number;
  /** Altura a la que se ancla el sprite, en niveles. */
  readonly anchorHeight: number;
  /** Caja que ocupa en pantalla, para poder razonar sobre solapes. */
  readonly box: Box;
  /** Alturas del borde de las caras. Vacio en una cima. */
  readonly face: ReliefFace | null;
}

/** Profundidad de una pieza. Es lo unico que decide quien tapa a quien. */
export function depthOfPiece(piece: GroundPiece): number {
  return piece.wx + piece.wy;
}

function boxOf(points: ReadonlyArray<{ x: number; y: number }>): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1 };
}

/** Las cuatro esquinas de la cima de un tile, ya en pantalla. */
function topCorners(wx: number, wy: number, level: number, rampDir: number) {
  const o = worldToScreen(wx, wy);
  const heights = [
    groundHeight(level, rampDir, 0, 0),
    groundHeight(level, rampDir, 1, 0),
    groundHeight(level, rampDir, 1, 1),
    groundHeight(level, rampDir, 0, 1),
  ];
  return heights.map((h, i) => ({
    x: o.x + TILE_DIAMOND[i].x,
    y: o.y + TILE_DIAMOND[i].y + heightOffset(h),
    h,
  }));
}

/** Las cuatro esquinas del cuadrilatero de una cara, ya en pantalla. */
function faceCorners(face: ReliefFace) {
  const o = worldToScreen(face.wx, face.wy);
  // La cara este cuelga del borde E-S; la sur, del borde O-S.
  const near = face.side === 'east' ? { x: TILE_W / 2, y: TILE_H / 2 } : { x: -TILE_W / 2, y: TILE_H / 2 };
  const far = { x: 0, y: TILE_H };
  return [
    { x: o.x + near.x, y: o.y + near.y + heightOffset(face.top0) },
    { x: o.x + far.x, y: o.y + far.y + heightOffset(face.top1) },
    { x: o.x + far.x, y: o.y + far.y + heightOffset(face.bottom1) },
    { x: o.x + near.x, y: o.y + near.y + heightOffset(face.bottom0) },
  ];
}

/**
 * Todas las piezas de terreno de un chunk, **en orden de dibujado**.
 *
 * El orden es por `wx + wy` creciente, y dentro de un tile la cima va antes que
 * sus costados porque los costados cuelgan por delante de ella. Dos piezas de la
 * misma antidiagonal no llegan a tocarse nunca —caen en columnas distintas de la
 * pantalla—, asi que dentro de una antidiagonal el orden da igual, y eso es lo
 * que permite meterlas en un contenedor por fila y ordenar solo las filas.
 */
export function groundPieces(world: World, chunk: Chunk, bounds?: TileBounds): GroundPiece[] {
  const pieces: GroundPiece[] = [];
  const baseX = chunk.cx * CHUNK_SIZE;
  const baseY = chunk.cy * CHUNK_SIZE;
  const x0 = bounds?.x0 ?? 0;
  const y0 = bounds?.y0 ?? 0;
  const x1 = bounds?.x1 ?? CHUNK_SIZE;
  const y1 = bounds?.y1 ?? CHUNK_SIZE;

  const facesByTile = new Map<string, ReliefFace[]>();
  for (const face of collectFaces(world, chunk, bounds)) {
    const key = `${face.wx},${face.wy}`;
    const list = facesByTile.get(key);
    if (list) list.push(face);
    else facesByTile.set(key, [face]);
  }

  // Recorrido por antidiagonales: es el orden de dibujado y ademas deja las
  // piezas ya agrupadas por profundidad, que es como las consume el renderizador.
  for (let sum = x0 + y0; sum <= x1 + y1 - 2; sum++) {
    for (let lx = Math.max(x0, sum - y1 + 1); lx < x1 && lx <= sum - y0; lx++) {
      const ly = sum - lx;
      const idx = ly * CHUNK_SIZE + lx;
      const wx = baseX + lx;
      const wy = baseY + ly;
      const level = chunk.level[idx];
      const rampDir = chunk.rampDir[idx];
      const terrain = chunk.terrain[idx] as Terrain;

      const corners = topCorners(wx, wy, level, rampDir);
      pieces.push({
        wx,
        wy,
        kind: 'top',
        terrain,
        rampDir,
        anchorHeight: Math.max(...corners.map((c) => c.h)),
        box: boxOf(corners),
        face: null,
      });

      for (const face of facesByTile.get(`${wx},${wy}`) ?? []) {
        pieces.push({
          wx,
          wy,
          kind: face.side,
          terrain: face.terrain,
          rampDir,
          anchorHeight: face.top0,
          box: boxOf(faceCorners(face)),
          face,
        });
      }
    }
  }

  return pieces;
}

/** True si dos cajas comparten algun pixel. */
export function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}
