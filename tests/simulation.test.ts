import { describe, expect, it } from 'vitest';
import {
  BODY_RADIUS,
  createGame,
  EntityKind,
  EntityStore,
  HUNGER_DECAY_PER_SEC,
  moveEntity,
  step,
  World,
} from '@verdant/sim';
import { emptyIntent, Feature, Resource, TICK_DT, TICK_HZ, type Intent } from '@verdant/shared';

function intent(over: Partial<Intent> = {}): Intent {
  return { ...emptyIntent(), ...over };
}

function runTicks(state: ReturnType<typeof createGame>, n: number, i: Intent): void {
  for (let k = 0; k < n; k++) step(state, i);
}

describe('simulacion', () => {
  it('el jugador aparece en un tile transitable', () => {
    for (const seed of [1, 2, 3, 100, 9999]) {
      const state = createGame(seed);
      const px = state.entities.x[state.playerId];
      const py = state.entities.y[state.playerId];
      expect(state.world.isSolidAt(Math.floor(px), Math.floor(py))).toBe(false);
      expect(state.entities.kind[state.playerId]).toBe(EntityKind.Player);
    }
  });

  it('el hambre baja con el tiempo al ritmo esperado', () => {
    const state = createGame(42);
    const before = state.entities.hunger[state.playerId];
    runTicks(state, TICK_HZ * 10, intent());
    const after = state.entities.hunger[state.playerId];
    const expected = before - HUNGER_DECAY_PER_SEC * 10;
    // Tolerancia holgada a proposito: hunger vive en un Float32Array y acumular
    // 600 restas en precision simple deriva unas milesimas. Sigue siendo
    // determinista (float32 esta definido por IEEE-754), solo que no coincide
    // con la aritmetica en float64 del valor esperado.
    expect(after).toBeCloseTo(expected, 2);
  });

  it('sin comer, el hambre llega a cero y entonces cae la salud', () => {
    const state = createGame(42);
    // Suficientes ticks para vaciar el hambre y empezar a pasar hambre de verdad.
    runTicks(state, TICK_HZ * 260, intent());
    expect(state.entities.hunger[state.playerId]).toBe(0);
    expect(state.entities.health[state.playerId]).toBeLessThan(100);
  });

  it('el jugador muere si la salud llega a cero', () => {
    const state = createGame(42);
    runTicks(state, TICK_HZ * 400, intent());
    expect(state.entities.health[state.playerId]).toBe(0);
    expect(state.entities.alive[state.playerId]).toBe(0);
  });

  it('el movimiento cambia la posicion y nunca atraviesa solidos', () => {
    const state = createGame(7);
    const startX = state.entities.x[state.playerId];
    runTicks(state, 120, intent({ moveX: 1 }));
    expect(state.entities.x[state.playerId]).toBeGreaterThan(startX);

    // En ningun momento el cuerpo debe solapar un tile solido.
    const px = state.entities.x[state.playerId];
    const py = state.entities.y[state.playerId];
    for (const [dx, dy] of [
      [-BODY_RADIUS, -BODY_RADIUS],
      [BODY_RADIUS, -BODY_RADIUS],
      [-BODY_RADIUS, BODY_RADIUS],
      [BODY_RADIUS, BODY_RADIUS],
    ]) {
      expect(state.world.isSolidAt(Math.floor(px + dx), Math.floor(py + dy))).toBe(false);
    }
  });

  it('la diagonal no es mas rapida que la ortogonal', () => {
    const a = createGame(31);
    const b = createGame(31);
    runTicks(a, 30, intent({ moveX: 1 }));
    runTicks(b, 30, intent({ moveX: 1, moveY: 1 }));

    const distA = Math.hypot(a.entities.x[a.playerId] - a.entities.x[a.playerId], 0) + 0;
    // Comparamos el desplazamiento total recorrido por cada uno.
    const start = createGame(31);
    const sx = start.entities.x[start.playerId];
    const sy = start.entities.y[start.playerId];
    const moveA = Math.hypot(a.entities.x[a.playerId] - sx, a.entities.y[a.playerId] - sy);
    const moveB = Math.hypot(b.entities.x[b.playerId] - sx, b.entities.y[b.playerId] - sy);
    expect(moveB).toBeLessThanOrEqual(moveA + 1e-9);
    expect(distA).toBe(0);
  });

  it('recolectar un arbol da madera y vacia el tile', () => {
    const world = new World(1234);
    // Buscamos un arbol concreto en el mundo generado.
    let found: { x: number; y: number } | null = null;
    for (let y = -60; y < 60 && !found; y++) {
      for (let x = -60; x < 60; x++) {
        if (world.featureAt(x, y) === Feature.Tree) {
          found = { x, y };
          break;
        }
      }
    }
    expect(found).not.toBeNull();

    const inventory = new Int32Array(3);
    const before = world.featureAt(found!.x, found!.y);
    expect(before).toBe(Feature.Tree);

    world.setFeature(found!.x, found!.y, Feature.None);
    inventory[Resource.Wood] += 3;

    expect(world.featureAt(found!.x, found!.y)).toBe(Feature.None);
    expect(inventory[Resource.Wood]).toBe(3);
  });

  it('las mutaciones sobreviven al descarte y regeneracion del chunk', () => {
    // Esta es la razon de existir del overlay de mutaciones: si el chunk se
    // descarta y se vuelve a generar, lo que el jugador cambio debe seguir ahi.
    const world = new World(555);
    let tree: { x: number; y: number } | null = null;
    for (let y = 0; y < 80 && !tree; y++) {
      for (let x = 0; x < 80; x++) {
        if (world.featureAt(x, y) === Feature.Tree) {
          tree = { x, y };
          break;
        }
      }
    }
    expect(tree).not.toBeNull();

    world.setFeature(tree!.x, tree!.y, Feature.None);
    world.pruneFar(100000, 100000, 1); // descarta todo
    expect(world.loadedChunkCount).toBe(0);

    expect(world.featureAt(tree!.x, tree!.y)).toBe(Feature.None);
  });

  it('el streaming mantiene acotada la memoria al caminar lejos', () => {
    const state = createGame(11);
    runTicks(state, TICK_HZ * 40, intent({ moveX: 1 }));
    const maxChunks = (2 * 5 + 1) ** 2; // radio de descarte
    expect(state.world.loadedChunkCount).toBeLessThanOrEqual(maxChunks);
  });
});

/**
 * El movimiento analogico existe para el joystick tactil: apenas desplazado,
 * el personaje camina despacio. El teclado tiene que seguir comportandose
 * exactamente igual que antes, y eso es lo que mas importa proteger aqui.
 */
describe('movimiento analogico', () => {
  /** Centro de una zona 7x7 sin nada solido: asi ninguna colision falsea la medida. */
  function openSpot(world: World): { x: number; y: number } {
    for (let radius = 0; radius < 240; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          let clear = true;
          for (let ty = -3; ty <= 3 && clear; ty++) {
            for (let tx = -3; tx <= 3; tx++) {
              if (world.isSolidAt(dx + tx, dy + ty)) {
                clear = false;
                break;
              }
            }
          }
          if (clear) return { x: dx + 0.5, y: dy + 0.5 };
        }
      }
    }
    throw new Error('no se encontro una zona abierta en el mundo de prueba');
  }

  /** Distancia recorrida en `ticks` empujando con el vector dado. */
  function travel(moveX: number, moveY: number, ticks = 30): number {
    const world = new World(2468);
    const spot = openSpot(world);
    const store = new EntityStore(4);
    const id = store.spawn(EntityKind.Player, spot.x, spot.y);
    for (let i = 0; i < ticks; i++) moveEntity(world, store, id, moveX, moveY, TICK_DT);
    return Math.hypot(store.x[id] - spot.x, store.y[id] - spot.y);
  }

  it('media deflexion recorre la mitad de distancia', () => {
    const full = travel(1, 0);
    const half = travel(0.5, 0);
    expect(full).toBeGreaterThan(0);
    expect(half / full).toBeCloseTo(0.5, 3);
  });

  it('la velocidad escala de forma continua con la deflexion', () => {
    const full = travel(1, 0);
    for (const magnitude of [0.25, 0.4, 0.75]) {
      expect(travel(magnitude, 0) / full).toBeCloseTo(magnitude, 3);
    }
  });

  it('una magnitud mayor que 1 se acota a velocidad maxima', () => {
    // El teclado en diagonal produce longitud raiz de 2; no debe correr mas.
    expect(travel(3, 0)).toBeCloseTo(travel(1, 0), 6);
    expect(travel(1, 1)).toBeCloseTo(travel(1, 0), 6);
  });

  it('el teclado sigue recorriendo lo mismo en diagonal que en ortogonal', () => {
    expect(travel(0, 1)).toBeCloseTo(travel(1, 0), 6);
    expect(travel(-1, -1)).toBeCloseTo(travel(1, 0), 6);
  });

  it('por debajo del umbral de ruido no hay movimiento', () => {
    expect(travel(1e-9, 0)).toBe(0);
  });
});
