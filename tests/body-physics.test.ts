/**
 * La fisica del cuerpo del jugador desde el 2026-10-10 (el autor):
 *
 * - **todas las cajas chocan con el terreno en todo momento**: el terreno se
 *   pisa con la huella entera, no en el centro;
 * - **solo subir es de golpe** (≤ `STEP_UP`); bajar, por poco que sea, es caer
 *   con la gravedad, y cayendo no se salta (sin margen);
 * - **inercia**: arrancar y frenar duran `INERTIA_TIME`, 0,1 s;
 * - y la cabeza choca con lo que tiene encima (el cuerpo mide 1,8).
 *
 * Mundos hechos a mano, con la altura de cada columna de 0,5 en medios bloques.
 */

import { describe, expect, it } from 'vitest';
import { Feature, TICK_DT } from '@verdant/shared';
import {
  applyVertical,
  BODY_RADIUS,
  EntityKind,
  EntityStore,
  INERTIA_TIME,
  moveAirborne,
  moveEntity,
  PLAYER_HEIGHT,
  takeOff,
  WALK_SPEED,
  type World,
} from '@verdant/sim';

/** Un mundo de columnas: `halves(vx, vy)` es la altura de cada una en medios bloques. */
function columns(halves: (vx: number, vy: number) => number, features: Record<string, Feature> = {}): World {
  return {
    seed: 7,
    groundHeightAt: (x: number, y: number) => halves(Math.floor(x * 2), Math.floor(y * 2)) / 2,
    columnTop: halves,
    featureAt: (x: number, y: number) => features[`${Math.floor(x)},${Math.floor(y)}`] ?? Feature.None,
    isSolidAt: () => false,
    isTerrainSolidAt: () => false,
  } as unknown as World;
}

/** Un jugador de pie en (`x`, `y`, `z`). */
function standing(x: number, y: number, z: number): { store: EntityStore; id: number } {
  const store = new EntityStore(4);
  const id = store.spawn(EntityKind.Player, x, y);
  store.z[id] = z;
  store.grounded[id] = 1;
  return { store, id };
}

/** Un tick como en `tick.ts`: en el suelo o en el aire se anda, y luego la vertical. */
function tick(world: World, store: EntityStore, id: number, moveX: number, moveY: number): void {
  if (store.grounded[id]) moveEntity(world, store, id, moveX, moveY, TICK_DT);
  else moveAirborne(world, store, id, moveX, moveY, TICK_DT);
  applyVertical(world, store, id, TICK_DT);
}

/** Cuantos ticks dura `INERTIA_TIME`: 6 a 60 Hz. */
const RAMP = Math.round(INERTIA_TIME / TICK_DT);

describe('El terreno se pisa con la huella entera', () => {
  // Un escalon de medio bloque: x < 1 a 0,5; de ahi en adelante, a 0.
  const step = columns((vx) => (vx < 2 ? 1 : 0));

  it('de pie en el borde mientras la huella toque el escalon, aunque el centro ya este fuera', () => {
    const x = 1 + BODY_RADIUS / 2;
    const { store, id } = standing(x, 0.5, 0.5);
    applyVertical(step, store, id, TICK_DT);
    expect(store.grounded[id]).toBe(1);
    expect(store.z[id]).toBe(0.5);
  });

  it('con la huella metida en una pared, no sube de golpe a lo alto: solo sube de golpe medio bloque', () => {
    // Pared de un bloque a partir de x = 1; el cuerpo, puesto a mano con el
    // centro fuera y la huella dentro (como al aparecer en un sitio a mano).
    const wall = columns((vx) => (vx >= 2 ? 2 : 0));
    const { store, id } = standing(1 - BODY_RADIUS / 2, 0.5, 0);
    for (let t = 0; t < 10; t++) applyVertical(wall, store, id, TICK_DT);
    expect(store.z[id]).toBe(0);
    expect(store.grounded[id]).toBe(1);
  });

  it('una pared se toca con la huella: se para con el borde del cuerpo en su cara', () => {
    // Pared de un bloque a partir de x = 2; llano a 0 antes.
    const wall = columns((vx) => (vx >= 4 ? 2 : 0));
    const { store, id } = standing(0.5, 0.5, 0);
    for (let t = 0; t < 90; t++) tick(wall, store, id, 1, 0);
    expect(store.x[id] + BODY_RADIUS).toBeLessThanOrEqual(2 + 1e-9);
    expect(store.x[id] + BODY_RADIUS).toBeGreaterThan(2 - WALK_SPEED * TICK_DT);
    expect(store.z[id]).toBe(0);
  });
});

describe('Bajar es caer, y solo subir es de golpe', () => {
  const step = columns((vx) => (vx < 2 ? 1 : 0));

  it('bajar medio bloque cae con la gravedad: ~0,13 s, pasando por alturas intermedias', () => {
    const { store, id } = standing(1 + BODY_RADIUS + 0.01, 0.5, 0.5);
    applyVertical(step, store, id, TICK_DT);
    expect(store.grounded[id]).toBe(0);
    const heights: number[] = [];
    let ticks = 1;
    for (; ticks < 60 && !store.grounded[id]; ticks++) {
      applyVertical(step, store, id, TICK_DT);
      heights.push(store.z[id]);
    }
    expect(store.z[id]).toBe(0);
    expect(heights.filter((z) => z > 0.01 && z < 0.49).length).toBeGreaterThan(2);
    // La caida libre de medio bloque: √(2·0,5/62) ≈ 0,127 s.
    expect(ticks * TICK_DT).toBeGreaterThan(0.1);
    expect(ticks * TICK_DT).toBeLessThan(0.16);
  });

  it('cayendo no se salta: sin margen (el autor, 2026-10-10)', () => {
    const { store, id } = standing(1 + BODY_RADIUS + 0.01, 0.5, 0.5);
    applyVertical(step, store, id, TICK_DT);
    expect(store.grounded[id]).toBe(0);
    expect(takeOff(store, id)).toBe(false);
  });

  it('subir medio bloque es de golpe, como seguir andando', () => {
    const { store, id } = standing(2.5, 0.5, 0);
    let maxRise = 0;
    for (let t = 0; t < 60; t++) {
      const z = store.z[id];
      tick(step, store, id, -1, 0);
      maxRise = Math.max(maxRise, store.z[id] - z);
      expect(store.grounded[id]).toBe(1);
    }
    expect(store.z[id]).toBe(0.5);
    expect(maxRise).toBe(0.5);
  });
});

describe('La inercia: arrancar y frenar en 0,1 s', () => {
  const flat = columns(() => 0);

  it('arranca a ritmo constante y en 0,1 s va a su paso', () => {
    const { store, id } = standing(0.5, 0.5, 0);
    for (let t = 1; t <= RAMP; t++) {
      tick(flat, store, id, 1, 0);
      expect(store.vx[id]).toBeCloseTo((WALK_SPEED * t) / RAMP, 9);
    }
    expect(store.vx[id]).toBe(WALK_SPEED);
  });

  it('al soltar resbala un poco y se para en 0,1 s', () => {
    const { store, id } = standing(0.5, 0.5, 0);
    for (let t = 0; t < 30; t++) tick(flat, store, id, 1, 0);
    const x0 = store.x[id];
    let ticks = 0;
    while (store.vx[id] !== 0 && ticks < 60) {
      tick(flat, store, id, 0, 0);
      ticks++;
    }
    expect(ticks).toBe(RAMP);
    // A ritmo constante: (n − 1)/2 ticks de paso, ~0,22 m andando a 60 Hz.
    expect(store.x[id] - x0).toBeCloseTo((WALK_SPEED * TICK_DT * (RAMP - 1)) / 2, 9);
  });

  it('contra una pared no se acumula velocidad', () => {
    const wall = columns((vx) => (vx >= 4 ? 2 : 0));
    const { store, id } = standing(1.5, 0.5, 0);
    for (let t = 0; t < 30; t++) tick(wall, store, id, 1, 0);
    expect(store.vx[id]).toBe(0);
  });
});

describe('La cabeza choca con lo que tiene encima', () => {
  // Una mesa en la casilla (0, 0), apoyada en lo mas alto de su casilla: una
  // sola columna, la (1, 1), a 2,5. Asi su caja (2,5 a 3,5) queda colgada sobre
  // las otras tres, que estan a 0: un techo, que el mundo de hoy no genera.
  const roofed = columns((vx, vy) => (vx === 1 && vy === 1 ? 5 : 0), { '0,0': Feature.Workbench });

  it('debajo se esta de pie: lo que queda por encima de la cabeza no estorba', () => {
    const { store, id } = standing(-1, 0.5, 0);
    for (let t = 0; t < 60; t++) tick(roofed, store, id, 1, 0);
    // Pasa bajo la mesa hasta topar con la columna alta, en x = 0,5.
    expect(store.x[id]).toBeGreaterThan(0);
    expect(store.x[id] + BODY_RADIUS).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(store.z[id]).toBe(0);
  });

  it('un salto debajo corta la subida en el techo, y vuelve a caer', () => {
    const { store, id } = standing(0.1, 0.5, 0);
    expect(takeOff(store, id)).toBe(true);
    let peak = 0;
    for (let t = 0; t < 90; t++) {
      tick(roofed, store, id, 0, 0);
      peak = Math.max(peak, store.z[id]);
    }
    // La cabeza (1,8) contra el techo (2,5): los pies no pasan de 0,7.
    expect(peak).toBeCloseTo(2.5 - PLAYER_HEIGHT, 9);
    expect(store.grounded[id]).toBe(1);
    expect(store.z[id]).toBe(0);
  });
});
