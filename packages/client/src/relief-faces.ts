/**
 * Las caras verticales del relieve: paredes y costados de talud.
 *
 * Puro, sin DOM ni PixiJS, como `biome-edges.ts` y `projection.ts`, para poder
 * comprobar la geometria en Node. El renderizador solo convierte esta lista en
 * sprites.
 *
 * En isometrica un tile solo ensena dos de sus cuatro costados: los dos que dan
 * a la camara. Los otros dos quedan tapados por el propio tile, asi que
 * dibujarlos seria pagar el doble por nada.
 *
 * Con la camara girable, **cuales son esos dos depende de la vista**. Todo lo de
 * aqui trabaja en ESPACIO DE VISTA —donde siempre son el este y el sur— y solo
 * pasa por la rotacion lo que hace falta: a que vecino del mundo se mira y que
 * esquinas suyas. Asi el codigo que dibuja no se entera de que la camara gira.
 */

import { CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { groundHeight, localCoord, type Chunk, type World } from '@verdant/sim';
import { toWorldSpace } from './projection.js';

/**
 * Rango de tiles LOCALES de un chunk, para poder trabajar por trozos.
 *
 * El recorte de pantalla es por bloques y no por chunk entero: con montanas de
 * cuarenta niveles un chunk puede ocupar mas que la pantalla, asi que darlo por
 * visible entero significa dibujar miles de tiles que no se ven.
 */
export interface TileBounds {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** Una cara pendiente de dibujar. */
export interface ReliefFace {
  /** Tile del que cuelga. */
  readonly wx: number;
  readonly wy: number;
  /** `east` baja hacia la izquierda de la pantalla; `south`, hacia la derecha. */
  readonly side: 'east' | 'south';
  /** Terreno de la cima, que es de donde saca su color. */
  readonly terrain: Terrain;
  /** Alturas del borde de arriba, en el orden cercano-lejano. */
  readonly top0: number;
  readonly top1: number;
  /** Alturas del vecino de abajo, en el mismo orden. */
  readonly bottom0: number;
  readonly bottom1: number;
}

/**
 * La esquina del MUNDO que ocupa una esquina dada del rombo en pantalla.
 *
 * Las cuatro esquinas de un tile son las mismas cuatro; lo que cambia con la
 * vista es cual de ellas cae arriba, cual a la derecha y asi. Se rota alrededor
 * del centro de la casilla, que es lo que mantiene la correspondencia.
 */
export function worldCorner(vx: number, vy: number): { fx: number; fy: number } {
  const w = toWorldSpace(vx - 0.5, vy - 0.5);
  return { fx: w.x + 0.5, fy: w.y + 0.5 };
}

/** Altura del suelo de un tile en una de sus esquinas, sin generar nada nuevo. */
function cornerAt(
  world: World,
  chunk: Chunk,
  wx: number,
  wy: number,
  fx: number,
  fy: number,
): number {
  const inside =
    wx >= chunk.cx * CHUNK_SIZE &&
    wx < (chunk.cx + 1) * CHUNK_SIZE &&
    wy >= chunk.cy * CHUNK_SIZE &&
    wy < (chunk.cy + 1) * CHUNK_SIZE;
  if (inside) {
    const idx = localCoord(wy) * CHUNK_SIZE + localCoord(wx);
    return groundHeight(chunk.level[idx], chunk.rampDir[idx], fx, fy);
  }
  // Fuera del chunk se pregunta al GENERADOR, no al mundo: `world.levelAt`
  // llamaria a `getChunk` y generaria y registraria el chunk vecino, con lo que
  // dibujar alteraria las cuentas de bioma. Es el mismo cuidado que ya tiene
  // `collectBiomeEdges`, y `generateChunk` no es mas que un mapeo tile a tile de
  // estas mismas funciones, asi que ambos coinciden exactamente.
  return groundHeight(world.gen.levelAt(wx, wy), world.gen.rampDirAt(wx, wy), fx, fy);
}

/**
 * Todas las caras visibles de un chunk.
 *
 * La cara existe cuando la cima queda por encima del suelo del vecino en alguno
 * de los dos extremos del borde. Que se comparen los DOS extremos y no los
 * niveles enteros es lo que hace que un talud no deje un escalon fantasma: al
 * subir hacia su vecino alto, sus dos alturas coinciden con las de el y no
 * aparece ninguna cara.
 */
export function collectFaces(world: World, chunk: Chunk, bounds?: TileBounds): ReliefFace[] {
  const faces: ReliefFace[] = [];
  const baseX = chunk.cx * CHUNK_SIZE;
  const baseY = chunk.cy * CHUNK_SIZE;
  const x0 = bounds?.x0 ?? 0;
  const y0 = bounds?.y0 ?? 0;
  const x1 = bounds?.x1 ?? CHUNK_SIZE;
  const y1 = bounds?.y1 ?? CHUNK_SIZE;

  // Los dos vecinos que caen delante en la vista actual, en coordenadas de
  // mundo. En la vista 0 son el de +x y el de +y, los de siempre.
  const ahead = { east: toWorldSpace(1, 0), south: toWorldSpace(0, 1) };
  // Nuestras dos esquinas de cada borde, y las dos del vecino que las tocan.
  // En espacio de vista el borde este va de la esquina E a la S, y el sur de la
  // O a la S; las del vecino son las opuestas.
  const corners = {
    east: [worldCorner(1, 0), worldCorner(1, 1), worldCorner(0, 0), worldCorner(0, 1)],
    south: [worldCorner(0, 1), worldCorner(1, 1), worldCorner(0, 0), worldCorner(1, 0)],
  } as const;

  for (let ly = y0; ly < y1; ly++) {
    for (let lx = x0; lx < x1; lx++) {
      const idx = ly * CHUNK_SIZE + lx;
      const wx = baseX + lx;
      const wy = baseY + ly;
      const level = chunk.level[idx];
      const ramp = chunk.rampDir[idx];
      const terrain = chunk.terrain[idx] as Terrain;

      for (const side of ['east', 'south'] as const) {
        const [near, far, theirNear, theirFar] = corners[side];
        const nx = wx + ahead[side].x;
        const ny = wy + ahead[side].y;
        push(
          faces,
          wx,
          wy,
          side,
          terrain,
          groundHeight(level, ramp, near.fx, near.fy),
          groundHeight(level, ramp, far.fx, far.fy),
          cornerAt(world, chunk, nx, ny, theirNear.fx, theirNear.fy),
          cornerAt(world, chunk, nx, ny, theirFar.fx, theirFar.fy),
        );
      }
    }
  }
  return faces;
}

function push(
  faces: ReliefFace[],
  wx: number,
  wy: number,
  side: 'east' | 'south',
  terrain: Terrain,
  top0: number,
  top1: number,
  rawBottom0: number,
  rawBottom1: number,
): void {
  // El suelo del vecino no puede quedar por encima de la cima en su extremo: si
  // lo estuviera, la cara se cruzaria consigo misma. Ahi sencillamente no hay
  // pared que dibujar por este lado.
  const bottom0 = Math.min(rawBottom0, top0);
  const bottom1 = Math.min(rawBottom1, top1);
  if (top0 <= bottom0 && top1 <= bottom1) return;
  faces.push({ wx, wy, side, terrain, top0, top1, bottom0, bottom1 });
}
