/**
 * Recoleccion: el jugador cosecha el tile que tiene delante.
 */

import { Feature, harvestOf, Resource } from '@verdant/shared';
import type { EntityStore } from '../entities.js';
import type { World } from '../world.js';

/** Alcance en tiles desde el centro del jugador. */
export const REACH = 1.1;
/** Bayas consumidas por comida y hambre que restaura cada una. */
export const BERRIES_PER_MEAL = 1;
export const HUNGER_PER_BERRY = 14;

export interface HarvestResult {
  resource: Resource;
  amount: number;
  tileX: number;
  tileY: number;
}

/** Tile al que apunta la entidad segun su ultima direccion de movimiento. */
export function targetTile(store: EntityStore, id: number): { x: number; y: number } {
  return {
    x: Math.floor(store.x[id] + store.facingX[id] * REACH),
    y: Math.floor(store.y[id] + store.facingY[id] * REACH),
  };
}

/**
 * Intenta recolectar el tile apuntado. Devuelve lo obtenido, o null si no habia
 * nada. Muta el mundo a traves de setFeature, que registra el cambio en el
 * overlay de mutaciones.
 */
export function tryHarvest(
  world: World,
  store: EntityStore,
  id: number,
  inventory: Int32Array,
): HarvestResult | null {
  const { x, y } = targetTile(store, id);
  const feature = world.featureAt(x, y);
  const yield_ = harvestOf(feature);
  if (!yield_) return null;

  world.setFeature(x, y, Feature.None);
  inventory[yield_.resource] += yield_.amount;
  return { resource: yield_.resource, amount: yield_.amount, tileX: x, tileY: y };
}

/** Come bayas del inventario si hay y si hace falta. Devuelve true si comio. */
export function tryEat(store: EntityStore, id: number, inventory: Int32Array): boolean {
  if (inventory[Resource.Berries] < BERRIES_PER_MEAL) return false;
  if (store.hunger[id] >= 100) return false;
  inventory[Resource.Berries] -= BERRIES_PER_MEAL;
  store.hunger[id] = Math.min(100, store.hunger[id] + HUNGER_PER_BERRY * BERRIES_PER_MEAL);
  return true;
}
