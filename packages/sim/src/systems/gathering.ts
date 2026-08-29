/**
 * Recoleccion y siembra.
 *
 * Recolectar RETIRA la instancia: el tile queda vacio y sera el ecosistema quien
 * decida mas adelante donde brota una nueva, que puede ser cualquier otro tile
 * apto del chunk. Sembrar es el camino rapido para devolver vida a una zona, y
 * el que el autor quiere como forma principal de mantener el equilibrio.
 */

import {
  BALANCED_HARVEST_BONUS,
  biomeOfTerrain,
  densityOfKind,
  Feature,
  harvestOf,
  isRare,
  isTerrainSolid,
  LifeKind,
  MAX_SEEDS_PER_HARVEST,
  Resource,
  saplingOf,
  seedFor,
  speciesFor,
} from '@verdant/shared';
import { actionTiles, directionOf, type Offset } from '../aim.js';
import type { EntityStore } from '../entities.js';
import { hash2DFloat } from '../rng.js';
import { toChunkCoord, type World } from '../world.js';

export const BERRIES_PER_MEAL = 1;
export const HUNGER_PER_BERRY = 14;

export interface HarvestResult {
  /**
   * Lo que habia en el tile. La recoleccion ya lo sabe, y sin el dato el cliente
   * no podria saber de que color son los escombros de algo que acaba de dejar de
   * existir en el mundo.
   */
  feature: Feature;
  resource: Resource;
  amount: number;
  /** Semillas obtenidas, de cero a MAX_SEEDS_PER_HARVEST. */
  seeds: number;
  seedResource: Resource | null;
  rare: boolean;
  /** True si el bioma estaba equilibrado y hubo bonus. */
  rewarded: boolean;
  tileX: number;
  tileY: number;
}

/**
 * Las casillas que afecta una accion de la entidad. La apuntada va la primera.
 *
 * Se calculan desde la casilla que PISA y no desde su posicion continua. Antes
 * era `floor(pos + mirada * 1.1)`, y con el personaje pegado al borde de su
 * casilla eso podia apuntar dos casillas mas alla; con un area de tres el fallo
 * pasaria de inadvertido a evidente.
 */
export function actionArea(store: EntityStore, id: number): Offset[] {
  const dir = directionOf(store.facingX[id], store.facingY[id]);
  const tileX = Math.floor(store.x[id]);
  const tileY = Math.floor(store.y[id]);
  // Sin mirada todavia, se apunta al sur, que es hacia donde nace mirando.
  return actionTiles(tileX, tileY, dir < 0 ? 4 : dir);
}

/** Tile al que apunta la entidad. */
export function targetTile(store: EntityStore, id: number): { x: number; y: number } {
  const [aimed] = actionArea(store, id);
  return { x: aimed.x, y: aimed.y };
}

/**
 * Recolecta el tile apuntado.
 *
 * El rendimiento sube un porcentaje fijo si el bioma esta equilibrado: es la
 * recompensa por cuidarlo. Las semillas se sortean con un hash de posicion y
 * tiempo, no con un generador con estado, para no romper el determinismo.
 */
export function tryHarvest(
  world: World,
  store: EntityStore,
  id: number,
  inventory: Int32Array,
  tick: number,
): HarvestResult | null {
  const { x, y } = targetTile(store, id);
  return harvestTile(world, x, y, inventory, tick);
}

/**
 * Recolecta las tres casillas del area, en orden fijo y empezando por la
 * apuntada. Cada una rinde lo suyo: tres arboles dan la madera de tres arboles,
 * como decidio el autor. El coste lo pone el ecosistema, que tardara mas en
 * reponerse de una tala tan rapida.
 */
export function tryHarvestArea(
  world: World,
  store: EntityStore,
  id: number,
  inventory: Int32Array,
  tick: number,
): HarvestResult[] {
  const out: HarvestResult[] = [];
  for (const tile of actionArea(store, id)) {
    const result = harvestTile(world, tile.x, tile.y, inventory, tick);
    if (result) out.push(result);
  }
  return out;
}

/** Recolecta un tile concreto. Es la primitiva de la que salen las dos de arriba. */
export function harvestTile(
  world: World,
  x: number,
  y: number,
  inventory: Int32Array,
  tick: number,
): HarvestResult | null {
  const feature = world.featureAt(x, y);
  const yield_ = harvestOf(feature);
  if (!yield_) return null;

  const rewarded = world.isBiomeBalanced(toChunkCoord(x), toChunkCoord(y), world.biomeAt(x, y));
  const amount = Math.round(yield_.amount * (1 + (rewarded ? BALANCED_HARVEST_BONUS : 0)));

  world.setFeature(x, y, Feature.None);
  inventory[yield_.resource] += amount;

  let seeds = 0;
  if (yield_.seed !== null) {
    const roll = hash2DFloat(world.seed ^ 0x6d1b8f2b, x * 92837111 + tick, y);
    seeds = Math.floor(roll * (MAX_SEEDS_PER_HARVEST + 1));
    inventory[yield_.seed] += seeds;
  }

  return {
    resource: yield_.resource,
    amount,
    seeds,
    seedResource: yield_.seed,
    feature,
    rare: isRare(feature),
    rewarded,
    tileX: x,
    tileY: y,
  };
}

/**
 * Siembra en el tile apuntado la especie que corresponde a ese terreno.
 *
 * No hay menu de seleccion: la semilla se elige sola segun lo que el sitio
 * sostenga y lo que el jugador lleve encima.
 */
export function tryPlant(
  world: World,
  store: EntityStore,
  id: number,
  inventory: Int32Array,
): Feature | null {
  const { x, y } = targetTile(store, id);
  if (world.featureAt(x, y) !== Feature.None) return null;

  const terrain = world.terrainAt(x, y);
  if (isTerrainSolid(terrain)) return null;
  const biome = biomeOfTerrain(terrain);

  for (const kind of [LifeKind.Tree, LifeKind.Plant]) {
    if (densityOfKind(terrain, kind) <= 0) continue;
    const seed = seedFor(kind);
    if (seed === null || inventory[seed] <= 0) continue;

    const sapling = saplingOf(speciesFor(biome, kind));
    if (sapling === Feature.None) continue;

    inventory[seed]--;
    world.plantSapling(x, y, sapling);
    return sapling;
  }
  return null;
}

/** Come bayas del inventario si hay y si hace falta. Devuelve true si comio. */
export function tryEat(store: EntityStore, id: number, inventory: Int32Array): boolean {
  if (inventory[Resource.Berries] < BERRIES_PER_MEAL) return false;
  if (store.hunger[id] >= 100) return false;
  inventory[Resource.Berries] -= BERRIES_PER_MEAL;
  store.hunger[id] = Math.min(100, store.hunger[id] + HUNGER_PER_BERRY * BERRIES_PER_MEAL);
  return true;
}
