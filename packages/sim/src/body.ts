/**
 * El cuerpo de un animal en el mundo: sus partes `hit` (`fauna-body.ts`)
 * puestas en su sitio y giradas con su rumbo, y si caben en el terreno.
 *
 * Decision del autor (2026-10-03): **el cuerpo choca con las cajas de sus
 * partes**, que giran con el rumbo, y no puede meterse en un bloque solido; un
 * bisonte no cabe por un pasillo de un bloque, y si al girar su cabeza entrara
 * en una pared, no gira. La cola y las patas finas no chocan.
 *
 * **Un escalon estorba a cada parte** (la regla 21 extendida a las partes,
 * *mi deduccion*): una casilla estorba a una parte si entre ella y la casilla
 * vecina hacia los pies hay un escalon —su suelo mas bajo pasa de `STEP_UP`
 * sobre el mas alto de la vecina— y ese suelo queda por encima de la base de
 * la parte. Una rampa no tiene escalon: deja pasar, aunque un cuerpo que no se
 * inclina asome sobre su pendiente; un escalon de un nivel no deja meter una
 * cabeza. Los pies siguen con su regla del centro y `STEP_UP` (`movement.ts`).
 *
 * Coordenadas del nucleo: `x`, `y` en el suelo y `z` hacia arriba.
 */

import { hitPartsOf, type Species, type Stage } from '@verdant/shared';
import { STEP_UP } from './systems/jump.js';
import type { World } from './world.js';

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
 * su izquierda: (-fy, fx).
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

/** Si la huella de una caja girada solapa la casilla (`tx`, `ty`): ejes separadores en 2D. */
function overlapsTile(b: OrientedBox, tx: number, ty: number): boolean {
  // La casilla, centrada en (tx + 0.5, ty + 0.5), con medio lado 0.5.
  const dx = tx + 0.5 - b.cx;
  const dy = ty + 0.5 - b.cy;
  const ax = Math.abs(b.ux);
  const ay = Math.abs(b.uy);
  // Ejes de la casilla: x e y. La caja proyecta hl·|u| + hw·|v| en cada uno.
  if (Math.abs(dx) >= 0.5 + b.hl * ax + b.hw * ay) return false;
  if (Math.abs(dy) >= 0.5 + b.hl * ay + b.hw * ax) return false;
  // Ejes de la caja: u y v. La casilla proyecta 0.5·(|ux| + |uy|) en los dos.
  const reach = 0.5 * (ax + ay);
  if (Math.abs(dx * b.ux + dy * b.uy) >= b.hl + reach) return false;
  if (Math.abs(-dx * b.uy + dy * b.ux) >= b.hw + reach) return false;
  return true;
}

/**
 * Lo que se lee de cada casilla en una ronda de consultas: si es solida y su
 * suelo mas bajo y mas alto. Un animal mira su postura hasta cuatro veces por
 * tick —donde esta, girado y avanzado en cada eje— sobre casi las mismas
 * casillas, asi que cada ronda (`groundRound`) las lee una vez. Es lo que deja
 * el choque por partes en el presupuesto de un tick (`tests/performance.test.ts`).
 */
const MEMO_R = 4;
const MEMO_SIDE = 2 * MEMO_R + 1;
const memo = {
  world: null as World | null,
  gen: 0,
  ox: 0,
  oy: 0,
  stamp: new Int32Array(MEMO_SIDE * MEMO_SIDE),
  solid: new Uint8Array(MEMO_SIDE * MEMO_SIDE),
  low: new Float64Array(MEMO_SIDE * MEMO_SIDE),
  high: new Float64Array(MEMO_SIDE * MEMO_SIDE),
};
const range = new Float64Array(2);

/**
 * Una ronda de consultas del terreno alrededor de (`x`, `y`): lo que `body`
 * lea de cada casilla se lee una vez. Al acabar, se olvida: el terreno puede
 * cambiar antes de la siguiente.
 */
export function groundRound<T>(world: World, x: number, y: number, body: () => T): T {
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
    memo.solid[i] = world.isSolidAt(tx, ty) ? 1 : 0;
    world.floorRangeAt(tx, ty, range);
    memo.low[i] = range[0];
    memo.high[i] = range[1];
  }
  return i;
}

function isSolid(world: World, tx: number, ty: number): boolean {
  const i = tile(world, tx, ty);
  return i >= 0 ? memo.solid[i] === 1 : world.isSolidAt(tx, ty);
}

function lowOf(world: World, tx: number, ty: number): number {
  const i = tile(world, tx, ty);
  if (i >= 0) return memo.low[i];
  world.floorRangeAt(tx, ty, range);
  return range[0];
}

function highOf(world: World, tx: number, ty: number): number {
  const i = tile(world, tx, ty);
  if (i >= 0) return memo.high[i];
  world.floorRangeAt(tx, ty, range);
  return range[1];
}

/**
 * Si la casilla (`tx`, `ty`) tiene un escalon que la separa de su vecina hacia
 * los pies (`feetX`, `feetY`), la altura de su suelo; si no, `-Infinity`. La
 * casilla de los pies no tiene escalon hacia si misma.
 */
function stepTop(world: World, tx: number, ty: number, feetX: number, feetY: number): number {
  const ftx = Math.floor(feetX);
  const fty = Math.floor(feetY);
  if (tx === ftx && ty === fty) return -Infinity;
  const dx = ftx - tx;
  const dy = fty - ty;
  const [nx, ny] = Math.abs(dx) >= Math.abs(dy) ? [tx + Math.sign(dx), ty] : [tx, ty + Math.sign(dy)];
  const low = lowOf(world, tx, ty);
  return low - highOf(world, nx, ny) > STEP_UP ? low : -Infinity;
}

/**
 * Cuantas veces se mete el cuerpo en el terreno: un punto por cada (parte,
 * casilla) en que la casilla es solida o tiene, hacia los pies en
 * (`feetX`, `feetY`), un escalon que pasa de la base de la parte. Cero es que
 * cabe. Dentro de una ronda (`groundRound`), cada casilla se lee una vez.
 */
export function bodyClashes(world: World, boxes: readonly OrientedBox[], feetX: number, feetY: number): number {
  let clashes = 0;
  for (const b of boxes) {
    const rx = b.hl * Math.abs(b.ux) + b.hw * Math.abs(b.uy);
    const ry = b.hl * Math.abs(b.uy) + b.hw * Math.abs(b.ux);
    const base = b.cz - b.hh;
    for (let ty = Math.floor(b.cy - ry); ty <= Math.floor(b.cy + ry); ty++) {
      for (let tx = Math.floor(b.cx - rx); tx <= Math.floor(b.cx + rx); tx++) {
        if (!overlapsTile(b, tx, ty)) continue;
        if (isSolid(world, tx, ty) || stepTop(world, tx, ty, feetX, feetY) > base + 1e-6) clashes++;
      }
    }
  }
  return clashes;
}
