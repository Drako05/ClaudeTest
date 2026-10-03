import { describe, expect, it } from 'vitest';
import { animalHeight, partsOf, SPECIES_COUNT, Species, Stage, STAGE_COUNT } from '@verdant/shared';
import {
  bodyBoxes,
  bodyClashes,
  EntityKind,
  EntityStore,
  rayOrientedBox,
  walkAnimal,
  type Animal,
  type World,
} from '@verdant/sim';

/**
 * Un mundo hecho a mano: lo unico que miran el choque de las partes y el andar
 * de un animal es que casillas son solidas y a que altura esta el suelo.
 */
function fakeWorld(solid: (tx: number, ty: number) => boolean, floor: (x: number, y: number) => number = () => 0): World {
  const floorRangeAt = (tx: number, ty: number, out: Float64Array) => {
    const e = 0.02;
    const h = [floor(tx + e, ty + e), floor(tx + 1 - e, ty + e), floor(tx + e, ty + 1 - e), floor(tx + 1 - e, ty + 1 - e)];
    out[0] = Math.min(...h);
    out[1] = Math.max(...h);
  };
  return { isSolidAt: solid, floorHeightAt: floor, floorRangeAt } as unknown as World;
}

/** Un animal suelto, con los pies en (`x`, `y`) y mirando a (`fx`, `fy`). */
function lone(species: Species, x: number, y: number, fx: number, fy: number) {
  const store = new EntityStore(4);
  const id = store.spawn(EntityKind.Critter, x, y);
  store.animal[id] = { species, stage: Stage.Adult } as Animal;
  store.facingX[id] = fx;
  store.facingY[id] = fy;
  return { store, id };
}

function clashesOf(world: World, store: EntityStore, id: number): number {
  const a = store.animal[id]!;
  return bodyClashes(world, bodyBoxes(a.species, a.stage, store.x[id], store.y[id], store.z[id], store.facingX[id], store.facingY[id]), store.x[id], store.y[id]);
}

/** Anda `seconds` hacia (`dx`, `dy`), con los pies siempre en el suelo. */
function walk(world: World, store: EntityStore, id: number, dx: number, dy: number, seconds: number, each?: () => void): void {
  for (let t = 0; t < seconds * 60; t++) {
    walkAnimal(world, store, id, dx, dy, 1, 1 / 60);
    store.z[id] = world.floorHeightAt(store.x[id], store.y[id]);
    each?.();
  }
}

describe('el plano del cuerpo', () => {
  it('cada especie y etapa mide de alto su animalHeight, con los pies en el suelo', () => {
    for (let s = 0; s < SPECIES_COUNT; s++) {
      for (let st = 0; st < STAGE_COUNT; st++) {
        const parts = partsOf(s as Species, st as Stage);
        const top = Math.max(...parts.map((p) => p.at[1] + p.size[1] / 2));
        const bottom = Math.min(...parts.map((p) => p.at[1] - p.size[1] / 2));
        expect(top, `${Species[s]} ${st}`).toBeCloseTo(animalHeight(s as Species, st as Stage), 9);
        expect(bottom, `${Species[s]} ${st}`).toBeCloseTo(0, 9);
        expect(parts.length, `${Species[s]} ${st}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('golpean y chocan el tronco y la cabeza; la cola, las patas y las orejas no', () => {
    for (let s = 0; s < SPECIES_COUNT; s++) {
      const parts = partsOf(s as Species, Stage.Adult);
      for (const p of parts) {
        if (/^(cola|pata|oreja|cuerno|asta|barba|ojo)/.test(p.name)) expect(p.hit, `${Species[s]} ${p.name}`).toBe(false);
        if (/^(tronco|cabeza|caparazon)$/.test(p.name)) expect(p.hit, `${Species[s]} ${p.name}`).toBe(true);
      }
      expect(parts.some((p) => p.hit)).toBe(true);
    }
  });

  it('la cabeza de un bisonte se golpea aunque quede lejos del tronco, y su cola no', () => {
    const boxes = bodyBoxes(Species.Bison, Stage.Adult, 0, 0, 0, 1, 0);
    const head = partsOf(Species.Bison, Stage.Adult).find((p) => p.name === 'cabeza')!;
    const tail = partsOf(Species.Bison, Stage.Adult).find((p) => p.name === 'cola')!;
    const down = { x: 0, y: 0, z: -1 };
    const hits = (x: number) => boxes.some((b) => rayOrientedBox({ x, y: 0, z: 5 }, down, b, 10) !== null);
    // La caja cuadrada de antes llegaba a 0,9 del centro; la cabeza esta mas alla.
    expect(head.at[0] - head.size[0] / 2).toBeGreaterThan(0.9);
    expect(hits(head.at[0])).toBe(true);
    expect(hits(tail.at[0])).toBe(false);
    // Girado, lo que estaba delante esta a su izquierda.
    const turned = bodyBoxes(Species.Bison, Stage.Adult, 0, 0, 0, 0, 1);
    expect(turned.some((b) => rayOrientedBox({ x: 0, y: head.at[0], z: 5 }, down, b, 10) !== null)).toBe(true);
    expect(turned.some((b) => rayOrientedBox({ x: head.at[0], y: 0, z: 5 }, down, b, 10) !== null)).toBe(false);
  });
});

describe('el cuerpo choca con el terreno', () => {
  // Un pasillo de una casilla de ancho a lo largo de x, en y de 0 a 1.
  const corridor = fakeWorld((_tx, ty) => ty !== 0);

  it('un bisonte no cabe por un pasillo de un bloque; una liebre si, y lo recorre', () => {
    const bison = lone(Species.Bison, 0.5, 0.5, 1, 0);
    expect(clashesOf(corridor, bison.store, bison.id)).toBeGreaterThan(0);
    const hare = lone(Species.Hare, 0.5, 0.5, 1, 0);
    expect(clashesOf(corridor, hare.store, hare.id)).toBe(0);
    walk(corridor, hare.store, hare.id, 1, 0, 3);
    expect(hare.store.x[hare.id]).toBeGreaterThan(3);
    expect(clashesOf(corridor, hare.store, hare.id)).toBe(0);
  });

  it('no gira si al girar la cabeza entrara en una pared, ni avanza contra ella', () => {
    // Una pared en x >= 2.
    const wall = fakeWorld((tx) => tx >= 2);
    const bison = lone(Species.Bison, 0.5, 0.5, 0, 1);
    expect(clashesOf(wall, bison.store, bison.id)).toBe(0);
    walk(wall, bison.store, bison.id, 1, 0, 3, () => expect(clashesOf(wall, bison.store, bison.id)).toBe(0));
    // Mirando a +x su hocico llegaria mas alla de x = 2: no termino de girar.
    expect(bison.store.facingX[bison.id]).toBeLessThan(0.95);
  });

  it('no mete la cabeza en un escalon de un nivel, y una liebre sube una rampa', () => {
    const step = fakeWorld(() => false, (x) => (x >= 3 ? 1 : 0));
    const bison = lone(Species.Bison, 0, 0.5, 1, 0);
    walk(step, bison.store, bison.id, 1, 0, 5, () => expect(clashesOf(step, bison.store, bison.id)).toBe(0));
    const snout = partsOf(Species.Bison, Stage.Adult).find((p) => p.name === 'hocico')!;
    expect(bison.store.x[bison.id] + snout.at[0] + snout.size[0] / 2).toBeLessThanOrEqual(3 + 1e-6);
    // La rampa sube un nivel en una casilla, de x = 2 a x = 3.
    const ramp = fakeWorld(() => false, (x) => Math.max(0, Math.min(1, x - 2)));
    const hare = lone(Species.Hare, 0, 0.5, 1, 0);
    walk(ramp, hare.store, hare.id, 1, 0, 5);
    expect(hare.store.x[hare.id]).toBeGreaterThan(3.5);
    expect(hare.store.z[hare.id]).toBe(1);
  });

  it('un animal que nacio sin caber sale andando y no se queda clavado', () => {
    // La cabeza dentro de una pared en x >= 2: se aleja hacia -x.
    const wall = fakeWorld((tx) => tx >= 2);
    const bison = lone(Species.Bison, 0.8, 0.5, 1, 0);
    const before = clashesOf(wall, bison.store, bison.id);
    expect(before).toBeGreaterThan(0);
    walk(wall, bison.store, bison.id, -1, 0, 6);
    expect(clashesOf(wall, bison.store, bison.id)).toBe(0);
    expect(bison.store.x[bison.id]).toBeLessThan(0.5);
    // Metido de grupa y mirando hacia fuera: sale avanzando, sin girar.
    const rump = lone(Species.Bison, 1.2, 0.5, -1, 0);
    expect(clashesOf(wall, rump.store, rump.id)).toBeGreaterThan(0);
    walk(wall, rump.store, rump.id, -1, 0, 3);
    expect(clashesOf(wall, rump.store, rump.id)).toBe(0);
    expect(rump.store.x[rump.id]).toBeLessThan(0.8);
  });
});
