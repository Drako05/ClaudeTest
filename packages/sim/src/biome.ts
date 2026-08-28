/**
 * Los biomas como unidad que se puede contar y equilibrar.
 *
 * Un bioma es el conjunto CONEXO de chunks que **contienen** tiles suyos,
 * recorrido por inundacion y solo sobre los chunks ya generados.
 *
 * Que el criterio sea "contiene" y no "su terreno predominante es" es lo que
 * hace que la mancha siga la forma real del bosque en vez de la rejilla de
 * chunks. Con el criterio anterior, un chunk mitad bosque mitad pradera se
 * asignaba entero a uno de los dos y el panel podia anunciar un bioma distinto
 * del suelo que pisaba el jugador.
 *
 * Solo cuenta lo ya generado: el resto del bosque, aunque todavia no exista, se
 * asume en equilibrio. Por eso al jugador no se le muestran cantidades absolutas
 * sino barras relativas al equilibrio con el que nacio la zona.
 */

import {
  BiomeKind,
  LIFE_KIND_COUNT,
  LIVING_KINDS,
  withinEquilibrium,
} from '@verdant/shared';
import { chunkKey } from './coords.js';
import type { World } from './world.js';

export interface BiomeStats {
  readonly kind: BiomeKind;
  /** Chunks generados que contienen este bioma. */
  readonly chunks: number;
  /** Vida que deberia haber, sumada sobre esos chunks. */
  readonly reference: Float64Array;
  /** Vida que hay ahora mismo. */
  readonly count: Int32Array;
  /** Chunks saturados por encima de su tope de densidad. */
  readonly overcrowded: number;
  /** True si todo esta en rango y ningun chunk esta saturado. */
  readonly balanced: boolean;
  /** Se alcanzo el tope del recorrido: las cuentas son de una parte del bioma. */
  readonly truncated: boolean;
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Recorre la mancha del bioma indicado y suma sus estadisticas.
 *
 * El recorrido se acota a `maxChunks` para que el coste no crezca sin limite en
 * una partida larga: un bosque explorado durante horas podria abarcar miles de
 * chunks y recorrerlos entero cada vez seria inviable.
 */
export function collectBiome(
  world: World,
  originCx: number,
  originCy: number,
  kind: BiomeKind,
  maxChunks: number,
): BiomeStats {
  const reference = new Float64Array(LIFE_KIND_COUNT);
  const count = new Int32Array(LIFE_KIND_COUNT);

  const seen = new Set<string>();
  const queue: Array<[number, number]> = [];
  let visited = 0;
  let overcrowded = 0;
  let truncated = false;

  if (world.hasBiome(originCx, originCy, kind)) {
    queue.push([originCx, originCy]);
    seen.add(chunkKey(originCx, originCy));
  }

  while (queue.length > 0) {
    if (visited >= maxChunks) {
      truncated = true;
      break;
    }
    const [cx, cy] = queue.pop()!;
    visited++;

    for (const life of LIVING_KINDS) {
      reference[life] += world.referenceOf(cx, cy, kind, life);
      count[life] += world.countOf(cx, cy, kind, life);
    }
    if (world.isChunkOvercrowded(cx, cy, kind)) overcrowded++;

    for (const [dx, dy] of NEIGHBOURS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = chunkKey(nx, ny);
      if (seen.has(key)) continue;
      // Solo lo ya generado cuenta, y solo si contiene este bioma.
      if (!world.isTracked(nx, ny)) continue;
      if (!world.hasBiome(nx, ny, kind)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }

  let balanced = overcrowded === 0;
  if (balanced) {
    for (const life of LIVING_KINDS) {
      if (!withinEquilibrium(count[life], reference[life])) {
        balanced = false;
        break;
      }
    }
  }

  return { kind, chunks: visited, reference, count, overcrowded, balanced, truncated };
}
