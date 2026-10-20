import { describe, expect, it } from 'vitest';
import {
  animalHeight,
  collisionBoxOf,
  Feature,
  hitPartsOf,
  partsOf,
  SPECIES_COUNT,
  Species,
  Stage,
  STAGE_COUNT,
} from '@verdant/shared';
import {
  airborneAnimal,
  ANIMAL_JUMP_MARGIN,
  applyVertical,
  bodyBoxes,
  bodyOf,
  brakeAnimal,
  CLIMB_SPEED,
  EntityKind,
  EntityStore,
  hitboxAt,
  rayOrientedBox,
  squareFloor,
  STEP_UP,
  walkAnimal,
  type Animal,
  type World,
} from '@verdant/sim';
import { withVoxels } from './ground.js';

/**
 * Un mundo hecho a mano: lo unico que miran el choque de un animal y su andar
 * es que casillas son solidas (agua), a que altura esta el suelo y que objeto
 * hay en cada casilla (`objects`, ninguno si no se dice).
 */
function fakeWorld(
  solid: (tx: number, ty: number) => boolean,
  floor: (x: number, y: number) => number = () => 0,
  objects: (tx: number, ty: number) => Feature = () => Feature.None,
): World {
  return withVoxels({
    seed: 1,
    isSolidAt: solid,
    isTerrainSolidAt: solid,
    groundHeightAt: floor,
    // La altura de la columna de 0,5, en medios bloques, de la misma funcion.
    columnTop: (vx: number, vy: number) => floor((vx + 0.5) / 2, (vy + 0.5) / 2) * 2,
    featureAt: objects,
  }) as unknown as World;
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

/**
 * Cuanto esta metida su caja en algo: lo que asoma lo que pisa por encima de
 * los pies. Cero (o menos) es que cabe; subiendo un escalon andando, tick a
 * tick, puede asomar hasta medio bloque.
 */
function inside(world: World, store: EntityStore, id: number): number {
  const body = bodyOf(store, id);
  return squareFloor(world, store.x[id], store.y[id], body.half, store.z[id] + body.height) - store.z[id];
}

/**
 * Anda `seconds` hacia (`dx`, `dy`) como en `stepFauna`: en el suelo
 * `walkAnimal`, en el aire `airborneAnimal`, y la gravedad. El paso es 1.
 * `keep` es lo que admiten sus pies, como su bioma.
 */
function walk(
  world: World,
  store: EntityStore,
  id: number,
  dx: number,
  dy: number,
  seconds: number,
  each?: () => void,
  keep?: (x: number, y: number) => boolean,
): void {
  for (let t = 0; t < seconds * 60; t++) {
    if (store.grounded[id]) walkAnimal(world, store, id, dx, dy, 1, 1 / 60, keep);
    else airborneAnimal(world, store, id, 1, 1 / 60, keep);
    applyVertical(world, store, id, 1 / 60);
    each?.();
  }
}

/** Las cajas mas bajas de un cuerpo: las que tocan el suelo en llano. */
function lowestOf<T extends { cz: number; hh: number }>(boxes: T[]): T[] {
  const base = Math.min(...boxes.map((b) => b.cz - b.hh));
  return boxes.filter((b) => b.cz - b.hh <= base + 1e-6);
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

  it('se golpean la cabeza, el cuello, las extremidades y el tronco; lo pequeno o fino no', () => {
    // El autor, 2026-10-05: las patas y las pinzas si; las patas de la gaviota
    // y del cangrejo, finas como un cuerno, no.
    const thinLegs = new Set([Species.Gull, Species.Crab]);
    for (let s = 0; s < SPECIES_COUNT; s++) {
      const parts = partsOf(s as Species, Stage.Adult);
      for (const p of parts) {
        const what = `${Species[s]} ${p.name}`;
        if (/^(cola|oreja|cuerno|asta|barba|ojo|ala|pico)/.test(p.name)) expect(p.hit, what).toBe(false);
        if (/^(tronco|cabeza|cuello|caparazon|pinza)/.test(p.name)) expect(p.hit, what).toBe(true);
        if (/^pata/.test(p.name)) expect(p.hit, what).toBe(!thinLegs.has(s as Species));
      }
      expect(parts.some((p) => p.hit)).toBe(true);
    }
    // Los cuadrupedos tienen sus cuatro patas con caja.
    expect(partsOf(Species.RedDeer, Stage.Adult).filter((p) => /^pata/.test(p.name) && p.hit)).toHaveLength(4);
  });

  it('la cabeza de un bisonte se golpea aunque quede lejos del tronco, y su cola no', () => {
    const boxes = bodyBoxes(Species.Bison, Stage.Adult, 0, 0, 0, 1, 0);
    const head = partsOf(Species.Bison, Stage.Adult).find((p) => p.name === 'cabeza')!;
    const tail = partsOf(Species.Bison, Stage.Adult).find((p) => p.name === 'cola')!;
    const down = { x: 0, y: 0, z: -1 };
    const hits = (x: number) => boxes.some((b) => rayOrientedBox({ x, y: 0, z: 5 }, down, b, 10) !== null);
    // La caja de colision llega a ~0,62 del centro; la cabeza esta mas alla.
    expect(head.at[0] - head.size[0] / 2).toBeGreaterThan(collisionBoxOf(Species.Bison, Stage.Adult).half);
    expect(hits(head.at[0])).toBe(true);
    expect(hits(tail.at[0])).toBe(false);
    // Girado, lo que estaba delante esta a su izquierda.
    const turned = bodyBoxes(Species.Bison, Stage.Adult, 0, 0, 0, 0, 1);
    expect(turned.some((b) => rayOrientedBox({ x: 0, y: head.at[0], z: 5 }, down, b, 10) !== null)).toBe(true);
    expect(turned.some((b) => rayOrientedBox({ x: head.at[0], y: 0, z: 5 }, down, b, 10) !== null)).toBe(false);
  });

  it('un golpe que solo toca la pata de un ciervo le da; el de su cuerno, no', () => {
    const parts = partsOf(Species.RedDeer, Stage.Adult);
    const leg = parts.find((p) => p.name.startsWith('pata-del'))!;
    const trunk = parts.find((p) => p.name === 'tronco')!;
    const boxes = bodyBoxes(Species.RedDeer, Stage.Adult, 0, 0, 0, 1, 0);
    // A media pata, por debajo del tronco: solo hay patas a esa altura.
    const z = leg.size[1] / 2;
    expect(trunk.at[1] - trunk.size[1] / 2).toBeGreaterThan(z);
    const side = { x: 0, y: 1, z: 0 };
    expect(boxes.some((b) => rayOrientedBox({ x: leg.at[0], y: -5, z }, side, b, 10) !== null)).toBe(true);
    // Entre las patas, a esa altura, no hay nada.
    expect(boxes.some((b) => rayOrientedBox({ x: 0, y: -5, z }, side, b, 10) !== null)).toBe(false);
  });

  it('en llano, lo que toca el suelo son sus partes mas bajas: las patas, el caparazon, el tronco de la gaviota', () => {
    const lowest = (s: Species) => {
      const boxes = lowestOf(bodyBoxes(s, Stage.Adult, 0, 0, 0, 1, 0));
      return { n: boxes.length, base: Math.min(...boxes.map((b) => b.cz - b.hh)) };
    };
    expect(lowest(Species.RedDeer)).toEqual({ n: 4, base: 0 });
    expect(lowest(Species.Crab).n).toBe(1);
    expect(lowest(Species.Gull).n).toBe(1);
  });
});

/**
 * La caja de colision (el autor, 2026-10-14, como en Minecraft): de base
 * cuadrada, alineada con los ejes, 1,2 × el ancho del cuerpo y alta hasta el
 * lomo; choca por todas sus caras siempre. Las cajas que se golpean siguen
 * siendo las partes.
 */
describe('la caja de colision', () => {
  it('las patas caben en su cuadrado, mirando a lo largo de el (guia de arte, directriz 4)', () => {
    // El autor, 2026-10-14: «las patas delanteras y traseras, no pueden estar
    // mucho mas separadas que el ancho del propio animal, para que la base
    // cuadrada las cubra». Con el animal mirando a lo largo de un eje.
    let checked = 0;
    for (let s = 0; s < SPECIES_COUNT; s++) {
      for (let st = 0; st < STAGE_COUNT; st++) {
        const { half } = collisionBoxOf(s as Species, st as Stage);
        for (const p of partsOf(s as Species, st as Stage)) {
          if (!p.name.startsWith('pata-del') && !p.name.startsWith('pata-tras')) continue;
          const where = `${Species[s]} ${st} ${p.name}`;
          expect(Math.abs(p.at[0]) + p.size[0] / 2, where).toBeLessThanOrEqual(half + 1e-9);
          expect(Math.abs(p.at[2]) + p.size[2] / 2, where).toBeLessThanOrEqual(half + 1e-9);
          checked++;
        }
      }
    }
    // Ocho especies con cuatro patas, en tres etapas.
    expect(checked).toBe(8 * 4 * STAGE_COUNT);
  });

  it('es cuadrada, de 1,2 veces el ancho del cuerpo, y alta hasta el lomo', () => {
    for (let s = 0; s < SPECIES_COUNT; s++) {
      for (let st = 0; st < STAGE_COUNT; st++) {
        const parts = hitPartsOf(s as Species, st as Stage);
        const width = 2 * Math.max(...parts.map((p) => Math.abs(p.at[2]) + p.size[2] / 2));
        const trunk = parts.find((p) => p.name === 'tronco' || p.name === 'caparazon')!;
        const box = collisionBoxOf(s as Species, st as Stage);
        expect(2 * box.half, `${Species[s]} ${st}`).toBeCloseTo(1.2 * width, 9);
        expect(box.height, `${Species[s]} ${st}`).toBeCloseTo(trunk.at[1] + trunk.size[1] / 2, 9);
      }
    }
  });

  it('un bisonte no cabe por un pasillo de un bloque; una liebre si, y lo recorre', () => {
    // Un pasillo de una casilla de ancho a lo largo de x, en y de 0 a 1.
    const corridor = fakeWorld((_tx, ty) => ty !== 0);
    expect(2 * collisionBoxOf(Species.Bison, Stage.Adult).half).toBeGreaterThan(1);
    const hare = lone(Species.Hare, 0.5, 0.5, 1, 0);
    walk(corridor, hare.store, hare.id, 1, 0, 3);
    expect(hare.store.x[hare.id]).toBeGreaterThan(2.5);
  });

  it('gira en el sitio hacia cualquier lado, aunque la cabeza se meta en la pared (se acepta)', () => {
    // De frente contra una pared en x >= 3, con la caja pegada a ella y el
    // destino detras. Hasta el 2026-10-14 el giro no cabia: retrocedia y
    // empujaba (el vaiven que vio el autor). Ahora gira sin moverse.
    const wall = fakeWorld((tx) => tx >= 3);
    const half = collisionBoxOf(Species.Bison, Stage.Adult).half;
    const x0 = 3 - half - 1e-3;
    const bison = lone(Species.Bison, x0, 0.5, 1, 0);
    let movedWhileTurning = 0;
    walk(wall, bison.store, bison.id, -1, 0, 1, () => {
      if (bison.store.facingX[bison.id] > -0.7) movedWhileTurning = Math.max(movedWhileTurning, Math.abs(bison.store.x[bison.id] - x0));
    });
    expect(bison.store.facingX[bison.id]).toBeLessThan(-0.99);
    // Frena lo poco que llevaba; ni retrocede ni empuja.
    expect(movedWhileTurning).toBeLessThan(1e-9);
    walk(wall, bison.store, bison.id, -1, 0, 2);
    expect(bison.store.x[bison.id]).toBeLessThan(x0 - 1);
  });

  it('nunca se mete en el terreno: andando, saltando ni cayendo (subiendo un escalon, como mucho medio bloque)', () => {
    // Sube medio bloque, luego uno, y baja de golpe dos.
    const terrain = fakeWorld(() => false, (x) => (x < 2 ? 0 : x < 4 ? 0.5 : x < 6 ? 1.5 : -0.5));
    for (const species of [Species.Bison, Species.Hare, Species.Crab]) {
      const a = lone(species, 0.5, 0.5, 1, 0);
      walk(terrain, a.store, a.id, 1, 0, 14, () => {
        const deep = inside(terrain, a.store, a.id);
        if (a.store.grounded[a.id]) expect(deep, Species[species]).toBeLessThanOrEqual(STEP_UP + 1e-9);
        else expect(deep, Species[species]).toBeLessThanOrEqual(1e-9);
      });
      expect(a.store.x[a.id], Species[species]).toBeGreaterThan(6.5);
      expect(a.store.z[a.id], Species[species]).toBe(-0.5);
    }
  });

  it('un animal que se encuentra metido en algo sale andando y no se queda clavado', () => {
    // Una pared de dos bloques en x >= 2, y la caja del bisonte dentro.
    const wall = fakeWorld(() => false, (x) => (x >= 2 ? 2 : 0));
    const bison = lone(Species.Bison, 1.8, 0.5, -1, 0);
    expect(inside(wall, bison.store, bison.id)).toBeGreaterThan(STEP_UP);
    walk(wall, bison.store, bison.id, -1, 0, 3);
    expect(inside(wall, bison.store, bison.id)).toBeLessThanOrEqual(0);
    expect(bison.store.z[bison.id]).toBe(0);
  });

  it('lo que no se salta se bordea: un pilar, un charco y una pared de dos bloques', () => {
    // Un pilar solido en (3, 0), justo en el camino.
    const pillar = fakeWorld((tx, ty) => tx === 3 && ty === 0);
    const a = lone(Species.Hare, 0.5, 0.5, 1, 0);
    walk(pillar, a.store, a.id, 1, 0, 8);
    expect(a.store.x[a.id]).toBeGreaterThan(5);
    // Un charco de tres casillas en x = 3: el agua no es de su bioma.
    const open = fakeWorld(() => false);
    const dry = (x: number, y: number) => !(Math.floor(x) === 3 && Math.abs(Math.floor(y)) <= 1);
    const b = lone(Species.Hare, 0.5, 0.5, 1, 0);
    walk(open, b.store, b.id, 1, 0, 10, () => expect(dry(b.store.x[b.id], b.store.y[b.id])).toBe(true), dry);
    expect(b.store.x[b.id]).toBeGreaterThan(5);
    // Una pared de dos bloques a lo largo de y: no se salta, se recorre.
    const cliff = fakeWorld(() => false, (x) => (x >= 3 ? 2 : 0));
    const c = lone(Species.Hare, 0.5, 0.5, 1, 0);
    walk(cliff, c.store, c.id, 1, 0, 8, () => expect(c.store.z[c.id]).toBeLessThan(1));
    expect(c.store.x[c.id]).toBeLessThan(3);
    expect(Math.abs(c.store.y[c.id] - 0.5)).toBeGreaterThan(2);
  });
});

/**
 * Subir y saltar (el autor, 2026-10-14): lo que no pasa de medio bloque se sube
 * andando, tick a tick; lo de mas, hasta un bloque, se salta con la fuerza
 * justa —el escalon mas 0,1—, y antes de rozarlo.
 */
describe('subir andando y saltar con la fuerza justa', () => {
  const halfStep = fakeWorld(() => false, (x) => (x >= 3 ? 0.5 : 0));
  const fullStep = fakeWorld(() => false, (x) => (x >= 3 ? 1 : 0));

  it('el medio bloque se sube andando, tick a tick, sin saltar y sin dejar de andar', () => {
    for (const species of [Species.Bison, Species.Hare, Species.Boar]) {
      const a = lone(species, 0.5, 0.5, 1, 0);
      let most = 0;
      let rising = 0;
      walk(halfStep, a.store, a.id, 1, 0, 6, () => {
        expect(a.store.grounded[a.id], Species[species]).toBe(1);
      });
      // Otra vez, midiendo cada tick.
      const b = lone(species, 0.5, 0.5, 1, 0);
      for (let t = 0; t < 360; t++) {
        const z = b.store.z[b.id];
        const x = b.store.x[b.id];
        walkAnimal(halfStep, b.store, b.id, 1, 0, 1, 1 / 60);
        applyVertical(halfStep, b.store, b.id, 1 / 60);
        if (b.store.z[b.id] > z + 1e-12) {
          most = Math.max(most, b.store.z[b.id] - z);
          rising++;
          expect(b.store.x[b.id], Species[species]).toBeGreaterThan(x);
        }
      }
      expect(a.store.z[a.id], Species[species]).toBe(0.5);
      expect(most, Species[species]).toBeLessThanOrEqual(CLIMB_SPEED / 60 + 1e-9);
      expect(rising, Species[species]).toBe(6);
    }
  });

  it('el de un bloque lo salta con la fuerza justa: el apice, 0,1 por encima, y aterriza arriba', () => {
    for (const species of [Species.Bison, Species.Hare, Species.RedDeer, Species.Crab]) {
      const a = lone(species, 0.5, 0.5, 1, 0);
      let peak = 0;
      let flew = false;
      walk(fullStep, a.store, a.id, 1, 0, 8, () => {
        if (a.store.grounded[a.id]) return;
        flew = true;
        peak = Math.max(peak, a.store.z[a.id]);
        // En el aire no va mas deprisa que andando (el paso del ayudante es 1).
        expect(Math.hypot(a.store.vx[a.id], a.store.vy[a.id])).toBeLessThanOrEqual(1 + 1e-9);
      });
      expect(flew, Species[species]).toBe(true);
      // Hasta el 2026-10-14, con el salto del jugador: a 1,16.
      expect(peak, Species[species]).toBeLessThanOrEqual(1 + ANIMAL_JUMP_MARGIN + 1e-9);
      expect(peak, Species[species]).toBeGreaterThan(1 + ANIMAL_JUMP_MARGIN - 0.03);
      expect(a.store.z[a.id], Species[species]).toBe(1);
    }
  });

  it('salta antes de rozar, aunque llegue en diagonal: no se arrastra a lo largo de la pared', () => {
    // Hacia el escalon de un bloque, a 30° de su cara. Lo que vio el autor:
    // arrastraban la cabeza contra la pared unos metros antes de saltar.
    const a = lone(Species.Hare, 0.5, 0.5, Math.cos(Math.PI / 6), Math.sin(Math.PI / 6));
    const half = bodyOf(a.store, a.id).half;
    let touching = 0;
    let jumped = false;
    walk(fullStep, a.store, a.id, Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), 8, () => {
      if (!a.store.grounded[a.id]) jumped = true;
      if (!jumped && a.store.grounded[a.id] && a.store.x[a.id] + half > 3 - 0.01) touching++;
    });
    expect(jumped).toBe(true);
    expect(touching).toBeLessThanOrEqual(1);
    expect(a.store.z[a.id]).toBe(1);
  });

  it('choca con una roca y la salta, y sigue por encima (el autor, 2026-10-05)', () => {
    // Una roca de 1,0 en la casilla 3 de la fila 0; el ciervo anda al este.
    const world = fakeWorld(() => false, () => 0, (tx, ty) => (tx === 3 && ty === 0 ? Feature.RockNode : Feature.None));
    const rock = hitboxAt(world, 3, 0)!;
    const deer = lone(Species.RedDeer, 0, 0.5, 1, 0);
    let stood = 0;
    walk(world, deer.store, deer.id, 1, 0, 8, () => {
      expect(inside(world, deer.store, deer.id)).toBeLessThanOrEqual(STEP_UP + 1e-9);
      if (deer.store.grounded[deer.id]) stood = Math.max(stood, deer.store.z[deer.id]);
    });
    expect(stood).toBe(rock.z1);
    expect(deer.store.x[deer.id]).toBeGreaterThan(rock.x1 + 1);
    expect(deer.store.z[deer.id]).toBe(0);
  });

  it('arranca en 0,1 s, y al llegar no se para en seco: frena deslizandose 0,1 s', () => {
    const open = fakeWorld(() => false);
    const hare = lone(Species.Hare, 0.5, 0.5, 1, 0);
    walkAnimal(open, hare.store, hare.id, 1, 0, 1, 1 / 60);
    expect(hare.store.vx[hare.id]).toBeCloseTo(1 / 6, 9);
    walk(open, hare.store, hare.id, 1, 0, 1);
    expect(hare.store.vx[hare.id]).toBeCloseTo(1, 9);
    const x0 = hare.store.x[hare.id];
    let ticks = 0;
    while (hare.store.vx[hare.id] > 0 && ticks < 60) {
      brakeAnimal(open, hare.store, hare.id, 1, 1 / 60);
      ticks++;
    }
    expect(hare.store.x[hare.id]).toBeGreaterThan(x0);
    expect(ticks).toBeLessThanOrEqual(6);
  });
});
