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
 * Y desde el 2026-10-10, **todas las cajas chocan con el terreno en todo
 * momento** (el autor): cada parte mide su altura de reposo (`partsRest`) —lo
 * mas alto bajo ella, columnas de 0,5 y cajas de objetos, menos lo que esta
 * por encima de los pies—, y estorba si pide subir los pies mas de lo que se
 * sube de golpe. Andando, `STEP_UP`; en el aire, nada. La cabeza de un bisonte
 * pasa por encima de una roca que sus patas no. Hasta entonces el terreno
 * estorbaba a cada parte por una heuristica de escalones hacia los pies.
 *
 * Coordenadas del nucleo: `x`, `y` en el suelo y `z` hacia arriba.
 */

import { overlapsSquare, partsRest, terrainSolid, type OrientedBox } from './boxes.js';
import type { World } from './world.js';

export { bodyBoxes, groundRound, type OrientedBox } from './boxes.js';

/**
 * Cuantas veces se mete el cuerpo, con los pies a `feet`, en el terreno: un
 * punto por cada parte que pediria subir los pies mas de `margin` para caber
 * (`partsRest`), y uno por cada (parte, casilla de agua) que solape. Cero es
 * que cabe. Dentro de una ronda (`groundRound`), cada casilla y cada columna se
 * leen una vez.
 */
export function bodyClashes(world: World, boxes: readonly OrientedBox[], feet: number, margin: number): number {
  let clashes = 0;
  for (const b of boxes) {
    if (partsRest(world, [b], feet) > feet + margin + 1e-6) clashes++;
    const rx = b.hl * Math.abs(b.ux) + b.hw * Math.abs(b.uy);
    const ry = b.hl * Math.abs(b.uy) + b.hw * Math.abs(b.ux);
    for (let ty = Math.floor(b.cy - ry); ty <= Math.floor(b.cy + ry); ty++) {
      for (let tx = Math.floor(b.cx - rx); tx <= Math.floor(b.cx + rx); tx++) {
        if (terrainSolid(world, tx, ty) && overlapsSquare(b, tx + 0.5, ty + 0.5, 0.5)) clashes++;
      }
    }
  }
  return clashes;
}
