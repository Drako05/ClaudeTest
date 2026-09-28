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
  isInert,
  isRare,
  isSapling,
  isTerrainSolid,
  LifeKind,
  MAX_SEEDS_PER_HARVEST,
  Resource,
  saplingOf,
  seedFor,
  speciesFor,
} from '@verdant/shared';
import { EYE_HEIGHT, plantTile, strike, type Hitbox, type Offset, type Strike, type Vec3 } from '../aim.js';
import { treeTrunkAt } from '../trunk.js';
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
 * Medidas de los hitboxes que no son arboles: medio ancho y alto, en bloques.
 * Salen de lo que mide cada dibujo (1,17 el arbusto, 1,09 la roca, 0,88 el
 * brote) y son **deduccion mia**; estan en `docs/pendiente.md`.
 */
const BUSH_BOX = { half: 0.45, height: 1.1 };
const ROCK_BOX = { half: 0.45, height: 1.0 };
const SAPLING_BOX = { half: 0.15, height: 0.85 };

/**
 * El hitbox del objeto de una casilla, o `null` si no hay nada que golpear.
 *
 * Una caja vertical centrada en la casilla y apoyada en su suelo. **El del arbol
 * es solo su tronco desnudo** (decision del autor: las hojas no), del suelo a la
 * copa y del grosor de su especie, y sale de `treeTrunkAt`, lo mismo que dibuja
 * el cliente: el tronco que se ve es el que se golpea.
 */
export function hitboxAt(world: World, tx: number, ty: number): Hitbox | null {
  const feature = world.featureAt(tx, ty);
  if (feature === Feature.None || !harvestOf(feature)) return null;
  let half: number;
  let height: number;
  const trunk = treeTrunkAt(world.seed, tx, ty, feature);
  if (trunk) {
    half = trunk.width / 2;
    height = trunk.bare;
  } else if (isSapling(feature)) {
    ({ half, height } = SAPLING_BOX);
  } else if (isInert(feature)) {
    ({ half, height } = ROCK_BOX);
  } else {
    ({ half, height } = BUSH_BOX);
  }
  const cx = tx + 0.5;
  const cy = ty + 0.5;
  const z0 = world.groundHeightAt(cx, cy);
  return { x0: cx - half, x1: cx + half, y0: cy - half, y1: cy + half, z0, z1: z0 + height };
}

/** Los ojos de la entidad: el origen del golpe. */
function eyeOf(store: EntityStore, id: number): Vec3 {
  return { x: store.x[id], y: store.y[id], z: store.z[id] + EYE_HEIGHT };
}

/**
 * El golpe de la entidad (regla 12): el sector plano de su mirada, cortado por
 * el terreno, y los objetos cuyo hitbox toca.
 */
export function strikeOf(world: World, store: EntityStore, id: number): Strike {
  return strike(
    eyeOf(store, id),
    store.facingX[id],
    store.facingY[id],
    store.lookZ[id],
    (x, y) => world.groundHeightAt(x, y),
    (tx, ty) => hitboxAt(world, tx, ty),
  );
}

/**
 * Las casillas de los objetos que el golpe alcanza, del mas cercano al mas
 * lejano. Es lo que se recolecta y lo que marca la reticula.
 */
export function actionReach(world: World, store: EntityStore, id: number): Offset[] {
  return strikeOf(world, store, id).targets.map(({ x, y }) => ({ x, y }));
}

/**
 * Donde se siembra: la casilla en que la mirada toca la cara de arriba del
 * suelo, a menos del alcance, o `null`. Decision del autor.
 */
export function targetTile(world: World, store: EntityStore, id: number): Offset | null {
  return plantTile(
    eyeOf(store, id),
    store.facingX[id],
    store.facingY[id],
    store.lookZ[id],
    (x, y) => world.groundHeightAt(x, y),
  );
}

/**
 * Recolecta todos los objetos que el golpe toca (regla 12), del mas cercano al
 * mas lejano. Cada uno rinde lo
 * suyo: tres arboles dan la madera de tres arboles,
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
  for (const tile of actionReach(world, store, id)) {
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

  // El botin puede ser un rango —los minerales lo son—. Se sortea con el mismo
  // hash de posicion y tiempo que las semillas, no con un generador con estado,
  // para no romper el determinismo.
  let amount = yield_.amount;
  if (yield_.max > yield_.amount) {
    const roll = hash2DFloat(world.seed ^ 0x2f6a1c93, x * 40503 + tick, y);
    amount += Math.floor(roll * (yield_.max - yield_.amount + 1));
  }

  // Lo inerte no cobra el bonus de equilibrio: premia cuidar un ecosistema, y la
  // montana no tiene ninguno que cuidar.
  const rewarded =
    !yield_.inert &&
    world.isBiomeBalanced(toChunkCoord(x), toChunkCoord(y), world.biomeAt(x, y));
  amount = Math.round(amount * (1 + (rewarded ? BALANCED_HARVEST_BONUS : 0)));

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
  // Se siembra donde la mirada toca la cara de arriba del suelo, a menos del
  // alcance (decision del autor); si no llega, o da en una pared, no se siembra.
  const aimed = targetTile(world, store, id);
  if (!aimed) return null;
  const { x, y } = aimed;
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
