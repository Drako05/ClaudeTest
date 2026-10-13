import { describe, expect, it } from 'vitest';
import { animalHeight, Feature, partsOf, SPECIES_COUNT, Species, Stage, STAGE_COUNT } from '@verdant/shared';
import {
  airborneAnimal,
  applyVertical,
  bodyBoxes,
  bodyClashes,
  brakeAnimal,
  EntityKind,
  EntityStore,
  hitboxAt,
  rayOrientedBox,
  REPEL_SPEED,
  takeOff,
  walkAnimal,
  type Animal,
  type World,
} from '@verdant/sim';

/**
 * Un mundo hecho a mano: lo unico que miran el choque de las partes y el andar
 * de un animal es que casillas son solidas (agua), a que altura esta el suelo y
 * que objeto hay en cada casilla (`objects`, ninguno si no se dice).
 */
function fakeWorld(
  solid: (tx: number, ty: number) => boolean,
  floor: (x: number, y: number) => number = () => 0,
  objects: (tx: number, ty: number) => Feature = () => Feature.None,
): World {
  return {
    seed: 1,
    isSolidAt: solid,
    isTerrainSolidAt: solid,
    groundHeightAt: floor,
    // La altura de la columna de 0,5, en medios bloques, de la misma funcion.
    columnTop: (vx: number, vy: number) => floor((vx + 0.5) / 2, (vy + 0.5) / 2) * 2,
    featureAt: objects,
  } as unknown as World;
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

/** Cuantas cajas del animal estan metidas en algo, sin margen: cero es que cabe. */
function clashesOf(world: World, store: EntityStore, id: number): number {
  const a = store.animal[id]!;
  const z = store.z[id];
  return bodyClashes(world, bodyBoxes(a.species, a.stage, store.x[id], store.y[id], z, store.facingX[id], store.facingY[id]), z, 0);
}

/**
 * Anda `seconds` hacia (`dx`, `dy`) como en `stepFauna`: en el suelo
 * `walkAnimal`, en el aire `airborneAnimal`, y la gravedad. `keep` es lo que
 * admiten sus pies, como su bioma.
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

/** Hasta donde llega en x el cuerpo que choca, girado con su rumbo. */
function frontOf(store: EntityStore, id: number): number {
  const a = store.animal[id]!;
  const boxes = bodyBoxes(a.species, a.stage, store.x[id], store.y[id], store.z[id], store.facingX[id], store.facingY[id]);
  return Math.max(...boxes.map((b) => b.cx + b.hl * Math.abs(b.ux) + b.hw * Math.abs(b.uy)));
}

/** Donde acaba por delante el hocico de un bisonte adulto, desde sus pies. */
const SNOUT_REACH = (() => {
  const snout = partsOf(Species.Bison, Stage.Adult).find((p) => p.name === 'hocico')!;
  return snout.at[0] + snout.size[0] / 2;
})();

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

  it('golpean y chocan la cabeza, el cuello, las extremidades y el tronco; lo pequeno o fino no', () => {
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
    // (Con la inercia, 2026-10-10, frena deslizandose y se queda a ~0,951.)
    expect(bison.store.facingX[bison.id]).toBeLessThan(0.99);
  });

  it('no mete la cabeza en un escalon de un bloque: lo salta, y una liebre sube saltando una escalera de medio bloque', () => {
    const step = fakeWorld(() => false, (x) => (x >= 3 ? 1 : 0));
    for (const species of [Species.Bison, Species.Hare]) {
      const a = lone(species, 0, 0.5, 1, 0);
      let jumped = false;
      walk(step, a.store, a.id, 1, 0, 5, () => {
        expect(clashesOf(step, a.store, a.id)).toBe(0);
        if (!a.store.grounded[a.id]) jumped = true;
        // Andando por abajo, ninguna parte entra en el escalon.
        if (a.store.grounded[a.id] && a.store.z[a.id] === 0) expect(frontOf(a.store, a.id)).toBeLessThanOrEqual(3 + 1e-6);
      });
      // Lo salto y siguio arriba (el autor, 2026-10-05: todos saltan un bloque).
      expect(jumped).toBe(true);
      expect(a.store.z[a.id]).toBe(1);
      expect(a.store.x[a.id]).toBeGreaterThan(4);
    }
    // Una escalera de medio bloque, de x = 2 a x = 3. Hasta el 2026-10-13 la
    // liebre la subia andando, con el hocico subiendola de golpe; ahora el
    // hocico llega antes que las patas, y salta cada escalon (el autor).
    const stairs = fakeWorld(() => false, (x) => (x < 2.5 ? 0 : x < 3 ? 0.5 : 1));
    const hare = lone(Species.Hare, 0, 0.5, 1, 0);
    let flights = 0;
    let wasGrounded = true;
    walk(stairs, hare.store, hare.id, 1, 0, 5, () => {
      const s = hare.store;
      if (wasGrounded && !s.grounded[hare.id]) flights++;
      wasGrounded = s.grounded[hare.id] === 1;
      if (s.grounded[hare.id] || s.vz[hare.id] > 0) expect(clashesOf(stairs, s, hare.id)).toBe(0);
    });
    expect(flights).toBe(2);
    expect(hare.store.x[hare.id]).toBeGreaterThan(3.5);
    expect(hare.store.z[hare.id]).toBe(1);
  });

  it('de frente contra una pared y con el destino detras, retrocede, gira y se va', () => {
    // Una pared en x >= 3, y el hocico pegado a ella: cualquier paso de giro
    // la meteria. Antes se quedaba asi para siempre.
    const wall = fakeWorld((tx) => tx >= 3);
    const x0 = 3 - SNOUT_REACH - 1e-3;
    const bison = lone(Species.Bison, x0, 0.5, 1, 0);
    expect(clashesOf(wall, bison.store, bison.id)).toBe(0);
    walk(wall, bison.store, bison.id, -1, 0, 4, () => expect(clashesOf(wall, bison.store, bison.id)).toBe(0));
    expect(bison.store.facingX[bison.id]).toBeLessThan(-0.9);
    expect(bison.store.x[bison.id]).toBeLessThan(x0 - 1);
  });

  it('lo que no se salta se bordea: un pilar, un charco y una pared de dos bloques', () => {
    // Un pilar solido en (3, 0), justo en el camino.
    const pillar = fakeWorld((tx, ty) => tx === 3 && ty === 0);
    const a = lone(Species.Hare, 0.5, 0.5, 1, 0);
    walk(pillar, a.store, a.id, 1, 0, 8, () => expect(clashesOf(pillar, a.store, a.id)).toBe(0));
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
    // Ocho segundos: cada rodeo arranca y frena con la inercia (2026-10-10).
    walk(cliff, c.store, c.id, 1, 0, 8, () => expect(c.store.z[c.id]).toBeLessThan(1));
    expect(c.store.x[c.id]).toBeLessThan(3);
    expect(Math.abs(c.store.y[c.id] - 0.5)).toBeGreaterThan(2);
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

  it('choca con una roca por las patas, la salta y sigue por encima (el autor, 2026-10-05)', () => {
    // Una roca de 1,0 en la casilla 3 de la fila 0; el ciervo anda al este.
    const world = fakeWorld(() => false, () => 0, (tx, ty) => (tx === 3 && ty === 0 ? Feature.RockNode : Feature.None));
    const rock = hitboxAt(world, 3, 0)!;
    // Las patas solas ya chocan: puesto con la pata delantera dentro de la roca.
    const legs = lowestOf(bodyBoxes(Species.RedDeer, Stage.Adult, rock.x0 - 0.3, 0.5, 0, 1, 0));
    expect(legs.length).toBe(4);
    expect(bodyClashes(world, legs, 0, 0.5)).toBeGreaterThan(0);
    // Andando, salta encima, se apoya en ella y sigue.
    const deer = lone(Species.RedDeer, 0, 0.5, 1, 0);
    let stood = 0;
    walk(world, deer.store, deer.id, 1, 0, 8, () => {
      expect(clashesOf(world, deer.store, deer.id)).toBe(0);
      if (deer.store.grounded[deer.id]) stood = Math.max(stood, deer.store.z[deer.id]);
    });
    expect(stood).toBe(rock.z1);
    expect(deer.store.x[deer.id]).toBeGreaterThan(rock.x1 + 1);
    expect(deer.store.z[deer.id]).toBe(0);
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
 * La fisica del 2026-10-10 (el autor): todas las cajas chocan con el terreno
 * en todo momento, solo subir medio bloque es de golpe, saltan como el jugador
 * —a su paso— y arrancan y frenan con inercia.
 */
describe('todas sus cajas chocan siempre, saltan a su paso y tienen inercia', () => {
  it('bajando un escalon no cae mientras lo pisa una pata; cayendo, lo que se mete lo saca la repulsion', () => {
    // Arriba a 1 hasta x = 3; abajo, a 0.
    const ledge = fakeWorld(() => false, (x) => (x < 3 ? 1 : 0));
    const bison = lone(Species.Bison, 1, 0.5, 1, 0);
    bison.store.z[bison.id] = 1;
    let fell = false;
    let repelled = false;
    walk(ledge, bison.store, bison.id, 1, 0, 6, () => {
      const s = bison.store;
      // De pie, ninguna caja dentro del escalon. Cayendo solo choca la base
      // (el autor, 2026-10-13): el tronco que asoma sobre el borde entra y la
      // repulsion lo saca, en horizontal y sin desviarse del borde.
      if (s.grounded[bison.id] && s.repelling[bison.id] === 0) expect(clashesOf(ledge, s, bison.id)).toBe(0);
      if (!s.grounded[bison.id]) fell = true;
      if (s.repelling[bison.id] === 1) repelled = true;
      expect(s.y[bison.id]).toBeCloseTo(0.5, 9);
    });
    expect(fell).toBe(true);
    expect(repelled).toBe(true);
    expect(clashesOf(ledge, bison.store, bison.id)).toBe(0);
    expect(bison.store.z[bison.id]).toBe(0);
    expect(bison.store.x[bison.id]).toBeGreaterThan(4);
  });

  it('cada caja choca a su altura: la cabeza pasa por encima de lo que no le llega, y no por dentro', () => {
    const bison = lone(Species.Bison, 0, 0.5, 1, 0);
    const boxes = bodyBoxes(Species.Bison, Stage.Adult, 0, 0.5, 0, 1, 0);
    // La cabeza es la caja mas adelantada; debajo no hay otra (la joroba si
    // tiene el tronco debajo).
    const head = boxes.reduce((a, b) => (b.cx > a.cx ? b : a));
    const base = head.cz - head.hh;
    const below = Math.floor(base * 2) / 2;
    expect(below).toBeGreaterThan(0);
    // Una columna sola, bajo el centro de la cabeza: a la altura de medio
    // bloque por debajo de su base no estorba; medio bloque mas alta, si.
    const vx = Math.floor(head.cx * 2);
    const vy = Math.floor(head.cy * 2);
    const pillar = (h: number) =>
      fakeWorld(() => false, (x, y) => (Math.floor(x * 2) === vx && Math.floor(y * 2) === vy ? h : 0));
    expect(clashesOf(pillar(below), bison.store, bison.id)).toBe(0);
    expect(clashesOf(pillar(below + 0.5), bison.store, bison.id)).toBeGreaterThan(0);
  });

  it('salta un escalon de un bloque a su paso: en el aire no va mas deprisa que andando', () => {
    const step = fakeWorld(() => false, (x) => (x >= 3 ? 1 : 0));
    for (const species of [Species.Bison, Species.Hare, Species.RedDeer]) {
      const a = lone(species, 0, 0.5, 1, 0);
      let flew = false;
      walk(step, a.store, a.id, 1, 0, 6, () => {
        if (a.store.grounded[a.id]) return;
        flew = true;
        // El paso del ayudante `walk` es 1.
        expect(Math.hypot(a.store.vx[a.id], a.store.vy[a.id])).toBeLessThanOrEqual(1 + 1e-9);
      });
      expect(flew, Species[species]).toBe(true);
      expect(a.store.z[a.id], Species[species]).toBe(1);
    }
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

/**
 * Lo que pidio el autor el 2026-10-13: si lo primero que tocaria un escalon no
 * son sus patas, salta antes de tocarlo, con el impulso horizontal minimo para
 * que sus patas delanteras lleguen arriba —constante todo el vuelo y sumado a
 * lo que anda en el aire—. Y el choque por fases: subiendo y en horizontal
 * chocan todas las cajas; bajando, solo la base, y lo demas que se meta lo
 * saca la repulsion, en horizontal y a `REPEL_SPEED`.
 */
describe('salta antes de tocar, con el impulso minimo, y al caer solo choca la base', () => {
  const halfStep = fakeWorld(() => false, (x) => (x >= 3 ? 0.5 : 0));
  const fullStep = fakeWorld(() => false, (x) => (x >= 3 ? 1 : 0));

  interface TakeOff {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    impulse: number;
  }

  /**
   * Anda hacia +x desde `x0` y dice si salto, desde donde y con que impulso.
   * De pie y subiendo, ninguna caja entra en nada: no espera a chocar.
   */
  function approach(world: World, species: Species, x0 = 0, seconds = 8) {
    const a = lone(species, x0, 0.5, 1, 0);
    let takeoff: TakeOff | null = null;
    let groundZ = a.store.z[a.id];
    walk(world, a.store, a.id, 1, 0, seconds, () => {
      const s = a.store;
      if (!takeoff && !s.grounded[a.id]) {
        takeoff = { x: s.x[a.id], y: s.y[a.id], z: groundZ, vx: s.vx[a.id], vy: s.vy[a.id], impulse: s.impulse[a.id] };
      }
      if (s.grounded[a.id]) groundZ = s.z[a.id];
      if (s.grounded[a.id] || s.vz[a.id] > 0) expect(clashesOf(world, s, a.id), Species[species]).toBe(0);
    });
    return { a, takeoff: takeoff as TakeOff | null };
  }

  /** Repite un salto desde `from` con otro impulso y otro paso en el aire; devuelve la altura a la que acaba. */
  function replay(world: World, species: Species, from: TakeOff, impulse: number, speed: number): number {
    const { store, id } = lone(species, from.x, from.y, 1, 0);
    store.z[id] = from.z;
    store.vx[id] = from.vx;
    store.vy[id] = from.vy;
    store.impulse[id] = impulse;
    takeOff(store, id);
    applyVertical(world, store, id, 1 / 60);
    for (let t = 0; t < 180 && !store.grounded[id]; t++) {
      airborneAnimal(world, store, id, speed, 1 / 60);
      applyVertical(world, store, id, 1 / 60);
    }
    return store.z[id];
  }

  it('una liebre, que llega con el hocico, salta el escalon de medio bloque sin tocarlo', () => {
    const { a, takeoff } = approach(halfStep, Species.Hare);
    expect(takeoff).not.toBeNull();
    expect(a.store.z[a.id]).toBe(0.5);
    expect(a.store.x[a.id]).toBeGreaterThan(4);
  });

  it('un bisonte adulto, que llega con las patas, sube andando el de medio bloque; el de uno lo salta con impulso', () => {
    const half = approach(halfStep, Species.Bison);
    expect(half.takeoff).toBeNull();
    expect(half.a.store.z[half.a.id]).toBe(0.5);
    const full = approach(fullStep, Species.Bison);
    expect(full.takeoff).not.toBeNull();
    expect(full.takeoff!.impulse).toBeGreaterThan(0);
    expect(full.a.store.z[full.a.id]).toBe(1);
  });

  it('el impulso es el minimo, y solo no basta: hace falta andar en el aire', () => {
    const { takeoff } = approach(fullStep, Species.Bison);
    const from = takeoff!;
    // El paso del ayudante `walk` es 1.
    expect(replay(fullStep, Species.Bison, from, from.impulse, 1)).toBe(1);
    expect(replay(fullStep, Species.Bison, from, from.impulse - 0.1, 1)).toBeLessThan(1);
    expect(replay(fullStep, Species.Bison, { ...from, vx: 0, vy: 0 }, from.impulse, 0)).toBeLessThan(1);
  });

  it('lo recibe aunque estuviera parado al pie del escalon', () => {
    const probe = lone(Species.Hare, 0, 0.5, 1, 0);
    const x0 = 3 - frontOf(probe.store, probe.id) - 1e-3;
    const a = lone(Species.Hare, x0, 0.5, 1, 0);
    expect(a.store.vx[a.id]).toBe(0);
    walk(halfStep, a.store, a.id, 1, 0, 1 / 60);
    expect(a.store.grounded[a.id]).toBe(0);
    walk(halfStep, a.store, a.id, 1, 0, 3);
    expect(a.store.z[a.id]).toBe(0.5);
  });

  it('cayendo, lo que se mete se repele en horizontal a REPEL_SPEED, sin subir ni bajar por ello', () => {
    // El bisonte que baja del rellano: su tronco asoma sobre el borde al caer.
    const ledge = fakeWorld(() => false, (x) => (x < 3 ? 1 : 0));
    const bison = lone(Species.Bison, 1, 0.5, 1, 0);
    const s = bison.store;
    s.z[bison.id] = 1;
    let pushed = 0;
    let last = { x: s.x[bison.id], y: s.y[bison.id] };
    walk(ledge, s, bison.id, 1, 0, 6, () => {
      const moved = Math.hypot(s.x[bison.id] - last.x, s.y[bison.id] - last.y);
      last = { x: s.x[bison.id], y: s.y[bison.id] };
      if (s.repelling[bison.id] !== 1) return;
      // Lo que anda (1) mas la repulsion, y nada mas.
      expect(moved).toBeLessThanOrEqual((1 + REPEL_SPEED) / 60 + 1e-9);
      if (moved > 1 / 60 + 1e-6) pushed++;
    });
    expect(pushed).toBeGreaterThan(0);
    expect(clashesOf(ledge, s, bison.id)).toBe(0);
  });
});
