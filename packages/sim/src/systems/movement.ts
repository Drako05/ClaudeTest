/**
 * Movimiento y colision contra la rejilla de tiles.
 *
 * Se resuelve eje por eje (primero X, luego Y). Es lo que permite deslizarse a
 * lo largo de una pared en vez de quedarse clavado al chocar en diagonal.
 */

import type { EntityStore } from '../entities.js';
import type { World } from '../world.js';

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

export function moveEntity(
  world: World,
  store: EntityStore,
  id: number,
  moveX: number,
  moveY: number,
  dt: number,
): void {
  // Normalizar para que la diagonal no sea mas rapida que la ortogonal.
  const len = Math.hypot(moveX, moveY);
  if (len > 1e-6) {
    moveX /= len;
    moveY /= len;
    store.facingX[id] = moveX;
    store.facingY[id] = moveY;
  } else {
    return;
  }

  const step = WALK_SPEED * dt;
  const curX = store.x[id];
  const curY = store.y[id];

  const nextX = curX + moveX * step;
  if (!collides(world, nextX, curY)) store.x[id] = nextX;

  const nextY = curY + moveY * step;
  if (!collides(world, store.x[id], nextY)) store.y[id] = nextY;
}
