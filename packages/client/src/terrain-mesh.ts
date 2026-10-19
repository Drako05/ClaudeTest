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
 * **El color es una textura en pixelart** (el autor, 2026-10-19: caras de 24 ×
 * 24 por bloque y voxeles de 12 × 12; guia de arte, directriz 7): cada casilla
 * toma la tesela de su suelo, en la variante que le toque, entera en su tapa
 * de 1 × 1 o un cuarto en la de cada columna. Las paredes, **del mismo
 * material, mas oscuras** (el autor), van en caras de un voxel, cada una con su
 * cuarto de tesela alineado con el mundo, para que una pared alta repita la
 * textura bloque a bloque en vez de estirarla.
 *
 * Ejes: `x` e `y` del mundo van a `x` y `z`, y la altura a `y`, que es el
 * convenio de three.js.
 */

import { CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { CHUNK_COLUMNS, hash2DFloat, topOf, VOXEL, VOXELS_PER_TILE, type Chunk, type World } from '@verdant/sim';

/** Geometria lista para subir a la GPU, en arrays planos. */
export interface MeshData {
  /** `x, y, z` por vertice. */
  readonly positions: Float32Array;
  /** `r, g, b` por vertice, de 0 a 1: la luz que oscurece la textura (las paredes). */
  readonly colors: Float32Array;
  /** `u, v` por vertice, en el atlas del suelo. */
  readonly uvs: Float32Array;
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
 * `biome-edges.ts`. Tambien lo usan las sombras (`main.ts` se lo pasa a
 * `buildShadows` como su `surface`), para caer sobre la superficie que se
 * dibuja y no sobre otra cuenta parecida.
 */
export function columnTopFor(world: World, chunk: Chunk, vx: number, vy: number): number {
  const lx = vx - chunk.cx * CHUNK_COLUMNS;
  const ly = vy - chunk.cy * CHUNK_COLUMNS;
  if (lx >= 0 && lx < CHUNK_COLUMNS && ly >= 0 && ly < CHUNK_COLUMNS) {
    return topOf(chunk.height[ly * CHUNK_COLUMNS + lx]);
  }
  return topOf(world.gen.columnTopAt(vx, vy));
}

/** Donde cae una tesela en el atlas: `u0, v0` su esquina de arriba a la izquierda en la imagen. */
export interface TileRect {
  readonly u0: number;
  readonly v0: number;
  readonly u1: number;
  readonly v1: number;
}

/**
 * La variante de suelo de una casilla, de `0` a `count - 1` (el autor,
 * 2026-10-19: 3-4 dibujos por suelo, elegidos por casilla con la semilla).
 * De la casilla y no del azar vivo, como el giro de las aspas: el chunk se
 * redibuja a menudo y el suelo no puede cambiar de dibujo al volver (regla 2).
 */
export function terrainVariant(seed: number, wx: number, wy: number, count: number): number {
  return Math.min(count - 1, Math.floor(hash2DFloat(seed ^ 0x5eed7e11, wx, wy) * count));
}

/** La tesela de una casilla: la de su suelo, en la variante que le toque. */
export type TerrainTile = (terrain: Terrain, wx: number, wy: number) => TileRect;

/** Lo oscuras que se ven las paredes frente a su tapa: con luz cenital se leerian del mismo color. */
export const WALL_LIGHT: readonly [number, number, number] = [0.72, 0.72, 0.74];
const LID_LIGHT: readonly [number, number, number] = [1, 1, 1];

/** La malla de un chunk: las tapas de sus columnas y sus paredes. */
export function chunkMesh(world: World, chunk: Chunk, tileOf: TerrainTile): MeshData {
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const baseX = chunk.cx * CHUNK_SIZE;
  const baseY = chunk.cy * CHUNK_SIZE;

  /**
   * Anade un cuadrilatero como dos triangulos: sus esquinas, su luz y donde
   * cae cada esquina en su tesela, en fracciones (`0, 0` arriba a la izquierda).
   */
  const quad = (
    p: readonly (readonly [number, number, number])[],
    rgb: readonly [number, number, number],
    tile: TileRect,
    corners: readonly (readonly [number, number])[],
  ): void => {
    const base = positions.length / 3;
    p.forEach(([x, y, z], i) => {
      positions.push(x, y, z);
      colors.push(rgb[0], rgb[1], rgb[2]);
      uvs.push(tile.u0 + (tile.u1 - tile.u0) * corners[i]![0], tile.v0 + (tile.v1 - tile.v0) * corners[i]![1]);
    });
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  /**
   * Una tapa horizontal de `x0, y0` a `x1, y1` a la altura `h`, mirando al
   * cielo, con el trozo de su tesela que le toca por su sitio en la casilla
   * (`fx, fy`): la imagen va con el este a la derecha y el sur abajo.
   */
  const lid = (x0: number, y0: number, x1: number, y1: number, h: number, tile: TileRect, fx: number, fy: number) =>
    quad(
      [
        [x0, h, y0],
        [x0, h, y1],
        [x1, h, y1],
        [x1, h, y0],
      ],
      LID_LIGHT,
      tile,
      [
        [fx, fy],
        [fx, fy + (y1 - y0)],
        [fx + (x1 - x0), fy + (y1 - y0)],
        [fx + (x1 - x0), fy],
      ],
    );

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx;
      const wy = baseY + ly;
      const terrain = chunk.terrain[ly * CHUNK_SIZE + lx] as Terrain;
      const tile = tileOf(terrain, wx, wy);

      const tops: number[] = [];
      for (let s = 0; s < VOXELS_PER_TILE * VOXELS_PER_TILE; s++) {
        const cx = (lx * VOXELS_PER_TILE + (s % VOXELS_PER_TILE));
        const cy = (ly * VOXELS_PER_TILE + Math.floor(s / VOXELS_PER_TILE));
        tops.push(topOf(chunk.height[cy * CHUNK_COLUMNS + cx]));
      }
      const flat = tops.every((t) => t === tops[0]);
      if (flat) lid(wx, wy, wx + 1, wy + 1, tops[0], tile, 0, 0);

      for (let s = 0; s < tops.length; s++) {
        const sx = s % VOXELS_PER_TILE;
        const sy = Math.floor(s / VOXELS_PER_TILE);
        const vx = wx * VOXELS_PER_TILE + sx;
        const vy = wy * VOXELS_PER_TILE + sy;
        const x0 = wx + sx * VOXEL;
        const y0 = wy + sy * VOXEL;
        const top = tops[s];
        if (!flat) lid(x0, y0, x0 + VOXEL, y0 + VOXEL, top, tile, sx * VOXEL, sy * VOXEL);
        for (const side of SIDES) {
          const below = columnTopFor(world, chunk, vx + side.dx, vy + side.dy);
          if (below >= top) continue;
          // A lo ancho, la mitad de la tesela que toca por su sitio en la
          // casilla; a lo alto, una cara por voxel: la mitad de arriba de la
          // tesela si acaba en un bloque entero, la de abajo si a medio.
          const across = (side.dx !== 0 ? sy : sx) * VOXEL;
          for (let z = top; z > below; z -= VOXEL) {
            const fy = ((z % 1) + 1) % 1 === 0 ? 0 : VOXEL;
            quad(
              [
                [x0 + side.a[0] * VOXEL, z, y0 + side.a[1] * VOXEL],
                [x0 + side.b[0] * VOXEL, z, y0 + side.b[1] * VOXEL],
                [x0 + side.b[0] * VOXEL, z - VOXEL, y0 + side.b[1] * VOXEL],
                [x0 + side.a[0] * VOXEL, z - VOXEL, y0 + side.a[1] * VOXEL],
              ],
              WALL_LIGHT,
              tile,
              [
                [across, fy],
                [across + VOXEL, fy],
                [across + VOXEL, fy + VOXEL],
                [across, fy + VOXEL],
              ],
            );
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    uvs: new Float32Array(uvs),
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
