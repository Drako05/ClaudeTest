/**
 * Las cajas de las cosas y lo que pisa un cuerpo.
 *
 * Decision del autor (2026-10-05): **cada objeto del entorno tiene UNA caja,
 * que se golpea y, si su tipo lo dice, choca** (`blocksBody`), ajustada al
 * objeto y no a su casilla, y con alto: encima se esta de pie. Chocan el
 * tronco del arbol, la roca, los minerales y las estaciones; el arbusto, el
 * brote y los guijarros solo se golpean. Y **el cuerpo se apoya y choca con su
 * huella entera**, tambien contra las estaciones y, desde el 2026-10-10,
 * tambien contra el terreno: «todas las cajas chocan con el terreno en todo
 * momento» (el autor; regla 21).
 *
 * De ahi sale todo con la regla de siempre —no se entra donde el suelo esta por
 * encima de los pies—, solo que «el suelo» es lo mas alto que toca la huella:
 * cada columna de 0,5 del terreno y el techo de cada caja de objeto, salvo las
 * que quedan por encima de la cabeza, que son techo (`squareFloor`,
 * `footing`, `headroom`).
 *
 * Vive aparte de `systems/` a proposito: lo usan `jump.ts`, `movement.ts` y
 * `gathering.ts`, y desde cualquiera de ellos abriria un ciclo de
 * importacion (ver «Ciclos de importacion» en `CLAUDE.md`).
 *
 * Coordenadas del nucleo: `x`, `y` en el suelo y `z` hacia arriba.
 */

import {
  blocksBody,
  collisionBoxOf,
  Feature,
  harvestOf,
  hitPartsOf,
  isInert,
  isSapling,
  isStation,
  Station,
  stationHeight,
  stationOfFeature,
  type CollisionBox,
  type Species,
  type Stage,
} from '@verdant/shared';
import type { Hitbox } from './aim.js';
import { EntityKind, type EntityStore } from './entities.js';
import { topOf, VOXEL, VOXELS_PER_TILE, voxelOf } from './relief.js';
import { treeTrunkAt } from './trunk.js';
import type { World } from './world.js';

/** Medio ancho del cuerpo del jugador, en tiles: su huella. */
export const BODY_RADIUS = 0.34;

/**
 * Lo que mide de alto el cuerpo del jugador (el autor, 2026-10-06): una caja de
 * objeto que asoma dentro de este alto le estorba de lado, y una que queda por
 * encima es techo contra el que se da con la cabeza.
 */
export const PLAYER_HEIGHT = 1.8;

/**
 * Medidas de las cajas que no son arboles: medio ancho y alto, en bloques.
 * Salen de lo que mide cada dibujo (1,17 el arbusto, 1,09 la roca, 0,88 el
 * brote) y son **deduccion mia**; estan en `docs/juicio.md`.
 */
const BUSH_BOX = { half: 0.45, height: 1.1 };
const ROCK_BOX = { half: 0.45, height: 1.0 };
const SAPLING_BOX = { half: 0.15, height: 0.85 };
/**
 * Los guijarros: bajos, hay que mirar al suelo para cogerlos, y del ancho de
 * su dibujo tumbado. **Propuesta mia.**
 */
const PEBBLES_BOX = { half: 0.3, height: 0.2 };
/**
 * Las estaciones ocupan su casilla entera, con el alto de `stationHeight`: lo
 * que se pisa, lo que se golpea y lo que se dibuja son el mismo numero.
 */
export const STATION_BOXES: Readonly<Record<Station.Workbench | Station.Furnace, { half: number; height: number }>> = {
  [Station.Workbench]: { half: 0.5, height: stationHeight(Feature.Workbench) },
  [Station.Furnace]: { half: 0.5, height: stationHeight(Feature.Furnace) },
};

/**
 * La caja del objeto de una casilla, o `null` si no hay nada que golpear.
 *
 * Una caja vertical centrada en la casilla y apoyada en su suelo. **La del
 * arbol es solo su tronco desnudo** (decision del autor: las hojas no), del
 * suelo a la copa y del grosor de su especie, y sale de `treeTrunkAt`, lo mismo
 * que dibuja el cliente: el tronco que se ve es el que se golpea y el que se
 * pisa.
 */
export function featureBox(world: World, tx: number, ty: number): Hitbox | null {
  const feature = world.featureAt(tx, ty);
  if (feature === Feature.None || !harvestOf(feature)) return null;
  let half: number;
  let height: number;
  const trunk = treeTrunkAt(world.seed, tx, ty, feature);
  const station = stationOfFeature(feature);
  if (station === Station.Workbench || station === Station.Furnace) {
    ({ half, height } = STATION_BOXES[station]);
  } else if (trunk) {
    half = trunk.width / 2;
    height = trunk.bare;
  } else if (isSapling(feature)) {
    ({ half, height } = SAPLING_BOX);
  } else if (feature === Feature.Pebbles) {
    ({ half, height } = PEBBLES_BOX);
  } else if (isInert(feature)) {
    ({ half, height } = ROCK_BOX);
  } else {
    ({ half, height } = BUSH_BOX);
  }
  const cx = tx + 0.5;
  const cy = ty + 0.5;
  const z0 = objectBase(world, tx, ty, feature);
  return { x0: cx - half, x1: cx + half, y0: cy - half, y1: cy + half, z0, z1: z0 + height };
}

/**
 * Donde se apoya el objeto de una casilla: la altura de la base de su caja.
 *
 * Una caja centrada en su casilla, por fina que sea, pisa sus cuatro columnas
 * de 0,5 (el centro es la esquina de las cuatro). Reglas del autor
 * (2026-10-06):
 * - **lo generado va apoyado entero**: si su sitio es un escalon suelto, baja
 *   un nivel y vuelve a mirar, hasta que toda su cara de abajo pise terreno.
 *   Cerrado en una formula, es **la columna mas baja** de las que pisa;
 * - **lo que pone el jugador se queda sobre lo que toque**, por poco que sea:
 *   **la columna mas alta**. Hoy son las estaciones.
 *
 * Que el arbol, el arbusto o el brote que nace de la vida van con lo generado,
 * aunque el brote lo siembre el jugador, es **deduccion mia**.
 */
export function objectBase(world: World, tx: number, ty: number, feature: Feature): number {
  const highest = isStation(feature);
  let base = highest ? -Infinity : Infinity;
  for (let sy = 0; sy < VOXELS_PER_TILE; sy++) {
    for (let sx = 0; sx < VOXELS_PER_TILE; sx++) {
      const top = topOf(world.columnTop(tx * VOXELS_PER_TILE + sx, ty * VOXELS_PER_TILE + sy));
      base = highest ? Math.max(base, top) : Math.min(base, top);
    }
  }
  return base;
}

/** La caja de la casilla si choca (`blocksBody`), o `null`. */
export function solidBoxAt(world: World, tx: number, ty: number): Hitbox | null {
  return blocksBody(world.featureAt(tx, ty)) ? featureBox(world, tx, ty) : null;
}

/** Una caja girada en el suelo: su centro, su eje largo y sus medios lados. */
export interface OrientedBox {
  cx: number;
  cy: number;
  cz: number;
  /** El eje largo, unitario, en el suelo. El de ancho es (-uy, ux). */
  ux: number;
  uy: number;
  hl: number;
  hw: number;
  hh: number;
}

/**
 * Las cajas que se golpean de un animal con los pies en (`x`, `y`, `z`) y
 * mirando a (`fx`, `fy`): sus partes `hit`, giradas con su rumbo (regla 12).
 * No chocan: el animal choca con su caja de colision (`bodyOf`). El ancho del
 * plano (`z` del marco del animal) va a su izquierda: (-fy, fx).
 */
export function bodyBoxes(
  species: Species,
  stage: Stage,
  x: number,
  y: number,
  z: number,
  fx: number,
  fy: number,
): OrientedBox[] {
  const len = Math.hypot(fx, fy) || 1;
  const ux = fx / len;
  const uy = fy / len;
  return hitPartsOf(species, stage).map((p) => ({
    cx: x + ux * p.at[0] - uy * p.at[2],
    cy: y + uy * p.at[0] + ux * p.at[2],
    cz: z + p.at[1],
    ux,
    uy,
    hl: p.size[0] / 2,
    hw: p.size[2] / 2,
    hh: p.size[1] / 2,
  }));
}

/**
 * **La caja de colision** de una entidad: su medio lado en planta y su alto.
 * Una caja alineada con los ejes del mundo, que no gira, para el jugador
 * (`BODY_RADIUS`, `PLAYER_HEIGHT`) y para los animales (`collisionBoxOf`: el
 * autor, 2026-10-14, «base cuadrada», como en Minecraft). Choca por todas sus
 * caras siempre (regla 21).
 */
export function bodyOf(store: EntityStore, id: number): CollisionBox {
  const animal = store.animal[id];
  if (store.kind[id] === EntityKind.Player || !animal) return PLAYER_BOX;
  return collisionBoxOf(animal.species, animal.stage);
}

const PLAYER_BOX: CollisionBox = { half: BODY_RADIUS, height: PLAYER_HEIGHT };

/**
 * Lo que se lee de cada casilla en una ronda de consultas: el techo de cada
 * columna y la caja de lo que choca. Un animal mira
 * su caja varias veces por tick —avanzada en cada eje, lo que hay delante para
 * saltar— y ensaya saltos y rodeos, sobre casi las mismas casillas; asi que
 * cada ronda (`groundRound`) las lee una vez (`tests/performance.test.ts`).
 */
const MEMO_R = 4;
const MEMO_SIDE = 2 * MEMO_R + 1;
/** Las columnas de 0,5 de la misma ventana. */
const MEMO_COLS = MEMO_SIDE * VOXELS_PER_TILE;
const memo = {
  world: null as World | null,
  gen: 0,
  ox: 0,
  oy: 0,
  stamp: new Int32Array(MEMO_SIDE * MEMO_SIDE),
  box: new Array<Hitbox | null>(MEMO_SIDE * MEMO_SIDE).fill(null),
  colStamp: new Int32Array(MEMO_COLS * MEMO_COLS),
  colTop: new Float64Array(MEMO_COLS * MEMO_COLS),
};

/**
 * Una ronda de consultas del terreno alrededor de (`x`, `y`): lo que `body`
 * lea de cada casilla se lee una vez. Al acabar, se olvida: el terreno puede
 * cambiar antes de la siguiente. Dentro de otra ronda, se aprovecha la de
 * fuera: `stepFauna` abre una por animal y tick, y su andar y su vertical la
 * comparten.
 */
export function groundRound<T>(world: World, x: number, y: number, body: () => T): T {
  if (memo.world === world) return body();
  memo.world = world;
  memo.gen++;
  memo.ox = Math.floor(x) - MEMO_R;
  memo.oy = Math.floor(y) - MEMO_R;
  try {
    return body();
  } finally {
    memo.world = null;
  }
}

/** La casilla en la ronda: su indice, leyendola si hace falta, o -1 si cae fuera. */
function tile(world: World, tx: number, ty: number): number {
  const lx = tx - memo.ox;
  const ly = ty - memo.oy;
  if (memo.world !== world || lx < 0 || ly < 0 || lx >= MEMO_SIDE || ly >= MEMO_SIDE) return -1;
  const i = ly * MEMO_SIDE + lx;
  if (memo.stamp[i] !== memo.gen) {
    memo.stamp[i] = memo.gen;
    memo.box[i] = solidBoxAt(world, tx, ty);
  }
  return i;
}

/** El techo de la columna de 0,5 (`vx`, `vy`), en el mundo, dentro de una ronda o no. */
export function columnTopIn(world: World, vx: number, vy: number): number {
  const lx = vx - memo.ox * VOXELS_PER_TILE;
  const ly = vy - memo.oy * VOXELS_PER_TILE;
  if (memo.world !== world || lx < 0 || ly < 0 || lx >= MEMO_COLS || ly >= MEMO_COLS) {
    return topOf(world.columnTop(vx, vy));
  }
  const i = ly * MEMO_COLS + lx;
  if (memo.colStamp[i] !== memo.gen) {
    memo.colStamp[i] = memo.gen;
    memo.colTop[i] = topOf(world.columnTop(vx, vy));
  }
  return memo.colTop[i];
}

/** `solidBoxAt`, dentro de una ronda o no. */
export function solidBox(world: World, tx: number, ty: number): Hitbox | null {
  const i = tile(world, tx, ty);
  return i >= 0 ? memo.box[i] : solidBoxAt(world, tx, ty);
}

/**
 * Las columnas de 0,5 que solapa el tramo `[c - half, c + half]` de un eje: la
 * primera y la ultima. Tocar el borde de una columna no es solaparla. Con
 * `half` 0, la del punto.
 */
function columnSpan(c: number, half: number): [number, number] {
  if (half <= 0) return [voxelOf(c), voxelOf(c)];
  return [voxelOf(c - half), Math.ceil((c + half) / VOXEL) - 1];
}

/**
 * Lo mas alto del terreno bajo una huella cuadrada de medio lado `half`
 * centrada en (`x`, `y`): el techo de cada columna de 0,5 que solapa. Con
 * `half` 0, el de la columna del punto.
 */
export function terrainUnder(world: World, x: number, y: number, half: number): number {
  const [vx0, vx1] = columnSpan(x, half);
  const [vy0, vy1] = columnSpan(y, half);
  let top = -Infinity;
  for (let vy = vy0; vy <= vy1; vy++) {
    for (let vx = vx0; vx <= vx1; vx++) {
      top = Math.max(top, columnTopIn(world, vx, vy));
    }
  }
  return top;
}

/**
 * Lo que pisa una huella cuadrada de medio lado `half` centrada en (`x`, `y`):
 * el terreno bajo la huella entera (`terrainUnder`) y, encima, el techo de cada
 * caja que choca y la solapa. Con `half` 0, lo que hay justo en ese punto. Con
 * `head`, solo las cajas que empiezan por debajo de ahi: las de mas arriba no
 * se pisan, son techo (`headroom`).
 */
export function squareFloor(world: World, x: number, y: number, half: number, head = Infinity): number {
  let floor = terrainUnder(world, x, y, half);
  for (let ty = Math.floor(y - half); ty <= Math.floor(y + half); ty++) {
    for (let tx = Math.floor(x - half); tx <= Math.floor(x + half); tx++) {
      const b = solidBox(world, tx, ty);
      if (
        b &&
        b.z1 > floor &&
        b.z0 < head &&
        b.x0 < x + half &&
        b.x1 > x - half &&
        b.y0 < y + half &&
        b.y1 > y - half
      ) {
        floor = b.z1;
      }
    }
  }
  return floor;
}

/**
 * El techo sobre una huella cuadrada: lo mas bajo de las cajas que chocan, la
 * solapan y empiezan a la altura `from` o por encima. `Infinity` si no hay
 * ninguna. Con `from` en la cabeza, es lo que corta un salto.
 */
export function ceilingOver(world: World, x: number, y: number, half: number, from: number): number {
  let ceiling = Infinity;
  for (let ty = Math.floor(y - half); ty <= Math.floor(y + half); ty++) {
    for (let tx = Math.floor(x - half); tx <= Math.floor(x + half); tx++) {
      const b = solidBox(world, tx, ty);
      if (
        b &&
        b.z0 >= from - 1e-9 &&
        b.z0 < ceiling &&
        b.x0 < x + half &&
        b.x1 > x - half &&
        b.y0 < y + half &&
        b.y1 > y - half
      ) {
        ceiling = b.z0;
      }
    }
  }
  return ceiling;
}

/**
 * Hasta donde puede subir lo alto de la caja de una entidad donde esta: el
 * techo sobre ella. Desde el 2026-10-14 tambien el de los animales, que chocan
 * con su caja (`bodyOf`).
 */
export function headroom(world: World, store: EntityStore, id: number): number {
  const body = bodyOf(store, id);
  return ceilingOver(world, store.x[id], store.y[id], body.half, store.z[id] + body.height);
}

/**
 * Lo que pisa una entidad donde esta: el suelo bajo su caja entera
 * (`squareFloor`), contando solo las cajas de objeto que empiezan por debajo de
 * lo alto de su caja. El jugador y los animales igual, cada uno con su caja
 * (`bodyOf`; hasta el 2026-10-14 un animal se apoyaba en las cajas de sus
 * partes). Es la vara de los pies —caer, aterrizar, estar de pie— en
 * `applyVertical`.
 *
 * Si lo que pisa pide subir mas de `upTo` (los pies mas lo que se sube
 * andando), se esta metido en algo —un arbol que crecio encima— y el cuerpo
 * **se queda donde esta**, sin subirse a lo alto. **Deduccion mia.**
 */
export function footing(world: World, store: EntityStore, id: number, upTo = Infinity): number {
  const z = store.z[id];
  const body = bodyOf(store, id);
  const rest = squareFloor(world, store.x[id], store.y[id], body.half, z + body.height);
  return rest > upTo || rest === -Infinity ? z : rest;
}
