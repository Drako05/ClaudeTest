/**
 * El auto salto (decision del autor, 2026-09-30; boton del movil).
 *
 * > «si mientras te estas desplazando te encuentras con un bloque justo en tu
 * > trayectoria y no te detienes, entonces el personaje salta automaticamente
 * > justo antes de chocar para subir sobre el de forma fluida»
 *
 * Y solo si se puede: no si el bloque es mas alto que el salto, ni si son
 * varios apilados que juntos pasan de el.
 *
 * Va aparte de `jump.ts` y `movement.ts` porque necesita de los dos, y el
 * primero ya lo importa el segundo.
 */

import { TICK_DT } from '@verdant/shared';
import { BODY_RADIUS, squareFloor } from '../boxes.js';
import type { EntityStore } from '../entities.js';
import type { World } from '../world.js';
import { GRAVITY, JUMP_SPEED, STEP_UP } from './jump.js';
import { collides, speedOf } from './movement.js';

/** Lo mas alto que suben los pies de un salto: el apice, ~1,16 niveles. */
export const JUMP_HEIGHT = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);

/** Cada cuanto se mira el suelo por delante, en casillas. */
const PROBE_STEP = 0.05;

/**
 * Cuanto tardan los pies en subir `rise` niveles desde el despegue: la raiz
 * de subida de `z = v0·t − g·t²/2`. Sin solucion por encima del apice.
 */
export function riseTime(rise: number): number {
  const d = JUMP_SPEED * JUMP_SPEED - 2 * GRAVITY * rise;
  if (d < 0) return Infinity;
  return (JUMP_SPEED - Math.sqrt(d)) / GRAVITY;
}

/**
 * Si toca saltar solo en este tick.
 *
 * Se recorre la linea de avance del cuerpo midiendo con su **huella entera**,
 * que es lo que mira la colision (`blocked` en `movement.ts`), y decide el
 * primer punto que estorbaria andando:
 *
 * - si es algo solido —agua, un tronco—, no se salta: no hay nada que subir;
 * - si es suelo que sube mas de `STEP_UP`, es el bloque. Se salta si cabe en el
 *   salto (estaciones incluidas: una mesa sobre un escalon suma dos) y si esta
 *   **justo a la distancia** que se recorre mientras los pies pasan de su
 *   borde. Asi se llega por encima y no se roza la cara: es lo «fluido».
 *
 * Una escalera de medio bloque se anda (lo que mide <= 0,5 se sube andando),
 * asi que no hace saltar: el sondeo la sigue escalon a escalon, y lo que decide
 * es el primer punto que sube mas de `STEP_UP` **sobre el escalon anterior**.
 */
export function autoJumpDue(
  world: World,
  store: EntityStore,
  id: number,
  moveX: number,
  moveY: number,
  running: boolean,
): boolean {
  if (!store.grounded[id]) return false;
  const len = Math.hypot(moveX, moveY);
  if (len <= 1e-6) return false;
  const dirX = moveX / len;
  const dirY = moveY / len;
  const speed = speedOf(running);
  const feet = store.z[id];
  // Mas alla de esto ni el bloque mas alto que se sube pide saltar ya.
  const reach = speed * (riseTime(JUMP_HEIGHT) + TICK_DT);

  let walked = feet;
  for (let s = PROBE_STEP; s <= reach + PROBE_STEP; s += PROBE_STEP) {
    const px = store.x[id] + dirX * s;
    const py = store.y[id] + dirY * s;
    if (collides(world, px, py)) return false;
    const floor = squareFloor(world, px, py, BODY_RADIUS);
    if (floor - walked <= STEP_UP) {
      // Se llega andando: el siguiente escalon se mide desde este.
      walked = floor;
      continue;
    }
    // El primer punto que estorba decide: o se sube de un salto desde aqui, o
    // nada (si hay que subir antes un escalon, se saltara desde el).
    if (walked !== feet) return false;
    const rise = floor - feet;
    if (rise > JUMP_HEIGHT) return false;
    // Un tick de mas de anticipacion: se decide despues de haber andado el de
    // ahora, y el sondeo encuentra el borde con un paso de retraso. Sin el, a
    // paso de marcha se rozaba la cara un tick.
    return s <= speed * (riseTime(rise) + TICK_DT) + PROBE_STEP;
  }
  return false;
}
