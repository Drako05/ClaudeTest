/**
 * El cuerpo de un animal en el mundo: sus partes `hit` (`fauna-body.ts`)
 * puestas en su sitio y giradas con su rumbo, y si caben en el terreno.
 *
 * Decision del autor (2026-10-03): **el cuerpo choca con las cajas de sus
 * partes**, que giran con el rumbo, y no puede meterse en un bloque solido; un
 * bisonte no cabe por un pasillo de un bloque, y si al girar su cabeza entrara
 * en una pared, no gira. Desde el 2026-10-05 (el autor) llevan caja la cabeza,
 * el cuello, las **extremidades** y el tronco; lo pequeno o fino —cuernos,
 * colas cortas, alas recogidas, las patas de la gaviota y del cangrejo— no.
 *
 * **Las cajas de los objetos** (`boxes.ts`: el tronco del arbol, la roca, los
 * minerales, las estaciones) estorban a una parte que solapan en planta si
 * su techo pasa de la base de la parte y su pie no queda por encima de ella:
 * la cabeza de un bisonte pasa por encima de una roca, sus patas no.
 *
 * **Un escalon estorba a cada parte** (la regla 21 extendida a las partes,
 * *mi deduccion*): una casilla estorba a una parte si entre ella y la casilla
 * vecina hacia los pies hay un escalon —su suelo mas bajo pasa de `STEP_UP`
 * sobre el mas alto de la vecina— y ese suelo queda por encima de la base de
 * la parte. Una rampa no tiene escalon: deja pasar, aunque un cuerpo que no se
 * inclina asome sobre su pendiente; un escalon de un nivel no deja meter una
 * cabeza. Los pies siguen con su regla del centro y `STEP_UP` (`movement.ts`).
 *
 * Coordenadas del nucleo: `x`, `y` en el suelo y `z` hacia arriba.
 */

import { columnTopIn, overlapsSquare, solidBox, terrainSolid, type OrientedBox } from './boxes.js';
import { VOXEL, voxelOf } from './relief.js';
import { STEP_UP } from './systems/jump.js';
import type { World } from './world.js';

export { bodyBoxes, groundRound, type OrientedBox } from './boxes.js';

/**
 * Si la columna de 0,5 (`vx`, `vy`) tiene un escalon que la separa de su vecina
 * hacia los pies (`feetX`, `feetY`), la altura de su techo; si no, `-Infinity`.
 * La columna de los pies no tiene escalon hacia si misma. Un medio bloque no es
 * escalon: se sube andando.
 */
function stepTop(world: World, vx: number, vy: number, feetX: number, feetY: number): number {
  const fvx = voxelOf(feetX);
  const fvy = voxelOf(feetY);
  if (vx === fvx && vy === fvy) return -Infinity;
  const dx = fvx - vx;
  const dy = fvy - vy;
  const [nx, ny] = Math.abs(dx) >= Math.abs(dy) ? [vx + Math.sign(dx), vy] : [vx, vy + Math.sign(dy)];
  const top = columnTopIn(world, vx, vy);
  return top - columnTopIn(world, nx, ny) > STEP_UP ? top : -Infinity;
}

/**
 * Cuantas veces se mete el cuerpo en el terreno: un punto por cada (parte,
 * casilla) en que la casilla es agua o tiene un objeto cuya caja la estorba, y
 * por cada (parte, columna de 0,5) con un escalon hacia los pies en
 * (`feetX`, `feetY`) que pasa de la base de la parte. Cero es que cabe. Dentro
 * de una ronda (`groundRound`), cada casilla y cada columna se leen una vez.
 */
export function bodyClashes(world: World, boxes: readonly OrientedBox[], feetX: number, feetY: number): number {
  let clashes = 0;
  for (const b of boxes) {
    const rx = b.hl * Math.abs(b.ux) + b.hw * Math.abs(b.uy);
    const ry = b.hl * Math.abs(b.uy) + b.hw * Math.abs(b.ux);
    const base = b.cz - b.hh;
    const top = b.cz + b.hh;
    for (let vy = voxelOf(b.cy - ry); vy <= voxelOf(b.cy + ry); vy++) {
      for (let vx = voxelOf(b.cx - rx); vx <= voxelOf(b.cx + rx); vx++) {
        if (!overlapsSquare(b, (vx + 0.5) * VOXEL, (vy + 0.5) * VOXEL, VOXEL / 2)) continue;
        if (stepTop(world, vx, vy, feetX, feetY) > base + 1e-6) clashes++;
      }
    }
    for (let ty = Math.floor(b.cy - ry); ty <= Math.floor(b.cy + ry); ty++) {
      for (let tx = Math.floor(b.cx - rx); tx <= Math.floor(b.cx + rx); tx++) {
        if (!overlapsSquare(b, tx + 0.5, ty + 0.5, 0.5)) continue;
        if (terrainSolid(world, tx, ty)) {
          clashes++;
          continue;
        }
        const o = solidBox(world, tx, ty);
        if (
          o &&
          o.z1 > base + 1e-6 &&
          o.z0 < top &&
          overlapsSquare(b, (o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2, (o.x1 - o.x0) / 2)
        ) {
          clashes++;
        }
      }
    }
  }
  return clashes;
}
