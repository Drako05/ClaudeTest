/**
 * El relieve del mundo convertido en una malla de triangulos.
 *
 * **Puro**: no importa three.js ni toca el DOM. Devuelve arrays planos y quien
 * dibuje los envuelve. Asi la geometria se puede comprobar en Node, y eso aqui no
 * es un lujo: si la malla mintiera sobre el mundo, el personaje andaria por
 * encima o por debajo de lo que pisa.
 *
 * El terreno son **voxeles de 0,5** (el autor, 2026-10-06): columnas de medio
 * bloque de lado, solidas hasta su altura, sin rampas. La malla es una tapa por
 * columna y una pared por cada vecina que quede mas abajo. Una casilla cuyas
 * cuatro columnas estan a la misma altura sale con **una sola tapa** de 1 × 1:
 * el terreno llano, que es casi todo, cuesta lo mismo que antes de los voxeles.
 *
 * Ejes: `x` e `y` del mundo van a `x` y `z`, y la altura a `y`, que es el
 * convenio de three.js.
 */

import { CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { CHUNK_COLUMNS, topOf, VOXEL, VOXELS_PER_TILE, type Chunk, type World } from '@verdant/sim';

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

/**
 * Los cuatro lados de una columna: hacia donde esta la vecina, y las dos
 * esquinas del borde comun, en fracciones de la columna, en orden antihorario
 * visto desde fuera para que la normal de la pared mire hacia la vecina.
 */
const SIDES: ReadonlyArray<{ dx: number; dy: number; a: [number, number]; b: [number, number] }> = [
  { dx: 1, dy: 0, a: [1, 0], b: [1, 1] },
  { dx: -1, dy: 0, a: [0, 1], b: [0, 0] },
  { dx: 0, dy: 1, a: [1, 1], b: [0, 1] },
  { dx: 0, dy: -1, a: [0, 0], b: [1, 0] },
];

/**
 * El techo de una columna de 0,5 (en coordenadas de voxel), en el mundo, sin
 * generar nada nuevo.
 *
 * Fuera del chunk se pregunta al GENERADOR y no al mundo: `world.columnTop`
 * llamaria a `getChunk` y registraria el chunk vecino, con lo que dibujar
 * alteraria las cuentas de bioma. Es el mismo cuidado que tiene
 * `biome-edges.ts`. Tambien lo usan las sombras (`shadow-patches.ts`), para
 * caer sobre la superficie que se dibuja y no sobre otra cuenta parecida.
 */
export function columnTopFor(world: World, chunk: Chunk, vx: number, vy: number): number {
  const lx = vx - chunk.cx * CHUNK_COLUMNS;
  const ly = vy - chunk.cy * CHUNK_COLUMNS;
  if (lx >= 0 && lx < CHUNK_COLUMNS && ly >= 0 && ly < CHUNK_COLUMNS) {
    return topOf(chunk.height[ly * CHUNK_COLUMNS + lx]);
  }
  return topOf(world.gen.columnTopAt(vx, vy));
}

/** Color base de un terreno, ya con su franja de brillo aplicada. */
export type TerrainColor = (terrain: Terrain, wx: number, wy: number) => readonly [number, number, number];

/** La malla de un chunk: las tapas de sus columnas y sus paredes. */
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

  /** Una tapa horizontal de `x0, y0` a `x1, y1` a la altura `h`, mirando al cielo. */
  const lid = (x0: number, y0: number, x1: number, y1: number, h: number, rgb: readonly [number, number, number]) =>
    quad(
      [
        [x0, h, y0],
        [x0, h, y1],
        [x1, h, y1],
        [x1, h, y0],
      ],
      rgb,
    );

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx;
      const wy = baseY + ly;
      const terrain = chunk.terrain[ly * CHUNK_SIZE + lx] as Terrain;
      const rgb = colorOf(terrain, wx, wy);
      // Las paredes bajan un punto respecto a la cima: sin eso, con luz cenital
      // una pared vertical y su tapa se leen del mismo color.
      const wall: readonly [number, number, number] = [rgb[0] * 0.72, rgb[1] * 0.72, rgb[2] * 0.74];

      const tops: number[] = [];
      for (let s = 0; s < VOXELS_PER_TILE * VOXELS_PER_TILE; s++) {
        const cx = (lx * VOXELS_PER_TILE + (s % VOXELS_PER_TILE));
        const cy = (ly * VOXELS_PER_TILE + Math.floor(s / VOXELS_PER_TILE));
        tops.push(topOf(chunk.height[cy * CHUNK_COLUMNS + cx]));
      }
      const flat = tops.every((t) => t === tops[0]);
      if (flat) lid(wx, wy, wx + 1, wy + 1, tops[0], rgb);

      for (let s = 0; s < tops.length; s++) {
        const sx = s % VOXELS_PER_TILE;
        const sy = Math.floor(s / VOXELS_PER_TILE);
        const vx = wx * VOXELS_PER_TILE + sx;
        const vy = wy * VOXELS_PER_TILE + sy;
        const x0 = wx + sx * VOXEL;
        const y0 = wy + sy * VOXEL;
        const top = tops[s];
        if (!flat) lid(x0, y0, x0 + VOXEL, y0 + VOXEL, top, rgb);
        for (const side of SIDES) {
          const below = columnTopFor(world, chunk, vx + side.dx, vy + side.dy);
          if (below >= top) continue;
          quad(
            [
              [x0 + side.a[0] * VOXEL, top, y0 + side.a[1] * VOXEL],
              [x0 + side.b[0] * VOXEL, top, y0 + side.b[1] * VOXEL],
              [x0 + side.b[0] * VOXEL, below, y0 + side.b[1] * VOXEL],
              [x0 + side.a[0] * VOXEL, below, y0 + side.a[1] * VOXEL],
            ],
            wall,
          );
        }
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
 * La altura que la malla dibuja en un punto del mundo, leida de la propia malla:
 * la mas alta de las tapas que lo cubren.
 *
 * Existe para el test: comprobar que la geometria dice lo mismo que
 * `world.groundHeightAt` exige poder preguntarle a la geometria, no al codigo
 * que la genero.
 */
export function meshHeightAt(mesh: MeshData, wx: number, wy: number): number | null {
  let best: number | null = null;
  for (let t = 0; t < mesh.indices.length; t += 6) {
    // Una tapa es un cuadrilatero con sus cuatro vertices a la misma altura.
    const ids = [mesh.indices[t], mesh.indices[t + 1], mesh.indices[t + 2], mesh.indices[t + 5]];
    const ys = ids.map((i) => mesh.positions[i * 3 + 1]);
    if (ys.some((y) => y !== ys[0])) continue;
    const xs = ids.map((i) => mesh.positions[i * 3]);
    const zs = ids.map((i) => mesh.positions[i * 3 + 2]);
    if (wx < Math.min(...xs) || wx > Math.max(...xs) || wy < Math.min(...zs) || wy > Math.max(...zs)) continue;
    if (best === null || ys[0] > best) best = ys[0];
  }
  return best;
}
