import { describe, expect, it } from 'vitest';
import {
  groundHeight,
  isRampEdge,
  LEVEL_STEP,
  levelFrom,
  MAX_LEVEL,
  NO_RAMP,
  OUTCROP_RISE,
  rampDirOf,
  RAMP_DIRS,
  RAMP_SHARE,
  SEA_LEVEL,
  WATER_LEVEL,
  World,
  WorldGen,
} from '@verdant/sim';
import { Terrain } from '@verdant/shared';

/**
 * El relieve.
 *
 * Dos cosas que defender por encima de todo. La primera, que **el mundo no
 * cambia de forma**: la altura sale de la misma elevacion que ya clasificaba el
 * terreno, asi que los biomas y sus umbrales calibrados tienen que salir
 * exactamente igual que antes. La segunda, que **el mundo sigue siendo
 * explorable**: las paredes de dos bloques que pidio el autor no pueden partirlo
 * en trozos incomunicados.
 */

const SEEDS = [12345, 7, 999];

describe('La altura es otra forma de escribir la elevacion', () => {
  it('el agua queda en negativo y la tierra empieza en cero', () => {
    expect(levelFrom(SEA_LEVEL - 0.001)).toBe(WATER_LEVEL);
    expect(levelFrom(0)).toBe(WATER_LEVEL);
    expect(levelFrom(SEA_LEVEL)).toBe(0);
  });

  it('cada escalon de elevacion sube un nivel, y se topa arriba', () => {
    expect(levelFrom(SEA_LEVEL + LEVEL_STEP)).toBe(1);
    expect(levelFrom(SEA_LEVEL + LEVEL_STEP * 3)).toBe(3);
    expect(levelFrom(SEA_LEVEL + LEVEL_STEP * MAX_LEVEL)).toBe(MAX_LEVEL);
    expect(levelFrom(SEA_LEVEL + LEVEL_STEP * (MAX_LEVEL + 20))).toBe(MAX_LEVEL);
  });

  it('el tope solo se alcanza con cordillera, no con la elevacion a secas', () => {
    // La elevacion cruda no pasa de 1, que son nueve niveles. Los cuarenta del
    // tope son cosa de la amplificacion: si `levelFrom(1)` llegara al tope, el
    // escalon estaria mal y todo el mundo llano se habria aplastado.
    expect(levelFrom(1)).toBeLessThan(MAX_LEVEL);
    expect(levelFrom(1)).toBe(Math.floor((1 - SEA_LEVEL) / LEVEL_STEP));
  });

  it('el terreno generado no ha cambiado: agua es nivel negativo y tierra no', () => {
    // La equivalencia que protege la calibracion de biomas entera. Si alguien
    // mueve el nivel del mar sin mover el umbral de agua, esto se cae.
    for (const seed of SEEDS) {
      const gen = new WorldGen(seed);
      for (let y = -150; y < 150; y += 3) {
        for (let x = -150; x < 150; x += 3) {
          const terrain = gen.terrainAt(x, y);
          const wet = terrain === Terrain.Water || terrain === Terrain.DeepWater;
          expect(gen.levelAt(x, y) < 0, `desacuerdo en (${x}, ${y}) semilla ${seed}`).toBe(wet);
        }
      }
    }
  });

  it('la costa no se ha movido: bajo el mar el relieve es la elevacion', () => {
    // La amplificacion de cordillera esta anclada al nivel del mar y solo actua
    // por encima. Es lo que permite meter montanas sin volver a calibrar el agua,
    // el fondo y la arena, que son los tres umbrales mas delicados que hay.
    for (const seed of SEEDS) {
      const gen = new WorldGen(seed);
      let wet = 0;
      for (let y = -150; y < 150; y += 3) {
        for (let x = -150; x < 150; x += 3) {
          const e = gen.elevationAt(x, y);
          if (e > SEA_LEVEL) continue;
          expect(gen.reliefAt(x, y), `el mar se movio en (${x}, ${y})`).toBe(e);
          wet++;
        }
      }
      expect(wet, `semilla ${seed} sin mar`).toBeGreaterThan(100);
    }
  });

  it('hay montanas de verdad, no llanuras onduladas', () => {
    // El fallo que reporto el autor: exploro un rato y no encontro ninguna
    // colina pronunciada. La medida le daba la razon a medias —habia rango pero
    // no pendiente— y esto es esa queja convertida en numero.
    for (const seed of SEEDS) {
      const gen = new WorldGen(seed);
      let peak = 0;
      let steps = 0;
      for (let y = -200; y < 200; y++) {
        for (let x = -200; x < 200; x++) {
          const level = gen.levelAt(x, y);
          if (level < 0) continue;
          if (level > peak) peak = level;
          if (gen.levelAt(x + 1, y) !== level) steps++;
        }
      }
      // Una cima que domine el paisaje, no un cerro.
      expect(peak, `semilla ${seed}: la cima mas alta es el nivel ${peak}`).toBeGreaterThan(18);
      // Y pendiente: una frontera de nivel cada pocas casillas en alguna parte.
      // Antes de las cordilleras caia una cada treinta, que es una llanura.
      expect(steps / (400 * 400)).toBeGreaterThan(0.03);
    }
  });

  it('los salientes no levantan el agua', () => {
    const gen = new WorldGen(12345);
    for (let y = -150; y < 150; y += 3) {
      for (let x = -150; x < 150; x += 3) {
        if (gen.levelAt(x, y) >= 0) continue;
        expect(gen.levelAt(x, y)).toBe(WATER_LEVEL);
      }
    }
  });
});

describe('Una arista se ve igual desde sus dos lados', () => {
  it('rampa o pared no depende de quien mire', () => {
    // Si dependiera, se podria subir una pared por un lado y no por el otro, y
    // el dibujo y la colision discreparian sobre la misma arista.
    for (let y = -40; y < 40; y++) {
      for (let x = -40; x < 40; x++) {
        expect(isRampEdge(777, x, y, x + 1, y)).toBe(isRampEdge(777, x + 1, y, x, y));
        expect(isRampEdge(777, x, y, x, y + 1)).toBe(isRampEdge(777, x, y + 1, x, y));
      }
    }
  });

  it('las dos aristas de un mismo tile son independientes', () => {
    // Si el eje no entrara en la clave, la arista este y la sur de un tile
    // darian siempre lo mismo y las rampas saldrian alineadas en diagonal.
    let differ = 0;
    for (let y = -40; y < 40; y++) {
      for (let x = -40; x < 40; x++) {
        if (isRampEdge(31337, x, y, x + 1, y) !== isRampEdge(31337, x, y, x, y + 1)) differ++;
      }
    }
    expect(differ).toBeGreaterThan(0);
  });

  it('la proporcion de rampas es la acordada', () => {
    let ramps = 0;
    let total = 0;
    for (let y = -200; y < 200; y++) {
      for (let x = -200; x < 200; x++) {
        if (isRampEdge(4242, x, y, x + 1, y)) ramps++;
        if (isRampEdge(4242, x, y, x, y + 1)) ramps++;
        total += 2;
      }
    }
    expect(ramps / total).toBeCloseTo(RAMP_SHARE, 2);
  });
});

describe('El talud de un tile', () => {
  /** Un mundo de juguete: alturas dadas a mano, para poder razonar sobre ellas. */
  function levelsFrom(grid: readonly (readonly number[])[]): (x: number, y: number) => number {
    return (x, y) => grid[y]?.[x] ?? -1;
  }

  it('un tile rodeado de su mismo nivel es plano', () => {
    const levelOf = levelsFrom([
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ]);
    expect(rampDirOf(1, 1, 1, 1, levelOf)).toBe(NO_RAMP);
  });

  it('hacia un vecino dos niveles mas alto nunca hay talud', () => {
    // Es la regla de la que salen las paredes infranqueables: dos niveles son
    // siempre pared, marque el ruido lo que marque.
    const levelOf = levelsFrom([
      [0, 3, 0],
      [3, 1, 3],
      [0, 3, 0],
    ]);
    for (let seed = 0; seed < 200; seed++) {
      expect(rampDirOf(seed, 1, 1, 1, levelOf), `semilla ${seed}`).toBe(NO_RAMP);
    }
  });

  it('hacia un vecino un nivel mas alto hay talud en el 15 % de los casos', () => {
    const levelOf = levelsFrom([
      [0, 0, 0],
      [0, 1, 0],
      [0, 2, 0],
    ]);
    // El unico candidato es el del sur, a nivel 2 desde el 1 del centro.
    let ramps = 0;
    const tries = 2000;
    for (let seed = 0; seed < tries; seed++) {
      const dir = rampDirOf(seed, 1, 1, 1, levelOf);
      if (dir === NO_RAMP) continue;
      expect(RAMP_DIRS[dir]).toEqual({ x: 0, y: 1 });
      ramps++;
    }
    expect(ramps / tries).toBeCloseTo(RAMP_SHARE, 1);
  });

  it('el agua no tiene talud', () => {
    const levelOf = levelsFrom([
      [0, 0, 0],
      [0, -1, 0],
      [0, 0, 0],
    ]);
    expect(rampDirOf(9, 1, 1, -1, levelOf)).toBe(NO_RAMP);
  });
});

describe('La altura del suelo dentro de un tile', () => {
  it('un tile plano vale su nivel en cualquier punto', () => {
    for (const [fx, fy] of [[0, 0], [0.5, 0.5], [0.99, 0.01]]) {
      expect(groundHeight(3, NO_RAMP, fx, fy)).toBe(3);
    }
  });

  it('un talud sube de su nivel al siguiente, sin escalon en ningun borde', () => {
    // Es lo que hace continuo el campo de alturas: en el limite con el tile alto
    // el talud ya vale exactamente su nivel, asi que no hay salto vertical.
    for (let dir = 0; dir < RAMP_DIRS.length; dir++) {
      const d = RAMP_DIRS[dir];
      // Punto pegado al lado por el que sube, y punto en el lado opuesto.
      const high = { x: d.x === 0 ? 0.5 : (d.x + 1) / 2, y: d.y === 0 ? 0.5 : (d.y + 1) / 2 };
      const low = { x: d.x === 0 ? 0.5 : (1 - d.x) / 2, y: d.y === 0 ? 0.5 : (1 - d.y) / 2 };
      expect(groundHeight(2, dir, high.x, high.y), `dir ${dir}`).toBeCloseTo(3, 10);
      expect(groundHeight(2, dir, low.x, low.y), `dir ${dir}`).toBeCloseTo(2, 10);
      expect(groundHeight(2, dir, 0.5, 0.5), `dir ${dir}`).toBeCloseTo(2.5, 10);
    }
  });
});

describe('El mundo con relieve sigue siendo explorable', () => {
  /**
   * Mayor componente conexa de la tierra, permitiendo subir como mucho `climb`
   * niveles. Con `climb` grande solo el agua separa, y esa es la linea base
   * contra la que hay que comparar: el mundo plano tampoco es del todo conexo, y
   * confundir las dos cosas hace pasar por sano un relieve que no lo es.
   */
  function largestComponent(level: Int8Array, side: number, climb: number): number {
    const seen = new Uint8Array(side * side);
    const stack: number[] = [];
    let best = 0;
    for (let start = 0; start < seen.length; start++) {
      if (seen[start] || level[start] < 0) continue;
      seen[start] = 1;
      stack.push(start);
      let size = 0;
      while (stack.length) {
        const i = stack.pop()!;
        size++;
        const x = i % side;
        const y = (i / side) | 0;
        const here = level[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= side || ny < 0 || ny >= side) continue;
          const j = ny * side + nx;
          if (seen[j] || level[j] < 0 || level[j] - here > climb) continue;
          seen[j] = 1;
          stack.push(j);
        }
      }
      if (size > best) best = size;
    }
    return best;
  }

  function sample(seed: number, side: number): Int8Array {
    const gen = new WorldGen(seed);
    const level = new Int8Array(side * side);
    const half = side >> 1;
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) level[y * side + x] = gen.levelAt(x - half, y - half);
    }
    return level;
  }

  for (const seed of SEEDS) {
    it(`semilla ${seed}: el relieve no parte el mundo`, () => {
      const side = 220;
      const level = sample(seed, side);
      let land = 0;
      for (const l of level) if (l >= 0) land++;

      const base = largestComponent(level, side, 99);
      const real = largestComponent(level, side, 1);
      const lost = (100 * (base - real)) / land;
      // El presupuesto acordado: el relieve puede costar como mucho un punto de
      // conectividad sobre la fragmentacion que ya causa el agua. Al doble de
      // salientes esto llega a 17 puntos, que es un mundo partido en dos.
      expect(lost, `pierde ${lost.toFixed(2)} puntos de conectividad`).toBeLessThan(1.2);
    });

    it(`semilla ${seed}: existen paredes de dos o mas bloques`, () => {
      // Sin ellas el encargo del autor no esta cumplido: todo se subiria de un
      // salto y no habria que buscar por donde.
      const side = 220;
      const level = sample(seed, side);
      let tall = 0;
      for (let y = 1; y < side - 1; y++) {
        for (let x = 1; x < side - 1; x++) {
          const here = level[y * side + x];
          if (here < 0) continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            if (level[(y + dy) * side + (x + dx)] - here >= 2) {
              tall++;
              break;
            }
          }
        }
      }
      expect(tall).toBeGreaterThan(50);
    });
  }

  it('fuera de las cordilleras el terreno no da escalones de dos', () => {
    // Donde no hay cordillera, el campo de elevacion es tan suave que dos tiles
    // vecinos no se llevan dos niveles: ahi los muros solo pueden venir de los
    // salientes. Es lo que hace que el mundo llano siga siendo el de siempre.
    const gen = new WorldGen(12345);
    let checked = 0;
    for (let y = -120; y < 120; y++) {
      for (let x = -120; x < 120; x++) {
        if (gen.isOutcrop(x, y) || gen.ridgeAt(x, y) > 0) continue;
        const here = gen.levelAt(x, y);
        if (here < 0) continue;
        for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          if (gen.isOutcrop(nx, ny) || gen.ridgeAt(nx, ny) > 0) continue;
          const there = gen.levelAt(nx, ny);
          if (there < 0) continue;
          expect(
            Math.abs(there - here),
            `escalon de ${Math.abs(there - here)} en llano, en (${x}, ${y})`,
          ).toBeLessThanOrEqual(1);
          checked++;
        }
      }
    }
    expect(checked, 'no se encontro llano sin cordillera').toBeGreaterThan(1000);
  });

  it('las cordilleras SI dan acantilados naturales, y salen gratis', () => {
    // Esto contradice lo que supuse al disenarlo: pensaba que una cordillera solo
    // daria laderas escalonadas y que todo muro vendria de un saliente. Medido,
    // la pendiente amplificada pasa de un nivel por casilla en muchos sitios y
    // fabrica acantilados de verdad. Y no cuesta conectividad: un acantilado en
    // mitad de una ladera siempre se rodea, porque la escalera sigue al lado.
    const gen = new WorldGen(7);
    let cliffs = 0;
    for (let y = -200; y < 200; y++) {
      for (let x = -200; x < 200; x++) {
        if (gen.isOutcrop(x, y) || gen.ridgeAt(x, y) === 0) continue;
        const here = gen.levelAt(x, y);
        if (here < 0) continue;
        for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
          if (gen.levelAt(x + dx, y + dy) - here >= 2) cliffs++;
        }
      }
    }
    expect(cliffs, 'las cordilleras no producen ni un acantilado').toBeGreaterThan(50);
  });

  it('un saliente levanta exactamente lo acordado', () => {
    const gen = new WorldGen(7);
    let checked = 0;
    for (let y = -120; y < 120; y++) {
      for (let x = -120; x < 120; x++) {
        if (!gen.isOutcrop(x, y)) continue;
        const level = gen.levelAt(x, y);
        if (level < 0 || level === MAX_LEVEL) continue; // el agua no sube y arriba se topa
        // La base es el nivel del RELIEVE, no el de la elevacion cruda: sobre una
        // cordillera el saliente se levanta desde la ladera amplificada.
        expect(level - levelFrom(gen.reliefAt(x, y))).toBe(OUTCROP_RISE);
        checked++;
      }
    }
    expect(checked, 'no se encontro ni un saliente').toBeGreaterThan(0);
  });
});

describe('El relieve que lee el mundo es el que genero el generador', () => {
  it('el chunk y el generador dicen la misma altura', () => {
    // La fuente unica de verdad aplicada al relieve: el cliente dibuja desde el
    // chunk y la fisica leera del chunk, asi que no pueden discrepar.
    // Se recorre TILE A TILE una banda que cruza varios limites de chunk. El
    // margen de `generateChunk` existe justo para esas columnas y filas: sin el,
    // el talud del borde se calcularia contra un vecino inventado y este test lo
    // ve, mientras que un muestreo espaciado se lo saltaria.
    const world = new World(12345);
    const gen = world.gen;
    for (let y = -34; y <= 34; y++) {
      for (let x = -34; x <= 34; x++) {
        expect(world.levelAt(x, y), `altura en (${x}, ${y})`).toBe(gen.levelAt(x, y));
        expect(world.rampDirAt(x, y), `talud en (${x}, ${y})`).toBe(gen.rampDirAt(x, y));
      }
    }
  });

  it('el talud del borde de un chunk no depende de por donde se genero', () => {
    // `generateChunk` es pura, y para seguir siendolo mira un tile de margen
    // alrededor. Sin ese margen, el relieve de la costura dependeria del orden
    // en que se generasen los chunks.
    const a = new World(999);
    const b = new World(999);
    // El mismo tile, alcanzado desde dos lados opuestos.
    b.levelAt(200, 200);
    b.levelAt(-200, -200);
    for (const [x, y] of [[31, 31], [32, 32], [0, 31], [31, 0], [-1, -1], [-33, 64]] as const) {
      expect(a.rampDirAt(x, y), `talud en (${x}, ${y})`).toBe(b.rampDirAt(x, y));
    }
  });

  it('la altura del suelo es continua al cruzar a un talud', () => {
    const world = new World(12345);
    // Se busca un talud de verdad en el mundo generado y se cruza su borde alto.
    let found = false;
    for (let y = -100; y < 100 && !found; y++) {
      for (let x = -100; x < 100; x++) {
        const dir = world.rampDirAt(x, y);
        if (dir < 0) continue;
        const d = RAMP_DIRS[dir];
        // Justo antes del borde por el que sube, ya casi a la altura del vecino.
        const px = x + 0.5 + d.x * 0.49;
        const py = y + 0.5 + d.y * 0.49;
        expect(world.groundHeightAt(px, py)).toBeCloseTo(world.levelAt(x, y) + 0.99, 6);
        expect(world.levelAt(x + d.x, y + d.y)).toBe(world.levelAt(x, y) + 1);
        found = true;
        break;
      }
    }
    expect(found, 'no se encontro ni un talud en el mundo de prueba').toBe(true);
  });
});
