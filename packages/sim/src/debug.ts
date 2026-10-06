/**
 * Utilidades de verificacion. Viven en el nucleo para que los tests headless
 * puedan comprobar el mundo sin dibujar nada.
 */

import { canClimbTo, VOXELS_PER_TILE } from './relief.js';
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
  // Por columnas de 0,5, contando el area en casillas (cuatro columnas cada una).
  const ox = sx * VOXELS_PER_TILE;
  const oy = sy * VOXELS_PER_TILE;
  const h = half * VOXELS_PER_TILE;
  const seen = new Set<number>();
  const stack: Array<[number, number]> = [[ox, oy]];
  let reached = 0;
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < ox - h || x >= ox + h || y < oy - h || y >= oy + h) continue;
    const key = (x - ox + h) * 4096 + (y - oy + h);
    if (seen.has(key)) continue;
    seen.add(key);
    if (world.isSolidAt(Math.floor(x / VOXELS_PER_TILE), Math.floor(y / VOXELS_PER_TILE))) continue;
    reached++;
    // La altura estorba desde la fase 2, asi que este recorrido tiene que
    // obedecerla: antes inundaba mirando solo los solidos y desde que una pared
    // detiene el paso eso dejo de medir lo que el jugador puede recorrer. El
    // presupuesto de conectividad del relieve se fijo con la version vieja, asi
    // que las cifras de antes y las de ahora **no son comparables**.
    const height = world.columnTop(x, y);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
      if (canClimbTo(height, world.columnTop(nx, ny))) stack.push([nx, ny]);
    }
  }
  return Math.floor(reached / (VOXELS_PER_TILE * VOXELS_PER_TILE));
}
