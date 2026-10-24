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
import { CHUNK_COLUMNS, hash2DFloat, NO_ORE, oreIn, topOf, VOXEL, VOXELS_PER_TILE, type Chunk, type World } from '@verdant/sim';

/** Geometria lista para subir a la GPU, en arrays planos. */
export interface MeshData {
  /** `x, y, z` por vertice. */
  readonly positions: Float32Array;
  /** `x, y, z` por vertice: hacia donde mira su cara, de largo 1. */
  readonly normals: Float32Array;
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

/**
 * Los arrays donde `chunkMesh` va escribiendo, que se reusan de un chunk al
 * siguiente y crecen al doble si no caben: un chunk de relieve lleva unos 20.000
 * vertices. Al terminar se copia lo escrito, del tamano justo.
 */
let scratchVertices = 1 << 15;
let scratchPositions = new Float32Array(scratchVertices * 3);
let scratchNormals = new Float32Array(scratchVertices * 3);
let scratchColors = new Float32Array(scratchVertices * 3);
let scratchUvs = new Float32Array(scratchVertices * 2);
let scratchIndices = new Uint32Array((scratchVertices / 4) * 6);

function growScratch(): void {
  const grow = <T extends Float32Array | Uint32Array>(a: T, size: number): T => {
    const b = new (a.constructor as new (n: number) => T)(size);
    b.set(a);
    return b;
  };
  scratchVertices *= 2;
  scratchPositions = grow(scratchPositions, scratchVertices * 3);
  scratchNormals = grow(scratchNormals, scratchVertices * 3);
  scratchColors = grow(scratchColors, scratchVertices * 3);
  scratchUvs = grow(scratchUvs, scratchVertices * 2);
  scratchIndices = grow(scratchIndices, (scratchVertices / 4) * 6);
}

/** Hacia donde mira cada cara, en los ejes de three.js. */
const NORMALS: Readonly<Record<Face, readonly [number, number, number]>> = {
  [Face.Top]: [0, 1, 0],
  [Face.Bottom]: [0, -1, 0],
  [Face.East]: [1, 0, 0],
  [Face.West]: [-1, 0, 0],
  [Face.South]: [0, 0, 1],
  [Face.North]: [0, 0, -1],
};

/** La malla de un chunk: cada cara de sus voxeles que da al aire. */
export function chunkMesh(world: World, chunk: Chunk, tileOf: TerrainTile): MeshData {
  let vertices = 0;
  let indexCount = 0;
  const baseX = chunk.cx * CHUNK_COLUMNS;
  const baseY = chunk.cy * CHUNK_COLUMNS;
  // Es lo que mas se repite al cruzar un borde de chunk (tanda movil 1,
  // 2026-10-24), asi que nada se crea por columna ni por cara: las funciones son
  // del chunk y la columna en curso va en variables. Y sin nada roto en el chunk
  // ni en sus vecinos, lo roto no se pregunta.
  const anyBroken =
    world.hasBroken(chunk.cx, chunk.cy) ||
    world.hasBroken(chunk.cx + 1, chunk.cy) ||
    world.hasBroken(chunk.cx - 1, chunk.cy) ||
    world.hasBroken(chunk.cx, chunk.cy + 1) ||
    world.hasBroken(chunk.cx, chunk.cy - 1);

  /**
   * Una esquina de un cuadrilatero: donde esta, su cara, su luz y donde cae en
   * su tesela, en fracciones.
   */
  const vertex = (
    x: number,
    y: number,
    z: number,
    face: Face,
    rgb: readonly [number, number, number],
    tile: TileRect,
    corner: readonly [number, number],
  ): void => {
    if (vertices === scratchVertices) growScratch();
    const i3 = vertices * 3;
    const n = NORMALS[face];
    scratchPositions[i3] = x;
    scratchPositions[i3 + 1] = y;
    scratchPositions[i3 + 2] = z;
    scratchNormals[i3] = n[0];
    scratchNormals[i3 + 1] = n[1];
    scratchNormals[i3 + 2] = n[2];
    scratchColors[i3] = rgb[0];
    scratchColors[i3 + 1] = rgb[1];
    scratchColors[i3 + 2] = rgb[2];
    scratchUvs[vertices * 2] = tile.u0 + (tile.u1 - tile.u0) * corner[0];
    scratchUvs[vertices * 2 + 1] = tile.v0 + (tile.v1 - tile.v0) * corner[1];
    vertices++;
  };
  /** Cierra las cuatro ultimas esquinas en dos triangulos. */
  const close = (): void => {
    const base = vertices - 4;
    scratchIndices[indexCount++] = base;
    scratchIndices[indexCount++] = base + 1;
    scratchIndices[indexCount++] = base + 2;
    scratchIndices[indexCount++] = base;
    scratchIndices[indexCount++] = base + 2;
    scratchIndices[indexCount++] = base + 3;
  };

  /** Si el voxel es solido: dentro del chunk, de su dato; fuera, sin generar nada. */
  const own = (vx: number, vy: number) => chunk.height[(vy - baseY) * CHUNK_COLUMNS + (vx - baseX)]!;
  const inside = (vx: number, vy: number) =>
    vx >= baseX && vx < baseX + CHUNK_COLUMNS && vy >= baseY && vy < baseY + CHUNK_COLUMNS;
  const solid = (vx: number, vy: number, vz: number): boolean =>
    inside(vx, vy)
      ? vz < own(vx, vy) && !(anyBroken && world.brokenAt(vx, vy)?.has(vz))
      : world.isSolidVoxelPeek(vx, vy, vz);
  /** El techo que dio el generador a la columna, para saber desde donde mirar. */
  const potential = (vx: number, vy: number): number =>
    inside(vx, vy) ? own(vx, vy) : world.gen.columnTopAt(vx, vy);

  // La columna en curso.
  let vx = 0;
  let vy = 0;
  let terrain = 0 as Terrain;
  let hasOre = false;
  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = 0;

  // Un voxel de mena es terreno solido, pero lo dibuja su mena (`ore-mesh.ts`).
  const ore = (z: number) => hasOre && oreIn(chunk, world.seed, vx, vy, z) !== Feature.None;

  // Arriba: el voxel de su techo y el de debajo de cada hueco.
  const lid = (z: number): void => {
    if (!solid(vx, vy, z) || solid(vx, vy, z + 1) || ore(z)) return;
    const h = (z + 1) * VOXEL;
    const tile = tileOf(terrain, vx, vy, z, Face.Top);
    vertex(x0, h, y0, Face.Top, LID_LIGHT, tile, LID_CORNERS[0]!);
    vertex(x0, h, y1, Face.Top, LID_LIGHT, tile, LID_CORNERS[1]!);
    vertex(x1, h, y1, Face.Top, LID_LIGHT, tile, LID_CORNERS[2]!);
    vertex(x1, h, y0, Face.Top, LID_LIGHT, tile, LID_CORNERS[3]!);
    close();
  };

  // A un lado: donde esta columna tiene voxel y la vecina no.
  const wall = (side: (typeof SIDES)[number], nx: number, ny: number, z: number): void => {
    if (!solid(vx, vy, z) || solid(nx, ny, z) || ore(z)) return;
    const zt = (z + 1) * VOXEL;
    const zb = z * VOXEL;
    const ax = x0 + side.a[0] * VOXEL;
    const ay = y0 + side.a[1] * VOXEL;
    const bx = x0 + side.b[0] * VOXEL;
    const by = y0 + side.b[1] * VOXEL;
    const tile = tileOf(terrain, vx, vy, z, side.face);
    vertex(ax, zt, ay, side.face, WALL_LIGHT, tile, WHOLE[0]!);
    vertex(bx, zt, by, side.face, WALL_LIGHT, tile, WHOLE[1]!);
    vertex(bx, zb, by, side.face, WALL_LIGHT, tile, WHOLE[2]!);
    vertex(ax, zb, ay, side.face, WALL_LIGHT, tile, WHOLE[3]!);
    close();
  };

  for (let ly = 0; ly < CHUNK_COLUMNS; ly++) {
    for (let lx = 0; lx < CHUNK_COLUMNS; lx++) {
      vx = baseX + lx;
      vy = baseY + ly;
      const tileIdx = Math.floor(ly / VOXELS_PER_TILE) * CHUNK_SIZE + Math.floor(lx / VOXELS_PER_TILE);
      terrain = chunk.terrain[tileIdx] as Terrain;
      hasOre = chunk.oreBase[tileIdx] !== NO_ORE;
      const top = own(vx, vy);
      const gone = anyBroken ? world.brokenAt(vx, vy) : undefined;
      x0 = vx * VOXEL;
      y0 = vy * VOXEL;
      x1 = x0 + VOXEL;
      y1 = y0 + VOXEL;

      // Arriba, y abajo: el de encima de cada hueco, si es solido (lo que
      // quedo en el aire).
      lid(top - 1);
      if (gone) {
        for (const g of gone) {
          lid(g - 1);
          const z = g + 1;
          if (z >= top || !solid(vx, vy, z) || ore(z)) continue;
          const h = z * VOXEL;
          const tile = tileOf(terrain, vx, vy, z, Face.Bottom);
          vertex(x0, h, y0, Face.Bottom, UNDER_LIGHT, tile, UNDER_CORNERS[0]!);
          vertex(x1, h, y0, Face.Bottom, UNDER_LIGHT, tile, UNDER_CORNERS[1]!);
          vertex(x1, h, y1, Face.Bottom, UNDER_LIGHT, tile, UNDER_CORNERS[2]!);
          vertex(x0, h, y1, Face.Bottom, UNDER_LIGHT, tile, UNDER_CORNERS[3]!);
          close();
        }
      }

      // A los lados: por encima de lo que dio el generador a la vecina, y en
      // sus huecos.
      for (let s = 0; s < SIDES.length; s++) {
        const side = SIDES[s]!;
        const nx = vx + side.dx;
        const ny = vy + side.dy;
        const from = potential(nx, ny);
        for (let z = from; z < top; z++) wall(side, nx, ny, z);
        const nGone = anyBroken ? world.brokenAt(nx, ny) : undefined;
        if (nGone) for (const g of nGone) if (g < from) wall(side, nx, ny, g);
      }
    }
  }

  return {
    positions: scratchPositions.slice(0, vertices * 3),
    normals: scratchNormals.slice(0, vertices * 3),
    colors: scratchColors.slice(0, vertices * 3),
    uvs: scratchUvs.slice(0, vertices * 2),
    indices: scratchIndices.slice(0, indexCount),
    triangles: indexCount / 3,
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
