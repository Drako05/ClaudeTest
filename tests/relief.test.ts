import { describe, expect, it } from 'vitest';
import {
  canClimbTo,
  HALF_STEP,
  heightFrom,
  JUMP_HALVES,
  MAX_HEIGHT,
  OUTCROP_RISE,
  SEA_LEVEL,
  topOf,
  VOXEL,
  VOXELS_PER_TILE,
  WALK_HALVES,
  WATER_HEIGHT,
  World,
  WorldGen,
} from '@verdant/sim';
import { Terrain } from '@verdant/shared';

/**
 * El relieve, en voxeles de 0,5 (el autor, 2026-10-06): columnas de medio bloque
 * de lado con su altura en medios bloques, sin rampas.
 *
 * Dos cosas que defender por encima de todo. La primera, que **el mundo no
 * cambia de forma**: la altura sale de la misma elevacion que ya clasificaba el
 * terreno, asi que los biomas y sus umbrales calibrados tienen que salir
 * exactamente igual que antes. La segunda, que **el mundo sigue siendo
 * explorable**: las paredes que pidio el autor no pueden partirlo en trozos
 * incomunicados.
 */

const SEEDS = [12345, 7, 999];

/** Las cuatro columnas de una casilla, en coordenadas de voxel. */
function columnsOf(tx: number, ty: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let sy = 0; sy < VOXELS_PER_TILE; sy++) {
    for (let sx = 0; sx < VOXELS_PER_TILE; sx++) out.push([tx * VOXELS_PER_TILE + sx, ty * VOXELS_PER_TILE + sy]);
  }
  return out;
}

describe('La altura es otra forma de escribir la elevacion', () => {
  it('la tierra empieza en cero y sube un medio bloque por cada medio escalon del autor', () => {
    expect(heightFrom(SEA_LEVEL)).toBe(0);
    expect(heightFrom(SEA_LEVEL - 0.001)).toBe(0);
    expect(HALF_STEP).toBeCloseTo(0.03, 10);
    // A media altura de cada escalon, para no depender del redondeo del borde.
    expect(heightFrom(SEA_LEVEL + HALF_STEP * 1.5)).toBe(1);
    expect(heightFrom(SEA_LEVEL + HALF_STEP * 7.5)).toBe(7);
    expect(heightFrom(SEA_LEVEL + HALF_STEP * (MAX_HEIGHT + 20))).toBe(MAX_HEIGHT);
    expect(topOf(MAX_HEIGHT)).toBe(40);
  });

  it('el tope solo se alcanza con cordillera, no con la elevacion a secas', () => {
    expect(heightFrom(1)).toBeLessThan(MAX_HEIGHT);
  });

  it('el terreno generado no ha cambiado: agua es altura de agua en sus cuatro columnas, y tierra no', () => {
    // La equivalencia que protege la calibracion de biomas entera. Si alguien
    // mueve el nivel del mar sin mover el umbral de agua, esto se cae.
    for (const seed of SEEDS) {
      const gen = new WorldGen(seed);
      for (let y = -150; y < 150; y += 7) {
        for (let x = -150; x < 150; x += 7) {
          const terrain = gen.terrainAt(x, y);
          const wet = terrain === Terrain.Water || terrain === Terrain.DeepWater;
          for (const [vx, vy] of columnsOf(x, y)) {
            const h = gen.columnTopAt(vx, vy);
            expect(h === WATER_HEIGHT, `desacuerdo en (${x}, ${y}) semilla ${seed}`).toBe(wet);
            if (!wet) expect(h).toBeGreaterThanOrEqual(0);
          }
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

  it('la columna de la esquina de una casilla es la casilla tal cual', () => {
    const gen = new WorldGen(7);
    for (let y = -60; y < 60; y += 5) {
      for (let x = -60; x < 60; x += 5) {
        expect(gen.columnTopAt(x * VOXELS_PER_TILE, y * VOXELS_PER_TILE)).toBe(gen.tileTopAt(x, y));
      }
    }
  });

  it('las columnas de en medio interpolan el relieve entre las esquinas de su casilla', () => {
    // Es lo que hace que la elevacion se lea cada 0,5 sin ruido nuevo (deduccion
    // del agente): la columna del este de una casilla cae en la media de su
    // esquina y la del este, y la del sureste, en la media de las cuatro.
    const gen = new WorldGen(7);
    let checked = 0;
    for (let y = -80; y < 80; y += 3) {
      for (let x = -80; x < 80; x += 3) {
        if (gen.tileTopAt(x, y) < 0) continue;
        if ([[0, 0], [1, 0], [0, 1], [1, 1]].some(([dx, dy]) => gen.isOutcrop(x + dx, y + dy))) continue;
        const r = (dx: number, dy: number) => gen.reliefAt(x + dx, y + dy);
        expect(gen.columnTopAt(x * 2 + 1, y * 2)).toBe(heightFrom((r(0, 0) + r(1, 0)) / 2));
        expect(gen.columnTopAt(x * 2 + 1, y * 2 + 1)).toBe(heightFrom((r(0, 0) + r(1, 0) + r(0, 1) + r(1, 1)) / 4));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('hay montanas de verdad, no llanuras onduladas', () => {
    // El fallo que reporto el autor: exploro un rato y no encontro ninguna
    // colina pronunciada. Una cima que domine el paisaje, y pendiente.
    for (const seed of SEEDS) {
      const gen = new WorldGen(seed);
      let peak = 0;
      let steps = 0;
      for (let y = -200; y < 200; y++) {
        for (let x = -200; x < 200; x++) {
          const h = gen.tileTopAt(x, y);
          if (h < 0) continue;
          if (h > peak) peak = h;
          if (gen.tileTopAt(x + 1, y) !== h) steps++;
        }
      }
      expect(topOf(peak), `semilla ${seed}: la cima mas alta mide ${topOf(peak)}`).toBeGreaterThan(18);
      expect(steps / (400 * 400)).toBeGreaterThan(0.03);
    }
  });
});

describe('Se sube andando medio bloque y de un salto uno entero', () => {
  it('el modelo de transito: medio bloque andando, dos de un salto, nunca al agua', () => {
    expect(WALK_HALVES * VOXEL).toBe(0.5);
    expect(JUMP_HALVES * VOXEL).toBe(1);
    expect(canClimbTo(3, 4, false)).toBe(true);
    expect(canClimbTo(3, 5, false)).toBe(false);
    expect(canClimbTo(3, 5, true)).toBe(true);
    expect(canClimbTo(3, 6, true)).toBe(false);
    expect(canClimbTo(9, 0, false)).toBe(true);
    expect(canClimbTo(0, WATER_HEIGHT, true)).toBe(false);
  });
});

describe('El mundo con relieve sigue siendo explorable', () => {
  /** Las alturas de las columnas de un cuadrado de `side` casillas, leidas de los chunks. */
  function sample(seed: number, side: number): { height: Int16Array; n: number } {
    const world = new World(seed);
    const n = side * VOXELS_PER_TILE;
    const half = n >> 1;
    const height = new Int16Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) height[y * n + x] = world.columnTop(x - half, y - half);
    }
    return { height, n };
  }

  /**
   * Mayor componente conexa de la tierra, permitiendo subir como mucho `climb`
   * medios bloques. Con `climb` grande solo el agua separa, y esa es la linea
   * base contra la que hay que comparar: el mundo plano tampoco es del todo
   * conexo, y confundir las dos cosas hace pasar por sano un relieve que no lo es.
   */
  function largestComponent(height: Int16Array, n: number, climb: number): number {
    const seen = new Uint8Array(n * n);
    const stack: number[] = [];
    let best = 0;
    for (let start = 0; start < seen.length; start++) {
      if (seen[start] || height[start] < 0) continue;
      seen[start] = 1;
      stack.push(start);
      let size = 0;
      while (stack.length) {
        const i = stack.pop()!;
        size++;
        const x = i % n;
        const y = (i / n) | 0;
        const here = height[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= n || ny < 0 || ny >= n) continue;
          const j = ny * n + nx;
          if (seen[j] || height[j] < 0 || height[j] - here > climb) continue;
          seen[j] = 1;
          stack.push(j);
        }
      }
      if (size > best) best = size;
    }
    return best;
  }

  for (const seed of SEEDS) {
    it(`semilla ${seed}: el relieve no parte el mundo`, () => {
      const { height, n } = sample(seed, 220);
      let land = 0;
      for (const h of height) if (h >= 0) land++;
      const base = largestComponent(height, n, 9999);
      const real = largestComponent(height, n, JUMP_HALVES);
      const lost = (100 * (base - real)) / land;
      // El presupuesto acordado: el relieve puede costar como mucho un punto de
      // conectividad sobre la fragmentacion que ya causa el agua.
      expect(lost, `pierde ${lost.toFixed(2)} puntos de conectividad`).toBeLessThan(1.2);

    });

    it(`semilla ${seed}: existen paredes de dos o mas bloques`, () => {
      // Sin ellas el encargo del autor no esta cumplido: todo se subiria de un
      // salto y no habria que buscar por donde. Salen de los salientes, que
      // son escasos a proposito (regla 14): hace falta mirar lejos.
      const { height, n } = sample(seed, 360);
      let tall = 0;
      for (let y = 1; y < n - 1; y++) {
        for (let x = 1; x < n - 1; x++) {
          const here = height[y * n + x];
          if (here < 0) continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            if (height[(y + dy) * n + (x + dx)] - here >= 2 * VOXELS_PER_TILE) {
              tall++;
              break;
            }
          }
        }
      }
      expect(tall).toBeGreaterThan(50);
    });
  }

  it('fuera de los salientes y las cordilleras todo se sube andando: medio bloque como mucho', () => {
    // Las columnas interpolan la elevacion entre las esquinas, y en llano esa
    // pendiente no pasa de medio bloque entre vecinas: las antiguas rampas son
    // ahora escaleras de medio bloque.
    const world = new World(12345);
    const gen = world.gen;
    let checked = 0;
    for (let vy = -200; vy < 200; vy++) {
      for (let vx = -200; vx < 200; vx++) {
        const tx = Math.floor(vx / VOXELS_PER_TILE);
        const ty = Math.floor(vy / VOXELS_PER_TILE);
        if (gen.ridgeAt(tx, ty) > 0) continue;
        if ([[0, 0], [1, 0], [0, 1], [1, 1]].some(([dx, dy]) => gen.isOutcrop(tx + dx, ty + dy))) continue;
        const here = world.columnTop(vx, vy);
        if (here < 0) continue;
        for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
          const there = world.columnTop(vx + dx, vy + dy);
          if (there < 0) continue;
          expect(Math.abs(there - here), `escalon de ${there - here} en llano, en (${vx}, ${vy})`).toBeLessThanOrEqual(WALK_HALVES);
          checked++;
        }
      }
    }
    expect(checked, 'no se encontro llano sin cordillera').toBeGreaterThan(10000);
  });

  it('las cordilleras dan paredes de un bloque, que se saltan', () => {
    // Con columnas interpoladas la pendiente amplificada de una cordillera sale
    // en paredes de un bloque, no en acantilados de dos (que dan los salientes).
    const world = new World(7);
    const gen = world.gen;
    let jumps = 0;
    for (let vy = -300; vy < 300; vy++) {
      for (let vx = -300; vx < 300; vx++) {
        if (gen.ridgeAt(Math.floor(vx / VOXELS_PER_TILE), Math.floor(vy / VOXELS_PER_TILE)) === 0) continue;
        const here = world.columnTop(vx, vy);
        if (here < 0) continue;
        if (world.columnTop(vx + 1, vy) - here >= JUMP_HALVES) jumps++;
      }
    }
    expect(jumps, 'las cordilleras no producen ni una pared de un bloque').toBeGreaterThan(50);
  });

  it('un saliente levanta exactamente lo acordado', () => {
    const gen = new WorldGen(7);
    let checked = 0;
    for (let y = -120; y < 120; y++) {
      for (let x = -120; x < 120; x++) {
        if (!gen.isOutcrop(x, y)) continue;
        const h = gen.tileTopAt(x, y);
        if (h < 0 || h === MAX_HEIGHT) continue; // el agua no sube y arriba se topa
        // La base es la altura del RELIEVE: sobre una cordillera el saliente se
        // levanta desde la ladera amplificada.
        expect(h - heightFrom(gen.reliefAt(x, y))).toBe(OUTCROP_RISE * VOXELS_PER_TILE);
        checked++;
      }
    }
    expect(checked, 'no se encontro ni un saliente').toBeGreaterThan(0);
  });
});

describe('El relieve que lee el mundo es el que genero el generador', () => {
  it('el chunk y el generador dicen la misma altura, columna a columna', () => {
    // La fuente unica de verdad aplicada al relieve: el cliente dibuja desde el
    // chunk y la fisica lee del chunk, asi que no pueden discrepar. Se recorre
    // una banda que cruza varios limites de chunk: el margen de `generateChunk`
    // existe justo para esas columnas.
    const world = new World(12345);
    const gen = world.gen;
    for (let vy = -70; vy <= 70; vy++) {
      for (let vx = -70; vx <= 70; vx += 3) {
        expect(world.columnTop(vx, vy), `altura en (${vx}, ${vy})`).toBe(gen.columnTopAt(vx, vy));
      }
    }
  });

  it('la altura del borde de un chunk no depende de por donde se genero', () => {
    const a = new World(999);
    const b = new World(999);
    b.columnTop(400, 400);
    b.columnTop(-400, -400);
    for (const [vx, vy] of [[63, 63], [64, 64], [0, 63], [63, 0], [-1, -1], [-65, 128]] as const) {
      expect(a.columnTop(vx, vy), `altura en (${vx}, ${vy})`).toBe(b.columnTop(vx, vy));
    }
  });

  it('el suelo de un punto es el techo de su columna: sin rampas, a escalones de medio bloque', () => {
    const world = new World(12345);
    for (let y = -20; y < 20; y += 0.37) {
      for (let x = -20; x < 20; x += 0.41) {
        const h = world.groundHeightAt(x, y);
        expect(h).toBe(topOf(world.columnTop(Math.floor(x * 2), Math.floor(y * 2))));
        expect(Number.isInteger(h / VOXEL)).toBe(true);
        expect(world.isSolidVoxel(Math.floor(x * 2), Math.floor(y * 2), h / VOXEL - 1)).toBe(true);
        expect(world.isSolidVoxel(Math.floor(x * 2), Math.floor(y * 2), h / VOXEL)).toBe(false);
      }
    }
  });
});
