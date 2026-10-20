/**
 * La formacion de una mena (el autor, 2026-10-20): **ocho voxeles de 0,5 en
 * tres niveles**: uno abajo, el 2 × 2 en medio y tres arriba. Los dos primeros
 * sustituyen terreno; el de arriba queda encima. Cada voxel se golpea y se
 * rompe solo, como el terreno.
 *
 * Modulo propio y sin dependencias cruzadas, como `relief.ts`: lo usan el
 * generador, el mundo y el cliente.
 *
 * Las alturas van desde la **base** de la mena: la columna mas baja de su
 * casilla, tal como la dio el relieve. El nivel de arriba empieza ahi; el del
 * medio, un voxel por debajo, y el de abajo, dos. Que voxel falta arriba y cual
 * va abajo sale de la casilla y la semilla (regla 2; *deduccion*, como el giro
 * de la roca).
 */

import { Feature } from '@verdant/shared';
import { hash2D } from './rng.js';

/** Un voxel de la formacion: [este, sur, altura desde la base], en voxeles. */
export type OreVoxel = readonly [number, number, number];

/** La sal de la semilla de la forma: que voxel falta arriba y cual va abajo. */
const ORE_SALT = 0x0e5f0a7;

/** Sin mena en la casilla: lo que guarda `oreBase` del chunk. */
export const NO_ORE = -32768;

/** Si la feature es una mena: carbon, cobre o hierro. */
export function isOre(feature: Feature): boolean {
  return feature === Feature.CoalNode || feature === Feature.CopperNode || feature === Feature.IronNode;
}

/** La formacion de la mena de la casilla (`tx`, `ty`): sus ocho voxeles. */
export function oreFormation(seed: number, tx: number, ty: number): OreVoxel[] {
  const h = hash2D(seed ^ ORE_SALT, tx, ty);
  const missing = h & 3;
  const bottom = (h >>> 2) & 3;
  const corner = (c: number): [number, number] => [c & 1, c >> 1];
  const out: OreVoxel[] = [[...corner(bottom), -2]];
  for (let c = 0; c < 4; c++) out.push([...corner(c), -1]);
  for (let c = 0; c < 4; c++) if (c !== missing) out.push([...corner(c), 0]);
  return out;
}

/** Si (`e`, `s`) ∈ {0, 1}² lleva voxel en el nivel de arriba de la formacion. */
export function oreOnTop(seed: number, tx: number, ty: number, e: number, s: number): boolean {
  return (hash2D(seed ^ ORE_SALT, tx, ty) & 3) !== e + 2 * s;
}
