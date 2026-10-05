/**
 * Una caja por objeto (decision del autor, 2026-10-05): la caja que se golpea
 * es la que choca, si su tipo choca (`blocksBody`), ajustada al objeto y no a
 * su casilla, y con alto: encima se esta de pie. El cuerpo se apoya y choca
 * con su huella entera (`BODY_RADIUS`), tambien contra las estaciones.
 *
 * Mundos llanos hechos a mano, a altura 0, con objetos puestos por casilla.
 */

import { describe, expect, it } from 'vitest';
import { blocksBody, Feature, TICK_DT } from '@verdant/shared';
import {
  applyVertical,
  BODY_RADIUS,
  EntityKind,
  EntityStore,
  hitboxAt,
  moveAirborne,
  moveEntity,
  solidBoxAt,
  squareFloor,
  takeOff,
  WALK_SPEED,
  type World,
} from '@verdant/sim';

/** Lo que se anda en un tick: se para, como mucho, a un paso de la cara. */
const STEP = WALK_SPEED * TICK_DT;

/** Un mundo llano con `objects` puestos por casilla ("x,y" -> Feature). */
function flat(objects: Record<string, Feature>): World {
  return {
    seed: 7,
    levelAt: () => 0,
    rampDirAt: () => -1,
    groundHeightAt: () => 0,
    featureAt: (x: number, y: number) => objects[`${Math.floor(x)},${Math.floor(y)}`] ?? Feature.None,
    isSolidAt: () => false,
    isTerrainSolidAt: () => false,
  } as unknown as World;
}

interface Trace {
  x: number;
  y: number;
  z: number;
  /** Lo mas alto que estuvo de pie. */
  stoodAt: number;
  grounded: boolean;
}

/** Anda hacia (`moveX`, `moveY`) como en `tick.ts`, saltando en el tick `jumpAt` si se da. */
function drive(world: World, x: number, y: number, moveX: number, moveY: number, ticks: number, jumpAt = -1): Trace {
  const store = new EntityStore(4);
  const id = store.spawn(EntityKind.Player, x, y);
  store.z[id] = 0;
  let stoodAt = 0;
  for (let t = 0; t < ticks; t++) {
    if (store.grounded[id]) {
      moveEntity(world, store, id, moveX, moveY, TICK_DT);
      if (t === jumpAt) takeOff(store, id);
    } else {
      moveAirborne(world, store, id, moveX, moveY, TICK_DT);
    }
    applyVertical(world, store, id, TICK_DT);
    if (store.grounded[id] && store.z[id] > stoodAt) stoodAt = store.z[id];
  }
  return { x: store.x[id], y: store.y[id], z: store.z[id], stoodAt, grounded: !!store.grounded[id] };
}

describe('Una caja por objeto: golpe y choque juntos', () => {
  it('chocan el tronco, la roca, los minerales y las estaciones; el arbusto, el brote y los guijarros no', () => {
    for (const f of [Feature.ForestTree, Feature.TundraTree, Feature.RockNode, Feature.IronNode, Feature.Workbench, Feature.Furnace]) {
      expect(blocksBody(f), Feature[f]).toBe(true);
    }
    for (const f of [Feature.MeadowPlant, Feature.ForestTreeSapling, Feature.Pebbles]) {
      expect(blocksBody(f), Feature[f]).toBe(false);
    }
    // La caja que choca es la misma que se golpea.
    const world = flat({ '0,0': Feature.RockNode, '1,0': Feature.MeadowPlant });
    expect(solidBoxAt(world, 0, 0)).toEqual(hitboxAt(world, 0, 0));
    expect(hitboxAt(world, 1, 0)).not.toBeNull();
    expect(solidBoxAt(world, 1, 0)).toBeNull();
  });

  it('entre dos troncos de tundra vecinos se pasa; entre dos de bosque, no', () => {
    // Dos arboles en la fila -2, en las casillas 0 y 1; el jugador pasa entre
    // ellos, por x = 1, andando al norte.
    const tundra = flat({ '0,-2': Feature.TundraTree, '1,-2': Feature.TundraTree });
    const forest = flat({ '0,-2': Feature.ForestTree, '1,-2': Feature.ForestTree });
    const gap = (w: World) => hitboxAt(w, 1, -2)!.x0 - hitboxAt(w, 0, -2)!.x1;
    // La premisa: el hueco de la tundra cabe el cuerpo, el del bosque no.
    expect(gap(tundra)).toBeGreaterThan(2 * BODY_RADIUS);
    expect(gap(forest)).toBeLessThan(2 * BODY_RADIUS);
    expect(drive(tundra, 1, 0.5, 0, -1, 90).y).toBeLessThan(-2);
    expect(drive(forest, 1, 0.5, 0, -1, 90).y).toBeGreaterThan(-1);
  });

  it('un tronco fino no deja atravesar su casilla por el medio, y se para al tocar la huella', () => {
    const world = flat({ '0,-2': Feature.TundraTree });
    const trunk = hitboxAt(world, 0, -2)!;
    const out = drive(world, 0.5, 0.5, 0, -1, 90);
    expect(out.y - BODY_RADIUS).toBeGreaterThanOrEqual(trunk.y1 - 1e-9);
    expect(out.y - BODY_RADIUS).toBeLessThan(trunk.y1 + STEP);
    // Y no se sube: el tronco pasa del salto.
    expect(drive(world, 0.5, 0.5, 0, -1, 90, 0).stoodAt).toBe(0);
  });

  it('una roca: andando se choca, saltando se sube y se esta de pie, y al bajarse se cae', () => {
    const world = flat({ '0,-1': Feature.RockNode });
    const rock = hitboxAt(world, 0, -1)!;
    // Andando, se para con la huella en su cara.
    const walked = drive(world, 0.5, 0.5, 0, -1, 60);
    expect(walked.y - BODY_RADIUS).toBeGreaterThanOrEqual(rock.y1 - 1e-9);
    expect(walked.y - BODY_RADIUS).toBeLessThan(rock.y1 + STEP);
    expect(walked.stoodAt).toBe(0);
    // Saltando, se sube: de pie en su techo.
    expect(drive(world, 0.5, 0.5, 0, -1, 30, 0).stoodAt).toBe(rock.z1);
    // Y siguiendo, se baja por el otro lado y cae al suelo.
    const across = drive(world, 0.5, 0.5, 0, -1, 120, 0);
    expect(across.stoodAt).toBe(rock.z1);
    expect(across.y + BODY_RADIUS).toBeLessThan(rock.y0);
    expect(across.z).toBe(0);
    expect(across.grounded).toBe(true);
  });

  it('se esta de pie mientras la huella toque la caja, aunque el centro ya no este encima', () => {
    const world = flat({ '0,0': Feature.RockNode });
    const rock = hitboxAt(world, 0, 0)!;
    // El centro fuera de la roca, la huella todavia dentro.
    const x = rock.x1 + BODY_RADIUS / 2;
    expect(squareFloor(world, x, 0.5, BODY_RADIUS)).toBe(rock.z1);
    expect(squareFloor(world, x, 0.5, 0)).toBe(0);
    expect(squareFloor(world, rock.x1 + BODY_RADIUS + 0.01, 0.5, BODY_RADIUS)).toBe(0);
    // Y de pie ahi, la vertical lo deja arriba: no cae.
    const store = new EntityStore(2);
    const id = store.spawn(EntityKind.Player, x, 0.5);
    store.z[id] = rock.z1;
    store.grounded[id] = 1;
    applyVertical(world, store, id, TICK_DT);
    expect(store.z[id]).toBe(rock.z1);
    expect(store.grounded[id]).toBe(1);
  });

  it('una caja que asoma mas de lo que se sube andando no sube el cuerpo de golpe a su techo', () => {
    // Un arbol que crece justo bajo la huella: se queda en el suelo, metido.
    const world = flat({ '0,0': Feature.ForestTree });
    const store = new EntityStore(2);
    const id = store.spawn(EntityKind.Player, 0.5, 0.5);
    store.z[id] = 0;
    store.grounded[id] = 1;
    applyVertical(world, store, id, TICK_DT);
    expect(store.z[id]).toBe(0);
  });

  it('una mesa choca al tocar la huella, no al llegar el centro', () => {
    const world = flat({ '0,-1': Feature.Workbench });
    const out = drive(world, 0.5, 0.5, 0, -1, 60);
    expect(out.y - BODY_RADIUS).toBeGreaterThanOrEqual(-1e-9);
    expect(out.y - BODY_RADIUS).toBeLessThan(STEP);
    // Y se sube de un salto: mide 1.
    expect(drive(world, 0.5, 0.5, 0, -1, 30, 0).stoodAt).toBe(1);
  });

  it('el arbusto, el brote y los guijarros no estorban', () => {
    for (const f of [Feature.MeadowPlant, Feature.ForestTreeSapling, Feature.Pebbles]) {
      const out = drive(flat({ '0,-1': f }), 0.5, 0.5, 0, -1, 60);
      expect(out.y, Feature[f]).toBeLessThan(-2);
      expect(out.stoodAt, Feature[f]).toBe(0);
    }
  });
});
