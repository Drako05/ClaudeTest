/**
 * Conversiones entre coordenadas de mundo y de chunk.
 *
 * Vive en su propio modulo, sin dependencias, a proposito: `world.ts` necesita a
 * `biome.ts` para agregar estadisticas y `biome.ts` necesita estas funciones. Si
 * estuvieran en `world.ts` habria un ciclo de importacion real, que en los tests
 * pasa desapercibido pero rompe el bundle del navegador con un error de acceso
 * antes de inicializar.
 */

import { CHUNK_MASK, CHUNK_SHIFT } from '@verdant/shared';

/** Division entera hacia abajo, correcta tambien para negativos. */
export function toChunkCoord(worldCoord: number): number {
  return worldCoord >> CHUNK_SHIFT;
}

export function localCoord(worldCoord: number): number {
  return worldCoord & CHUNK_MASK;
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}
