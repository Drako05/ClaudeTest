/**
 * El relieve del mundo convertido en una malla de triangulos.
 *
 * **Puro**: no importa three.js ni toca el DOM. Devuelve arrays planos y quien
 * dibuje los envuelve. Asi la geometria se puede comprobar en Node, y eso aqui no
 * es un lujo: si la malla mintiera sobre el mundo, el personaje andaria por
 * encima o por debajo de lo que pisa.
 *
 * El terreno son **voxeles de 0,5** (el autor, 2026-10-06), y **el voxel es su
 * unidad** (el autor, 2026-10-20: «los bloques de 0.5 ya no se deben ver como
 * pertenecientes a un bloque de 1m»). La malla es una cara por cada lado de un
 * voxel solido que da a uno vacio: arriba, a los lados y, bajo lo que quedo en
 * el aire, abajo. Lo vacio es lo que esta sobre el techo de su columna y lo
 * roto (`World.breakVoxel`).
 *
 * **El color es una textura en pixelart** (guia de arte, directriz 7: 24
 * pixeles por bloque): **cada cara de voxel lleva su tesela entera de 12 × 12**
 * (`voxel-art.ts`), la del suelo de su casilla, en la variante que le toque a
 * esa cara de ese voxel. Lo de debajo es del mismo suelo hasta el fondo (el
 * autor). Los lados, **del mismo material, mas oscuros** (el autor), y lo de
 * abajo, mas aun (*deduccion*).
 *
 * Ejes: `x` e `y` del mundo van a `x` y `z`, y la altura a `y`, que es el
 * convenio de three.js.
 */

import { CHUNK_SIZE, Feature, type Terrain } from '@verdant/shared';
import { CHUNK_COLUMNS, hash2DFloat, oreIn, topOf, VOXEL, VOXELS_PER_TILE, type Chunk, type World } from '@verdant/sim';

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

/** Una cara de un voxel: hacia donde mira. */
export enum Face {
  Top,
  Bottom,
  East,
  West,
  South,
  North,
}

/**
 * Los cuatro lados de una columna: hacia donde esta la vecina, su cara, y las
 * dos esquinas del borde comun, en fracciones de la columna, en orden
 * antihorario visto desde fuera para que la normal de la pared mire hacia la
 * vecina.
 */
const SIDES: ReadonlyArray<{ dx: number; dy: number; face: Face; a: [number, number]; b: [number, number] }> = [
  { dx: 1, dy: 0, face: Face.East, a: [1, 0], b: [1, 1] },
  { dx: -1, dy: 0, face: Face.West, a: [0, 1], b: [0, 0] },
  { dx: 0, dy: 1, face: Face.South, a: [1, 1], b: [0, 1] },
  { dx: 0, dy: -1, face: Face.North, a: [0, 0], b: [1, 0] },
];

/**
 * El techo de una columna de 0,5 (en coordenadas de voxel), en el mundo, sin
 * generar nada nuevo (`World.columnTopPeek`): fuera de un chunk cargado se
 * pregunta al generador, que es puro, y no a `getChunk`, que registraria el
 * chunk vecino, con lo que dibujar alteraria las cuentas de bioma. Es el mismo
 * cuidado que tiene `biome-edges.ts`. Lo roto cuenta, tambien en la vecina.
 * Tambien lo usan las sombras (`main.ts` se lo pasa a `buildShadows` como su
 * `surface`), para caer sobre la superficie que se dibuja.
 */
export function columnTopFor(world: World, vx: number, vy: number): number {
  return topOf(world.columnTopPeek(vx, vy));
}

/** Donde cae una tesela en el atlas: `u0, v0` su esquina de arriba a la izquierda en la imagen. */
export interface TileRect {
  readonly u0: number;
  readonly v0: number;
  readonly u1: number;
  readonly v1: number;
}

/**
 * La variante de suelo de una cara de voxel, de `0` a `count - 1` (el autor,
 * 2026-10-19: 3-4 dibujos por suelo, elegidos con la semilla; desde el
 * 2026-10-20, por voxel y cara). Del sitio y no del azar vivo, como el giro de
 * las aspas: el chunk se redibuja a menudo y el suelo no puede cambiar de
 * dibujo al volver (regla 2).
 */
export function terrainVariant(seed: number, vx: number, vy: number, vz: number, face: Face, count: number): number {
  const h = hash2DFloat(seed ^ 0x5eed7e11 ^ Math.imul(vz * 8 + face, 0x9e3779b1), vx, vy);
  return Math.min(count - 1, Math.floor(h * count));
}

/** La tesela de una cara de voxel: la del suelo de su casilla, en la variante que le toque. */
export type TerrainTile = (terrain: Terrain, vx: number, vy: number, vz: number, face: Face) => TileRect;

/** Lo oscuras que se ven las paredes frente a su tapa: con luz cenital se leerian del mismo color. */
export const WALL_LIGHT: readonly [number, number, number] = [0.72, 0.72, 0.74];
/** Y lo de debajo de lo que quedo en el aire, a la sombra. **Deduccion mia.** */
export const UNDER_LIGHT: readonly [number, number, number] = [0.55, 0.55, 0.58];
const LID_LIGHT: readonly [number, number, number] = [1, 1, 1];

/**
 * Las esquinas de una tesela entera, en el orden en que se dan las de una
 * pared: arriba a la izquierda, a la derecha, y abajo. Las de una tapa: la
 * imagen va con el este a la derecha y el sur abajo. Las de abajo, igual vista
 * desde abajo.
 */
const WHOLE: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];
const LID_CORNERS: readonly (readonly [number, number])[] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
];
const UNDER_CORNERS = WHOLE;

/** La malla de un chunk: cada cara de sus voxeles que da al aire. */
export function chunkMesh(world: World, chunk: Chunk, tileOf: TerrainTile): MeshData {
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const baseX = chunk.cx * CHUNK_COLUMNS;
  const baseY = chunk.cy * CHUNK_COLUMNS;

  /**
   * Anade un cuadrilatero como dos triangulos: sus esquinas, su luz y donde
   * cae cada esquina en su tesela, en fracciones (`0, 0` arriba a la izquierda).
   */
  const quad = (
    p: readonly (readonly [number, number, number])[],
    rgb: readonly [number, number, number],
    tile: TileRect,
    corners: readonly (readonly [number, number])[] = WHOLE,
  ): void => {
    const base = positions.length / 3;
    p.forEach(([x, y, z], i) => {
      positions.push(x, y, z);
      colors.push(rgb[0], rgb[1], rgb[2]);
      uvs.push(tile.u0 + (tile.u1 - tile.u0) * corners[i]![0], tile.v0 + (tile.v1 - tile.v0) * corners[i]![1]);
    });
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  /** Si el voxel es solido: dentro del chunk, de su dato; fuera, sin generar nada. */
  const own = (vx: number, vy: number) => chunk.height[(vy - baseY) * CHUNK_COLUMNS + (vx - baseX)]!;
  const inside = (vx: number, vy: number) =>
    vx >= baseX && vx < baseX + CHUNK_COLUMNS && vy >= baseY && vy < baseY + CHUNK_COLUMNS;
  const solid = (vx: number, vy: number, vz: number): boolean =>
    inside(vx, vy) ? vz < own(vx, vy) && !world.brokenAt(vx, vy)?.has(vz) : world.isSolidVoxelPeek(vx, vy, vz);
  /** El techo que dio el generador a la columna, para saber desde donde mirar. */
  const potential = (vx: number, vy: number): number =>
    inside(vx, vy) ? own(vx, vy) : world.gen.columnTopAt(vx, vy);

  for (let ly = 0; ly < CHUNK_COLUMNS; ly++) {
    for (let lx = 0; lx < CHUNK_COLUMNS; lx++) {
      const vx = baseX + lx;
      const vy = baseY + ly;
      const terrain = chunk.terrain[Math.floor(ly / VOXELS_PER_TILE) * CHUNK_SIZE + Math.floor(lx / VOXELS_PER_TILE)] as Terrain;
      const top = own(vx, vy);
      const gone = world.brokenAt(vx, vy);
      const x0 = vx * VOXEL;
      const y0 = vy * VOXEL;
      const x1 = x0 + VOXEL;
      const y1 = y0 + VOXEL;
      // Un voxel de mena es terreno solido, pero lo dibuja su mena (`ore-mesh.ts`).
      const ore = (z: number) => oreIn(chunk, world.seed, vx, vy, z) !== Feature.None;

      // Arriba: el voxel de su techo y el de debajo de cada hueco. Abajo: el
      // de encima de cada hueco, si es solido (lo que quedo en el aire).
      const lid = (z: number) => {
        if (!solid(vx, vy, z) || solid(vx, vy, z + 1) || ore(z)) return;
        const h = (z + 1) * VOXEL;
        quad([[x0, h, y0], [x0, h, y1], [x1, h, y1], [x1, h, y0]], LID_LIGHT, tileOf(terrain, vx, vy, z, Face.Top), LID_CORNERS);
      };
      lid(top - 1);
      if (gone) {
        for (const g of gone) {
          lid(g - 1);
          const z = g + 1;
          if (z >= top || !solid(vx, vy, z) || ore(z)) continue;
          const h = z * VOXEL;
          quad([[x0, h, y0], [x1, h, y0], [x1, h, y1], [x0, h, y1]], UNDER_LIGHT, tileOf(terrain, vx, vy, z, Face.Bottom), UNDER_CORNERS);
        }
      }

      // A los lados: donde esta columna tiene voxel y la vecina no. Por encima
      // de lo que dio el generador a la vecina, y en sus huecos.
      for (const side of SIDES) {
        const nx = vx + side.dx;
        const ny = vy + side.dy;
        const wall = (z: number) => {
          if (!solid(vx, vy, z) || solid(nx, ny, z) || ore(z)) return;
          const zt = (z + 1) * VOXEL;
          const zb = z * VOXEL;
          const ax = x0 + side.a[0] * VOXEL;
          const ay = y0 + side.a[1] * VOXEL;
          const bx = x0 + side.b[0] * VOXEL;
          const by = y0 + side.b[1] * VOXEL;
          quad([[ax, zt, ay], [bx, zt, by], [bx, zb, by], [ax, zb, ay]], WALL_LIGHT, tileOf(terrain, vx, vy, z, side.face));
        };
        const from = potential(nx, ny);
        for (let z = from; z < top; z++) wall(z);
        const nGone = world.brokenAt(nx, ny);
        if (nGone) for (const g of nGone) if (g < from) wall(g);
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
    // Una cara horizontal (una tapa, o la de abajo de un saliente) es un
    // cuadrilatero con sus cuatro vertices a la misma altura; la mas alta es
    // siempre una tapa.
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
