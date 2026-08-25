import { describe, expect, it } from 'vitest';
import {
  createGame,
  DayPhase,
  dayFraction,
  daylight,
  phaseOf,
  step,
  World,
} from '@verdant/sim';
import {
  DAY_TICKS,
  emptyIntent,
  Feature,
  LIFE_STEP_TICKS,
  regrowTicksOf,
} from '@verdant/shared';

/**
 * Las leyes de "El libro del mundo", convertidas en pruebas.
 *
 * El libro no describe funcionalidades sino leyes, y una ley que nadie
 * comprueba es solo una intencion. Cada test de aqui cita la ley que defiende:
 * si el codigo deja de cumplirla, esto falla y el incumplimiento tiene nombre.
 */

/** Chunk con capacidad de carga alta, para medir la vegetacion sin ruido. */
function fertileChunk(world: World): { cx: number; cy: number } {
  for (let cy = -6; cy <= 6; cy++) {
    for (let cx = -6; cx <= 6; cx++) {
      if (world.life.capacityOf(cx, cy) > 0.5) return { cx, cy };
    }
  }
  throw new Error('no se encontro un chunk fertil en el mundo de prueba');
}

describe('Capitulo I — «El mundo existe independientemente de cualquier observador»', () => {
  /**
   * La prueba central del diseno: simular paso a paso con el mundo cargado y
   * ponerse al dia de golpe sin cargar nada tienen que dar el MISMO resultado,
   * no uno parecido. Si divergen, el mundo solo existe cuando lo miran.
   */
  function vegetationAfter(seed: number, ticks: number, observing: boolean): number {
    const world = new World(seed);
    world.setNow(0);
    const { cx, cy } = fertileChunk(world);
    world.life.setVegetation(cx, cy, 0.05);

    if (observing) {
      world.ensureAround(cx * 32, cy * 32, 3);
      for (let t = 1; t <= ticks; t++) world.setNow(t);
    } else {
      world.setNow(ticks); // nadie ha mirado nunca esta region
    }
    return world.life.vegetationOf(cx, cy);
  }

  it('la vegetacion evoluciona igual se observe o no', () => {
    const ticks = LIFE_STEP_TICKS * 400;
    const observed = vegetationAfter(31337, ticks, true);
    const unobserved = vegetationAfter(31337, ticks, false);
    expect(observed).toBeGreaterThan(0.05);
    // Identico, no aproximado: el paso de vida es fijo y global.
    expect(unobserved).toBe(observed);
  });

  it('alejarse y volver no altera lo que ocurrio mientras tanto', () => {
    const seed = 909;
    const stay = new World(seed);
    stay.setNow(0);
    const { cx, cy } = fertileChunk(stay);
    stay.life.setVegetation(cx, cy, 0.1);
    stay.ensureAround(cx * 32, cy * 32, 3);

    const leave = new World(seed);
    leave.setNow(0);
    leave.life.setVegetation(cx, cy, 0.1);
    leave.ensureAround(cx * 32, cy * 32, 3);

    const ticks = LIFE_STEP_TICKS * 200;
    for (let t = 1; t <= ticks; t++) {
      stay.setNow(t);
      leave.setNow(t);
      // El segundo mundo se marcha lejisimos a mitad de camino y vuelve.
      if (t === Math.floor(ticks / 2)) leave.pruneFar(999999, 999999, 1);
      if (t === ticks - 1) leave.ensureAround(cx * 32, cy * 32, 3);
    }

    expect(leave.life.vegetationOf(cx, cy)).toBe(stay.life.vegetationOf(cx, cy));
    expect(leave.loadedChunkCount).toBeGreaterThan(0);
  });
});

describe('Capitulo III — «Las entidades vivas no surgen automaticamente»', () => {
  it('un chunk sin vida y rodeado de vacio no genera vida por si solo', () => {
    const world = new World(4242);
    world.setNow(0);
    const { cx, cy } = fertileChunk(world);

    // Centro y sus cuatro vecinos completamente arrasados.
    world.life.setVegetation(cx, cy, 0);
    world.life.setVegetation(cx + 1, cy, 0);
    world.life.setVegetation(cx - 1, cy, 0);
    world.life.setVegetation(cx, cy + 1, 0);
    world.life.setVegetation(cx, cy - 1, 0);

    world.setNow(LIFE_STEP_TICKS);
    // Exactamente cero: el crecimiento logistico se anula con v = 0 y no hay
    // vecino del que migrar. La generacion espontanea es imposible por formula.
    expect(world.life.vegetationOf(cx, cy)).toBe(0);
  });

  it('pero si se repuebla desde vecinos con vida', () => {
    const world = new World(4242);
    world.setNow(0);
    const { cx, cy } = fertileChunk(world);
    world.life.setVegetation(cx, cy, 0);

    // Los vecinos siguen intactos, asi que hay un origen real del que venir.
    world.setNow(LIFE_STEP_TICKS * 300);
    expect(world.life.vegetationOf(cx, cy)).toBeGreaterThan(0);
  });
});

describe('Capitulo III — «Los ecosistemas tienden hacia estados dinamicos de equilibrio»', () => {
  it('la vegetacion converge a la capacidad de carga sin superarla', () => {
    const world = new World(777);
    world.setNow(0);
    const { cx, cy } = fertileChunk(world);
    const capacity = world.life.capacityOf(cx, cy);

    world.life.setVegetation(cx, cy, capacity * 0.05);
    for (let step = 1; step <= 2000; step++) {
      world.setNow(step * LIFE_STEP_TICKS);
      expect(world.life.vegetationOf(cx, cy)).toBeLessThanOrEqual(capacity + 1e-9);
    }
    expect(world.life.vegetationOf(cx, cy)).toBeCloseTo(capacity, 3);
  });

  it('el agua y la roca no sostienen vegetacion', () => {
    const world = new World(12345);
    world.setNow(0);
    let sterile: { cx: number; cy: number } | null = null;
    for (let cy = -8; cy <= 8 && !sterile; cy++) {
      for (let cx = -8; cx <= 8; cx++) {
        if (world.life.capacityOf(cx, cy) === 0) {
          sterile = { cx, cy };
          break;
        }
      }
    }
    expect(sterile).not.toBeNull();
    world.setNow(LIFE_STEP_TICKS * 1000);
    expect(world.life.densityOf(sterile!.cx, sterile!.cy)).toBe(0);
  });

  it('el mundo solo recuerda las zonas perturbadas', () => {
    // Sin esto la memoria creceria sin limite con cada zona que se toque.
    const world = new World(555);
    world.setNow(0);
    expect(world.life.disturbedCount).toBe(0);

    const { cx, cy } = fertileChunk(world);
    world.life.disturb(cx, cy, 0.3);
    expect(world.life.disturbedCount).toBe(1);

    world.setNow(LIFE_STEP_TICKS * 4000);
    expect(world.life.disturbedCount).toBe(0); // ya sano, ya se olvido
  });
});

describe('Capitulo II — «Segun su naturaleza, pueden ser finitos, consumibles y renovables»', () => {
  function findFeature(world: World, wanted: Feature): { x: number; y: number } {
    for (let y = -90; y < 90; y++) {
      for (let x = -90; x < 90; x++) {
        if (world.featureAt(x, y) === wanted) return { x, y };
      }
    }
    throw new Error(`no se encontro ${Feature[wanted]} en el mundo de prueba`);
  }

  it('un arbusto recolectado vuelve a crecer con el tiempo', () => {
    const world = new World(12345);
    world.setNow(0);
    const bush = findFeature(world, Feature.BerryBush);
    const regrow = regrowTicksOf(Feature.BerryBush);

    world.recordHarvest(bush.x, bush.y, Feature.BerryBush, 0.012);
    expect(world.featureAt(bush.x, bush.y)).toBe(Feature.None);

    world.setNow(regrow - 1);
    expect(world.featureAt(bush.x, bush.y)).toBe(Feature.None);

    // La zona tambien tuvo que recuperar su vegetacion: el tiempo de rebrote
    // manda sobre el tile, pero la densidad de la zona manda sobre si hay planta.
    world.setNow(regrow + LIFE_STEP_TICKS * 500);
    expect(world.featureAt(bush.x, bush.y)).toBe(Feature.BerryBush);
  });

  it('la piedra es finita y no vuelve nunca', () => {
    const world = new World(12345);
    world.setNow(0);
    const rock = findFeature(world, Feature.RockNode);

    world.setFeature(rock.x, rock.y, Feature.None);
    world.setNow(DAY_TICKS * 40);
    expect(world.featureAt(rock.x, rock.y)).toBe(Feature.None);
  });

  it('lo que ya no se ve tampoco estorba el paso', () => {
    // Si el dibujo y la colision usaran criterios distintos, se chocaria con
    // arboles invisibles.
    const world = new World(12345);
    world.setNow(0);
    const tree = findFeature(world, Feature.Tree);
    expect(world.isSolidAt(tree.x, tree.y)).toBe(true);

    world.recordHarvest(tree.x, tree.y, Feature.Tree, 0.012);
    expect(world.featureAt(tree.x, tree.y)).toBe(Feature.None);
    expect(world.isSolidAt(tree.x, tree.y)).toBe(false);
  });

  it('talar hunde la vegetacion de la zona, no solo el tile', () => {
    const world = new World(12345);
    world.setNow(0);
    const bush = findFeature(world, Feature.BerryBush);
    const cx = bush.x >> 5;
    const cy = bush.y >> 5;
    const before = world.life.vegetationOf(cx, cy);

    world.recordHarvest(bush.x, bush.y, Feature.BerryBush, 0.012);
    expect(world.life.vegetationOf(cx, cy)).toBeLessThan(before);
  });
});

describe('Capitulo I — «Existen el pasar del tiempo y las leyes fisicas fundamentales»', () => {
  it('el ciclo del dia es periodico', () => {
    expect(dayFraction(0)).toBe(0);
    expect(dayFraction(DAY_TICKS)).toBe(0);
    expect(dayFraction(DAY_TICKS * 3 + DAY_TICKS / 4)).toBeCloseTo(0.25, 9);
  });

  it('el dia recorre sus cuatro fases', () => {
    const seen = new Set<DayPhase>();
    for (let t = 0; t < DAY_TICKS; t += 60) seen.add(phaseOf(t));
    expect(seen.has(DayPhase.Night)).toBe(true);
    expect(seen.has(DayPhase.Dawn)).toBe(true);
    expect(seen.has(DayPhase.Day)).toBe(true);
    expect(seen.has(DayPhase.Dusk)).toBe(true);
  });

  it('hay oscuridad de noche y luz plena de dia', () => {
    expect(daylight(0)).toBe(0); // medianoche
    expect(daylight(Math.floor(DAY_TICKS * 0.5))).toBe(1); // mediodia
    expect(daylight(Math.floor(DAY_TICKS * 0.25))).toBeGreaterThan(0);
    expect(daylight(Math.floor(DAY_TICKS * 0.25))).toBeLessThan(1);
  });

  it('el tiempo avanza al jugar', () => {
    const state = createGame(2024);
    const start = state.tick;
    const intent = emptyIntent();
    for (let i = 0; i < 600; i++) step(state, intent);
    expect(state.tick - start).toBe(600);
    expect(state.world.currentTick).toBe(state.tick - 1);
  });

  it('un mundo nuevo empieza de dia, no a medianoche', () => {
    const state = createGame(2024);
    expect(daylight(state.tick)).toBeGreaterThan(0.5);
  });
});

describe('El mundo sigue siendo determinista con la vida en marcha', () => {
  it('misma semilla y mismas acciones producen el mismo mundo', () => {
    function run(): number[] {
      const state = createGame(8080);
      const intent = emptyIntent();
      intent.moveX = 1;
      intent.harvest = true;
      for (let i = 0; i < 4000; i++) step(state, intent);
      return [
        state.entities.x[state.playerId],
        state.entities.y[state.playerId],
        state.world.life.disturbedCount,
        ...Array.from(state.inventory),
      ];
    }
    expect(run()).toEqual(run());
  });
});
