/**
 * Utilidades de verificacion. Viven en el nucleo para que los tests headless
 * puedan comprobar el mundo sin dibujar nada.
 */

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
