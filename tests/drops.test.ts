import { describe, expect, it } from 'vitest';
import {
  createGame,
  DROP_HALF,
  dropFloor,
  featureBox,
  skipTime,
  step,
  THROW_DELAY_TICKS,
  WATER_SURFACE,
  type Drop,
  type GameState,
} from '@verdant/sim';
import { emptyIntent, Feature, Resource, TICK_HZ, toolStats, type Intent } from '@verdant/shared';
import { groundCount } from './ground.js';

/**
 * Los objetos sueltos (el autor, 2026-10-18): todo botin cae al suelo, flota
 * a 0,2 de el, se recoge solo al acercarse, lo tirado se lanza hacia la mirada
 * y tarda unos 2 s en dejarse recoger, dos montones iguales se funden y nada
 * de eso se pierde al alejarse.
 */

function atSpawn(seed = 12345): { state: GameState; tx: number; ty: number } {
  const state = createGame(seed);
  const e = state.entities;
  const id = state.playerId;
  const tx = Math.floor(e.x[id]);
  const ty = Math.floor(e.y[id]);
  e.x[id] = tx + 0.5;
  e.y[id] = ty + 0.5;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) state.world.setFeature(tx + dx, ty + dy, Feature.None);
  }
  return { state, tx, ty };
}

function act(state: GameState, over: Partial<Intent> = {}, ticks = 1): void {
  for (let i = 0; i < ticks; i++) step(state, { ...emptyIntent(), ...over });
}

/** Lleva al jugador a un punto, de pie en su suelo. */
function moveTo(state: GameState, x: number, y: number): void {
  const e = state.entities;
  const id = state.playerId;
  e.x[id] = x;
  e.y[id] = y;
  e.z[id] = state.world.groundHeightAt(x, y);
}

const drops = (state: GameState): Drop[] => [...state.world.drops.values()];

/** Un monton recogible ya, soltado justo encima de su suelo. */
function dropAt(state: GameState, item: Resource, count: number, x: number, y: number, wear = 0): Drop {
  return state.world.drops.add({
    item, count, wear, x, y, z: dropFloor(state.world, x, y) + 0.5, vx: 0, vy: 0, vz: 0, pickableAt: 0,
  });
}

/**
 * Cuanto se alejo un monton de la cara de una caja por la que salio, por su
 * rumbo desde el centro: negativo si su huella pisa la caja.
 */
function beyondBox(d: Drop, box: { x0: number; x1: number; y0: number; y1: number }): number {
  const dx = d.x - (box.x0 + box.x1) / 2;
  const dy = d.y - (box.y0 + box.y1) / 2;
  const r = Math.hypot(dx, dy);
  const out = ((box.x1 - box.x0) / 2 + DROP_HALF) / (Math.max(Math.abs(dx), Math.abs(dy)) / r);
  return r - out;
}

describe('El botin cae al suelo', () => {
  it('talar, coger a mano y golpear un arbol sin hacha sueltan el botin en el suelo, no en el inventario', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 1, ty, Feature.MeadowPlant);
    act(state, { harvest: true, aimX: 1, aimY: 0, aimZ: Math.sin((-40 * Math.PI) / 180) });
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.None);
    expect(groundCount(state.world, Resource.Berries)).toBeGreaterThan(0);
    expect(state.inventory.count(Resource.Berries)).toBe(0);

    state.world.setFeature(tx - 1, ty, Feature.ForestTree);
    act(state, { harvest: true, aimX: -1, aimY: 0 });
    expect(state.world.featureAt(tx - 1, ty)).toBe(Feature.ForestTree);
    expect(groundCount(state.world, Resource.Branch)).toBe(1);
    expect(state.inventory.count(Resource.Branch)).toBe(0);
  });

  it('salta y se esparce, cada monton hacia su lado, y se posa a 0,2 de su suelo', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 1, ty, Feature.MeadowPlant);
    // Sale de la mitad de la altura de la mata (el autor, 2026-10-18).
    const box = featureBox(state.world, tx + 1, ty)!;
    act(state, { harvest: true, aimX: 1, aimY: 0, aimZ: Math.sin((-40 * Math.PI) / 180) });
    const born = drops(state);
    // Un tick despues de salir, a no mas de lo que sube en un tick.
    for (const d of born) expect(Math.abs(d.z - (box.z0 + box.z1) / 2)).toBeLessThan(0.1);
    // Lejos, para que el iman no se lo lleve mientras cae.
    moveTo(state, tx + 8.5, ty + 0.5);
    act(state, {}, TICK_HZ);
    const all = drops(state);
    expect(all.length).toBeGreaterThanOrEqual(2);
    for (const d of all) {
      expect(d.resting).toBe(true);
      // 0,2: el numero del autor, escrito y no leido de la constante.
      expect(d.z).toBeCloseTo(dropFloor(state.world, d.x, d.y) + 0.2, 6);
      expect(beyondBox(d, box)).toBeGreaterThanOrEqual(-1e-9);
      // Cae a no mas de 0,5 de la cara por la que sale (el autor), escrito.
      expect(beyondBox(d, box)).toBeLessThanOrEqual(0.5 + 1e-9);
    }
    // Cada uno hacia su lado: no todos en el mismo punto.
    expect(new Set(all.map((d) => `${d.x.toFixed(3)},${d.y.toFixed(3)}`)).size).toBe(all.length);
  });

  it('la rama de un arbol en pie sale de su tronco y cae al suelo, no encima de el', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx - 1, ty, Feature.ForestTree);
    const trunk = featureBox(state.world, tx - 1, ty)!;
    act(state, { harvest: true, aimX: -1, aimY: 0 });
    moveTo(state, tx + 8.5, ty + 0.5);
    act(state, {}, TICK_HZ);
    const [branch] = drops(state);
    expect(branch.resting).toBe(true);
    expect(branch.z).toBeLessThan(trunk.z1);
    expect(beyondBox(branch, trunk)).toBeGreaterThanOrEqual(-1e-9);
    expect(beyondBox(branch, trunk)).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it('sobre el agua flota en su superficie', () => {
    const { state } = atSpawn();
    const id = state.playerId;
    const px = state.entities.x[id];
    const py = state.entities.y[id];
    let water: { x: number; y: number } | null = null;
    for (let r = 2; r < 80 && !water; r++) {
      for (let a = 0; a < 32 && !water; a++) {
        const x = Math.floor(px + r * Math.cos((a / 32) * Math.PI * 2)) + 0.5;
        const y = Math.floor(py + r * Math.sin((a / 32) * Math.PI * 2)) + 0.5;
        if (state.world.isTerrainSolidAt(x, y)) water = { x, y };
      }
    }
    expect(water).not.toBeNull();
    const d = dropAt(state, Resource.Wood, 1, water!.x, water!.y);
    act(state, {}, 30);
    expect(d.resting).toBe(true);
    expect(d.z).toBeCloseTo(WATER_SURFACE + 0.2, 6);
  });
});

describe('Recoger', () => {
  it('el iman: a 1 del cuerpo vuela hacia el jugador y entra; mas lejos se queda', () => {
    const { state } = atSpawn();
    const id = state.playerId;
    const x = state.entities.x[id];
    const y = state.entities.y[id];
    // El iman llega a 1 bloque del cuerpo (el autor, 2026-10-18), escrito.
    const near = dropAt(state, Resource.Stone, 3, x + 0.9, y);
    const far = dropAt(state, Resource.Wood, 2, x, y + 1.2);
    act(state, {}, TICK_HZ);
    expect(state.world.drops.get(near.id)).toBeUndefined();
    expect(state.inventory.count(Resource.Stone)).toBe(3);
    expect(state.world.drops.get(far.id)).toBe(far);
    expect(state.inventory.count(Resource.Wood)).toBe(0);
  });

  it('entra lo que cabe y el resto se queda en el suelo, sin volver a volar', () => {
    const { state } = atSpawn();
    const inv = state.inventory;
    // Todo lleno de madera salvo 30 de sitio para piedra.
    inv.add(Resource.Stone, 70);
    while (inv.addSome(Resource.Wood, 100) > 0);
    const id = state.playerId;
    const d = dropAt(state, Resource.Stone, 50, state.entities.x[id] + 1, state.entities.y[id]);
    act(state, {}, TICK_HZ);
    expect(inv.count(Resource.Stone)).toBe(100);
    expect(state.world.drops.get(d.id)).toBe(d);
    expect(d.count).toBe(20);
    expect(d.homing).toBe(false);
  });
});

describe('Tirar', () => {
  it('lo lanza hacia la mirada y no se deja recoger hasta pasados unos 2 s', () => {
    const { state } = atSpawn();
    const id = state.playerId;
    state.inventory.add(Resource.Stone, 10);
    const x0 = state.entities.x[id];
    act(state, { discard: 0, aimX: 1, aimY: 0 });
    expect(state.inventory.count(Resource.Stone)).toBe(0);
    const [d] = drops(state);
    expect(d.count).toBe(10);
    expect(d.vx).toBeGreaterThan(0);
    act(state, {}, TICK_HZ);
    // Cayo por delante, a mas de un bloque.
    expect(d.resting).toBe(true);
    expect(d.x - x0).toBeGreaterThan(1);
    // Junto a el, aun dentro de los 2 s, no se recoge.
    moveTo(state, d.x - 0.5, d.y);
    act(state, {}, THROW_DELAY_TICKS - TICK_HZ - 2);
    expect(state.inventory.count(Resource.Stone)).toBe(0);
    act(state, {}, TICK_HZ);
    expect(state.inventory.count(Resource.Stone)).toBe(10);
  });

  it('una herramienta tirada conserva su desgaste', () => {
    const { state } = atSpawn();
    const inv = state.inventory;
    inv.add(Resource.StoneAxe, 1);
    inv.wear[0] = 5;
    act(state, { discard: 0, aimX: 1, aimY: 0 });
    const [d] = drops(state);
    expect(d.wear).toBe(5);
    act(state, {}, THROW_DELAY_TICKS);
    moveTo(state, d.x, d.y);
    act(state, {}, TICK_HZ);
    expect(inv.count(Resource.StoneAxe)).toBe(1);
    expect(inv.wear[0]).toBe(5);
    expect(inv.wear[0]).toBeLessThan(toolStats(Resource.StoneAxe)!.uses);
  });
});

describe('Montones', () => {
  it('dos iguales que se posan juntos se funden; dos herramientas no', () => {
    const { state } = atSpawn();
    const id = state.playerId;
    const x = state.entities.x[id] + 6;
    const y = state.entities.y[id];
    dropAt(state, Resource.Wood, 3, x, y);
    dropAt(state, Resource.Wood, 4, x + 0.2, y);
    dropAt(state, Resource.StoneAxe, 1, x, y + 0.2, 40);
    dropAt(state, Resource.StoneAxe, 1, x + 0.1, y + 0.2, 40);
    act(state, {}, 30);
    expect(drops(state).filter((d) => d.item === Resource.Wood).map((d) => d.count)).toEqual([7]);
    expect(drops(state).filter((d) => d.item === Resource.StoneAxe)).toHaveLength(2);
  });
});

describe('Duran para siempre', () => {
  it('alejarse hasta descargar su chunk y volver no los toca', () => {
    const { state } = atSpawn();
    const id = state.playerId;
    const x = state.entities.x[id];
    const y = state.entities.y[id];
    const d = dropAt(state, Resource.Wood, 5, x + 4, y);
    act(state, {}, 30);
    const at = { x: d.x, y: d.y, z: d.z };
    const chunks = state.world.loadedChunkCount;
    moveTo(state, x + 32 * 12, y);
    act(state, {}, 2);
    moveTo(state, x + 32 * 24, y);
    act(state, {}, 2);
    expect(state.world.drops.get(d.id)).toBe(d);
    moveTo(state, x - 2.5, y);
    act(state, {}, 2);
    expect(state.world.loadedChunkCount).toBeLessThanOrEqual(chunks + 4);
    expect({ x: d.x, y: d.y, z: d.z, count: d.count }).toEqual({ ...at, count: 5 });
  });
});

describe('Las leyes', () => {
  it('con la misma semilla, el mismo botin en los mismos sitios', () => {
    const run = () => {
      const { state, tx, ty } = atSpawn();
      state.world.setFeature(tx + 1, ty, Feature.MeadowPlant);
      act(state, { harvest: true, aimX: 1, aimY: 0, aimZ: Math.sin((-40 * Math.PI) / 180) });
      act(state, {}, 20);
      return drops(state).map((d) => [d.item, d.count, d.x, d.y, d.z]);
    };
    expect(run()).toEqual(run());
  });

  it('saltar el tiempo deja los montones como vivirlo quieto', () => {
    const play = (skip: boolean) => {
      const { state, tx, ty } = atSpawn();
      state.world.setFeature(tx + 1, ty, Feature.MeadowPlant);
      act(state, { harvest: true, aimX: 1, aimY: 0, aimZ: Math.sin((-40 * Math.PI) / 180) });
      // Lejos del iman: lo que se compara es la caida.
      moveTo(state, tx + 8.5, ty + 0.5);
      if (skip) skipTime(state, 3 * TICK_HZ);
      else act(state, {}, 3 * TICK_HZ);
      return { ground: drops(state).map((d) => [d.item, d.count, d.x, d.y, d.z]), berries: state.inventory.count(Resource.Berries) };
    };
    expect(play(true)).toEqual(play(false));
  });
});
