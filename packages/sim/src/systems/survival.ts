/**
 * Bucle basico de supervivencia: el hambre baja siempre; si llega a cero la
 * salud empieza a caer, y con hambre alta la salud se regenera despacio.
 *
 * **El hambre gasta segun el esfuerzo** (decision del autor, 2026-09-30):
 * quieto o andando se vacia en dos dias de juego (fue uno hasta el 2026-10-01);
 * corriendo, mas deprisa en la misma proporcion en que se corre mas deprisa; y
 * cada salto cuesta un 0,25 % (fue un 1 % y luego un 0,5 %).
 */

import { DAY_TICKS, TICK_DT } from '@verdant/shared';
import type { EntityStore } from '../entities.js';

/**
 * Dias de juego en que se vacia el hambre llena, quieto o andando. Numero del
 * autor. El ritmo se deriva de `DAY_TICKS`, asi que si un dia cambia de
 * duracion el hambre la sigue sola.
 */
export const HUNGER_EMPTY_DAYS = 2;

/** Puntos de hambre perdidos por segundo, quieto o andando (de 100). */
export const HUNGER_DECAY_PER_SEC = 100 / (HUNGER_EMPTY_DAYS * DAY_TICKS * TICK_DT);

/**
 * Lo que cuesta cada salto, tambien el automatico: el 0,25 % del hambre total,
 * numero del autor.
 */
export const JUMP_HUNGER = 0.25;

/** Cobra un salto que ha despegado. Nunca baja de cero. */
export function spendJump(store: EntityStore, id: number): void {
  store.hunger[id] = Math.max(0, store.hunger[id] - JUMP_HUNGER);
}
/** Danio por segundo con el hambre a cero. */
export const STARVE_DAMAGE_PER_SEC = 2.0;
/** Regeneracion por segundo cuando se esta bien alimentado. */
export const REGEN_PER_SEC = 0.4;
export const WELL_FED_THRESHOLD = 60;

/**
 * `effort` multiplica el gasto de hambre: 1 quieto o andando, y
 * `RUN_MULTIPLIER` corriendo y desplazandose (lo decide el tick).
 */
export function updateSurvival(store: EntityStore, id: number, dt: number, effort = 1): void {
  if (!store.alive[id]) return;

  store.hunger[id] = Math.max(0, store.hunger[id] - HUNGER_DECAY_PER_SEC * effort * dt);

  if (store.hunger[id] <= 0) {
    store.health[id] -= STARVE_DAMAGE_PER_SEC * dt;
  } else if (store.hunger[id] >= WELL_FED_THRESHOLD && store.health[id] < 100) {
    store.health[id] = Math.min(100, store.health[id] + REGEN_PER_SEC * dt);
  }

  if (store.health[id] <= 0) {
    store.health[id] = 0;
    store.alive[id] = 0;
  }
}
