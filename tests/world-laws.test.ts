import { describe, expect, it } from 'vitest';
import {
  createGame,
  DayPhase,
  dayFraction,
  daylight,
  phaseOf,
  skipTime,
  step,
  World,
} from '@verdant/sim';
import {
  BiomeKind,
  CHUNK_SIZE,
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

/**
 * Chunk con vida abundante de un bioma concreto, para medir sin que el ruido
 * domine. Devuelve tambien el bioma, porque la contabilidad va por (chunk,
 * bioma, tipo) y no tendria sentido pedir cuentas sin decir de cual.
 */
interface Spot {
  cx: number;
  cy: number;
  biome: BiomeKind;
}

function livelyChunk(world: World, kind = LifeKind.Tree): Spot {
  for (let cy = -6; cy <= 6; cy++) {
    for (let cx = -6; cx <= 6; cx++) {
      world.getChunk(cx, cy);
      for (const biome of [BiomeKind.Forest, BiomeKind.Meadow]) {
        if (world.referenceOf(cx, cy, biome, kind) > 40) return { cx, cy, biome };
      }
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
    const { cx, cy, biome } = livelyChunk(world);
    world.setPopulation(cx, cy, biome, LifeKind.Tree, 4);

    if (observing) {
      for (let t = 1; t <= ticks; t++) world.setNow(t);
    } else {
      world.setNow(ticks); // nadie ha mirado nunca esta region
    }
    return world.populationOf(cx, cy, biome, LifeKind.Tree);
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
    const { cx, cy, biome } = livelyChunk(stay);
    stay.setPopulation(cx, cy, biome, LifeKind.Tree, 6);

    const leave = new World(seed);
    leave.setNow(0);
    leave.getChunk(cx, cy);
    leave.setPopulation(cx, cy, biome, LifeKind.Tree, 6);

    const ticks = LIFE_STEP_TICKS * 200;
    for (let t = 1; t <= ticks; t++) {
      stay.setNow(t);
      leave.setNow(t);
      if (t === Math.floor(ticks / 2)) leave.pruneFar(999999, 999999, 1);
      if (t === ticks - 1) leave.getChunk(cx, cy);
    }

    expect(leave.populationOf(cx, cy, biome, LifeKind.Tree)).toBe(
      stay.populationOf(cx, cy, biome, LifeKind.Tree),
    );
  });
});

describe('Capitulo III — «Las entidades vivas no surgen automaticamente»', () => {
  it('sin fuente cercana no se genera ni una sola unidad de vida', () => {
    const world = new World(4242);
    world.setNow(0);
    const { cx, cy, biome } = livelyChunk(world);

    // El chunk y todo su vecindario, sin un solo arbol del que provenir.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        world.getChunk(cx + dx, cy + dy);
        world.setPopulation(cx + dx, cy + dy, biome, LifeKind.Tree, 0);
      }
    }

    // Se mide UN paso a proposito: en cuanto pasan varios, la vida entra
    // legitimamente desde el bosque de mas alla del vecindario, y eso es la ley
    // cumpliendose (hay un origen) y no incumpliendose. Lo que la ley prohibe es
    // que surja de la nada, y es exactamente lo que dice este paso.
    world.setNow(LIFE_STEP_TICKS);
    expect(world.populationOf(cx, cy, biome, LifeKind.Tree)).toBe(0);
    expect(world.countOf(cx, cy, biome, LifeKind.Tree)).toBe(0);
  });

  it('donde el terreno no sostiene vida, no aparece jamas', () => {
    const world = new World(12345);
    world.setNow(0);
    // Un chunk esteril es el que no sostiene vida en NINGUN bioma suyo.
    let sterile: { cx: number; cy: number } | null = null;
    for (let cy = -8; cy <= 8 && !sterile; cy++) {
      for (let cx = -8; cx <= 8; cx++) {
        world.getChunk(cx, cy);
        const total = [BiomeKind.Forest, BiomeKind.Meadow].reduce(
          (sum, b) => sum + world.referenceOf(cx, cy, b, LifeKind.Tree),
          0,
        );
        if (total === 0) {
          sterile = { cx, cy };
          break;
        }
      }
    }
    expect(sterile).not.toBeNull();
    world.setNow(LIFE_STEP_TICKS * 3000);
    for (const b of [BiomeKind.Forest, BiomeKind.Meadow]) {
      expect(world.populationOf(sterile!.cx, sterile!.cy, b, LifeKind.Tree)).toBe(0);
      expect(world.countOf(sterile!.cx, sterile!.cy, b, LifeKind.Tree)).toBe(0);
    }
  });

  it('un chunk vacio rodeado de bosque se repuebla desde el', () => {
    const world = new World(4242);
    world.setNow(0);
    const { cx, cy, biome } = livelyChunk(world);
    world.setPopulation(cx, cy, biome, LifeKind.Tree, 0);

    // Los vecinos siguen intactos: hay un origen plausible del que venir.
    world.setNow(LIFE_STEP_TICKS * 1200);
    expect(world.populationOf(cx, cy, biome, LifeKind.Tree)).toBeGreaterThan(0);
    expect(world.countOf(cx, cy, biome, LifeKind.Tree)).toBeGreaterThan(0);
  });
});

describe('Capitulo III — «Los ecosistemas tienden hacia estados dinamicos de equilibrio»', () => {
  it('la vida tiende a su referente sin superarlo nunca', () => {
    const world = new World(777);
    world.setNow(0);
    const { cx, cy, biome } = livelyChunk(world);
    const reference = world.referenceOf(cx, cy, biome, LifeKind.Tree);

    world.setPopulation(cx, cy, biome, LifeKind.Tree, reference * 0.05);
    for (let s = 1; s <= 4000; s++) {
      world.setNow(s * LIFE_STEP_TICKS);
      // El techo no se rebasa en ningun momento del recorrido.
      expect(world.populationOf(cx, cy, biome, LifeKind.Tree)).toBeLessThanOrEqual(reference + 1e-9);
    }
    // La logistica se acerca de forma asintotica: la ley habla de TENDER a un
    // equilibrio, no de clavarlo, asi que lo que se exige es entrar en el rango.
    expect(withinEquilibrium(world.populationOf(cx, cy, biome, LifeKind.Tree), reference)).toBe(true);
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
        for (const b of [BiomeKind.Forest, BiomeKind.Meadow]) {
          for (const kind of [LifeKind.Tree, LifeKind.Plant]) {
            const reference = world.referenceOf(cx, cy, b, kind);
            if (reference < 150) continue;
            expect(
              withinEquilibrium(world.countOf(cx, cy, b, kind), reference),
              `chunk ${cx},${cy} nace fuera de rango en ${BiomeKind[b]}`,
            ).toBe(true);
            checked++;
          }
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
      const { cx, cy, biome } = livelyChunk(world);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) world.getChunk(cx + dx, cy + dy);
      }
      const stats = world.biomeStats(cx, cy, biome);
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
    const biome = world.biomeAt(tree.x, tree.y);

    world.setFeature(tree.x, tree.y, Feature.None);
    const before = world.countOf(cx, cy, biome, LifeKind.Tree);

    world.setNow(LIFE_STEP_TICKS * 600);
    expect(world.countOf(cx, cy, biome, LifeKind.Tree)).toBeGreaterThan(before);
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
      const tileX = Math.floor(state.entities.x[state.playerId]);
      const tileY = Math.floor(state.entities.y[state.playerId]);
      const cx = tileX >> 5;
      const cy = tileY >> 5;
      const biome = state.world.biomeAt(tileX, tileY);
      return [
        state.entities.x[state.playerId],
        state.entities.y[state.playerId],
        state.world.trackedChunkCount,
        state.world.populationOf(cx, cy, biome, LifeKind.Tree),
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
    const { cx, cy, biome } = livelyChunk(world);
    const reference = world.referenceOf(cx, cy, biome, LifeKind.Tree);

    expect(world.isChunkOvercrowded(cx, cy, biome)).toBe(false);
    world.setPopulation(cx, cy, biome, LifeKind.Tree, reference * (DENSITY_CAP + 0.4));
    expect(world.isChunkOvercrowded(cx, cy, biome)).toBe(true);
  });
});

/**
 * El bioma es del suelo, no del chunk.
 *
 * Nace de un fallo que reporto el autor: el panel anunciaba «Bosque» mientras el
 * personaje pisaba hierba. La causa era etiquetar el chunk entero con su terreno
 * predominante, asi que en un chunk mixto la mitad de los tiles quedaba bajo un
 * nombre que no era el suyo, y —peor— dos especies distintas compartian cuenta.
 */
describe('El bioma nombrado es el suelo que se pisa', () => {
  /** Chunk que contiene a la vez pradera y bosque, con un tile de cada uno. */
  function mixedChunk(world: World): {
    cx: number;
    cy: number;
    meadow: { x: number; y: number };
    forest: { x: number; y: number };
  } {
    for (let cy = -6; cy <= 6; cy++) {
      for (let cx = -6; cx <= 6; cx++) {
        world.getChunk(cx, cy);
        if (!world.hasBiome(cx, cy, BiomeKind.Meadow)) continue;
        if (!world.hasBiome(cx, cy, BiomeKind.Forest)) continue;

        let meadow: { x: number; y: number } | null = null;
        let forest: { x: number; y: number } | null = null;
        for (let ty = 0; ty < CHUNK_SIZE && !(meadow && forest); ty++) {
          for (let tx = 0; tx < CHUNK_SIZE; tx++) {
            const x = cx * CHUNK_SIZE + tx;
            const y = cy * CHUNK_SIZE + ty;
            const biome = world.biomeAt(x, y);
            if (biome === BiomeKind.Meadow && !meadow) meadow = { x, y };
            if (biome === BiomeKind.Forest && !forest) forest = { x, y };
          }
        }
        if (meadow && forest) return { cx, cy, meadow, forest };
      }
    }
    throw new Error('no se encontro un chunk mixto de pradera y bosque');
  }

  it('dos tiles del MISMO chunk pueden dar biomas distintos', () => {
    const world = new World(31337);
    world.setNow(0);
    const { meadow, forest } = mixedChunk(world);

    // Es el fallo reportado convertido en regresion: con un bioma por chunk,
    // estos dos tiles devolvian forzosamente lo mismo.
    expect(world.biomeAt(meadow.x, meadow.y)).toBe(BiomeKind.Meadow);
    expect(world.biomeAt(forest.x, forest.y)).toBe(BiomeKind.Forest);
  });

  it('las especies no se mezclan: talar el bosque no toca la pradera', () => {
    const world = new World(31337);
    world.setNow(0);
    const { cx, cy } = mixedChunk(world);

    const meadowBefore = world.countOf(cx, cy, BiomeKind.Meadow, LifeKind.Tree);
    expect(world.countOf(cx, cy, BiomeKind.Forest, LifeKind.Tree)).toBeGreaterThan(0);

    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const x = cx * CHUNK_SIZE + tx;
        const y = cy * CHUNK_SIZE + ty;
        if (world.biomeAt(x, y) !== BiomeKind.Forest) continue;
        if (lifeKindOf(world.featureAt(x, y)) !== LifeKind.Tree) continue;
        world.setFeature(x, y, Feature.None);
      }
    }

    expect(world.countOf(cx, cy, BiomeKind.Forest, LifeKind.Tree)).toBe(0);
    expect(world.countOf(cx, cy, BiomeKind.Meadow, LifeKind.Tree)).toBe(meadowBefore);
  });

  it('un brote solo sale en el terreno de su bioma', () => {
    const world = new World(31337);
    world.setNow(0);
    const { cx, cy } = mixedChunk(world);

    // La pradera del chunk se vacia de arboles y el bosque se llena hasta el
    // tope. Sin paso de vida de por medio: lo que se mide es donde COLOCA los
    // arboles la repoblacion, no cuantos decide poner.
    world.setPopulation(cx, cy, BiomeKind.Meadow, LifeKind.Tree, 0);
    const reference = world.referenceOf(cx, cy, BiomeKind.Forest, LifeKind.Tree);
    world.setPopulation(cx, cy, BiomeKind.Forest, LifeKind.Tree, reference * DENSITY_CAP);

    expect(world.countOf(cx, cy, BiomeKind.Meadow, LifeKind.Tree)).toBe(0);
    expect(world.countOf(cx, cy, BiomeKind.Forest, LifeKind.Tree)).toBeGreaterThan(0);

    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const x = cx * CHUNK_SIZE + tx;
        const y = cy * CHUNK_SIZE + ty;
        if (lifeKindOf(world.featureAt(x, y)) !== LifeKind.Tree) continue;
        expect(
          world.biomeAt(x, y),
          `arbol fuera de su bioma en (${x}, ${y})`,
        ).toBe(BiomeKind.Forest);
      }
    }
  });
});

/**
 * Los saltos de tiempo de las herramientas de desarrollo.
 *
 * Es la ley del observador aplicada a la herramienta: si saltar una hora no
 * dejara el mundo igual que vivirla, lo que se verifique con ella no diria nada
 * de la partida real.
 */
describe('Saltar el tiempo equivale a esperar quieto', () => {
  function snapshot(state: ReturnType<typeof createGame>): number[] {
    const tileX = Math.floor(state.entities.x[state.playerId]);
    const tileY = Math.floor(state.entities.y[state.playerId]);
    const cx = tileX >> 5;
    const cy = tileY >> 5;
    const biome = state.world.biomeAt(tileX, tileY);
    return [
      state.tick,
      state.world.currentTick,
      state.entities.hunger[state.playerId],
      state.world.trackedChunkCount,
      state.world.populationOf(cx, cy, biome, LifeKind.Tree),
      state.world.populationOf(cx, cy, biome, LifeKind.Plant),
      state.world.countOf(cx, cy, biome, LifeKind.Tree),
      state.world.countOf(cx, cy, biome, LifeKind.Plant),
    ];
  }

  it('una hora saltada y una hora vivida quieto dejan el mismo mundo', () => {
    const hour = Math.round(DAY_TICKS / 24);

    const waited = createGame(31337);
    const idle = emptyIntent();
    for (let t = 0; t < hour; t++) step(waited, idle);

    const skipped = createGame(31337);
    skipTime(skipped, hour);

    // Identico, no parecido: la vida avanza en pasos globales fijos y el hambre
    // se aplica tick a tick tambien en el salto.
    expect(snapshot(skipped)).toEqual(snapshot(waited));
  });
});
