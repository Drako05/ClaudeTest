/**
 * Bucle basico de supervivencia: el hambre baja siempre; si llega a cero la
 * salud empieza a caer, y con hambre alta la salud se regenera despacio.
 */

import type { EntityStore } from '../entities.js';

/** Puntos de hambre perdidos por segundo. */
export const HUNGER_DECAY_PER_SEC = 0.55;
/** Danio por segundo con el hambre a cero. */
export const STARVE_DAMAGE_PER_SEC = 2.0;
/** Regeneracion por segundo cuando se esta bien alimentado. */
export const REGEN_PER_SEC = 0.4;
export const WELL_FED_THRESHOLD = 60;

export function updateSurvival(store: EntityStore, id: number, dt: number): void {
  if (!store.alive[id]) return;

  store.hunger[id] = Math.max(0, store.hunger[id] - HUNGER_DECAY_PER_SEC * dt);

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
