/**
 * Utilidades de verificacion. Viven en el nucleo para que los tests headless
 * puedan comprobar el mundo sin dibujar nada.
 */

import type { World } from './world.js';
import type { WorldGen } from './worldgen.js';
import { generateChunk } from './worldgen.js';

/**
 * Hash FNV-1a de una region rectangular de chunks. Dos mundos con la misma
 * semilla deben dar el mismo hash; con semillas distintas, casi seguro distinto.
 */
export function hashRegion(
  gen: WorldGen,
  cx0: number,
  cy0: number,
  cx1: number,
  cy1: number,
): number {
  let h = 0x811c9dc5;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const chunk = generateChunk(gen, cx, cy);
      for (let i = 0; i < chunk.terrain.length; i++) {
        h ^= chunk.terrain[i];
        h = Math.imul(h, 0x01000193);
        h ^= chunk.feature[i];
        h = Math.imul(h, 0x01000193);
      }
    }
  }
  return h >>> 0;
}

/**
 * Numero de tiles alcanzables a pie desde un punto, dentro de una ventana.
 *
 * Se mide en area absoluta y no en porcentaje del terreno libre a proposito:
 * que haya islas o cordilleras inaccesibles es correcto en un mundo de
 * supervivencia. Lo que seria un fallo es que el jugador aparezca encerrado en
 * un bolsillo diminuto, y eso es justo lo que este numero detecta.
 */
export function reachableArea(world: World, sx: number, sy: number, half = 100): number {
  const seen = new Set<string>();
  const stack: Array<[number, number]> = [[sx, sy]];
  let reached = 0;
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < sx - half || x >= sx + half || y < sy - half || y >= sy + half) continue;
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (world.isSolidAt(x, y)) continue;
    reached++;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return reached;
}
