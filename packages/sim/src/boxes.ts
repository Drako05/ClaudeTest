/**
 * Las cajas de las cosas y lo que pisa un cuerpo.
 *
 * Decision del autor (2026-10-05): **cada objeto del entorno tiene UNA caja,
 * que se golpea y, si su tipo lo dice, choca** (`blocksBody`), ajustada al
 * objeto y no a su casilla, y con alto: encima se esta de pie. Chocan el
 * tronco del arbol, la roca, los minerales y las estaciones; el arbusto, el
 * brote y los guijarros solo se golpean. Y **el cuerpo se apoya y choca con su
 * huella entera**, tambien contra las estaciones; el terreno sigue midiendose
 * en el centro (regla 21).
 *
 * De ahi sale todo con la regla de siempre —no se entra donde el suelo esta por
 * encima de los pies—, solo que «el suelo» es el terreno en el centro y,
 * encima, el techo de cada caja que toca la huella (`squareFloor`, `footing`).
 *
 * Vive aparte de `systems/` a proposito: lo usan `jump.ts`, `movement.ts`,
 * `body.ts` y `gathering.ts`, y desde cualquiera de ellos abriria un ciclo de
 * importacion (ver «Ciclos de importacion» en `CLAUDE.md`).
 *
 * Coordenadas del nucleo: `x`, `y` en el suelo y `z` hacia arriba.
 */

import {
  blocksBody,
  Feature,
  harvestOf,
  hitPartsOf,
  isInert,
  isSapling,
  isStation,
  Station,
  stationHeight,
  stationOfFeature,
  type Species,
  type Stage,
} from '@verdant/shared';
import type { Hitbox } from './aim.js';
import { EntityKind, type EntityStore } from './entities.js';
import { topOf, VOXELS_PER_TILE } from './relief.js';
import { treeTrunkAt } from './trunk.js';
import type { World } from './world.js';

/** Medio ancho del cuerpo del jugador, en tiles: su huella. */
export const BODY_RADIUS = 0.34;

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
 * Las cajas que golpean y chocan de un animal con los pies en (`x`, `y`, `z`)
 * y mirando a (`fx`, `fy`). El ancho del plano (`z` del marco del animal) va a
 * su izquierda: (-fy, fx). Con `feetOnly`, solo sus partes mas bajas: las que
 * lo sostienen.
 */
export function bodyBoxes(
  species: Species,
  stage: Stage,
  x: number,
  y: number,
  z: number,
  fx: number,
  fy: number,
  feetOnly = false,
): OrientedBox[] {
  const len = Math.hypot(fx, fy) || 1;
  const ux = fx / len;
  const uy = fy / len;
  return (feetOnly ? footPartsOf(species, stage) : hitPartsOf(species, stage)).map((p) => ({
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

const footCache = new Map<number, ReturnType<typeof hitPartsOf>>();

/**
 * Las partes con caja mas bajas de un animal, las que lo sostienen: las patas
 * del cuadrupedo, el caparazon del cangrejo, el tronco de la gaviota.
 * **Deduccion mia** (`docs/juicio.md`).
 */
function footPartsOf(species: Species, stage: Stage): ReturnType<typeof hitPartsOf> {
  const key = species * 8 + stage;
  let parts = footCache.get(key);
  if (!parts) {
    const all = hitPartsOf(species, stage);
    const base = (p: (typeof all)[number]) => p.at[1] - p.size[1] / 2;
    const lowest = Math.min(...all.map(base));
    parts = all.filter((p) => base(p) <= lowest + 1e-6);
    footCache.set(key, parts);
  }
  return parts;
}

/**
 * Si la huella de una caja girada solapa el cuadrado de centro (`cx`, `cy`) y
 * medio lado `half`: ejes separadores en 2D. Tocarse por el borde no cuenta.
 */
export function overlapsSquare(b: OrientedBox, cx: number, cy: number, half: number): boolean {
  const dx = cx - b.cx;
  const dy = cy - b.cy;
  const ax = Math.abs(b.ux);
  const ay = Math.abs(b.uy);
  // Ejes del cuadrado: x e y. La caja proyecta hl·|u| + hw·|v| en cada uno.
  if (Math.abs(dx) >= half + b.hl * ax + b.hw * ay) return false;
  if (Math.abs(dy) >= half + b.hl * ay + b.hw * ax) return false;
  // Ejes de la caja: u y v. El cuadrado proyecta half·(|ux| + |uy|) en los dos.
  const reach = half * (ax + ay);
  if (Math.abs(dx * b.ux + dy * b.uy) >= b.hl + reach) return false;
  if (Math.abs(-dx * b.uy + dy * b.ux) >= b.hw + reach) return false;
  return true;
}

/**
 * Lo que se lee de cada casilla en una ronda de consultas: si su terreno corta
 * el paso, su suelo mas bajo y mas alto, y la caja de lo que choca. Un animal
 * mira su postura hasta cuatro veces por tick —donde esta, girado y avanzado en
 * cada eje—, y ensaya saltos y rodeos, sobre casi las mismas casillas; asi que
 * cada ronda (`groundRound`) las lee una vez. Es lo que deja el choque por
 * partes en el presupuesto de un tick (`tests/performance.test.ts`).
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
  water: new Uint8Array(MEMO_SIDE * MEMO_SIDE),
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
    memo.water[i] = world.isTerrainSolidAt(tx, ty) ? 1 : 0;
    memo.box[i] = solidBoxAt(world, tx, ty);
  }
  return i;
}

/** Si el terreno de la casilla corta el paso (el agua), dentro de una ronda o no. */
export function terrainSolid(world: World, tx: number, ty: number): boolean {
  const i = tile(world, tx, ty);
  return i >= 0 ? memo.water[i] === 1 : world.isTerrainSolidAt(tx, ty);
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
 * Lo que pisa una huella cuadrada de medio lado `half` centrada en (`x`, `y`):
 * el terreno en su centro y, encima, el techo de cada caja que choca y la
 * solapa. Con `half` 0, lo que hay justo en ese punto. Con `upTo`, solo las
 * cajas cuyo techo no pasa de ahi (ver `footing`).
 */
export function squareFloor(world: World, x: number, y: number, half: number, upTo = Infinity): number {
  let floor = world.groundHeightAt(x, y);
  for (let ty = Math.floor(y - half); ty <= Math.floor(y + half); ty++) {
    for (let tx = Math.floor(x - half); tx <= Math.floor(x + half); tx++) {
      const b = solidBox(world, tx, ty);
      if (b && b.z1 > floor && b.z1 <= upTo && b.x0 < x + half && b.x1 > x - half && b.y0 < y + half && b.y1 > y - half) {
        floor = b.z1;
      }
    }
  }
  return floor;
}

/**
 * Lo que pisan unas cajas giradas (las partes que sostienen a un animal), con
 * el terreno medido en (`x`, `y`): el terreno y el techo de cada caja que choca
 * y solapa alguna.
 */
export function partsFloor(world: World, boxes: readonly OrientedBox[], x: number, y: number, upTo = Infinity): number {
  let floor = world.groundHeightAt(x, y);
  for (const p of boxes) {
    const rx = p.hl * Math.abs(p.ux) + p.hw * Math.abs(p.uy);
    const ry = p.hl * Math.abs(p.uy) + p.hw * Math.abs(p.ux);
    for (let ty = Math.floor(p.cy - ry); ty <= Math.floor(p.cy + ry); ty++) {
      for (let tx = Math.floor(p.cx - rx); tx <= Math.floor(p.cx + rx); tx++) {
        const b = solidBox(world, tx, ty);
        if (!b || b.z1 <= floor || b.z1 > upTo) continue;
        if (overlapsSquare(p, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.x1 - b.x0) / 2)) floor = b.z1;
      }
    }
  }
  return floor;
}

/**
 * Lo que pisa una entidad donde esta: el jugador con su huella
 * (`BODY_RADIUS`), un animal con sus partes mas bajas. Es la vara de los pies
 * —caer, aterrizar, estar de pie— en `applyVertical`.
 *
 * Solo cuentan las cajas cuyo techo no pasa de `upTo` (los pies mas lo que se
 * sube andando): una caja que asoma por encima de eso no se pisa, se esta
 * metido en ella —un arbol que crecio encima, un animal que no cabe y anda
 * solo con los pies—, y no puede subir el cuerpo de golpe a su techo.
 * **Deduccion mia.**
 */
export function footing(world: World, store: EntityStore, id: number, upTo = Infinity): number {
  const x = store.x[id];
  const y = store.y[id];
  if (store.kind[id] === EntityKind.Player) return squareFloor(world, x, y, BODY_RADIUS, upTo);
  const animal = store.animal[id];
  if (!animal) return world.groundHeightAt(x, y);
  const feet = bodyBoxes(animal.species, animal.stage, x, y, store.z[id], store.facingX[id], store.facingY[id], true);
  return partsFloor(world, feet, x, y, upTo);
}
