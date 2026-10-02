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
import { aimedSurface, groundHeight, type GameState, type Surface, type World } from '@verdant/sim';
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

/** Empuja las aristas de la casilla (wx, wy) a su altura. */
function pushSquare(out: number[], world: World, wx: number, wy: number): void {
  const level = world.levelAt(wx, wy);
  const ramp = world.rampDirAt(wx, wy);
  for (const [ax, ay, bx, by] of SQUARE) {
    out.push(
      wx + ax, groundHeight(level, ramp, ax, ay) + LIFT, wy + ay,
      wx + bx, groundHeight(level, ramp, bx, by) + LIFT, wy + by,
    );
  }
}

/**
 * Empuja el contorno de la cara de cubo de una pared que toca la mirada: la del
 * plano (x o y entero) mas cercano al punto tocado, de una casilla de ancho y
 * un nivel de alto, separada un pelo hacia el lado de quien mira.
 */
function pushWallFace(out: number[], world: World, s: Surface): void {
  const { point, tile, front } = s;
  const alongX = Math.abs(point.x - Math.round(point.x)) < Math.abs(point.y - Math.round(point.y));
  const top = world.levelAt(tile.x, tile.y);
  const z0 = Math.min(Math.floor(point.z + 1e-6), top - 1);
  const z1 = z0 + 1;
  const corners: Array<[number, number]> = [];
  if (alongX) {
    const x = Math.round(point.x) + Math.sign(front.x - tile.x) * LIFT;
    const y = Math.floor(point.y);
    corners.push([x, y], [x, y + 1]);
  } else {
    const y = Math.round(point.y) + Math.sign(front.y - tile.y) * LIFT;
    const x = Math.floor(point.x);
    corners.push([x, y], [x + 1, y]);
  }
  const [[ax, ay], [bx, by]] = corners;
  out.push(ax, z0, ay, bx, z0, by, bx, z0, by, bx, z1, by, bx, z1, by, ax, z1, ay, ax, z1, ay, ax, z0, ay);
}

export class Overlays {
  /**
   * Donde toca la mirada: la casilla de suelo, o la cara de la pared (pedido
   * del autor, 2026-09-30). Es donde se sembraria o se colocaria algo. Los
   * objetos al alcance ya no se marcan: lo pidio tambien el autor.
   */
  private readonly plant = lines(0xb8f28a, 0.45);
  private readonly wall = lines(0xffffff, 0.5);
  private readonly grids = new Map<string, LineSegments>();
  private readonly borders = new Map<string, { mesh: LineSegments; segments: number; misplaced: number }>();

  constructor(private readonly scene: Scene) {
    scene.add(this.plant, this.wall);
  }

  /** Marca donde toca la mirada: el suelo en verde, la cara de una pared en blanco. */
  updateReticle(state: GameState): void {
    const floor: number[] = [];
    const wall: number[] = [];
    const s = aimedSurface(state.world, state.entities, state.playerId);
    if (s?.top) pushSquare(floor, state.world, s.tile.x, s.tile.y);
    else if (s) pushWallFace(wall, state.world, s);
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
   * destruyen para no pagar memoria por algo invisible.
   */
  syncDebug(
    world: World,
    chunks: ReadonlyArray<readonly [number, number]>,
    showChunks: boolean,
    showBiomes: boolean,
  ): void {
    const keys = new Set(chunks.map(([cx, cy]) => `${cx},${cy}`));

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
    const edge = (wx: number, wy: number, ax: number, ay: number, bx: number, by: number) => {
      const level = world.levelAt(wx, wy);
      const ramp = world.rampDirAt(wx, wy);
      data.push(
        wx + ax, groundHeight(level, ramp, ax, ay) + LIFT, wy + ay,
        wx + bx, groundHeight(level, ramp, bx, by) + LIFT, wy + by,
      );
    };
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
