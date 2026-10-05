/**
 * Las cajas de golpe y de choque, para verlas (panel de desarrollo, «Cajas»;
 * pedido del autor, 2026-10-05).
 *
 * Tres colores, del autor: **rojo** lo que se golpea, **cian** lo que choca y
 * **amarillo** lo que hace las dos cosas. Se ven **a traves de todo** (sin
 * prueba de profundidad), y el **agua no se dibuja** aunque corte el paso.
 * Ninguna caja es de aqui: todas salen del nucleo, las mismas que usa la
 * simulacion.
 * - **Golpe**: `hitboxAt` de cada casilla —del arbol, solo su tronco—.
 * - **Choque**: la casilla entera de lo que `isFeatureSolid` (arboles, roca y
 *   minerales), que es lo que mira `collides`. Ese choque no tiene alto —es
 *   una columna—, asi que se dibuja hasta el alto de su caja de golpe
 *   (**propuesta mia**). Y el jugador: su huella de `BODY_RADIUS` de los pies
 *   a los ojos (`EYE_HEIGHT`, **propuesta mia**: su choque tampoco tiene alto).
 * - **Las dos**: las estaciones (`hitboxAt` es su `STATION_BOXES`, el bloque
 *   que se pisa) y los animales (`animalBoxes`, las partes que golpean y
 *   chocan).
 *
 * La cuenta es pura (`collectBoxes`, `boxEdges`) y se mide en Node; dibujarla
 * es `DebugBoxes`.
 */

import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments, type Scene } from 'three';
import { isFeatureSolid, isStation } from '@verdant/shared';
import {
  animalBoxes,
  BODY_RADIUS,
  EYE_HEIGHT,
  hitboxAt,
  type GameState,
  type Hitbox,
  type OrientedBox,
} from '@verdant/sim';

/** Casillas alrededor del jugador cuyas cajas se dibujan. **Propuesta mia.** */
export const BOX_RADIUS = 12;

/** Las aristas de cada clase, como pares de puntos de three (`y` arriba). */
export interface BoxEdges {
  hit: number[];
  solid: number[];
  both: number[];
  /** Cuantas cajas hay de cada clase. */
  counts: { hit: number; solid: number; both: number };
}

/** Las 12 aristas de una caja de 8 esquinas, por sus indices. */
const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 3], [3, 2], [2, 0],
  [4, 5], [5, 7], [7, 6], [6, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

/**
 * Empuja las aristas de una caja: alineada (`Hitbox`, en el suelo `x`/`y` y en
 * alto `z`) o girada (`OrientedBox`, con su eje largo `ux`/`uy`). Sale en
 * coordenadas de three: el `y` del mundo va a `z`, y el alto a `y`.
 */
export function boxEdges(out: number[], box: Hitbox | OrientedBox): void {
  const corners: Array<[number, number, number]> = [];
  if ('x0' in box) {
    for (const z of [box.z0, box.z1]) {
      for (const y of [box.y0, box.y1]) for (const x of [box.x0, box.x1]) corners.push([x, z, y]);
    }
  } else {
    // El eje de ancho es (-uy, ux), como en `sim/body.ts`.
    for (const sz of [-1, 1]) {
      for (const sw of [-1, 1]) {
        for (const sl of [-1, 1]) {
          const x = box.cx + box.ux * box.hl * sl - box.uy * box.hw * sw;
          const y = box.cy + box.uy * box.hl * sl + box.ux * box.hw * sw;
          corners.push([x, box.cz + box.hh * sz, y]);
        }
      }
    }
  }
  for (const [a, b] of EDGES) out.push(...corners[a], ...corners[b]);
}

/** Todas las cajas de alrededor del jugador, por clase. */
export function collectBoxes(state: GameState, radius = BOX_RADIUS): BoxEdges {
  const out: BoxEdges = { hit: [], solid: [], both: [], counts: { hit: 0, solid: 0, both: 0 } };
  const { world, entities, playerId } = state;
  const px = Math.floor(entities.x[playerId]);
  const py = Math.floor(entities.y[playerId]);
  for (let ty = py - radius; ty <= py + radius; ty++) {
    for (let tx = px - radius; tx <= px + radius; tx++) {
      const box = hitboxAt(world, tx, ty);
      const feature = world.featureAt(tx, ty);
      if (box && isStation(feature)) {
        boxEdges(out.both, box);
        out.counts.both++;
        continue;
      }
      if (box) {
        boxEdges(out.hit, box);
        out.counts.hit++;
      }
      if (isFeatureSolid(feature)) {
        const z0 = world.groundHeightAt(tx + 0.5, ty + 0.5);
        const z1 = box ? box.z1 : z0 + 1;
        boxEdges(out.solid, { x0: tx, x1: tx + 1, y0: ty, y1: ty + 1, z0, z1 });
        out.counts.solid++;
      }
    }
  }
  // El jugador: su huella de choque, de los pies a los ojos.
  const x = entities.x[playerId];
  const y = entities.y[playerId];
  const z = entities.z[playerId];
  boxEdges(out.solid, {
    x0: x - BODY_RADIUS, x1: x + BODY_RADIUS, y0: y - BODY_RADIUS, y1: y + BODY_RADIUS, z0: z, z1: z + EYE_HEIGHT,
  });
  out.counts.solid++;
  // Los animales, cada parte que golpea y choca.
  for (const id of state.fauna.values()) {
    if (Math.abs(entities.x[id] - x) > radius || Math.abs(entities.y[id] - y) > radius) continue;
    for (const part of animalBoxes(entities, id)) {
      boxEdges(out.both, part);
      out.counts.both++;
    }
  }
  return out;
}

function lines(color: number): LineSegments {
  const mesh = new LineSegments(
    new BufferGeometry(),
    // A traves de todo (el autor): sin prueba de profundidad, y dibujadas al
    // final para que nada las pinte encima.
    new LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }),
  );
  mesh.renderOrder = 1000;
  // La geometria se reescribe entera: la esfera envolvente de la primera vez no
  // vale para las siguientes (ver `overlays.ts`).
  mesh.frustumCulled = false;
  return mesh;
}

export class DebugBoxes {
  private readonly hit = lines(0xff4d4d);
  private readonly solid = lines(0x3fd8ff);
  private readonly both = lines(0xffd23f);
  private shown = false;
  /** Lo ultimo contado, para el humo. */
  counts = { hit: 0, solid: 0, both: 0 };

  constructor(private readonly scene: Scene) {}

  /**
   * Con las cajas puestas, las rehace; sin ellas, las quita. Entero en cada
   * fotograma: a este radio son unas 600 casillas, cuesta poco, y no hay cache
   * que se quede vieja al talar algo o al pasar un animal.
   */
  update(state: GameState, show: boolean): void {
    if (!show) {
      this.clear();
      return;
    }
    if (!this.shown) {
      this.scene.add(this.hit, this.solid, this.both);
      this.shown = true;
    }
    const boxes = collectBoxes(state);
    set(this.hit, boxes.hit);
    set(this.solid, boxes.solid);
    set(this.both, boxes.both);
    this.counts = boxes.counts;
  }

  clear(): void {
    if (!this.shown) return;
    this.scene.remove(this.hit, this.solid, this.both);
    this.shown = false;
    this.counts = { hit: 0, solid: 0, both: 0 };
  }
}

function set(mesh: LineSegments, data: number[]): void {
  mesh.geometry.setAttribute('position', new BufferAttribute(new Float32Array(data), 3));
}
