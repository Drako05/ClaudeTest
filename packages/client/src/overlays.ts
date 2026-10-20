/**
 * Lo que se dibuja SOBRE el mundo para leerlo: la reticula de la accion y las
 * dos vistas de depuracion del panel, la rejilla de chunks y el contorno de
 * biomas.
 *
 * Todo son lineas pegadas al suelo, a la altura real de cada esquina, y con la
 * prueba de profundidad puesta: en 3D una linea que atraviesa una montana para
 * verse confunde mas que ayuda. Un pelo por encima del suelo (`LIFT`) para que
 * no parpadee contra la malla.
 */

import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments,
  type Scene,
} from 'three';
import { CHUNK_SIZE } from '@verdant/shared';
import { aimedSurface, VOXEL, VOXELS_PER_TILE, type GameState, type Surface, type World } from '@verdant/sim';
import { collectBiomeEdges } from './biome-edges.js';

const LIFT = 0.03;

/** Las cuatro aristas de una casilla, como pares de esquinas (fx, fy). */
const SQUARE: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0, 1, 0],
  [1, 0, 1, 1],
  [1, 1, 0, 1],
  [0, 1, 0, 0],
];

function lines(color: number, opacity: number): LineSegments {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(0), 3));
  const mesh = new LineSegments(
    geometry,
    new LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
  // La geometria se reescribe entera a menudo, y three.js calcula la esfera
  // envolvente una sola vez: sin esto la reticula se recortaria en cuanto el
  // jugador se alejara de donde se dibujo por primera vez (ver
  // `docs/efectos.md`).
  mesh.frustumCulled = false;
  return mesh;
}

function setPositions(mesh: LineSegments, data: number[]): void {
  mesh.geometry.setAttribute('position', new BufferAttribute(new Float32Array(data), 3));
}

/**
 * Empuja la arista de la casilla (wx, wy) de la esquina (ax, ay) a la (bx, by),
 * en tramos de medio bloque, cada uno a la altura de la columna de 0,5 que
 * bordea por dentro de la casilla.
 */
function pushTileEdge(out: number[], world: World, wx: number, wy: number, ax: number, ay: number, bx: number, by: number): void {
  for (let k = 0; k < VOXELS_PER_TILE; k++) {
    const x0 = ax + ((bx - ax) * k) / VOXELS_PER_TILE;
    const y0 = ay + ((by - ay) * k) / VOXELS_PER_TILE;
    const x1 = ax + ((bx - ax) * (k + 1)) / VOXELS_PER_TILE;
    const y1 = ay + ((by - ay) * (k + 1)) / VOXELS_PER_TILE;
    // La columna del tramo: su punto medio, metido un cuarto hacia dentro.
    const inside = (v: number) => Math.min(Math.max(v, VOXEL / 2), 1 - VOXEL / 2);
    const h = world.groundHeightAt(wx + inside((x0 + x1) / 2), wy + inside((y0 + y1) / 2)) + LIFT;
    out.push(wx + x0, h, wy + y0, wx + x1, h, wy + y1);
  }
}

/**
 * Empuja el contorno de la cara de voxel que toca la mirada (el voxel es la
 * unidad del terreno: el autor, 2026-10-20), de medio bloque de lado y
 * separada un pelo hacia fuera, hacia quien mira.
 */
function pushVoxelFace(out: number[], s: Surface): void {
  const { voxel: v, normal: n } = s;
  // En el nucleo: x, y en el plano y z la altura. El plano de la cara, en su
  // eje; las otras dos, el lado del voxel.
  const lo = [v.x * VOXEL, v.y * VOXEL, v.z * VOXEL];
  const hi = lo.map((c) => c + VOXEL);
  const normal = [n.x, n.y, n.z];
  const axis = normal.findIndex((c) => c !== 0);
  if (axis < 0) return;
  const plane = (normal[axis]! > 0 ? hi[axis]! : lo[axis]!) + normal[axis]! * LIFT;
  const [u, w] = [0, 1, 2].filter((a) => a !== axis) as [number, number];
  const corner = (cu: number, cw: number): number[] => {
    const p = [0, 0, 0];
    p[axis] = plane;
    p[u] = cu;
    p[w] = cw;
    // A three.js: la altura va en `y`.
    return [p[0]!, p[2]!, p[1]!];
  };
  const ring = [corner(lo[u]!, lo[w]!), corner(hi[u]!, lo[w]!), corner(hi[u]!, hi[w]!), corner(lo[u]!, hi[w]!)];
  for (let i = 0; i < 4; i++) out.push(...ring[i]!, ...ring[(i + 1) % 4]!);
}

export class Overlays {
  /**
   * Donde toca la mirada: la cara de arriba de un voxel, o la de una pared
   * (pedido del autor, 2026-09-30; por voxel desde el 2026-10-20). Es donde se
   * sembraria o se colocaria algo. Los objetos al alcance ya no se marcan: lo
   * pidio tambien el autor.
   */
  private readonly plant = lines(0xb8f28a, 0.45);
  private readonly wall = lines(0xffffff, 0.5);
  private readonly grids = new Map<string, LineSegments>();
  private readonly borders = new Map<string, { mesh: LineSegments; segments: number; misplaced: number }>();
  /** La `terrainRevision` de cada chunk con la que se hicieron su rejilla y su contorno. */
  private readonly revs = new Map<string, number>();

  constructor(private readonly scene: Scene) {
    scene.add(this.plant, this.wall);
  }

  /** Marca donde toca la mirada: el suelo en verde, la cara de una pared en blanco. */
  updateReticle(state: GameState): void {
    const floor: number[] = [];
    const wall: number[] = [];
    const s = aimedSurface(state.world, state.entities, state.playerId);
    if (s) pushVoxelFace(s.top ? floor : wall, s);
    setPositions(this.plant, floor);
    setPositions(this.wall, wall);
  }

  /** Lo que marca la reticula ahora mismo: suelo, pared o nada. */
  get reticle(): 'suelo' | 'pared' | null {
    const count = (m: LineSegments) => m.geometry.getAttribute('position').count;
    return count(this.plant) > 0 ? 'suelo' : count(this.wall) > 0 ? 'pared' : null;
  }

  /**
   * Pone al dia las vistas de depuracion para los chunks mallados.
   *
   * Se construyen una vez por chunk y se guardan; al apagar la vista se
   * destruyen para no pagar memoria por algo invisible. Y se rehacen cuando
   * cambia el terreno del chunk (un voxel roto), que es por donde van.
   */
  syncDebug(
    world: World,
    chunks: ReadonlyArray<readonly [number, number]>,
    showChunks: boolean,
    showBiomes: boolean,
  ): void {
    const keys = new Set(chunks.map(([cx, cy]) => `${cx},${cy}`));
    for (const [cx, cy] of chunks) {
      const key = `${cx},${cy}`;
      const rev = world.getChunk(cx, cy).terrainRevision;
      if (this.revs.get(key) === rev) continue;
      this.revs.set(key, rev);
      const grid = this.grids.get(key);
      if (grid) this.drop(grid);
      this.grids.delete(key);
      const border = this.borders.get(key);
      if (border) this.drop(border.mesh);
      this.borders.delete(key);
    }
    for (const key of this.revs.keys()) if (!keys.has(key)) this.revs.delete(key);

    for (const [key, mesh] of this.grids) {
      if (showChunks && keys.has(key)) continue;
      this.drop(mesh);
      this.grids.delete(key);
    }
    for (const [key, view] of this.borders) {
      if (showBiomes && keys.has(key)) continue;
      this.drop(view.mesh);
      this.borders.delete(key);
    }

    for (const [cx, cy] of chunks) {
      const key = `${cx},${cy}`;
      if (showChunks && !this.grids.has(key)) this.grids.set(key, this.buildGrid(world, cx, cy));
      if (showBiomes && !this.borders.has(key)) this.borders.set(key, this.buildBorders(world, cx, cy));
    }
  }

  /** Borra todo lo de depuracion, al reiniciar el mundo. */
  reset(): void {
    for (const mesh of this.grids.values()) this.drop(mesh);
    for (const view of this.borders.values()) this.drop(view.mesh);
    this.grids.clear();
    this.borders.clear();
    this.revs.clear();
  }

  /** Segmentos de contorno de bioma trazados. Para la prueba de humo. */
  get borderSegmentCount(): number {
    let total = 0;
    for (const view of this.borders.values()) total += view.segments;
    return total;
  }

  /**
   * Segmentos de contorno que caen fuera de su propio chunk. Tiene que ser
   * siempre cero: es el fallo que tuvo el isometrico, un contorno corrido un
   * chunk entero, que a ojo no se distingue de uno correcto.
   */
  get misplacedBorderCount(): number {
    let bad = 0;
    for (const view of this.borders.values()) bad += view.misplaced;
    return bad;
  }

  /** Chunks con rejilla dibujada. */
  get gridCount(): number {
    return this.grids.size;
  }

  /** El contorno del chunk, siguiendo el suelo de sus propias casillas. */
  private buildGrid(world: World, cx: number, cy: number): LineSegments {
    const data: number[] = [];
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    const edge = (wx: number, wy: number, ax: number, ay: number, bx: number, by: number) =>
      pushTileEdge(data, world, wx, wy, ax, ay, bx, by);
    for (let i = 0; i < CHUNK_SIZE; i++) {
      edge(x0 + i, y0, 0, 0, 1, 0);
      edge(x0 + i, y0 + CHUNK_SIZE - 1, 0, 1, 1, 1);
      edge(x0, y0 + i, 0, 0, 0, 1);
      edge(x0 + CHUNK_SIZE - 1, y0 + i, 1, 0, 1, 1);
    }
    const mesh = lines(0x8fc4ff, 0.7);
    setPositions(mesh, data);
    this.scene.add(mesh);
    return mesh;
  }

  private buildBorders(world: World, cx: number, cy: number) {
    const data = collectBiomeEdges(world, world.getChunk(cx, cy));
    let misplaced = 0;
    for (let i = 0; i < data.length; i += 6) {
      const inside = (x: number, z: number) =>
        x >= cx * CHUNK_SIZE && x <= (cx + 1) * CHUNK_SIZE &&
        z >= cy * CHUNK_SIZE && z <= (cy + 1) * CHUNK_SIZE;
      if (!inside(data[i], data[i + 2]) || !inside(data[i + 3], data[i + 5])) misplaced++;
      data[i + 1] += LIFT;
      data[i + 4] += LIFT;
    }
    const mesh = lines(0xffe08a, 0.9);
    setPositions(mesh, data);
    this.scene.add(mesh);
    return { mesh, segments: data.length / 6, misplaced };
  }

  private drop(mesh: LineSegments): void {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as LineBasicMaterial).dispose();
  }
}
