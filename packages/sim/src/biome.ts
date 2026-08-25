/**
 * Los biomas como unidad que se puede contar y equilibrar.
 *
 * Un bioma es el conjunto CONEXO de chunks del mismo tipo dominante, recorrido
 * por inundacion y **solo sobre los chunks ya generados**.
 *
 * Eso ultimo no es una limitacion tecnica sino el modelo que quiso el autor: el
 * resto del bosque, aunque todavia no exista, se asume en equilibrio, asi que
 * unicamente lo ya generado puede desviar las cuentas. Por eso al jugador no se
 * le muestran cantidades absolutas —no serian significativas con el bioma a
 * medio generar— sino barras relativas a ese equilibrio inicial.
 */

import {
  BiomeKind,
  LIFE_KIND_COUNT,
  LifeKind,
  withinEquilibrium,
} from '@verdant/shared';
import { chunkKey } from './coords.js';
import type { World } from './world.js';

export interface BiomeStats {
  readonly kind: BiomeKind;
  /** Chunks generados que forman este bioma. */
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

/**
 * Recorre el bioma al que pertenece un chunk y suma sus estadisticas.
 *
 * El recorrido se acota a `maxChunks` para que el coste no crezca sin limite en
 * una partida larga: un bosque explorado durante horas podria abarcar miles de
 * chunks y recorrerlos entero cada vez seria inviable.
 */
export function collectBiome(
  world: World,
  originCx: number,
  originCy: number,
  maxChunks: number,
): BiomeStats {
  const kind = world.biomeKindOf(originCx, originCy);
  const reference = new Float64Array(LIFE_KIND_COUNT);
  const count = new Int32Array(LIFE_KIND_COUNT);

  const seen = new Set<string>();
  const queue: Array<[number, number]> = [[originCx, originCy]];
  seen.add(chunkKey(originCx, originCy));

  let visited = 0;
  let overcrowded = 0;
  let truncated = false;

  while (queue.length > 0) {
    if (visited >= maxChunks) {
      truncated = true;
      break;
    }
    const [cx, cy] = queue.pop()!;
    visited++;

    for (const life of [LifeKind.Tree, LifeKind.Plant]) {
      reference[life] += world.referenceOf(cx, cy, life);
      count[life] += world.countOf(cx, cy, life);
    }
    if (world.isChunkOvercrowded(cx, cy)) overcrowded++;

    for (const [dx, dy] of NEIGHBOURS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = chunkKey(nx, ny);
      if (seen.has(key)) continue;
      // Solo lo ya generado cuenta: el resto se asume en equilibrio.
      if (!world.isTracked(nx, ny)) continue;
      if (world.biomeKindOf(nx, ny) !== kind) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }

  let balanced = overcrowded === 0;
  if (balanced) {
    for (const life of [LifeKind.Tree, LifeKind.Plant]) {
      if (!withinEquilibrium(count[life], reference[life])) {
        balanced = false;
        break;
      }
    }
  }

  return { kind, chunks: visited, reference, count, overcrowded, balanced, truncated };
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
