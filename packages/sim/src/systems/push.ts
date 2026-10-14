/**
 * Los empujes entre cuerpos (el autor, 2026-10-14, punto 9: «colisiones
 * similares a las de minecraft, que no se sienten rigidas»; y «segun el
 * tamaño: el grande aparta mas al pequeño, y el jugador cuenta como un cuerpo
 * mas»).
 *
 * Los cuerpos no se chocan entre si al andar —`blocked` solo mira el terreno y
 * los objetos—: se pueden meter uno en otro, y este paso, al final del tick,
 * los va apartando poco a poco. Asi un animal no frena en seco contra otro, y
 * el jugador se abre paso entre un rebaño empujandolo.
 *
 * **Deduccion mia, no numeros del autor** (`docs/juicio.md`):
 * - la **masa** de cada cuerpo es el volumen de su caja (`bodyOf`): el jugador,
 *   0,68 × 0,68 × 1,8; un bisonte adulto, 1,25 × 1,25 × 1,58;
 * - dos cajas que se solapan en planta y en alto se apartan **por la linea
 *   entre sus centros**, a `PUSH_SPEED` (2 m/s) como mucho, en proporcion a lo
 *   que se solapan;
 * - cada una se lleva la parte de esa velocidad que le toca **por la masa de
 *   la otra**: frente a un cuerpo que pesa lo mismo, la mitad; frente a uno
 *   mucho mayor, casi toda;
 * - el empuje pasa por el choque de andar (`nudge`): nunca mete a nadie en una
 *   pared ni en el agua, ni saca a un animal de su bioma. Lo que no cabe se
 *   pierde.
 *
 * Los pares van siempre en el mismo orden, a lo largo de x y a igual x por
 * id: el resultado no depende de nada mas que del estado (determinista).
 */

import { TICK_DT } from '@verdant/shared';
import { bodyOf } from '../boxes.js';
import type { EntityStore } from '../entities.js';
import type { World } from '../world.js';
import { nudge } from './movement.js';
import { keepIn, type FaunaIndex } from './wander.js';

/** Lo mas rapido que se apartan dos cuerpos, metidos del todo uno en otro, en m/s. */
export const PUSH_SPEED = 2;

/** La masa de un cuerpo: el volumen de su caja. */
export function massOf(store: EntityStore, id: number): number {
  const { half, height } = bodyOf(store, id);
  return 4 * half * half * height;
}

/** Los cuerpos del paso, ordenados a lo largo de x, con su caja y su masa. */
const ids: number[] = [];
const half: number[] = [];
const tall: number[] = [];
const mass: number[] = [];
const moveX: number[] = [];
const moveY: number[] = [];

/**
 * Un paso de empujes: aparta lo que se solapa entre el jugador `playerId` (si
 * vive) y los animales cargados. Se calcula todo con las posiciones del
 * principio del paso y luego se mueve, para que el orden de los pares no
 * cambie lo que le toca a cada uno.
 */
export function pushBodies(
  world: World,
  store: EntityStore,
  fauna: FaunaIndex,
  playerId: number,
  dt: number = TICK_DT,
): void {
  ids.length = 0;
  if (store.alive[playerId]) ids.push(playerId);
  for (const id of fauna.values()) if (store.alive[id] && store.animal[id]) ids.push(id);
  const n = ids.length;
  if (n < 2) return;
  // A lo largo de x, y a igual x por id: el mismo orden con el mismo estado.
  // Asi cada cuerpo solo mira a los que tiene al lado, hasta donde su caja y
  // la mas ancha podrian tocarse (con 113 animales, de 0,65 ms a 0,15).
  ids.sort((a, b) => store.x[a] - store.x[b] || a - b);
  let widest = 0;
  for (let i = 0; i < n; i++) {
    const { half: h, height } = bodyOf(store, ids[i]!);
    half[i] = h;
    tall[i] = height;
    mass[i] = 4 * h * h * height;
    widest = Math.max(widest, h);
  }
  moveX.length = n;
  moveY.length = n;
  moveX.fill(0);
  moveY.fill(0);

  for (let i = 0; i < n; i++) {
    const a = ids[i]!;
    for (let j = i + 1; j < n; j++) {
      const b = ids[j]!;
      const dx = store.x[b] - store.x[a];
      if (dx >= half[i]! + widest) break;
      const reach = half[i]! + half[j]!;
      const dy = store.y[b] - store.y[a];
      const overX = reach - Math.abs(dx);
      const overY = reach - Math.abs(dy);
      if (overX <= 0 || overY <= 0) continue;
      // Y en alto: uno encima de otro no se empujan.
      if (store.z[a] >= store.z[b] + tall[j]! || store.z[b] >= store.z[a] + tall[i]!) continue;
      // Lo que se solapan: lo que haria falta mover a uno para separarlos, en
      // el eje que menos pide, sobre lo que se solaparian centro con centro.
      const overlap = Math.min(overX, overY) / reach;
      // La linea entre sus centros; si coinciden, una fija (el de id menor, a -x).
      const dist = Math.hypot(dx, dy);
      const ux = dist > 1e-9 ? dx / dist : 1;
      const uy = dist > 1e-9 ? dy / dist : 0;
      const speed = PUSH_SPEED * overlap;
      const shareA = mass[j]! / (mass[i]! + mass[j]!);
      const shareB = mass[i]! / (mass[i]! + mass[j]!);
      moveX[i]! -= ux * speed * shareA * dt;
      moveY[i]! -= uy * speed * shareA * dt;
      moveX[j]! += ux * speed * shareB * dt;
      moveY[j]! += uy * speed * shareB * dt;
    }
  }

  for (let i = 0; i < n; i++) {
    if (moveX[i] === 0 && moveY[i] === 0) continue;
    const id = ids[i]!;
    nudge(world, store, id, moveX[i]!, moveY[i]!, store.animal[id] ? keepIn(world, store, id) : undefined);
  }
}
