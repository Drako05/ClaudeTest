/**
 * El relieve del mundo convertido en una malla de triangulos.
 *
 * **Puro**: no importa three.js ni toca el DOM. Devuelve arrays planos y quien
 * dibuje los envuelve. Asi la geometria se puede comprobar en Node, y eso aqui no
 * es un lujo: si la malla mintiera sobre el mundo, el personaje andaria por
 * encima o por debajo de lo que pisa.
 *
 * Sale de `groundHeight(level, rampDir, fx, fy)`, que ya existia en
 * `sim/relief.ts` y devuelve la altura continua en cualquier punto de una
 * casilla. Esa funcion **ya era la descripcion de una malla**; aqui solo se
 * recorre.
 *
 * Ejes: `x` e `y` del mundo van a `x` y `z`, y la altura a `y`, que es el
 * convenio de three.js. El mundo sigue siendo la misma rejilla cuadrada.
 *
 * A diferencia del isometrico, se emiten las paredes de **los cuatro** vecinos y
 * no de dos. Ese es justo el motivo de todo esto: con la camara libre ya no hay
 * dos costados que el propio bloque tape siempre.
 */

import { CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { groundHeight, type Chunk, type World } from '@verdant/sim';

/** Geometria lista para subir a la GPU, en arrays planos. */
export interface MeshData {
  /** `x, y, z` por vertice. */
  readonly positions: Float32Array;
  /** `r, g, b` por vertice, de 0 a 1. */
  readonly colors: Float32Array;
  readonly indices: Uint32Array;
  /** Cuantos triangulos lleva, para poder medirlo. */
  readonly triangles: number;
}

/** Un vecino: a que lado esta y que esquinas comparte con nosotros. */
interface Side {
  readonly dx: number;
  readonly dy: number;
  /** Mis dos esquinas del borde, en coordenadas locales `[fx, fy]`. */
  readonly mine: readonly [readonly [number, number], readonly [number, number]];
  /** Las suyas que tocan las mias, en el mismo orden. */
  readonly theirs: readonly [readonly [number, number], readonly [number, number]];
}

const SIDES: readonly Side[] = [
  { dx: 1, dy: 0, mine: [[1, 0], [1, 1]], theirs: [[0, 0], [0, 1]] },
  { dx: -1, dy: 0, mine: [[0, 1], [0, 0]], theirs: [[1, 1], [1, 0]] },
  { dx: 0, dy: 1, mine: [[1, 1], [0, 1]], theirs: [[1, 0], [0, 0]] },
  { dx: 0, dy: -1, mine: [[0, 0], [1, 0]], theirs: [[0, 1], [1, 1]] },
];

/**
 * Altura de un tile en una de sus esquinas, sin generar nada nuevo.
 *
 * Fuera del chunk se pregunta al GENERADOR y no al mundo: `world.levelAt`
 * llamaria a `getChunk` y registraria el chunk vecino, con lo que dibujar
 * alteraria las cuentas de bioma. Es el mismo cuidado que tiene
 * `biome-edges.ts`.
 */
function cornerHeight(
  world: World,
  chunk: Chunk,
  wx: number,
  wy: number,
  fx: number,
  fy: number,
): number {
  const lx = wx - chunk.cx * CHUNK_SIZE;
  const ly = wy - chunk.cy * CHUNK_SIZE;
  if (lx >= 0 && lx < CHUNK_SIZE && ly >= 0 && ly < CHUNK_SIZE) {
    const idx = ly * CHUNK_SIZE + lx;
    return groundHeight(chunk.level[idx], chunk.rampDir[idx], fx, fy);
  }
  return groundHeight(world.gen.levelAt(wx, wy), world.gen.rampDirAt(wx, wy), fx, fy);
}

/** Color base de un terreno, ya con su franja de brillo aplicada. */
export type TerrainColor = (terrain: Terrain, wx: number, wy: number) => readonly [number, number, number];

/**
 * La malla de un chunk: una tapa por casilla y una pared por cada vecino que
 * quede mas abajo.
 *
 * La tapa usa las **cuatro** alturas de sus esquinas, asi que un talud sale como
 * un cuadrilatero alabeado —una rampa de verdad— sin necesitar codigo aparte. Es
 * la misma razon por la que el isometrico dibujaba un talud como un rombo torcido.
 */
export function chunkMesh(world: World, chunk: Chunk, colorOf: TerrainColor): MeshData {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const baseX = chunk.cx * CHUNK_SIZE;
  const baseY = chunk.cy * CHUNK_SIZE;

  /** Anade un cuadrilatero como dos triangulos, con un color plano. */
  const quad = (
    p: readonly (readonly [number, number, number])[],
    rgb: readonly [number, number, number],
  ): void => {
    const base = positions.length / 3;
    for (const [x, y, z] of p) {
      positions.push(x, y, z);
      colors.push(rgb[0], rgb[1], rgb[2]);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const idx = ly * CHUNK_SIZE + lx;
      const wx = baseX + lx;
      const wy = baseY + ly;
      const level = chunk.level[idx];
      const ramp = chunk.rampDir[idx];
      const terrain = chunk.terrain[idx] as Terrain;
      const rgb = colorOf(terrain, wx, wy);

      const h = (fx: number, fy: number): number => groundHeight(level, ramp, fx, fy);

      // La tapa, en orden antihorario vista desde arriba para que la normal
      // apunte al cielo y la luz la ilumine.
      quad(
        [
          [wx, h(0, 0), wy],
          [wx, h(0, 1), wy + 1],
          [wx + 1, h(1, 1), wy + 1],
          [wx + 1, h(1, 0), wy],
        ],
        rgb,
      );

      for (const side of SIDES) {
        const nx = wx + side.dx;
        const ny = wy + side.dy;
        const [a, b] = side.mine;
        const [ta, tb] = side.theirs;
        const topA = h(a[0], a[1]);
        const topB = h(b[0], b[1]);
        // El suelo del vecino no puede quedar por encima de nuestra cima en su
        // extremo: si lo estuviera, la pared se cruzaria consigo misma. Ahi
        // sencillamente no hay pared que dibujar por este lado.
        const botA = Math.min(cornerHeight(world, chunk, nx, ny, ta[0], ta[1]), topA);
        const botB = Math.min(cornerHeight(world, chunk, nx, ny, tb[0], tb[1]), topB);
        if (topA <= botA && topB <= botB) continue;

        // Las paredes bajan un punto respecto a la cima: sin eso, con luz cenital
        // una pared vertical y su tapa se leen del mismo color.
        const wall: readonly [number, number, number] = [rgb[0] * 0.72, rgb[1] * 0.72, rgb[2] * 0.74];
        quad(
          [
            [wx + a[0], topA, wy + a[1]],
            [wx + b[0], topB, wy + b[1]],
            [wx + b[0], botB, wy + b[1]],
            [wx + a[0], botA, wy + a[1]],
          ],
          wall,
        );
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    triangles: indices.length / 3,
  };
}

/**
 * La altura que la malla dibuja en un punto del mundo, leida de la propia malla.
 *
 * Existe para el test: comprobar que la geometria dice lo mismo que
 * `world.groundHeightAt` exige poder preguntarle a la geometria, no al codigo
 * que la genero.
 */
export function meshHeightAt(mesh: MeshData, wx: number, wy: number): number | null {
  let best: number | null = null;
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const z = mesh.positions[i + 2];
    if (Math.abs(x - wx) > 1e-6 || Math.abs(z - wy) > 1e-6) continue;
    const y = mesh.positions[i + 1];
    if (best === null || y > best) best = y;
  }
  return best;
}
