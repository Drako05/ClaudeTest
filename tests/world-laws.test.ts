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
  DENSITY_CAP,
  emptyIntent,
  Feature,
  LIFE_STEP_TICKS,
  LifeKind,
  lifeKindOf,
  withinEquilibrium,
} from '@verdant/shared';

/**
 * Las leyes de "El libro del mundo", convertidas en pruebas.
 *
 * El libro no describe funcionalidades sino leyes, y una ley que nadie
 * comprueba es solo una intencion. Cada test de aqui cita la ley que defiende:
 * si el codigo deja de cumplirla, esto falla y el incumplimiento tiene nombre.
 */

/** Chunk con vida abundante, para medir sin que el ruido domine. */
function livelyChunk(world: World, kind = LifeKind.Tree): { cx: number; cy: number } {
  for (let cy = -6; cy <= 6; cy++) {
    for (let cx = -6; cx <= 6; cx++) {
      world.getChunk(cx, cy);
      if (world.referenceOf(cx, cy, kind) > 40) return { cx, cy };
    }
  }
  throw new Error('no se encontro un chunk con vegetacion en el mundo de prueba');
}

/** Primer tile del mundo que cumple una condicion. */
function findTile(world: World, match: (f: Feature) => boolean): { x: number; y: number } {
  for (let y = -80; y < 80; y++) {
    for (let x = -80; x < 80; x++) {
      if (match(world.featureAt(x, y))) return { x, y };
    }
  }
  throw new Error('no se encontro la feature buscada en el mundo de prueba');
}

describe('Capitulo I — «El mundo existe independientemente de cualquier observador»', () => {
  /**
   * La prueba central del diseno: simular paso a paso con el mundo cargado y
   * ponerse al dia de golpe sin mirarlo tienen que dar el MISMO resultado, no
   * uno parecido. Si divergen, el mundo solo existe cuando lo miran.
   */
  function populationAfter(seed: number, ticks: number, observing: boolean): number {
    const world = new World(seed);
    world.setNow(0);
    const { cx, cy } = livelyChunk(world);
    world.setPopulation(cx, cy, LifeKind.Tree, 4);

    if (observing) {
      for (let t = 1; t <= ticks; t++) world.setNow(t);
    } else {
      world.setNow(ticks); // nadie ha mirado nunca esta region
    }
    return world.populationOf(cx, cy, LifeKind.Tree);
  }

  it('la vida evoluciona igual se observe o no', () => {
    const ticks = LIFE_STEP_TICKS * 400;
    const observed = populationAfter(31337, ticks, true);
    const unobserved = populationAfter(31337, ticks, false);
    expect(observed).toBeGreaterThan(4);
    // Identico, no aproximado: el paso de vida es fijo y global.
    expect(unobserved).toBe(observed);
  });

  it('alejarse y volver no altera lo que ocurrio mientras tanto', () => {
    const seed = 909;
    const stay = new World(seed);
    stay.setNow(0);
    const { cx, cy } = livelyChunk(stay);
    stay.setPopulation(cx, cy, LifeKind.Tree, 6);

    const leave = new World(seed);
    leave.setNow(0);
    leave.getChunk(cx, cy);
    leave.setPopulation(cx, cy, LifeKind.Tree, 6);

    const ticks = LIFE_STEP_TICKS * 200;
    for (let t = 1; t <= ticks; t++) {
      stay.setNow(t);
      leave.setNow(t);
      if (t === Math.floor(ticks / 2)) leave.pruneFar(999999, 999999, 1);
      if (t === ticks - 1) leave.getChunk(cx, cy);
    }

    expect(leave.populationOf(cx, cy, LifeKind.Tree)).toBe(
      stay.populationOf(cx, cy, LifeKind.Tree),
    );
  });
});

describe('Capitulo III — «Las entidades vivas no surgen automaticamente»', () => {
  it('sin fuente cercana no se genera ni una sola unidad de vida', () => {
    const world = new World(4242);
    world.setNow(0);
    const { cx, cy } = livelyChunk(world);

    // El chunk y todo su vecindario, sin un solo arbol del que provenir.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        world.getChunk(cx + dx, cy + dy);
        world.setPopulation(cx + dx, cy + dy, LifeKind.Tree, 0);
      }
    }

    // Se mide UN paso a proposito: en cuanto pasan varios, la vida entra
    // legitimamente desde el bosque de mas alla del vecindario, y eso es la ley
    // cumpliendose (hay un origen) y no incumpliendose. Lo que la ley prohibe es
    // que surja de la nada, y es exactamente lo que dice este paso.
    world.setNow(LIFE_STEP_TICKS);
    expect(world.populationOf(cx, cy, LifeKind.Tree)).toBe(0);
    expect(world.countOf(cx, cy, LifeKind.Tree)).toBe(0);
  });

  it('donde el terreno no sostiene vida, no aparece jamas', () => {
    const world = new World(12345);
    world.setNow(0);
    let sterile: { cx: number; cy: number } | null = null;
    for (let cy = -8; cy <= 8 && !sterile; cy++) {
      for (let cx = -8; cx <= 8; cx++) {
        world.getChunk(cx, cy);
        if (world.referenceOf(cx, cy, LifeKind.Tree) === 0) {
          sterile = { cx, cy };
          break;
        }
      }
    }
    expect(sterile).not.toBeNull();
    world.setNow(LIFE_STEP_TICKS * 3000);
    expect(world.populationOf(sterile!.cx, sterile!.cy, LifeKind.Tree)).toBe(0);
    expect(world.countOf(sterile!.cx, sterile!.cy, LifeKind.Tree)).toBe(0);
  });

  it('un chunk vacio rodeado de bosque se repuebla desde el', () => {
    const world = new World(4242);
    world.setNow(0);
    const { cx, cy } = livelyChunk(world);
    world.setPopulation(cx, cy, LifeKind.Tree, 0);

    // Los vecinos siguen intactos: hay un origen plausible del que venir.
    world.setNow(LIFE_STEP_TICKS * 1200);
    expect(world.populationOf(cx, cy, LifeKind.Tree)).toBeGreaterThan(0);
    expect(world.countOf(cx, cy, LifeKind.Tree)).toBeGreaterThan(0);
  });
});

describe('Capitulo III — «Los ecosistemas tienden hacia estados dinamicos de equilibrio»', () => {
  it('la vida tiende a su referente sin superarlo nunca', () => {
    const world = new World(777);
    world.setNow(0);
    const { cx, cy } = livelyChunk(world);
    const reference = world.referenceOf(cx, cy, LifeKind.Tree);

    world.setPopulation(cx, cy, LifeKind.Tree, reference * 0.05);
    for (let s = 1; s <= 4000; s++) {
      world.setNow(s * LIFE_STEP_TICKS);
      // El techo no se rebasa en ningun momento del recorrido.
      expect(world.populationOf(cx, cy, LifeKind.Tree)).toBeLessThanOrEqual(reference + 1e-9);
    }
    // La logistica se acerca de forma asintotica: la ley habla de TENDER a un
    // equilibrio, no de clavarlo, asi que lo que se exige es entrar en el rango.
    expect(withinEquilibrium(world.populationOf(cx, cy, LifeKind.Tree), reference)).toBe(true);
  });

  it('todo chunk poblado nace dentro de su rango de equilibrio', () => {
    // El generador y el equilibrio comparten la misma tabla de densidades, asi
    // que el recuento real cae de forma natural alrededor del referente.
    //
    // Solo se exige en chunks con vida abundante: colocar N plantas con
    // probabilidad p tiene una desviacion tipica del orden de la raiz de N, que
    // en porcentaje crece cuanto menor es N. Con un referente de 150 esa
    // dispersion cabe holgada en el rango; con uno de 20 no cabria, y exigirlo
    // seria pedirle al azar que no se note.
    const world = new World(2024);
    world.setNow(0);
    let checked = 0;
    for (let cy = -4; cy <= 4; cy++) {
      for (let cx = -4; cx <= 4; cx++) {
        world.getChunk(cx, cy);
        for (const kind of [LifeKind.Tree, LifeKind.Plant]) {
          const reference = world.referenceOf(cx, cy, kind);
          if (reference < 150) continue;
          expect(
            withinEquilibrium(world.countOf(cx, cy, kind), reference),
            `chunk ${cx},${cy} nace fuera de rango`,
          ).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(3);
  });

  it('los biomas nacen equilibrados salvo excepciones del azar', () => {
    // La afirmacion "nace equilibrado" es estadistica, no puntual: colocar vida
    // al azar hace que algun bioma pequeno caiga fuera de la banda de vez en
    // cuando, y exigirselo a una semilla concreta seria pedirle al azar que no
    // se note.
    //
    // Lo que si es una invariante dura es que NO haya sesgo: el generador y el
    // equilibrio comparten tabla de densidades, asi que la desviacion media
    // sobre muchas semillas tiene que rondar el cero. Si alguien tocara una de
    // las dos tablas y se separasen, esa media se iria y este test lo diria.
    let balanced = 0;
    let biomes = 0;
    const deviations: number[] = [];

    for (let seed = 1; seed <= 24; seed++) {
      const world = new World(seed);
      world.setNow(0);
      const { cx, cy } = livelyChunk(world);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) world.getChunk(cx + dx, cy + dy);
      }
      const stats = world.biomeStats(cx, cy);
      biomes++;
      if (stats.balanced) balanced++;
      for (const kind of [LifeKind.Tree, LifeKind.Plant]) {
        if (stats.reference[kind] > 30) {
          deviations.push(stats.count[kind] / stats.reference[kind] - 1);
        }
      }
    }

    expect(balanced / biomes).toBeGreaterThan(0.85);
    const mean = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    expect(deviations.length).toBeGreaterThan(20);
    expect(Math.abs(mean), `sesgo medio de ${(mean * 100).toFixed(1)}%`).toBeLessThan(0.04);
  });
});

describe('Capitulo II — «Segun su naturaleza, pueden ser finitos, consumibles y renovables»', () => {
  it('recolectar hace desaparecer la planta del tile, no solo desactivarla', () => {
    // Este es el fallo que reporto el autor: el sprite seguia dibujado porque el
    // renderer leia el potencial del generador en vez de lo que hay realmente.
    const world = new World(12345);
    world.setNow(0);
    const tree = findTile(world, (f) => lifeKindOf(f) === LifeKind.Tree);

    expect(world.isSolidAt(tree.x, tree.y)).toBe(true);
    world.setFeature(tree.x, tree.y, Feature.None);

    // Las tres vias tienen que coincidir: recoleccion, colision y dibujo.
    expect(world.featureAt(tree.x, tree.y)).toBe(Feature.None);
    expect(world.isSolidAt(tree.x, tree.y)).toBe(false);

    const chunk = world.getChunk(tree.x >> 5, tree.y >> 5);
    const view = new Uint8Array(32 * 32);
    world.readFeatures(chunk, view);
    expect(view[(tree.y & 31) * 32 + (tree.x & 31)]).toBe(Feature.None);
  });

  it('el ecosistema repone lo recolectado', () => {
    const world = new World(555);
    world.setNow(0);
    const tree = findTile(world, (f) => lifeKindOf(f) === LifeKind.Tree);
    const cx = tree.x >> 5;
    const cy = tree.y >> 5;

    world.setFeature(tree.x, tree.y, Feature.None);
    const before = world.countOf(cx, cy, LifeKind.Tree);

    world.setNow(LIFE_STEP_TICKS * 600);
    expect(world.countOf(cx, cy, LifeKind.Tree)).toBeGreaterThan(before);
  });

  it('la piedra es inerte: ni cuenta como vida ni se repone', () => {
    const world = new World(12345);
    world.setNow(0);
    expect(lifeKindOf(Feature.RockNode)).toBeNull();

    const rock = findTile(world, (f) => f === Feature.RockNode);
    world.setFeature(rock.x, rock.y, Feature.None);
    world.setNow(DAY_TICKS * 40);
    expect(world.featureAt(rock.x, rock.y)).not.toBe(Feature.RockNode);
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
    expect(seen.size).toBe(4);
  });

  it('hay oscuridad de noche y luz plena de dia', () => {
    expect(daylight(0)).toBe(0);
    expect(daylight(Math.floor(DAY_TICKS * 0.5))).toBe(1);
  });

  it('el tiempo avanza al jugar', () => {
    const state = createGame(2024);
    const start = state.tick;
    const intent = emptyIntent();
    for (let i = 0; i < 600; i++) step(state, intent);
    expect(state.tick - start).toBe(600);
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
      const cx = Math.floor(state.entities.x[state.playerId]) >> 5;
      const cy = Math.floor(state.entities.y[state.playerId]) >> 5;
      return [
        state.entities.x[state.playerId],
        state.entities.y[state.playerId],
        state.world.trackedChunkCount,
        state.world.populationOf(cx, cy, LifeKind.Tree),
        ...Array.from(state.inventory),
      ];
    }
    expect(run()).toEqual(run());
  });
});

describe('El tope de densidad acota la saturacion', () => {
  it('un chunk por encima del tope se marca como saturado', () => {
    const world = new World(4321);
    world.setNow(0);
    const { cx, cy } = livelyChunk(world);
    const reference = world.referenceOf(cx, cy, LifeKind.Tree);

    expect(world.isChunkOvercrowded(cx, cy)).toBe(false);
    world.setPopulation(cx, cy, LifeKind.Tree, reference * (DENSITY_CAP + 0.4));
    expect(world.isChunkOvercrowded(cx, cy)).toBe(true);
  });
});
