/**
 * Las caras verticales del relieve: paredes y costados de talud.
 *
 * Puro, sin DOM ni PixiJS, como `biome-edges.ts` y `projection.ts`, para poder
 * comprobar la geometria en Node. El renderizador solo convierte esta lista en
 * sprites.
 *
 * En isometrica un tile solo ensena dos de sus cuatro costados: el que da al
 * este y el que da al sur. Los otros dos quedan tapados por el propio tile, asi
 * que dibujarlos seria pagar el doble por nada.
 */

import { CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { groundHeight, localCoord, type Chunk, type World } from '@verdant/sim';

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
export function collectFaces(world: World, chunk: Chunk): ReliefFace[] {
  const faces: ReliefFace[] = [];
  const baseX = chunk.cx * CHUNK_SIZE;
  const baseY = chunk.cy * CHUNK_SIZE;

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const idx = ly * CHUNK_SIZE + lx;
      const wx = baseX + lx;
      const wy = baseY + ly;
      const level = chunk.level[idx];
      const ramp = chunk.rampDir[idx];
      const terrain = chunk.terrain[idx] as Terrain;

      // Cara este: el borde que va de la esquina E a la S, compartido con el
      // tile de x+1. Nuestras esquinas E y S son las N y O del vecino.
      push(
        faces,
        wx,
        wy,
        'east',
        terrain,
        groundHeight(level, ramp, 1, 0),
        groundHeight(level, ramp, 1, 1),
        cornerAt(world, chunk, wx + 1, wy, 0, 0),
        cornerAt(world, chunk, wx + 1, wy, 0, 1),
      );

      // Cara sur: el borde de la esquina O a la S, compartido con el tile de
      // y+1. Nuestras esquinas O y S son las N y E del vecino.
      push(
        faces,
        wx,
        wy,
        'south',
        terrain,
        groundHeight(level, ramp, 0, 1),
        groundHeight(level, ramp, 1, 1),
        cornerAt(world, chunk, wx, wy + 1, 0, 0),
        cornerAt(world, chunk, wx, wy + 1, 1, 0),
      );
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
