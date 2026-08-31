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
import { groundHeight, NO_RAMP, type Chunk, type World } from '@verdant/sim';
import { collectFaces, worldCorner, type ReliefFace, type TileBounds } from './relief-faces.js';
import {
  depthOf,
  heightOffset,
  TILE_DIAMOND,
  TILE_H,
  TILE_W,
  toWorldSpace,
  worldToScreen,
} from './projection.js';

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
  /**
   * `top` es la cara de arriba y `east`/`south` los dos costados que se ven.
   *
   * `backEast` y `backWest` son las dos aristas TRASERAS: las que no llevan cara
   * porque el propio tile las tapa. Ahi no se dibuja el bloque —no se ve— pero si
   * su filo iluminado y la sombra que proyecta, que es lo unico que delata la
   * altura cuando se mira un escalon por detras.
   */
  readonly kind: 'top' | 'east' | 'south' | 'backEast' | 'backWest';
  readonly terrain: Terrain;
  /** Talud del tile, o `NO_RAMP`. Solo lo usa la cima. */
  readonly rampDir: number;
  /** Altura a la que se ancla el sprite, en niveles. */
  readonly anchorHeight: number;
  /** Cuanto cae cada esquina del rombo bajo la de anclaje. Solo en la cima. */
  readonly corners: readonly [number, number, number, number];
  /** Desnivel que delata una arista trasera, en niveles. Solo en las senales. */
  readonly drop: number;
  /** Caja que ocupa en pantalla, para poder razonar sobre solapes. */
  readonly box: Box;
  /** Alturas del borde de las caras. Vacio en una cima. */
  readonly face: ReliefFace | null;
}

/** Desnivel maximo que dibuja una senal de arista trasera. */
export const MAX_CUE_DROP = 3;

/**
 * Profundidad de una pieza. Es lo unico que decide quien tapa a quien.
 *
 * Pasa por `depthOf`, que rota con la camara. Sumar `wx + wy` a pelo funciona en
 * la vista 0 y manda cada pieza a la fila equivocada en las otras tres.
 */
export function depthOfPiece(piece: GroundPiece): number {
  return depthOf(piece.wx, piece.wy);
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

/**
 * Las cuatro esquinas de la cima de un tile, ya en pantalla.
 *
 * `TILE_DIAMOND` va en orden de PANTALLA —norte, este, sur, oeste—, y cual de
 * las esquinas del mundo cae en cada sitio depende de la vista. Por eso la altura
 * se pide con `worldCorner`, que hace esa traduccion.
 */
function topCorners(wx: number, wy: number, level: number, rampDir: number) {
  const o = worldToScreen(wx, wy);
  return [0, 1, 2, 3].map((i) => {
    const c = worldCorner(...([[0, 0], [1, 0], [1, 1], [0, 1]][i] as [number, number]));
    const h = groundHeight(level, rampDir, c.fx, c.fy);
    return {
      x: o.x + TILE_DIAMOND[i].x,
      y: o.y + TILE_DIAMOND[i].y + heightOffset(h),
      h,
    };
  });
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

  // Los dos vecinos que quedan DETRAS en la vista actual: los de las aristas sin
  // cara. De ellos salen las senales de altura.
  const behind = { backEast: toWorldSpace(0, -1), backWest: toWorldSpace(-1, 0) } as const;

  for (let ly = y0; ly < y1; ly++) {
    for (let lx = x0; lx < x1; lx++) {
      const idx = ly * CHUNK_SIZE + lx;
      const wx = baseX + lx;
      const wy = baseY + ly;
      const level = chunk.level[idx];
      const rampDir = chunk.rampDir[idx];
      const terrain = chunk.terrain[idx] as Terrain;

      const corners = topCorners(wx, wy, level, rampDir);
      const anchorHeight = Math.max(...corners.map((c) => c.h));
      pieces.push({
        wx,
        wy,
        kind: 'top',
        terrain,
        rampDir,
        anchorHeight,
        corners: [
          anchorHeight - corners[0].h,
          anchorHeight - corners[1].h,
          anchorHeight - corners[2].h,
          anchorHeight - corners[3].h,
        ],
        drop: 0,
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
          corners: FLAT,
          drop: 0,
          box: boxOf(faceCorners(face)),
          face,
        });
      }

      // Las senales de las aristas traseras. Solo en tiles planos: un talud ya se
      // lee como cuesta, y su borde de atras es por donde sube, que es otra cosa.
      if (rampDir !== NO_RAMP || level < 0) continue;
      for (const kind of ['backEast', 'backWest'] as const) {
        const d = behind[kind];
        const theirs = neighbourEdgeHeight(world, chunk, wx + d.x, wy + d.y, kind);
        const drop = Math.min(MAX_CUE_DROP, level - theirs);
        if (drop <= 0) continue;
        pieces.push({
          wx,
          wy,
          kind,
          terrain,
          rampDir,
          anchorHeight: level,
          corners: FLAT,
          drop,
          box: cueBox(wx, wy, kind, level, drop),
          face: null,
        });
      }
    }
  }

  // Por profundidad, que es el orden de dibujado. La ordenacion de JavaScript es
  // estable, asi que dentro de un tile se conserva cima, costados y senales, que
  // es el orden en que tienen que ir: los costados cuelgan por delante de la cima
  // y las senales se pintan sobre el terreno de detras.
  pieces.sort((a, b) => depthOf(a.wx, a.wy) - depthOf(b.wx, b.wy));
  return pieces;
}

const FLAT: readonly [number, number, number, number] = [0, 0, 0, 0];

/** Altura del vecino de detras en la arista que comparten. */
function neighbourEdgeHeight(
  world: World,
  chunk: Chunk,
  nx: number,
  ny: number,
  kind: 'backEast' | 'backWest',
): number {
  // Nuestra arista trasera este va de la esquina N a la E; la suya, de la O a la
  // S. La trasera oeste va de la N a la O, y la suya de la E a la S.
  const theirs = kind === 'backEast' ? worldCorner(0, 1) : worldCorner(1, 0);
  const inside =
    nx >= chunk.cx * CHUNK_SIZE &&
    nx < (chunk.cx + 1) * CHUNK_SIZE &&
    ny >= chunk.cy * CHUNK_SIZE &&
    ny < (chunk.cy + 1) * CHUNK_SIZE;
  if (inside) {
    const lx = nx - chunk.cx * CHUNK_SIZE;
    const ly = ny - chunk.cy * CHUNK_SIZE;
    const idx = ly * CHUNK_SIZE + lx;
    return groundHeight(chunk.level[idx], chunk.rampDir[idx], theirs.fx, theirs.fy);
  }
  return groundHeight(world.gen.levelAt(nx, ny), world.gen.rampDirAt(nx, ny), theirs.fx, theirs.fy);
}

/** Caja de una senal de arista trasera: la arista y la sombra que sube de ella. */
function cueBox(wx: number, wy: number, kind: 'backEast' | 'backWest', level: number, drop: number): Box {
  const o = worldToScreen(wx, wy);
  const lift = heightOffset(level);
  const far = kind === 'backEast' ? TILE_DIAMOND[1] : TILE_DIAMOND[3];
  const shade = drop * -heightOffset(1);
  return boxOf([
    { x: o.x, y: o.y + lift - shade },
    { x: o.x + far.x, y: o.y + far.y + lift - shade },
    { x: o.x + far.x, y: o.y + far.y + lift },
    { x: o.x, y: o.y + lift },
  ]);
}

/** True si dos cajas comparten algun pixel. */
export function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}
