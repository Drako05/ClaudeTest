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
 * `half` 0, el de la columna del punto. Con `upTo`, solo las columnas que no
 * pasan de ahi, como las cajas (`footing`); `-Infinity` si no queda ninguna.
 */
export function terrainUnder(world: World, x: number, y: number, half: number, upTo = Infinity): number {
  const [vx0, vx1] = columnSpan(x, half);
  const [vy0, vy1] = columnSpan(y, half);
  let top = -Infinity;
  for (let vy = vy0; vy <= vy1; vy++) {
    for (let vx = vx0; vx <= vx1; vx++) {
      const column = columnTopIn(world, vx, vy);
      if (column <= upTo) top = Math.max(top, column);
    }
  }
  return top;
}

/**
 * Lo que pisa una huella cuadrada de medio lado `half` centrada en (`x`, `y`):
 * el terreno bajo la huella entera (`terrainUnder`) y, encima, el techo de cada
 * caja que choca y la solapa. Con `half` 0, lo que hay justo en ese punto. Con
 * `upTo`, solo el terreno y las cajas cuyo techo no pasa de ahi (ver
 * `footing`); `-Infinity` si no queda nada debajo de eso. Con
 * `head`, solo las que empiezan por debajo de ahi: las de mas arriba no se
 * pisan, son techo (`headroom`).
 */
export function squareFloor(world: World, x: number, y: number, half: number, upTo = Infinity, head = Infinity): number {
  let floor = terrainUnder(world, x, y, half, upTo);
  for (let ty = Math.floor(y - half); ty <= Math.floor(y + half); ty++) {
    for (let tx = Math.floor(x - half); tx <= Math.floor(x + half); tx++) {
      const b = solidBox(world, tx, ty);
      if (
        b &&
        b.z1 > floor &&
        b.z1 <= upTo &&
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
 * Hasta donde puede subir la cabeza de una entidad donde esta: el techo sobre el
 * jugador. Los animales aun no lo miran (`Infinity`): sus partes chocan de lado
 * con las cajas, y en el mundo de hoy no hay nada colgado.
 */
export function headroom(world: World, store: EntityStore, id: number): number {
  if (store.kind[id] !== EntityKind.Player) return Infinity;
  return ceilingOver(world, store.x[id], store.y[id], BODY_RADIUS, store.z[id] + PLAYER_HEIGHT);
}

/**
 * **La altura de reposo** de un cuerpo de cajas giradas con los pies a `z`: lo
 * mas bajo a que pueden estar los pies sin que **ninguna** caja quede dentro del
 * terreno o de la caja de un objeto (el autor, 2026-10-10: «todas las cajas
 * chocan con el terreno en todo momento»). Es, sobre cada caja, lo mas alto que
 * hay bajo ella —el techo de cada columna de 0,5 y de cada caja de objeto que
 * solapa— menos lo que esa caja esta por encima de los pies. **Deduccion mia.**
 *
 * Asi la cabeza de un bisonte pasa por encima de una pared que sus patas no, y
 * un animal con las patas traseras sobre un escalon no cae hasta que todas sus
 * cajas caben abajo. Las cajas de objeto que empiezan por encima de una parte
 * no cuentan para ella. Con `upTo`, solo cuenta lo que no pide subir los pies
 * mas alla de ahi (`footing`); `-Infinity` si no queda nada.
 */
export function partsRest(world: World, boxes: readonly OrientedBox[], z: number, upTo = Infinity): number {
  let rest = -Infinity;
  for (const p of boxes) {
    const lift = p.cz - p.hh - z;
    const top = p.cz + p.hh;
    const rx = p.hl * Math.abs(p.ux) + p.hw * Math.abs(p.uy);
    const ry = p.hl * Math.abs(p.uy) + p.hw * Math.abs(p.ux);
    for (let vy = voxelOf(p.cy - ry); vy <= voxelOf(p.cy + ry); vy++) {
      for (let vx = voxelOf(p.cx - rx); vx <= voxelOf(p.cx + rx); vx++) {
        if (!overlapsSquare(p, (vx + 0.5) * VOXEL, (vy + 0.5) * VOXEL, VOXEL / 2)) continue;
        const feet = columnTopIn(world, vx, vy) - lift;
        if (feet > rest && feet <= upTo) rest = feet;
      }
    }
    for (let ty = Math.floor(p.cy - ry); ty <= Math.floor(p.cy + ry); ty++) {
      for (let tx = Math.floor(p.cx - rx); tx <= Math.floor(p.cx + rx); tx++) {
        const b = solidBox(world, tx, ty);
        if (!b || b.z0 >= top) continue;
        const feet = b.z1 - lift;
        if (feet <= rest || feet > upTo) continue;
        if (overlapsSquare(p, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.x1 - b.x0) / 2)) rest = feet;
      }
    }
  }
  return rest;
}

/**
 * Lo que pisa una entidad donde esta: el jugador con su huella
 * (`BODY_RADIUS`), un animal con todas sus cajas (`partsRest`; hasta el
 * 2026-10-10, solo con las mas bajas y el terreno en el centro). Es la vara de
 * los pies —caer, aterrizar, estar de pie— en `applyVertical`.
 *
 * Solo cuentan las cajas cuyo techo no pasa de `upTo` (los pies mas lo que se
 * sube andando): una caja que asoma por encima de eso no se pisa, se esta
 * metido en ella —un arbol que crecio encima, un animal que no cabe y anda
 * solo con los pies—, y no puede subir el cuerpo de golpe a su techo.
 * **Deduccion mia.** Desde el 2026-10-10 vale igual para el terreno y para
 * todo el cuerpo: si lo que pisa —la huella del jugador, todas las cajas del
 * animal— pide subir mas de `upTo`, el cuerpo **se queda donde esta**, ni se
 * sube de golpe a lo alto (solo se sube de golpe lo que se sube andando, el
 * autor) ni a medias apoyado en otra cosa.
 */
export function footing(world: World, store: EntityStore, id: number, upTo = Infinity): number {
  const x = store.x[id];
  const y = store.y[id];
  const z = store.z[id];
  let rest: number;
  if (store.kind[id] === EntityKind.Player) {
    rest = squareFloor(world, x, y, BODY_RADIUS, Infinity, z + PLAYER_HEIGHT);
  } else {
    const animal = store.animal[id];
    if (!animal) return world.groundHeightAt(x, y);
    rest = partsRest(world, bodyBoxes(animal.species, animal.stage, x, y, z, store.facingX[id], store.facingY[id]), z);
  }
  // Metido en algo mas de lo que se sube de golpe: se queda donde esta, sin
  // subirse a medias apoyado en otra cosa. Andando no pasa nunca —no se entra
  // donde el suelo pasa de los pies—; pasa al aparecer o si algo crece debajo.
  return rest > upTo || rest === -Infinity ? z : rest;
}
