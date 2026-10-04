/**
 * Recoleccion y siembra.
 *
 * Recolectar RETIRA la instancia: el tile queda vacio y sera el ecosistema quien
 * decida mas adelante donde brota una nueva, que puede ser cualquier otro tile
 * apto del chunk. Sembrar es el camino rapido para devolver vida a una zona, y
 * el que el autor quiere como forma principal de mantener el equilibrio.
 */

import {
  animalLoot,
  BALANCED_HARVEST_BONUS,
  biomeOfTerrain,
  foodValue,
  Species,
  Stage,
  strikeDamage,
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
  placedFeatureOf,
  RECIPES,
  Resource,
  saplingOf,
  seedFor,
  speciesFor,
  Station,
  stationHeight,
  stationOfFeature,
  TICK_HZ,
  ToolKind,
  toolStats,
  workOf,
} from '@verdant/shared';
import {
  aimSurface,
  EYE_HEIGHT,
  gazeTarget,
  groundHit,
  lookVector,
  plantTile,
  pointAlong,
  rayBox,
  rayOrientedBox,
  strike,
  STRIKE_RANGE,
  type Hitbox,
  type Offset,
  type Strike,
  type Surface,
  type Vec3,
} from '../aim.js';
import { bodyBoxes, type OrientedBox } from '../body.js';
import { treeTrunkAt } from '../trunk.js';
import type { EntityStore } from '../entities.js';
import type { Bundle, Inventory } from '../inventory.js';
import { NO_RAMP } from '../relief.js';
import { hash2DFloat } from '../rng.js';
import { facingToward, stationNear } from '../stations.js';
import { toChunkCoord, type World } from '../world.js';
import { BODY_RADIUS } from './movement.js';

/** Cuanto se come de una vez: una unidad. Lo que llena, `foodValue`. */
export const BERRIES_PER_MEAL = 1;

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
 *
 * El daño lleva su casilla para poder olvidarlo al descargar su chunk
 * (`forgetUnloadedDamage`). Las ramas no son daño: se reponen con el tiempo, y
 * se quedan aunque el chunk se descargue.
 */
export class WorkState {
  readonly damage = new Map<number, { feature: Feature; work: number; tick: number; x: number; y: number }>();
  readonly branches = new Map<number, { taken: number; tick: number }>();
}

/**
 * Olvida el daño de los objetos cuyo chunk ya no esta cargado: **el daño no
 * sobrevive a recargar el chunk**, decision del autor (2026-10-03) para todo
 * lo que se golpea —plantas, bloques y animales—. `step` lo llama al podar
 * chunks, como `syncFauna` olvida el de los animales al retirarlos.
 */
export function forgetUnloadedDamage(work: WorkState, world: World): void {
  for (const [key, d] of work.damage) {
    if (!world.isLoaded(toChunkCoord(d.x), toChunkCoord(d.y))) work.damage.delete(key);
  }
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
 * Las estaciones ocupan su casilla entera, con el alto de `stationHeight`: lo
 * que se pisa, lo que se golpea y lo que se dibuja son el mismo numero.
 */
export const STATION_BOXES: Readonly<Record<Station.Workbench | Station.Furnace, { half: number; height: number }>> = {
  [Station.Workbench]: { half: 0.5, height: stationHeight(Feature.Workbench) },
  [Station.Furnace]: { half: 0.5, height: stationHeight(Feature.Furnace) },
};

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
  const station = stationOfFeature(feature);
  if (station === Station.Workbench || station === Station.Furnace) {
    ({ half, height } = STATION_BOXES[station]);
  } else if (trunk) {
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
    store.lookRoll[id],
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
 * El golpe en **modo preciso** (decision del autor, 2026-09-30): solo el primer
 * objetivo que cruza el centro de la mira, cortado por el terreno y a menos del
 * alcance; ninguno si el terreno esta antes. Con su distancia desde los ojos,
 * que es donde acaba la estocada que lo dibuja.
 */
export function preciseTarget(world: World, store: EntityStore, id: number): (Offset & { t: number; at: Vec3 }) | null {
  return gazeTarget(
    eyeOf(store, id),
    store.facingX[id],
    store.facingY[id],
    store.lookZ[id],
    (x, y) => world.groundHeightAt(x, y),
    (tx, ty) => hitboxAt(world, tx, ty),
  );
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

/** Un objeto golpeado que no se rompio: da sus particulas pequenas. */
export interface Hit {
  x: number;
  y: number;
  feature: Feature;
}

export interface Swing {
  results: HarvestResult[];
  /**
   * Lo golpeado que siguio en pie: dañado, del que salio una rama, o que pedia
   * otra herramienta. El cliente suelta ahi las particulas de golpe, mas
   * pequenas que las de romper (decision del autor).
   */
  hits: Hit[];
  /** Por que algo no salio, si es que no salio. */
  blocked: Blocked | null;
  /** True si la herramienta de la mano se rompio con este golpe. */
  broke: boolean;
  /** Los animales que alcanzo, y si murieron. */
  animals: AnimalHit[];
  /**
   * Donde toco el golpe cada cosa que se puede romper —feature o animal—: el
   * punto de su caja que alcanzo su rayo mas corto. Ahi dibuja el cliente el
   * impacto (pedido del autor, 2026-10-03).
   */
  impacts: Vec3[];
}

/** Un animal alcanzado por un golpe. */
export interface AnimalHit {
  /** La entidad que era. Si murio, ya no lo es: `step` la retira. */
  id: number;
  key: string;
  species: Species;
  stage: Stage;
  x: number;
  y: number;
  z: number;
  /** Los PV que le quedan, 0 si murio. */
  health: number;
  killed: boolean;
}

/**
 * Las cajas de golpe de un animal: las partes `hit` de su plano
 * (`fauna-body.ts`) en su sitio y giradas con su rumbo. Su cola, sus patas y
 * sus orejas no: decision del autor, el golpe va al cuerpo.
 */
export function animalBoxes(store: EntityStore, id: number): OrientedBox[] {
  const animal = store.animal[id];
  if (!animal || !store.alive[id]) return [];
  return bodyBoxes(animal.species, animal.stage, store.x[id], store.y[id], store.z[id], store.facingX[id], store.facingY[id]);
}

/**
 * Los animales que alcanza un golpe, cada uno con la distancia desde los ojos.
 * En barrido, todos los que cruza algun rayo del sector ya cortado por el
 * terreno; en preciso, solo el rayo central, cortado igual.
 */
function animalsInReach(
  world: World,
  store: EntityStore,
  id: number,
  animals: Iterable<number>,
  precise: boolean,
): Array<{ id: number; t: number; at: Vec3 }> {
  const origin = eyeOf(store, id);
  const rays = precise
    ? (() => {
        const dir = lookVector(store.facingX[id], store.facingY[id], store.lookZ[id]);
        const hit = groundHit(origin, dir, STRIKE_RANGE, (x, y) => world.groundHeightAt(x, y));
        return [{ dir, length: hit ? hit.t : STRIKE_RANGE }];
      })()
    : strikeOf(world, store, id).rays;
  const out: Array<{ id: number; t: number; at: Vec3 }> = [];
  for (const a of animals) {
    const reach = STRIKE_RANGE + 2;
    if (Math.abs(store.x[a] - origin.x) > reach || Math.abs(store.y[a] - origin.y) > reach) continue;
    const boxes = animalBoxes(store, a);
    let best = Infinity;
    let bestDir: Vec3 | null = null;
    for (const ray of rays) {
      for (const box of boxes) {
        const t = rayOrientedBox(origin, ray.dir, box, ray.length);
        if (t !== null && t < best) {
          best = t;
          bestDir = ray.dir;
        }
      }
    }
    if (bestDir) out.push({ id: a, t: best, at: pointAlong(origin, bestDir, best) });
  }
  out.sort((p, q) => p.t - q.t);
  return out;
}

/**
 * Un golpe a un animal: le quita el daño de lo que se lleva en la mano
 * (`strikeDamage`) y, si llega a cero, suelta su botin y muere para siempre.
 * **Un botin entra entero o no entra**, como en la recoleccion: si no cabe, el
 * golpe que lo mataria no completa y el animal sigue con su daño.
 */
function hitAnimal(
  world: World,
  store: EntityStore,
  a: number,
  inventory: Inventory,
  damage: number,
): AnimalHit | 'full' {
  const animal = store.animal[a]!;
  const left = store.health[a] - damage;
  const base = {
    id: a,
    key: animal.key,
    species: animal.species,
    stage: animal.stage,
    x: store.x[a],
    y: store.y[a],
    z: store.z[a],
  };
  if (left > 0) {
    store.health[a] = left;
    return { ...base, health: left, killed: false };
  }
  const loot = animalLoot(animal.species, animal.stage);
  if (!inventory.fits(loot)) return 'full';
  for (const b of loot) inventory.add(b.item, b.count);
  store.health[a] = 0;
  world.killFauna(animal.key);
  return { ...base, health: 0, killed: true };
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
  precise = false,
  animals: Iterable<number> = [],
): Swing {
  const swing: Swing = { results: [], hits: [], blocked: null, broke: false, animals: [], impacts: [] };
  const held = inventory.held();
  const stats = held === null ? null : toolStats(held);
  let useful = false;

  // Los animales, con el mismo golpe (regla 12). En preciso solo cuenta el
  // primer objetivo de la mira, sea un animal o un objeto del mundo.
  const beasts = animalsInReach(world, store, id, animals, precise);
  let tiles: Array<Offset & { at: Vec3 }>;
  if (precise) {
    const tile = preciseTarget(world, store, id);
    tiles = tile ? [tile] : [];
    if (beasts.length > 0) {
      if (tile && tile.t < beasts[0].t) beasts.length = 0;
      else tiles = [];
      beasts.length = Math.min(beasts.length, 1);
    }
  } else {
    tiles = strikeOf(world, store, id).targets.slice();
  }
  for (const { id: a, at } of beasts) {
    // El impacto, en el punto donde el golpe toca su caja: lo dibuja el
    // cliente, y es lo unico que sale de un animal golpeado (decision del
    // autor, 2026-10-03: sin fragmentos).
    swing.impacts.push(at);
    const hit = hitAnimal(world, store, a, inventory, strikeDamage(stats));
    if (hit === 'full') {
      swing.blocked = 'full';
      const animal = store.animal[a]!;
      swing.animals.push({
        id: a, key: animal.key, species: animal.species, stage: animal.stage,
        x: store.x[a], y: store.y[a], z: store.z[a], health: store.health[a], killed: false,
      });
    } else {
      swing.animals.push(hit);
    }
    // Golpear un animal con una herramienta la gasta, sea la que sea.
    if (stats) useful = true;
  }

  for (const { x, y, at } of tiles) {
    const feature = world.featureAt(x, y);
    const need = workOf(feature);
    if (!need) continue;
    // Todo lo que el golpe toca y se puede romper da su impacto, se rompa o no.
    swing.impacts.push(at);

    let power = 0;
    if (need.tool === ToolKind.Hand) power = 1;
    else if (stats && stats.kind === need.tool && stats.tier >= need.tier) {
      power = stats.power;
      useful = true;
    }

    if (power === 0) {
      swing.hits.push({ x, y, feature });
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
      work.damage.set(key, { feature, work: done, tick, x, y });
      swing.hits.push({ x, y, feature });
      continue;
    }
    const result = harvestTile(world, x, y, inventory, tick);
    if (!result) {
      swing.hits.push({ x, y, feature });
      // No cabe: el objeto se queda y su dano tambien, asi el siguiente golpe
      // lo termina en cuanto haya sitio.
      work.damage.set(key, { feature, work: need.work, tick, x, y });
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
 * Fabrica una receta si hay materiales, si el resultado cabe y si se esta
 * donde se fabrica. Lo basico, a mano en cualquier sitio; lo mejor, junto a su
 * mesa u horno (decisiones del autor). Es instantaneo (propuesta mia; fundir
 * tambien, del plan aprobado).
 *
 * `near` dice si hay una estacion de ese tipo a mano; sin ella, solo valen las
 * recetas de mano. `step` le pasa `stationNear` con la posicion del jugador.
 */
export function tryCraft(
  inventory: Inventory,
  recipe: number,
  near: (s: Station) => boolean = (s) => s === Station.Hand,
): 'ok' | 'missing' | 'full' {
  const r = RECIPES[recipe];
  if (!r || !near(r.station)) return 'missing';
  for (const input of r.inputs) if (inventory.count(input.item) < input.count) return 'missing';
  if (!inventory.fits([{ item: r.output, count: r.count }], r.inputs)) return 'full';
  for (const input of r.inputs) inventory.remove(input.item, input.count);
  inventory.add(r.output, r.count);
  return 'ok';
}

/** Que hizo un `use`. */
export type Used = 'ate' | 'planted' | 'placed' | 'opened';

/** La estacion que se abrio al usarla, y donde esta. */
export interface Opened {
  station: Station;
  x: number;
  y: number;
}

/**
 * La estacion que se acaba de colocar: su casilla y la altura a la que la tocaba
 * la mirada. Contra una pared es mas alta que su suelo, y el cliente la deja
 * caer desde ahi (decision del autor: todo tiene gravedad).
 */
export interface Placed {
  x: number;
  y: number;
  z: number;
}

/** Lo que dejo un `use` ademas de su resultado. */
export interface UseOut {
  opened?: (o: Opened) => void;
  placed?: (p: Placed) => void;
}

/**
 * Lo que mira el centro de la mirada, si es una estacion: su casilla, o `null`.
 */
export function stationInSight(world: World, store: EntityStore, id: number): Opened | null {
  const at = preciseTarget(world, store, id);
  if (!at) return null;
  const station = stationOfFeature(world.featureAt(at.x, at.y));
  return station === null ? null : { station, x: at.x, y: at.y };
}

/**
 * Usar (clic derecho, boton USAR), decisiones del autor:
 * - **mirando una estacion, la abre**, lleve lo que lleve en la mano;
 * - si no, con lo de la mano: una baya se come, una semilla se siembra —esa
 *   semilla, donde la mirada toca el suelo— y una estacion se coloca ahi.
 *
 * `opened` recibe la estacion abierta, para que el cliente abra su panel: la
 * apertura sale de la Intent como todo lo demas (regla 5).
 */
export function tryUse(
  world: World,
  store: EntityStore,
  id: number,
  inventory: Inventory,
  out: UseOut = {},
): Used | null {
  const sight = stationInSight(world, store, id);
  if (sight) {
    out.opened?.(sight);
    return 'opened';
  }
  const item = inventory.inHand();
  // Lo que se come: las bayas y la carne asada (`foodValue`).
  if (item !== null && foodValue(item) > 0) return tryEat(store, id, inventory, item) ? 'ate' : null;
  if (item === Resource.TreeSeed || item === Resource.PlantSeed) {
    return tryPlant(world, store, id, inventory, item) ? 'planted' : null;
  }
  if (item !== null && placedFeatureOf(item) !== Feature.None) {
    const placed = tryPlace(world, store, id, inventory);
    if (placed) out.placed?.(placed);
    return placed ? 'placed' : null;
  }
  return null;
}

/** Donde toca la mirada el terreno, a menos del alcance: suelo o pared (`aimSurface`). */
export function aimedSurface(world: World, store: EntityStore, id: number): Surface | null {
  return aimSurface(
    eyeOf(store, id),
    store.facingX[id],
    store.facingY[id],
    store.lookZ[id],
    (x, y) => world.groundHeightAt(x, y),
  );
}

/**
 * Donde se colocaria algo: la casilla en que la mirada toca el suelo, o, si
 * toca un costado del terreno, **la de delante de esa pared** (decision del
 * autor, 2026-09-30: aparece junto a la pared y cae hasta el suelo). A menos
 * del alcance en horizontal, como sembrar.
 */
export function placeTarget(world: World, store: EntityStore, id: number): Placed | null {
  const surface = aimedSurface(world, store, id);
  if (!surface) return null;
  return { x: surface.front.x, y: surface.front.y, z: surface.point.z };
}

/**
 * Coloca la estacion de la mano donde la mirada toca el suelo, o delante de la
 * pared que mira, a menos del alcance (decisiones del autor). Hace falta una
 * casilla vacia, sin agua, **sin talud** —una caja sobre una rampa quedaria
 * colgando por un lado— y que no pise el cuerpo del jugador, que quedaria
 * dentro de ella (las dos, propuesta mia). Devuelve donde, o `null`.
 */
export function tryPlace(world: World, store: EntityStore, id: number, inventory: Inventory): Placed | null {
  const item = inventory.inHand();
  if (item === null) return null;
  const feature = placedFeatureOf(item);
  if (feature === Feature.None) return null;
  const at = placeTarget(world, store, id);
  if (!at) return null;
  const { x, y } = at;
  if (world.featureAt(x, y) !== Feature.None) return null;
  if (isTerrainSolid(world.terrainAt(x, y))) return null;
  if (world.rampDirAt(x, y) !== NO_RAMP) return null;
  const px = store.x[id];
  const py = store.y[id];
  const touches =
    x >= Math.floor(px - BODY_RADIUS) &&
    x <= Math.floor(px + BODY_RADIUS) &&
    y >= Math.floor(py - BODY_RADIUS) &&
    y <= Math.floor(py + BODY_RADIUS);
  if (touches) return null;
  inventory.spendInHand();
  world.setFeature(x, y, feature);
  // Su cara principal, hacia quien la pone (pedido del autor, 2026-10-02).
  world.setStationFacing(x, y, facingToward(x, y, px, py));
  return { x, y, z: Math.max(at.z, world.groundHeightAt(x + 0.5, y + 0.5)) };
}

/** `tryCraft` con las estaciones que hay alrededor de la entidad. */
export function craftNear(
  world: World,
  store: EntityStore,
  id: number,
  inventory: Inventory,
  recipe: number,
): 'ok' | 'missing' | 'full' {
  return tryCraft(inventory, recipe, (s) => stationNear(world, eyeOf(store, id), s, (tx, ty) => hitboxAt(world, tx, ty)));
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
  only: Resource | null = null,
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
    // Con una semilla concreta en la mano, solo esa.
    if (only !== null && seed !== only) continue;

    const sapling = saplingOf(speciesFor(biome, kind));
    if (sapling === Feature.None) continue;

    inventory.remove(seed, 1);
    world.plantSapling(x, y, sapling);
    return sapling;
  }
  return null;
}

/**
 * Come una racion de algo del inventario —bayas, por defecto, o carne asada—
 * si hay y si hace falta. Llena lo que diga `foodValue`. Devuelve true si comio.
 */
export function tryEat(
  store: EntityStore,
  id: number,
  inventory: Inventory,
  item: Resource = Resource.Berries,
): boolean {
  const food = foodValue(item);
  if (food <= 0) return false;
  if (inventory.count(item) < BERRIES_PER_MEAL) return false;
  if (store.hunger[id] >= 100) return false;
  inventory.remove(item, BERRIES_PER_MEAL);
  store.hunger[id] = Math.min(100, store.hunger[id] + food * BERRIES_PER_MEAL);
  return true;
}
