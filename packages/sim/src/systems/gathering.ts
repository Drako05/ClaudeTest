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
  DAY_TICKS,
  densityOfKind,
  Feature,
  harvestOf,
  isInert,
  isRare,
  isSapling,
  isTerrainSolid,
  LifeKind,
  lifeKindOf,
  MAX_SEEDS_PER_HARVEST,
  RECIPES,
  Resource,
  saplingOf,
  seedFor,
  speciesFor,
  Station,
  TICK_HZ,
  ToolKind,
  toolStats,
  workOf,
} from '@verdant/shared';
import { EYE_HEIGHT, plantTile, strike, type Hitbox, type Offset, type Strike, type Vec3 } from '../aim.js';
import { treeTrunkAt } from '../trunk.js';
import type { EntityStore } from '../entities.js';
import type { Bundle, Inventory } from '../inventory.js';
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
  /**
   * Lo que viene ademas del producto principal: la fibra de un arbusto, la
   * rama de un arbol talado. Sin bono de equilibrio (propuesta mia).
   */
  extras: Bundle[];
  /**
   * True si el objeto se recolecto entero y el tile quedo vacio. False para
   * la rama que suelta un arbol golpeado sin hacha, que sigue en pie.
   */
  felled: boolean;
}

/**
 * Por que un golpe no hizo lo que se esperaba: el inventario no tenia sitio,
 * o hace falta un pico (o uno mejor). Lo cuenta el cliente en un aviso.
 */
export type Blocked = 'full' | 'needPickaxe' | 'needBetterPickaxe';

/**
 * El daño acumulado en cada objeto golpeado y las ramas que ya se le han
 * arrancado a cada arbol. Es estado de las mutaciones del jugador y vive fuera
 * del chunk, como el overlay (regla 4).
 */
export class WorkState {
  readonly damage = new Map<number, { feature: Feature; work: number; tick: number }>();
  readonly branches = new Map<number, { taken: number; tick: number }>();
}

/**
 * El daño acumulado se pierde tras 3 s sin golpear ese objeto. **Propuesta
 * mia** (plan de la tanda 1).
 */
export const DAMAGE_DECAY_TICKS = 3 * TICK_HZ;
/** Ramas que da un arbol a mano antes de agotarse. **Propuesta mia.** */
export const BRANCHES_PER_TREE = 3;
/** Las ramas de un arbol se reponen enteras en un dia de juego. **Propuesta mia.** */
export const BRANCH_REGROW_TICKS = DAY_TICKS / BRANCHES_PER_TREE;

function tileKey(x: number, y: number): number {
  return (x + 33554432) * 67108864 + (y + 33554432);
}

/** Daño acumulado de un tile ahora mismo, de 0 al trabajo que pide. */
export function damageAt(work: WorkState, world: World, x: number, y: number, tick: number): number {
  const d = work.damage.get(tileKey(x, y));
  if (!d || d.feature !== world.featureAt(x, y) || tick - d.tick > DAMAGE_DECAY_TICKS) return 0;
  return d.work;
}

/**
 * Ramas que le quedan a un arbol. Se reponen con el tiempo transcurrido, no con
 * pasos: el resultado no depende de cuando se mire (ley del observador).
 */
export function branchesLeft(work: WorkState, x: number, y: number, tick: number): number {
  const b = work.branches.get(tileKey(x, y));
  if (!b) return BRANCHES_PER_TREE;
  const regrown = Math.floor((tick - b.tick) / BRANCH_REGROW_TICKS);
  return Math.min(BRANCHES_PER_TREE, BRANCHES_PER_TREE - b.taken + regrown);
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
 * Los guijarros: bajos, hay que mirar al suelo para cogerlos, y del ancho de
 * su dibujo tumbado. **Propuesta mia.**
 */
const PEBBLES_BOX = { half: 0.3, height: 0.2 };

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
  } else if (feature === Feature.Pebbles) {
    ({ half, height } = PEBBLES_BOX);
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

export interface Swing {
  results: HarvestResult[];
  /** Por que algo no salio, si es que no salio. */
  blocked: Blocked | null;
  /** True si la herramienta de la mano se rompio con este golpe. */
  broke: boolean;
}

/**
 * Un golpe (regla 12): todo lo que toca el sector recibe el poder de lo que se
 * lleva en la mano, y lo que llega a su trabajo se recolecta, del mas cercano
 * al mas lejano. Decision del autor: **trabajo por golpes**, y una herramienta
 * mejor pide menos.
 *
 * - Lo que se trabaja a mano (arbustos, guijarros) sale con cualquier cosa.
 * - Un arbol sin hacha no cae: suelta una rama por golpe mientras le queden.
 * - Roca y minerales sin el pico adecuado no dan nada.
 * - La herramienta gasta **un uso por golpe util**, alcance a uno o a varios
 *   (propuesta mia), y golpear con ella lo que no es suyo no la gasta.
 */
export function tryHarvestArea(
  world: World,
  store: EntityStore,
  id: number,
  inventory: Inventory,
  tick: number,
  work: WorkState,
): Swing {
  const swing: Swing = { results: [], blocked: null, broke: false };
  const held = inventory.held();
  const stats = held === null ? null : toolStats(held);
  let useful = false;

  for (const { x, y } of actionReach(world, store, id)) {
    const feature = world.featureAt(x, y);
    const need = workOf(feature);
    if (!need) continue;

    let power = 0;
    if (need.tool === ToolKind.Hand) power = 1;
    else if (stats && stats.kind === need.tool && stats.tier >= need.tier) {
      power = stats.power;
      useful = true;
    }

    if (power === 0) {
      if (lifeKindOf(feature) === LifeKind.Tree) {
        const branch = tryBranch(world, x, y, inventory, tick, work);
        if (branch === 'full') swing.blocked = 'full';
        else if (branch) swing.results.push(branch);
      } else {
        swing.blocked =
          stats?.kind === ToolKind.Pickaxe ? 'needBetterPickaxe' : 'needPickaxe';
      }
      continue;
    }

    const key = tileKey(x, y);
    const done = damageAt(work, world, x, y, tick) + power;
    if (done < need.work) {
      work.damage.set(key, { feature, work: done, tick });
      continue;
    }
    const result = harvestTile(world, x, y, inventory, tick);
    if (!result) {
      // No cabe: el objeto se queda y su dano tambien, asi el siguiente golpe
      // lo termina en cuanto haya sitio.
      work.damage.set(key, { feature, work: need.work, tick });
      swing.blocked = 'full';
      continue;
    }
    work.damage.delete(key);
    work.branches.delete(key);
    swing.results.push(result);
  }

  if (useful) swing.broke = inventory.wearHeld();
  return swing;
}

/** Una rama de un arbol golpeado sin hacha, si le quedan y si cabe. */
function tryBranch(
  world: World,
  x: number,
  y: number,
  inventory: Inventory,
  tick: number,
  work: WorkState,
): HarvestResult | 'full' | null {
  const left = branchesLeft(work, x, y, tick);
  if (left <= 0) return null;
  if (!inventory.add(Resource.Branch, 1)) return 'full';
  // La reposicion se cuenta desde el ultimo arranque, con lo que ya se habia
  // repuesto descontado: asi el calculo sigue siendo solo del tiempo.
  work.branches.set(tileKey(x, y), { taken: BRANCHES_PER_TREE - left + 1, tick });
  const feature = world.featureAt(x, y);
  return {
    feature,
    resource: Resource.Branch,
    amount: 1,
    seeds: 0,
    seedResource: null,
    rare: isRare(feature),
    rewarded: false,
    tileX: x,
    tileY: y,
    extras: [],
    felled: false,
  };
}

/**
 * Recolecta un tile concreto de una vez, sin golpes ni herramientas: la
 * primitiva que completa `tryHarvestArea`. Devuelve `null`, sin tocar nada, si
 * no hay nada que recolectar o si el botin no cabe entero.
 */
export function harvestTile(
  world: World,
  x: number,
  y: number,
  inventory: Inventory,
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

  let seeds = 0;
  if (yield_.seed !== null) {
    const roll = hash2DFloat(world.seed ^ 0x6d1b8f2b, x * 92837111 + tick, y);
    seeds = Math.floor(roll * (MAX_SEEDS_PER_HARVEST + 1));
  }

  // Lo de mas: fibra de los arbustos (1-2) y una rama del arbol talado.
  // **Propuesta mia** (plan de la tanda 1).
  const extras: Bundle[] = [];
  const kind = lifeKindOf(feature);
  if (kind === LifeKind.Plant) {
    const roll = hash2DFloat(world.seed ^ 0x51f0a3d7, x * 7919 + tick, y);
    extras.push({ item: Resource.Fiber, count: 1 + Math.floor(roll * 2) });
  } else if (kind === LifeKind.Tree) {
    extras.push({ item: Resource.Branch, count: 1 });
  }

  const loot: Bundle[] = [{ item: yield_.resource, count: amount }, ...extras];
  if (yield_.seed !== null && seeds > 0) loot.push({ item: yield_.seed, count: seeds });
  if (!inventory.fits(loot)) return null;

  world.setFeature(x, y, Feature.None);
  for (const b of loot) inventory.add(b.item, b.count);

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
    extras,
    felled: true,
  };
}

/**
 * Fabrica una receta si hay materiales y el resultado cabe. Lo basico se
 * fabrica a mano en cualquier sitio (decision del autor); es instantaneo
 * (propuesta mia). Devuelve true si fabrico.
 */
export function tryCraft(inventory: Inventory, recipe: number): boolean {
  const r = RECIPES[recipe];
  if (!r || r.station !== Station.Hand) return false;
  for (const input of r.inputs) if (inventory.count(input.item) < input.count) return false;
  if (!inventory.fits([{ item: r.output, count: r.count }], r.inputs)) return false;
  for (const input of r.inputs) inventory.remove(input.item, input.count);
  inventory.add(r.output, r.count);
  return true;
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
  inventory: Inventory,
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
    if (seed === null || inventory.count(seed) <= 0) continue;

    const sapling = saplingOf(speciesFor(biome, kind));
    if (sapling === Feature.None) continue;

    inventory.remove(seed, 1);
    world.plantSapling(x, y, sapling);
    return sapling;
  }
  return null;
}

/** Come bayas del inventario si hay y si hace falta. Devuelve true si comio. */
export function tryEat(store: EntityStore, id: number, inventory: Inventory): boolean {
  if (inventory.count(Resource.Berries) < BERRIES_PER_MEAL) return false;
  if (store.hunger[id] >= 100) return false;
  inventory.remove(Resource.Berries, BERRIES_PER_MEAL);
  store.hunger[id] = Math.min(100, store.hunger[id] + HUNGER_PER_BERRY * BERRIES_PER_MEAL);
  return true;
}
