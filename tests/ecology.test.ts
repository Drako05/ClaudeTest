import { describe, expect, it } from 'vitest';
import {
  EntityKind,
  EntityStore,
  tryHarvest,
  tryPlant,
  World,
} from '@verdant/sim';
import {
  DENSITY_CAP,
  EQUILIBRIUM_BAND,
  Feature,
  isSapling,
  LIFE_STEP_TICKS,
  LIFE_STEPS_PER_HOUR,
  LifeKind,
  lifeKindOf,
  MATURATION_TICKS,
  MAX_SEEDS_PER_HARVEST,
  maturesInto,
  RESOURCE_COUNT,
  Resource,
} from '@verdant/shared';

/**
 * Los ritmos del ecosistema, medidos sobre la simulacion real.
 *
 * Las dos anclas las fijo el autor y las constantes se calibraron para
 * cumplirlas, asi que estos tests comprueban la calibracion de punta a punta y
 * no la formula por separado: si alguien toca el ancho del rango, el paso de
 * vida o las tasas, esto deja de cuadrar y avisa.
 */

function livelyChunk(world: World): { cx: number; cy: number } {
  for (let cy = -6; cy <= 6; cy++) {
    for (let cx = -6; cx <= 6; cx++) {
      world.getChunk(cx, cy);
      if (world.referenceOf(cx, cy, LifeKind.Tree) > 60) return { cx, cy };
    }
  }
  throw new Error('no se encontro un chunk con vegetacion en el mundo de prueba');
}

/** Cuantos pasos de vida tarda en cumplirse una condicion. */
function stepsUntil(world: World, done: () => boolean, limit = 40000): number {
  for (let s = 1; s <= limit; s++) {
    world.setNow(s * LIFE_STEP_TICKS);
    if (done()) return s;
  }
  throw new Error('la condicion no se cumplio dentro del limite de pasos');
}

describe('Ritmo de recuperacion: de cero al rango en 5 horas reales', () => {
  it('un chunk colonizado desde cero alcanza el rango en el tiempo acordado', () => {
    const world = new World(31337);
    world.setNow(0);
    const { cx, cy } = livelyChunk(world);
    const reference = world.referenceOf(cx, cy, LifeKind.Tree);
    const target = reference * (1 - EQUILIBRIUM_BAND);

    // A cero, pero con los vecinos intactos: hay un origen del que colonizar.
    world.setPopulation(cx, cy, LifeKind.Tree, 0);

    const steps = stepsUntil(world, () => world.populationOf(cx, cy, LifeKind.Tree) >= target);
    const hours = steps / LIFE_STEPS_PER_HOUR;
    expect(hours, `tardo ${hours.toFixed(2)} h en vez de 5`).toBeGreaterThan(4.6);
    expect(hours, `tardo ${hours.toFixed(2)} h en vez de 5`).toBeLessThan(5.4);
  });

  it('la curva es lenta en los extremos y rapida en el medio', () => {
    // Es la forma que pidio el autor. Se mide el incremento por paso a tres
    // alturas distintas de la curva.
    const world = new World(31337);
    world.setNow(0);
    const { cx, cy } = livelyChunk(world);
    const reference = world.referenceOf(cx, cy, LifeKind.Tree);

    function incrementAt(fraction: number): number {
      world.setPopulation(cx, cy, LifeKind.Tree, reference * fraction);
      const before = world.populationOf(cx, cy, LifeKind.Tree);
      const at = world.currentTick;
      world.setNow(at + LIFE_STEP_TICKS);
      return world.populationOf(cx, cy, LifeKind.Tree) - before;
    }

    const low = incrementAt(0.05);
    const middle = incrementAt(0.5);
    const high = incrementAt(0.95);

    expect(middle).toBeGreaterThan(low * 3);
    expect(middle).toBeGreaterThan(high * 3);
  });
});

describe('Ritmo de mortandad: del 200 % al rango en 2.5 horas reales', () => {
  it('un chunk saturado vuelve a la banda en el tiempo acordado', () => {
    const world = new World(4242);
    world.setNow(0);
    const { cx, cy } = livelyChunk(world);
    const reference = world.referenceOf(cx, cy, LifeKind.Tree);
    const target = reference * (1 + EQUILIBRIUM_BAND);

    world.setPopulation(cx, cy, LifeKind.Tree, reference * 2);

    const steps = stepsUntil(world, () => world.populationOf(cx, cy, LifeKind.Tree) <= target);
    const hours = steps / LIFE_STEPS_PER_HOUR;
    expect(hours, `tardo ${hours.toFixed(2)} h en vez de 2.5`).toBeGreaterThan(2.3);
    expect(hours, `tardo ${hours.toFixed(2)} h en vez de 2.5`).toBeLessThan(2.7);
  });

  it('la mortandad corrige mas al principio que al final', () => {
    const world = new World(4242);
    world.setNow(0);
    const { cx, cy } = livelyChunk(world);
    const reference = world.referenceOf(cx, cy, LifeKind.Tree);

    function dropAt(fraction: number): number {
      world.setPopulation(cx, cy, LifeKind.Tree, reference * fraction);
      const before = world.populationOf(cx, cy, LifeKind.Tree);
      const at = world.currentTick;
      world.setNow(at + LIFE_STEP_TICKS);
      return before - world.populationOf(cx, cy, LifeKind.Tree);
    }

    expect(dropAt(2.0)).toBeGreaterThan(dropAt(1.3) * 2);
  });

  it('la saturacion deja al bioma sin recompensas mientras dura', () => {
    const world = new World(4242);
    world.setNow(0);
    const { cx, cy } = livelyChunk(world);
    expect(world.isBiomeBalanced(cx, cy)).toBe(true);

    const reference = world.referenceOf(cx, cy, LifeKind.Tree);
    world.setPopulation(cx, cy, LifeKind.Tree, reference * (DENSITY_CAP + 0.5));
    expect(world.isChunkOvercrowded(cx, cy)).toBe(true);
    expect(world.isBiomeBalanced(cx, cy)).toBe(false);

    // La competencia lo corrige sola con el tiempo.
    stepsUntil(world, () => !world.isChunkOvercrowded(cx, cy));
    expect(world.isChunkOvercrowded(cx, cy)).toBe(false);
  });
});

describe('El ciclo de la siembra', () => {
  /** Coloca al jugador justo encima del tile indicado. */
  function playerOn(x: number, y: number): { store: EntityStore; id: number } {
    const store = new EntityStore(4);
    const id = store.spawn(EntityKind.Player, x + 0.5, y + 0.5);
    // Sin direccion, el tile apuntado es el propio: asi el test no depende de
    // hacia donde mire el personaje.
    store.facingX[id] = 0;
    store.facingY[id] = 0;
    return { store, id };
  }

  function findTile(world: World, match: (f: Feature) => boolean): { x: number; y: number } {
    for (let y = -80; y < 80; y++) {
      for (let x = -80; x < 80; x++) {
        if (match(world.featureAt(x, y))) return { x, y };
      }
    }
    throw new Error('no se encontro la feature buscada');
  }

  it('recolectar deja entre cero y dos semillas', () => {
    const world = new World(2024);
    world.setNow(0);
    const inventory = new Int32Array(RESOURCE_COUNT);
    const counts = new Map<number, number>();
    let harvests = 0;

    for (let y = -60; y < 60 && harvests < 120; y++) {
      for (let x = -60; x < 60 && harvests < 120; x++) {
        if (lifeKindOf(world.featureAt(x, y)) !== LifeKind.Tree) continue;
        const before = inventory[Resource.TreeSeed];
        const { store, id } = playerOn(x, y);
        const result = tryHarvest(world, store, id, inventory, world.currentTick);
        expect(result).not.toBeNull();
        const gained = inventory[Resource.TreeSeed] - before;
        counts.set(gained, (counts.get(gained) ?? 0) + 1);
        harvests++;
      }
    }

    expect(harvests).toBe(120);
    for (const gained of counts.keys()) {
      expect(gained).toBeGreaterThanOrEqual(0);
      expect(gained).toBeLessThanOrEqual(MAX_SEEDS_PER_HARVEST);
    }
    // Los tres resultados posibles aparecen: no es una constante disfrazada.
    expect(counts.size).toBe(MAX_SEEDS_PER_HARVEST + 1);
  });

  it('un bioma equilibrado rinde mas al recolectar', () => {
    const world = new World(2024);
    world.setNow(0);
    const tree = findTile(world, (f) => lifeKindOf(f) === LifeKind.Tree);
    const cx = tree.x >> 5;
    const cy = tree.y >> 5;

    const inventory = new Int32Array(RESOURCE_COUNT);
    const { store, id } = playerOn(tree.x, tree.y);
    const balanced = world.isBiomeBalanced(cx, cy);
    const result = tryHarvest(world, store, id, inventory, 0)!;

    if (balanced) {
      // 3 de base con un 30 % de bonus.
      expect(result.rewarded).toBe(true);
      expect(result.amount).toBe(4);
    } else {
      expect(result.rewarded).toBe(false);
      expect(result.amount).toBe(3);
    }
  });

  it('sembrar consume una semilla y el brote madura a adulto', () => {
    const world = new World(2024);
    world.setNow(0);
    const tree = findTile(world, (f) => lifeKindOf(f) === LifeKind.Tree);
    const inventory = new Int32Array(RESOURCE_COUNT);
    const { store, id } = playerOn(tree.x, tree.y);

    // Se retira el arbol para dejar el tile libre y se siembra ahi mismo.
    world.setFeature(tree.x, tree.y, Feature.None);
    inventory[Resource.TreeSeed] = 1;

    const sapling = tryPlant(world, store, id, inventory);
    expect(sapling).not.toBeNull();
    expect(isSapling(world.featureAt(tree.x, tree.y))).toBe(true);
    expect(inventory[Resource.TreeSeed]).toBe(0);

    // Un brote ni estorba el paso ni se puede recolectar todavia.
    expect(world.isSolidAt(tree.x, tree.y)).toBe(false);
    expect(tryHarvest(world, store, id, inventory, 0)).toBeNull();

    const adult = maturesInto(sapling!);
    world.setNow(MATURATION_TICKS - 1);
    expect(isSapling(world.featureAt(tree.x, tree.y))).toBe(true);

    world.setNow(MATURATION_TICKS + 1);
    expect(world.featureAt(tree.x, tree.y)).toBe(adult);
    expect(world.isSolidAt(tree.x, tree.y)).toBe(true);
  });

  it('no se puede sembrar sin semillas ni sobre un tile ocupado', () => {
    const world = new World(2024);
    world.setNow(0);
    const tree = findTile(world, (f) => lifeKindOf(f) === LifeKind.Tree);
    const inventory = new Int32Array(RESOURCE_COUNT);
    const { store, id } = playerOn(tree.x, tree.y);

    inventory[Resource.TreeSeed] = 1;
    expect(tryPlant(world, store, id, inventory)).toBeNull(); // ocupado
    expect(inventory[Resource.TreeSeed]).toBe(1);

    world.setFeature(tree.x, tree.y, Feature.None);
    inventory[Resource.TreeSeed] = 0;
    inventory[Resource.PlantSeed] = 0;
    expect(tryPlant(world, store, id, inventory)).toBeNull(); // sin semillas
  });
});
