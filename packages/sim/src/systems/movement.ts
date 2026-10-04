/**
 * Movimiento y colision contra la rejilla de tiles.
 *
 * Se resuelve eje por eje (primero X, luego Y). Es lo que permite deslizarse a
 * lo largo de una pared en vez de quedarse clavado al chocar en diagonal.
 *
 * **La altura estorba, y estorba con una sola regla**: no se entra donde el
 * suelo esta por encima de los pies. De ahi salen las tres cosas a la vez, sin
 * casos especiales — un talud se sube andando porque su suelo sube poco a poco,
 * una pared no se sube porque el suyo sube de golpe, y en el aire uno se estampa
 * contra la cara de un bloque porque a esa altura su suelo sigue estando encima.
 * Lo unico que cambia entre andar y volar es **cuanto** margen hay: andando,
 * `STEP_UP`; volando, ninguno.
 *
 * Antes de esto el jugador cambiaba de nivel sin mas, teletransportandose de un
 * tile bajo a uno alto y al reves, porque la colision solo miraba `isSolidAt` y
 * el relieve solo se veia.
 */

import type { EntityStore } from '../entities.js';
import type { World } from '../world.js';
import { bodyBoxes, bodyClashes, groundRound } from '../body.js';
import { STEP_UP } from './jump.js';

/** Medio ancho del cuerpo del jugador, en tiles. */
export const BODY_RADIUS = 0.34;
/** Velocidad de marcha, en tiles por segundo. Es la de siempre. */
export const WALK_SPEED = 5.2;

/**
 * Cuanto mas rapido se corre que se anda.
 *
 * **Deduccion del agente, no numero del autor**, y por tanto suyo para
 * corregir: pidio la mecanica pero no la cifra. 1.6 es lo habitual —se nota de
 * verdad sin que el mundo pase volando— y esta expresado como multiplicador
 * justo para que cambiarlo sea una linea.
 *
 * No obliga a recalibrar nada de lo que ya habia, y esta comprobado: subiendo un
 * talud a la carrera el suelo asciende `RUN_SPEED · TICK_DT ≈ 0.139` niveles por
 * tick, todavia muy por debajo del medio nivel de `STEP_UP` (regla 21), y el
 * paso por tick sigue siendo mucho menor que `BODY_RADIUS`, asi que no se
 * atraviesan paredes.
 */
export const RUN_MULTIPLIER = 1.6;

/** Velocidad de carrera, en tiles por segundo. */
export const RUN_SPEED = WALK_SPEED * RUN_MULTIPLIER;

/**
 * La velocidad de desplazamiento: dos valores y nada entre medias.
 *
 * Antes era `WALK_SPEED · magnitud del mando`, o sea que el joystick hacia de
 * acelerador. El autor lo cambio al pedir la carrera: **el mando apunta, el
 * interruptor decide la velocidad.** Con teclado daba igual —un eje vale 1 y la
 * diagonal raiz de 2, y ambos se acotaban a 1—, asi que quien lo nota es el
 * movil, que es justo donde el autor lo queria distinto.
 */
export function speedOf(running: boolean): number {
  return running ? RUN_SPEED : WALK_SPEED;
}

/** True si el AABB centrado en (cx, cy) solapa algun tile solido. */
export function collides(world: World, cx: number, cy: number): boolean {
  const minX = Math.floor(cx - BODY_RADIUS);
  const maxX = Math.floor(cx + BODY_RADIUS);
  const minY = Math.floor(cy - BODY_RADIUS);
  const maxY = Math.floor(cy + BODY_RADIUS);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (world.isSolidAt(tx, ty)) return true;
    }
  }
  return false;
}

/**
 * True si se puede poner el cuerpo en (cx, cy) teniendo los pies a `feet`.
 *
 * La altura se mide en el CENTRO y no en el contorno del cuerpo, al reves que
 * los solidos. Con el contorno, arrimarse a una pared bastaria para que el
 * maximo de las casillas solapadas fuera la propia pared y el personaje se
 * subiria a ella de lado. El centro es lo que de verdad se pisa.
 */
function blocked(
  world: World,
  cx: number,
  cy: number,
  feet: number,
  margin: number,
  keep?: (x: number, y: number) => boolean,
): boolean {
  if (collides(world, cx, cy)) return true;
  if (keep && !keep(cx, cy)) return true;
  // El suelo con sus estaciones: una mesa estorba de lado como una pared de un
  // bloque y se sube saltando (decision del autor, 2026-09-30).
  return world.floorHeightAt(cx, cy) > feet + margin;
}

/**
 * Un paso de movimiento horizontal, eje a eje.
 *
 * `margin` es cuanto desnivel se admite subir: `STEP_UP` andando y 0 en el aire.
 */
function slide(
  world: World,
  store: EntityStore,
  id: number,
  stepX: number,
  stepY: number,
  margin: number,
  keep?: (x: number, y: number) => boolean,
): void {
  const feet = store.z[id];
  const curY = store.y[id];

  const nextX = store.x[id] + stepX;
  if (!blocked(world, nextX, curY, feet, margin, keep)) store.x[id] = nextX;

  const nextY = curY + stepY;
  if (!blocked(world, store.x[id], nextY, feet, margin, keep)) store.y[id] = nextY;
}

/**
 * Movimiento en el suelo.
 *
 * Deja tambien `vx`/`vy` puestas aunque la posicion la escriba directamente:
 * son la velocidad que se lleva, y quien dibuja o mide la lee de ahi.
 */
export function moveEntity(
  world: World,
  store: EntityStore,
  id: number,
  moveX: number,
  moveY: number,
  dt: number,
  running = false,
): void {
  walk(world, store, id, moveX, moveY, dt, running, STEP_UP);
}

/**
 * Movimiento en el aire: **igual que en el suelo** (decision del autor,
 * 2026-09-30). El salto solo empuja hacia arriba, y lo horizontal lo pone el
 * mando a la velocidad de andar o de correr; sin mando no se avanza. Hasta
 * entonces se conservaba el impulso del despegue y solo se admitia un 30 % de
 * desviacion.
 *
 * Lo unico que cambia es que va **sin margen de subida**, que es lo que
 * convierte la cara de un bloque en una pared contra la que estamparse: por
 * debajo de su altura no se entra, y por encima si.
 */
export function moveAirborne(
  world: World,
  store: EntityStore,
  id: number,
  moveX: number,
  moveY: number,
  dt: number,
  running = false,
): void {
  walk(world, store, id, moveX, moveY, dt, running, 0);
}

function walk(
  world: World,
  store: EntityStore,
  id: number,
  moveX: number,
  moveY: number,
  dt: number,
  running: boolean,
  margin: number,
): void {
  const len = Math.hypot(moveX, moveY);
  if (len <= 1e-6) {
    store.vx[id] = 0;
    store.vy[id] = 0;
    return;
  }

  // La direccion se normaliza, y con eso la diagonal deja de ser mas rapida que
  // la ortogonal. La magnitud NO se mira: el vector es direccion y ya esta.
  const dirX = moveX / len;
  const dirY = moveY / len;
  store.facingX[id] = dirX;
  store.facingY[id] = dirY;

  const speed = speedOf(running);
  store.vx[id] = dirX * speed;
  store.vy[id] = dirY * speed;

  slide(world, store, id, dirX * speed * dt, dirY * speed * dt, margin);
}

/** Cuanto gira un animal, en radianes por segundo: media vuelta por segundo. **Deduccion mia.** */
export const ANIMAL_TURN_RATE = Math.PI;

/**
 * Lo que puede desviarse el rumbo de un animal de su destino para avanzar: mas
 * alla, gira sin moverse, porque los animales no andan de lado. **Deduccion
 * mia.**
 */
export const ANIMAL_WALK_CONE = Math.PI / 4;

/** El angulo de `a` a `b`, por el camino corto, en (-π, π]. */
function turnBetween(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * Si los pies de un animal pueden ir a (cx, cy): su casilla no es solida, el
 * punto lo admite `keep` —no sale de los tiles de su bioma— y el suelo no sube
 * mas de `STEP_UP`. Lo demas del cuerpo lo miran sus partes (`body.ts`).
 */
function feetBlocked(
  world: World,
  cx: number,
  cy: number,
  feet: number,
  keep?: (x: number, y: number) => boolean,
): boolean {
  if (world.isSolidAt(Math.floor(cx), Math.floor(cy))) return true;
  if (keep && !keep(cx, cy)) return true;
  return world.floorHeightAt(cx, cy) > feet + STEP_UP;
}

/**
 * Un tick del andar de un animal hacia (`dirX`, `dirY`), a su velocidad.
 *
 * Decision del autor (2026-10-03): **choca con las cajas de sus partes**, que
 * giran con su rumbo (`body.ts`). Por eso:
 * - **gira hacia su destino** a `ANIMAL_TURN_RATE`, y un paso de giro que
 *   metiera una parte en el terreno no se da: si al girar su cabeza entrara en
 *   una pared, no gira;
 * - **avanza a lo largo de su rumbo**, eje a eje como el jugador, cuando ese
 *   rumbo esta a menos de `ANIMAL_WALK_CONE` de su destino;
 * - **un cuerpo que cabe no puede dejar de caber**: un paso que lo meteria
 *   en el terreno no se da. Uno que no cabe —nacio asi, o crecio algo a su
 *   lado— anda sin que sus partes le estorben, solo con sus pies, hasta que
 *   vuelve a caber: asi nunca se queda clavado. **Deduccion mia.**
 */
export function walkAnimal(
  world: World,
  store: EntityStore,
  id: number,
  dirX: number,
  dirY: number,
  speed: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): void {
  groundRound(world, store.x[id], store.y[id], () => walkAnimalStep(world, store, id, dirX, dirY, speed, dt, keep));
}

function walkAnimalStep(
  world: World,
  store: EntityStore,
  id: number,
  dirX: number,
  dirY: number,
  speed: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): void {
  const animal = store.animal[id];
  store.vx[id] = 0;
  store.vy[id] = 0;
  if (!animal || Math.hypot(dirX, dirY) <= 1e-6 || speed <= 0) return;
  const feet = store.z[id];
  const clashes = (x: number, y: number, fx: number, fy: number) =>
    bodyClashes(world, bodyBoxes(animal.species, animal.stage, x, y, feet, fx, fy), x, y);
  let x = store.x[id];
  let y = store.y[id];
  let fx = store.facingX[id];
  let fy = store.facingY[id];
  let here = clashes(x, y, fx, fy);

  // El giro, hasta lo que da un tick.
  const have = Math.atan2(fy, fx);
  let left = turnBetween(have, Math.atan2(dirY, dirX));
  const turn = Math.max(-ANIMAL_TURN_RATE * dt, Math.min(ANIMAL_TURN_RATE * dt, left));
  if (turn !== 0) {
    const nfx = Math.cos(have + turn);
    const nfy = Math.sin(have + turn);
    const there = clashes(x, y, nfx, nfy);
    if (here > 0 || there === 0) {
      fx = nfx;
      fy = nfy;
      here = there;
      left -= turn;
      store.facingX[id] = fx;
      store.facingY[id] = fy;
    }
  }
  if (Math.abs(left) > ANIMAL_WALK_CONE) return;

  // El avance, a lo largo de su rumbo y eje a eje.
  const stepX = fx * speed * dt;
  const stepY = fy * speed * dt;
  if (!feetBlocked(world, x + stepX, y, feet, keep)) {
    const there = here > 0 ? here : clashes(x + stepX, y, fx, fy);
    if (here > 0 || there === 0) x += stepX;
  }
  if (!feetBlocked(world, x, y + stepY, feet, keep)) {
    if (here > 0 || clashes(x, y + stepY, fx, fy) === 0) y += stepY;
  }
  store.vx[id] = (x - store.x[id]) / dt;
  store.vy[id] = (y - store.y[id]) / dt;
  store.x[id] = x;
  store.y[id] = y;
}
