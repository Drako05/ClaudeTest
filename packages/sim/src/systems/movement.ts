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
import { airVelocity, STEP_UP } from './jump.js';

/** Medio ancho del cuerpo del jugador, en tiles. */
export const BODY_RADIUS = 0.34;
/** Velocidad en tiles por segundo. */
export const WALK_SPEED = 5.2;

/** True si el AABB centrado en (cx, cy) solapa algun tile solido. */
function collides(world: World, cx: number, cy: number): boolean {
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
function blocked(world: World, cx: number, cy: number, feet: number, margin: number): boolean {
  if (collides(world, cx, cy)) return true;
  return world.groundHeightAt(cx, cy) > feet + margin;
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
): void {
  const feet = store.z[id];
  const curY = store.y[id];

  const nextX = store.x[id] + stepX;
  if (!blocked(world, nextX, curY, feet, margin)) store.x[id] = nextX;

  const nextY = curY + stepY;
  if (!blocked(world, store.x[id], nextY, feet, margin)) store.y[id] = nextY;
}

/**
 * Movimiento en el suelo.
 *
 * Deja tambien `vx`/`vy` puestas aunque la posicion la escriba directamente:
 * son el impulso con el que se despega, y es lo que hace que a paso completo un
 * salto llegue a dos casillas y a paso lento, menos.
 */
export function moveEntity(
  world: World,
  store: EntityStore,
  id: number,
  moveX: number,
  moveY: number,
  dt: number,
): void {
  const len = Math.hypot(moveX, moveY);
  if (len <= 1e-6) {
    store.vx[id] = 0;
    store.vy[id] = 0;
    return;
  }

  // La direccion siempre se normaliza (asi la diagonal no es mas rapida que la
  // ortogonal), pero la MAGNITUD, acotada a 1, escala la velocidad. Es lo que
  // hace analogico un joystick: apenas desplazado, se camina despacio.
  // El teclado no nota el cambio: un eje da len = 1 y la diagonal da len = raiz
  // de 2, y ambos se acotan a 1.
  const dirX = moveX / len;
  const dirY = moveY / len;
  store.facingX[id] = dirX;
  store.facingY[id] = dirY;

  const speed = WALK_SPEED * Math.min(1, len);
  store.vx[id] = dirX * speed;
  store.vy[id] = dirY * speed;

  slide(world, store, id, dirX * speed * dt, dirY * speed * dt, STEP_UP);
}

/**
 * Movimiento en el aire.
 *
 * Ni acelera ni frena: la velocidad es la del despegue mas la desviacion que
 * permita `AIR_CONTROL`. Y **sin margen de subida**, que es lo que convierte la
 * cara de un bloque en una pared contra la que estamparse: por debajo de su
 * altura no se entra, y por encima si.
 */
export function moveAirborne(
  world: World,
  store: EntityStore,
  id: number,
  moveX: number,
  moveY: number,
  dt: number,
): void {
  const len = Math.hypot(moveX, moveY);

  // Sin mando no hay correccion, y por tanto se conserva el impulso tal cual.
  // Tratar «nada» como «querer velocidad cero» seria pedir una desviacion hacia
  // el reposo, y soltar el mando en pleno vuelo frenaria un 30 % el salto. El
  // autor dijo «impulso conservado»; la correccion es algo que se HACE.
  let v = { x: store.takeoffVx[id], y: store.takeoffVy[id] };
  if (len > 1e-6) {
    const speed = WALK_SPEED * Math.min(1, len);
    store.facingX[id] = moveX / len;
    store.facingY[id] = moveY / len;
    v = airVelocity(
      store.takeoffVx[id],
      store.takeoffVy[id],
      (moveX / len) * speed,
      (moveY / len) * speed,
    );
  }

  store.vx[id] = v.x;
  store.vy[id] = v.y;

  slide(world, store, id, v.x * dt, v.y * dt, 0);
}
