import { describe, expect, it } from 'vitest';
import { collisionBoxOf, emptyIntent, Feature, Species, Stage, Terrain, TICK_DT } from '@verdant/shared';
import {
  bodyOf,
  collides,
  createGame,
  EntityKind,
  EntityStore,
  massOf,
  PUSH_SPEED,
  pushBodies,
  step,
  type Animal,
  type FaunaIndex,
  type World,
} from '@verdant/sim';

/**
 * Los empujes entre cuerpos (el autor, 2026-10-14): «colisiones similares a
 * las de minecraft, que no se sienten rigidas», y «segun el tamaño: el grande
 * aparta mas al pequeño, y el jugador cuenta como un cuerpo mas». Como se
 * reparten y a que velocidad es deduccion mia (`docs/juicio.md`).
 */

/**
 * Un mundo hecho a mano, llano: `water` dice que casillas son agua y
 * `terrain`, el terreno de cada casilla (pradera si no se dice).
 */
function fakeWorld(
  water: (tx: number, ty: number) => boolean = () => false,
  terrain: (tx: number, ty: number) => Terrain = () => Terrain.Grass,
): World {
  return {
    seed: 1,
    isSolidAt: water,
    isTerrainSolidAt: water,
    groundHeightAt: () => 0,
    columnTop: () => 0,
    featureAt: () => Feature.None,
    terrainAt: terrain,
  } as unknown as World;
}

/** Un corral: animales (y un jugador, si se pide) de pie en llano. */
function pen(bodies: { species?: Species; x: number; y: number; z?: number }[]) {
  const store = new EntityStore(16);
  const fauna: FaunaIndex = new Map();
  let player = -1;
  const ids = bodies.map((b, i) => {
    const id = store.spawn(b.species === undefined ? EntityKind.Player : EntityKind.Critter, b.x, b.y);
    store.z[id] = b.z ?? 0;
    store.grounded[id] = 1;
    if (b.species === undefined) player = id;
    else {
      store.animal[id] = { species: b.species, stage: Stage.Adult } as Animal;
      fauna.set(`a${i}`, id);
    }
    return id;
  });
  return { store, fauna, ids, player };
}

/** Lo que se solapan en planta dos cuerpos: positivo, metidos. */
function overlap(store: EntityStore, a: number, b: number): number {
  const reach = bodyOf(store, a).half + bodyOf(store, b).half;
  return Math.min(reach - Math.abs(store.x[b] - store.x[a]), reach - Math.abs(store.y[b] - store.y[a]));
}

describe('Los cuerpos se empujan, y el grande aparta al pequeño', () => {
  it('dos iguales metidos uno en otro se apartan poco a poco, a partes iguales, hasta no tocarse', () => {
    const world = fakeWorld();
    const { store, fauna, ids } = pen([
      { species: Species.Bison, x: 10, y: 10 },
      { species: Species.Bison, x: 10.3, y: 10 },
    ]);
    const [a, b] = ids as [number, number];
    let ticks = 0;
    while (overlap(store, a, b) > 1e-3 && ticks < 600) {
      const ax = store.x[a];
      const bx = store.x[b];
      pushBodies(world, store, fauna, -1);
      // Nunca de golpe: como mucho `PUSH_SPEED` entre los dos, en un tick.
      expect(store.x[b] - bx - (store.x[a] - ax)).toBeLessThanOrEqual(PUSH_SPEED * TICK_DT + 1e-9);
      // A partes iguales, y por la linea entre sus centros.
      expect(store.x[b] - bx + (store.x[a] - ax)).toBeCloseTo(0, 9);
      expect(store.x[b] - bx).toBeGreaterThan(0);
      expect(store.y[a]).toBe(10);
      ticks++;
    }
    expect(overlap(store, a, b)).toBeLessThanOrEqual(1e-3);
    // No es instantaneo: de 0,3 entre centros a separados, mas de medio segundo.
    expect(ticks).toBeGreaterThan(30);
    expect(ticks).toBeLessThan(600);
  });

  it('el grande aparta mas al pequeño: cada uno se lleva la parte de la masa del otro', () => {
    const world = fakeWorld();
    const { store, fauna, ids } = pen([
      { species: Species.Bison, x: 10, y: 10 },
      { species: Species.Hare, x: 10.4, y: 10.2 },
    ]);
    const [bison, hare] = ids as [number, number];
    pushBodies(world, store, fauna, -1);
    const bisonMoved = Math.hypot(store.x[bison] - 10, store.y[bison] - 10);
    const hareMoved = Math.hypot(store.x[hare] - 10.4, store.y[hare] - 10.2);
    expect(hareMoved).toBeGreaterThan(bisonMoved);
    expect(hareMoved / bisonMoved).toBeCloseTo(massOf(store, bison) / massOf(store, hare), 6);
  });

  it('y por el lado que sea: la liebre a la izquierda del bisonte, igual', () => {
    const world = fakeWorld();
    const { store, fauna, ids } = pen([
      { species: Species.Bison, x: 10, y: 10 },
      { species: Species.Hare, x: 9.6, y: 9.8 },
    ]);
    pushBodies(world, store, fauna, -1);
    expect(store.x[ids[1]!]).toBeLessThan(9.6);
    expect(store.x[ids[0]!]).toBeGreaterThan(10);
  });

  it('la masa es el volumen de la caja', () => {
    const { store, ids, player } = pen([{ species: Species.Bison, x: 0, y: 0 }, { x: 5, y: 5 }]);
    const box = bodyOf(store, ids[0]!);
    expect(massOf(store, ids[0]!)).toBeCloseTo(2 * box.half * 2 * box.half * box.height, 9);
    expect(massOf(store, player)).toBeCloseTo(0.68 * 0.68 * 1.8, 9);
  });

  it('el jugador cuenta como un cuerpo mas: aparta a una liebre y un bisonte lo aparta a el', () => {
    const world = fakeWorld();
    const hare = pen([{ x: 10, y: 10 }, { species: Species.Hare, x: 10.3, y: 10 }]);
    pushBodies(world, hare.store, hare.fauna, hare.player);
    const pushedHare = hare.store.x[hare.ids[1]!] - 10.3;
    const pushedByHare = 10 - hare.store.x[hare.player];
    expect(pushedHare).toBeGreaterThan(pushedByHare);
    expect(pushedByHare).toBeGreaterThan(0);

    const bison = pen([{ x: 10, y: 10 }, { species: Species.Bison, x: 10.3, y: 10 }]);
    pushBodies(world, bison.store, bison.fauna, bison.player);
    expect(10 - bison.store.x[bison.player]).toBeGreaterThan(bison.store.x[bison.ids[1]!] - 10.3);
  });

  it('uno encima de otro no se empujan', () => {
    const world = fakeWorld();
    const { store, fauna, ids } = pen([
      { species: Species.Bison, x: 10, y: 10 },
      { species: Species.Hare, x: 10.1, y: 10, z: 3 },
    ]);
    pushBodies(world, store, fauna, -1);
    expect(store.x[ids[0]!]).toBe(10);
    expect(store.x[ids[1]!]).toBe(10.1);
  });

  it('un empuje nunca mete a nadie en el agua ni saca a un animal de su bioma', () => {
    // Agua desde x = 11; una liebre con su caja a 2 cm de ella, y un bisonte
    // (con su caja aun fuera del agua) bien metido en ella, que la empuja hacia
    // alli.
    const hareX = 11 - collisionBoxOf(Species.Hare, Stage.Adult).half - 0.02;
    const sea = fakeWorld((tx) => tx >= 11);
    const wet = pen([
      { species: Species.Bison, x: 10.35, y: 10.5 },
      { species: Species.Hare, x: hareX, y: 10.5 },
    ]);
    for (let t = 0; t < 120; t++) pushBodies(sea, wet.store, wet.fauna, -1);
    const hare = wet.ids[1]!;
    expect(collides(sea, wet.store.x[hare], wet.store.y[hare], bodyOf(wet.store, hare).half)).toBe(false);
    // Lo que la liebre no puede ceder lo cede el bisonte, que si tiene sitio.
    expect(wet.store.x[wet.ids[0]!]).toBeLessThan(10.35);

    // Arena (costa) desde x = 11: la liebre es de pradera, y no sale de ella.
    const shore = fakeWorld(undefined, (tx) => (tx >= 11 ? Terrain.Sand : Terrain.Grass));
    const dry = pen([
      { species: Species.Bison, x: 10.35, y: 10.5 },
      { species: Species.Hare, x: hareX, y: 10.5 },
    ]);
    for (let t = 0; t < 120; t++) pushBodies(shore, dry.store, dry.fauna, -1);
    expect(dry.store.x[dry.ids[1]!]).toBeLessThan(11);
  });

  it('mismo corral, mismo resultado, y en el orden que sea', () => {
    const world = fakeWorld();
    const run = (order: number[]) => {
      const bodies = [
        { species: Species.Bison, x: 10, y: 10 },
        { species: Species.Hare, x: 10.3, y: 10.1 },
        { species: Species.RedDeer, x: 10.1, y: 10.4 },
        { x: 9.8, y: 9.9 },
      ];
      const { store, ids } = pen(bodies);
      // El indice de la fauna, en el orden dado: no cambia nada.
      const fauna: FaunaIndex = new Map(order.filter((i) => i < 3).map((i) => [`a${i}`, ids[i]!]));
      for (let t = 0; t < 60; t++) pushBodies(world, store, fauna, ids[3]!);
      return ids.map((id) => [store.x[id], store.y[id]]);
    };
    expect(run([0, 1, 2])).toEqual(run([2, 0, 1]));
  });

  it('en el juego: un jugador quieto metido en un animal se aparta, aunque no ande', () => {
    const state = createGame(5);
    const { entities: e, playerId: p } = state;
    const id = [...state.fauna.values()].find((a) => e.alive[a] && e.grounded[a])!;
    expect(id).toBeDefined();
    e.x[p] = e.x[id] + 0.05;
    e.y[p] = e.y[id];
    e.z[p] = e.z[id];
    e.vx[p] = 0;
    e.vy[p] = 0;
    const before = e.x[p] - e.x[id];
    step(state, emptyIntent());
    expect(e.x[p] - e.x[id]).toBeGreaterThan(before);
  });
});
