import { describe, expect, it } from 'vitest';
import {
  animalBoxes,
  collides,
  createGame,
  EYE_HEIGHT,
  faunaOf,
  Inventory,
  periodOf,
  skipTime,
  step,
  tryCraft,
  tryEat,
  waypointOf,
  World,
  type GameState,
} from '@verdant/sim';
import {
  animalHitPoints,
  animalLoot,
  biomeOfTerrain,
  CHUNK_SIZE,
  CHUNK_TILES,
  densityPerChunk,
  emptyIntent,
  foodValue,
  hitPointsOf,
  LifeKind,
  lifeKindOf,
  meatOf,
  RECIPES,
  Resource,
  Sex,
  SPECIES,
  SPECIES_COUNT,
  Species,
  Stage,
  STAGE_SHARE,
  Station,
  strikeDamage,
  toolStats,
  type Intent,
} from '@verdant/shared';

/**
 * La fauna de la primera tanda (plan aprobado por el autor, 2026-10-02): diez
 * especies que deambulan, potencial de su chunk, con lo que se les hace en el
 * overlay. Aqui se miden los numeros; el humo mide que se ven y se cazan.
 */

/** Un animal materializado del juego, el primero que cumpla `ok`. */
function someAnimal(state: GameState, ok: (id: number) => boolean = () => true): number {
  for (const id of state.fauna.values()) if (ok(id)) return id;
  throw new Error('no hay fauna materializada que valga');
}

/** Lleva al jugador lejos (sin fauna de aqui) y lo devuelve, pasando por `step`. */
function travelAndBack(state: GameState): void {
  const { entities, playerId } = state;
  const x = entities.x[playerId];
  const y = entities.y[playerId];
  entities.x[playerId] = x + 40 * CHUNK_SIZE;
  step(state, emptyIntent());
  entities.x[playerId] = x;
  entities.y[playerId] = y;
  step(state, emptyIntent());
}

/**
 * Pone al jugador junto al animal y apunta los ojos al centro de su caja, para
 * golpearlo en modo preciso. Devuelve la Intent del golpe.
 */
function aimAt(state: GameState, id: number): Intent {
  const { entities, playerId, world } = state;
  for (const [ox, oy] of [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6], [1.2, 1.2], [-1.2, -1.2]]) {
    const px = entities.x[id] + ox;
    const py = entities.y[id] + oy;
    if (collides(world, px, py)) continue;
    entities.x[playerId] = px;
    entities.y[playerId] = py;
    entities.z[playerId] = world.floorHeightAt(px, py);
    break;
  }
  // La primera parte que golpea es su tronco.
  const box = animalBoxes(entities, id)[0];
  const dx = box.cx - entities.x[playerId];
  const dy = box.cy - entities.y[playerId];
  const dz = box.cz - (entities.z[playerId] + EYE_HEIGHT);
  const len = Math.hypot(dx, dy, dz);
  return { ...emptyIntent(), aimX: dx, aimY: dy, aimZ: dz / len, harvest: true, precise: true };
}

describe('Fauna: el sistema de puntos de vida', () => {
  it('sale de la masa: el jugador, 70 kg, tiene 100, y ocho veces la masa es el doble', () => {
    expect(hitPointsOf(70)).toBe(100);
    expect(hitPointsOf(70 * 8)).toBe(200);
    expect(hitPointsOf(70 / 8)).toBe(50);
  });

  it('da los PV de cada adulto con su masa real', () => {
    // La tabla del plan llevaba 38 para liebre y zorro y 10 para el cangrejo,
    // redondeados a mano; la formula aprobada da 38,5 → 39 y 9,5 → 9.
    const adult: Record<number, number> = {
      [Species.Hare]: 39, [Species.Bison]: 205, [Species.RedDeer]: 129, [Species.Boar]: 109,
      [Species.Reindeer]: 120, [Species.ArcticFox]: 39, [Species.Ibex]: 100, [Species.Marmot]: 41,
      [Species.Crab]: 9, [Species.Gull]: 24,
    };
    for (let s = 0 as Species; s < SPECIES_COUNT; s++) {
      expect(animalHitPoints(s, Stage.Adult), SPECIES[s].name).toBe(adult[s]);
    }
  });

  it('las etapas salen de la misma formula con su masa: cria por debajo de joven, y joven de adulto', () => {
    for (let s = 0 as Species; s < SPECIES_COUNT; s++) {
      const [c, j, a] = [Stage.Infant, Stage.Juvenile, Stage.Adult].map((st) => animalHitPoints(s, st));
      expect(c).toBeLessThan(j);
      expect(j).toBeLessThan(a);
      // ~0,53 y ~0,84 del adulto: la raiz cubica del 15 y el 60 %.
      expect(c / a).toBeCloseTo(Math.cbrt(0.15), 1);
      expect(j / a).toBeCloseTo(Math.cbrt(0.6), 1);
    }
  });

  it('el daño de un golpe: 5 a mano y 10 por punto de poder de la herramienta', () => {
    expect(strikeDamage(null)).toBe(5);
    expect(strikeDamage(toolStats(Resource.StoneAxe))).toBe(10);
    expect(strikeDamage(toolStats(Resource.IronPickaxe))).toBe(30);
  });
});

describe('Fauna: botin', () => {
  it('la carne sale de la masa: 1 de una liebre, 15 de un bisonte adulto', () => {
    expect(meatOf(4)).toBe(1);
    expect(meatOf(600)).toBe(15);
  });

  it('cada clase suelta lo suyo, y las crias de mamifero no dan piel', () => {
    const count = (s: Species, st: Stage, r: Resource) =>
      animalLoot(s, st).find((b) => b.item === r)?.count ?? 0;
    expect(count(Species.Bison, Stage.Adult, Resource.Hide)).toBe(2);
    expect(count(Species.RedDeer, Stage.Adult, Resource.Hide)).toBe(1);
    expect(count(Species.RedDeer, Stage.Infant, Resource.Hide)).toBe(0);
    expect(count(Species.Gull, Stage.Adult, Resource.Feather)).toBe(3);
    expect(count(Species.Gull, Stage.Infant, Resource.Feather)).toBe(1);
    expect(count(Species.Crab, Stage.Adult, Resource.Shell)).toBe(1);
    expect(count(Species.Crab, Stage.Adult, Resource.RawMeat)).toBe(0);
    expect(count(Species.Bison, Stage.Infant, Resource.RawMeat)).toBeLessThan(count(Species.Bison, Stage.Adult, Resource.RawMeat));
  });

  it('la carne cruda se asa en el horno y la asada llena 35 de hambre; la cruda no se come', () => {
    const roast = RECIPES.findIndex((r) => r.output === Resource.CookedMeat);
    expect(RECIPES[roast].station).toBe(Station.Furnace);
    const inv = new Inventory();
    inv.add(Resource.RawMeat, 2);
    inv.add(Resource.Coal, 1);
    expect(tryCraft(inv, roast)).toBe('missing'); // sin horno a mano, no
    expect(tryCraft(inv, roast, () => true)).toBe('ok');
    expect(inv.count(Resource.CookedMeat)).toBe(2);
    expect(foodValue(Resource.RawMeat)).toBe(0);

    const state = createGame(7);
    state.entities.hunger[state.playerId] = 50;
    expect(tryEat(state.entities, state.playerId, inv, Resource.CookedMeat)).toBe(true);
    expect(state.entities.hunger[state.playerId]).toBe(85);
  });
});

describe('Fauna: aparicion', () => {
  it('la fauna de un chunk es pura: la misma en cualquier orden y al regenerarse', () => {
    const a = new World(99);
    const b = new World(99);
    for (let cy = 3; cy >= -3; cy--) for (let cx = 3; cx >= -3; cx--) b.getChunk(cx, cy);
    for (const [cx, cy] of [[0, 0], [2, -1], [-3, 3]]) {
      const ca = a.getChunk(cx, cy);
      const cb = b.getChunk(cx, cy);
      expect(faunaOf(a.seed, cx, cy, ca.terrain, ca.feature)).toEqual(faunaOf(b.seed, cx, cy, cb.terrain, cb.feature));
      expect(a.faunaOfChunk(cx, cy)).toEqual(b.faunaOfChunk(cx, cy));
    }
  });

  it('cada especie sale con su densidad, y las etapas y los sexos en su proporcion', () => {
    const world = new World(1234);
    const got = new Array<number>(SPECIES_COUNT).fill(0);
    const want = new Array<number>(SPECIES_COUNT).fill(0);
    const stages = [0, 0, 0];
    let males = 0;
    let total = 0;
    for (let cy = -15; cy < 15; cy++) {
      for (let cx = -15; cx < 15; cx++) {
        const chunk = world.getChunk(cx, cy);
        for (const animal of world.faunaOfChunk(cx, cy)) {
          got[animal.species]++;
          stages[animal.stage]++;
          if (animal.sex === Sex.Male) males++;
          total++;
          // Siempre en una casilla de su bioma.
          expect(biomeOfTerrain(world.terrainAt(Math.floor(animal.homeX), Math.floor(animal.homeY)))).toBe(
            SPECIES[animal.species].biome,
          );
        }
        for (let s = 0 as Species; s < SPECIES_COUNT; s++) {
          let n = 0;
          for (let i = 0; i < CHUNK_TILES; i++) if (biomeOfTerrain(chunk.terrain[i]) === SPECIES[s].biome) n++;
          want[s] += (densityPerChunk(s) * n) / CHUNK_TILES;
        }
      }
    }
    const sumGot = got.reduce((p, q) => p + q, 0);
    const sumWant = want.reduce((p, q) => p + q, 0);
    expect(Math.abs(sumGot - sumWant) / sumWant).toBeLessThan(0.1);
    for (let s = 0 as Species; s < SPECIES_COUNT; s++) {
      // Las especies con muestra de sobra, a un 25 % de su densidad.
      if (want[s] >= 150) expect(Math.abs(got[s] - want[s]) / want[s], SPECIES[s].name).toBeLessThan(0.25);
    }
    // Las etapas: los grupos fuerzan un adulto, asi que los adultos pueden ir
    // algo por encima; las tres, a 4 puntos de su parte.
    for (const st of [Stage.Infant, Stage.Juvenile, Stage.Adult]) {
      expect(Math.abs(stages[st] / total - STAGE_SHARE[st])).toBeLessThan(0.04);
    }
    expect(Math.abs(males / total - 0.5)).toBeLessThan(0.04);
  });
});

describe('Fauna: deambular', () => {
  it('materializa la fauna de alrededor del jugador, y anda', () => {
    const state = createGame(1);
    expect(state.fauna.size).toBeGreaterThan(10);
    const before = new Map([...state.fauna].map(([k, id]) => [k, [state.entities.x[id], state.entities.y[id]]]));
    for (let t = 0; t < 600; t++) step(state, emptyIntent());
    let moved = 0;
    for (const [k, id] of state.fauna) {
      const b = before.get(k);
      if (b && Math.hypot(state.entities.x[id] - b[0], state.entities.y[id] - b[1]) > 0.5) moved++;
    }
    expect(moved).toBeGreaterThan(state.fauna.size / 3);
  });

  it('ningun animal pisa nunca un tile de otro bioma', () => {
    const state = createGame(5);
    for (let t = 0; t < 1200; t++) {
      step(state, emptyIntent());
      if (t % 20 !== 0) continue;
      for (const id of state.fauna.values()) {
        const animal = state.entities.animal[id]!;
        const biome = state.world.biomeAt(Math.floor(state.entities.x[id]), Math.floor(state.entities.y[id]));
        expect(biome).toBe(SPECIES[animal.species].biome);
      }
    }
  });

  it('visto o no, cada animal va al mismo punto de paso en el mismo periodo', () => {
    // Uno lo vive tick a tick; el otro salta el mismo rato. Los dos tienen que
    // perseguir el mismo punto, y el que salto esta en el.
    const lived = createGame(3);
    for (let t = 0; t < 1500; t++) step(lived, emptyIntent());
    const skipped = createGame(3);
    skipTime(skipped, 1500);
    expect(skipped.tick).toBe(lived.tick);
    let compared = 0;
    for (const [key, a] of lived.fauna) {
      const b = skipped.fauna.get(key);
      if (b === undefined) continue;
      const animal = lived.entities.animal[a]!;
      const target = waypointOf(lived.world.gen, animal, periodOf(animal, lived.tick));
      expect([lived.entities.wanderX[a], lived.entities.wanderY[a]]).toEqual([target.x, target.y]);
      expect([skipped.entities.wanderX[b], skipped.entities.wanderY[b]]).toEqual([target.x, target.y]);
      if (!collides(skipped.world, target.x, target.y)) {
        expect([skipped.entities.x[b], skipped.entities.y[b]]).toEqual([target.x, target.y]);
      }
      compared++;
    }
    expect(compared).toBeGreaterThan(10);
  });
});

describe('Fauna: cazar', () => {
  it('golpear quita PV, y al recargar su chunk vuelve entero', () => {
    // El daño no sobrevive a recargarse (decision del autor, 2026-10-03); lo
    // que si sobrevive es la muerte (el test siguiente).
    const state = createGame(1);
    const id = someAnimal(state, (a) => state.entities.maxHealth[a] > 30);
    const key = state.entities.animal[id]!.key;
    const full = state.entities.maxHealth[id];
    step(state, aimAt(state, id));
    expect(state.entities.health[id]).toBe(full - 5);
    expect(state.lastAnimalHits.map((h) => h.key)).toEqual([key]);

    travelAndBack(state);
    const again = state.fauna.get(key)!;
    expect(again).toBeDefined();
    expect(state.entities.health[again]).toBe(full);
  });

  it('el daño de un arbol se olvida al descargar su chunk, y no antes', () => {
    const state = createGame(1);
    state.inventory.add(Resource.StoneAxe, 1);
    state.inventory.select(0);
    const { entities, playerId, world } = state;
    // El primer arbol de alrededor del nacimiento, golpeado una vez.
    let tree: { x: number; y: number } | null = null;
    const px = Math.floor(entities.x[playerId]);
    const py = Math.floor(entities.y[playerId]);
    for (let r = 1; r < 12 && !tree; r++) {
      for (let dy = -r; dy <= r && !tree; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (lifeKindOf(world.featureAt(px + dx, py + dy)) === LifeKind.Tree) {
            tree = { x: px + dx, y: py + dy };
            break;
          }
        }
      }
    }
    expect(tree).not.toBeNull();
    const work = state.work;
    work.damage.set(tree!.y * 100003 + tree!.x, {
      feature: world.featureAt(tree!.x, tree!.y), work: 1, tick: state.tick, x: tree!.x, y: tree!.y,
    });
    // Un paso quieto, sin cambiar de chunk: sigue ahi.
    step(state, emptyIntent());
    expect(work.damage.size).toBe(1);
    // Ir lejos descarga su chunk: se olvida.
    entities.x[playerId] += 40 * CHUNK_SIZE;
    step(state, emptyIntent());
    expect(work.damage.size).toBe(0);
  });

  it('matarlo da su botin entero, y lo que muere no vuelve', () => {
    const state = createGame(1);
    state.inventory.add(Resource.IronAxe, 1);
    state.inventory.select(0);
    const id = someAnimal(state);
    const animal = state.entities.animal[id]!;
    let killed = false;
    for (let t = 0; t < 40 && !killed; t++) {
      step(state, aimAt(state, id));
      killed = state.lastAnimalHits.some((h) => h.killed);
    }
    expect(killed).toBe(true);
    for (const b of animalLoot(animal.species, animal.stage)) expect(state.inventory.count(b.item)).toBe(b.count);
    expect(state.fauna.has(animal.key)).toBe(false);
    expect(state.world.isFaunaDead(animal.key)).toBe(true);

    travelAndBack(state);
    expect(state.fauna.has(animal.key)).toBe(false);
  });

  it('el impacto cae sobre la caja de lo golpeado, uno por objetivo, en preciso y en barrido', () => {
    // Dentro de alguna de sus partes, en los ejes de cada una.
    const near = (p: { x: number; y: number; z: number }, boxes: ReturnType<typeof animalBoxes>) =>
      boxes.some((b) => {
        const dx = p.x - b.cx;
        const dy = p.y - b.cy;
        return (
          Math.abs(dx * b.ux + dy * b.uy) <= b.hl + 1e-6 &&
          Math.abs(-dx * b.uy + dy * b.ux) <= b.hw + 1e-6 &&
          Math.abs(p.z - b.cz) <= b.hh + 1e-6
        );
      });
    for (const precise of [true, false]) {
      const state = createGame(1);
      const id = someAnimal(state, (a) => state.entities.maxHealth[a] > 30);
      const intent = { ...aimAt(state, id), precise };
      step(state, intent);
      const box = animalBoxes(state.entities, id);
      const hit = state.lastAnimalHits.find((h) => h.id === id);
      expect(hit, `modo ${precise ? 'preciso' : 'barrido'}`).toBeDefined();
      // Uno por cosa golpeada: animales y objetos del mundo.
      expect(state.lastImpacts.length).toBe(state.lastAnimalHits.length + state.lastHits.length + state.lastHarvest.filter((r) => r.felled).length);
      expect(state.lastImpacts.some((p) => near(p, box))).toBe(true);
    }
  });

  it('con el inventario lleno el golpe que mataria no completa, y el animal sigue', () => {
    const state = createGame(1);
    for (let i = 0; i < 16; i++) state.inventory.add(Resource.Stone, 100);
    const id = someAnimal(state, (a) => state.entities.animal[a]!.species !== Species.Crab);
    const key = state.entities.animal[id]!.key;
    state.entities.health[id] = 1;
    step(state, aimAt(state, id));
    expect(state.lastBlocked).toBe('full');
    expect(state.world.isFaunaDead(key)).toBe(false);
    expect(state.fauna.get(key)).toBe(id);
    expect(state.entities.health[id]).toBe(1);
  });
});
