/**
 * Hasta donde puede alejarse la camara sin atravesar nada.
 *
 * Desde que las tres vistas comparten la mirada (el pivote son los ojos del
 * jugador y la camara va detras, sobre la linea de la mirada), mirar hacia
 * arriba en tercera persona mete la camara por debajo de los ojos, y ahi hay
 * suelo, paredes y troncos. El autor pidio que **no atraviese bloques ni
 * objetos**: se lanza un rayo desde los ojos hacia donde iria la camara y se para
 * un poco antes del primer choque.
 *
 * Choca con lo mismo que el golpe (regla 12): el **terreno** que se dibuja y los
 * **hitboxes**. Las hojas no son hitbox —el del arbol es su tronco desnudo—, asi
 * que la camara pasa entre las copas y se para en los troncos.
 *
 * **Puro**: sin three.js ni DOM, con el mundo entrando como funciones, para
 * afirmarlo en Node. Coordenadas del nucleo: `z` es la altura.
 */

import { groundHit, rayBox, type Ground, type Hitbox, type Vec3 } from '@verdant/sim';

/** Cuanto se queda la camara antes de lo que la para. **Deduccion mia.** */
export const CAMERA_MARGIN = 0.3;
/** Lo mas cerca que llega a ponerse. */
export const CAMERA_MIN = 0.15;

/**
 * La distancia a la que puede ponerse la camara desde `pivot` en la direccion
 * unitaria `dir` (del pivote hacia la camara), como mucho `maxDist`.
 */
export function cameraClearance(
  pivot: Vec3,
  dir: Vec3,
  maxDist: number,
  ground: Ground,
  boxAt: (tx: number, ty: number) => Hitbox | null,
): number {
  const hit = rayHit(pivot, dir, maxDist, ground, boxAt);
  if (hit >= maxDist) return maxDist;
  return Math.max(CAMERA_MIN, hit - CAMERA_MARGIN);
}

/**
 * Donde choca primero un rayo desde `pivot` en la direccion unitaria `dir`
 * con el terreno o con un hitbox, sin margen: la distancia, o `maxDist` si no
 * choca antes. Lo usan la camara (con su margen) y el modo TAP, que busca el
 * punto del mundo que hay bajo el dedo.
 */
export function rayHit(
  pivot: Vec3,
  dir: Vec3,
  maxDist: number,
  ground: Ground,
  boxAt: (tx: number, ty: number) => Hitbox | null,
): number {
  let hit = groundHit(pivot, dir, maxDist, ground)?.t ?? maxDist;

  // Los hitboxes viven dentro de su casilla, asi que basta mirar las casillas
  // que cruza la proyeccion del rayo (Amanatides-Woo), y solo hasta el suelo.
  let tx = Math.floor(pivot.x);
  let ty = Math.floor(pivot.y);
  const stepX = Math.sign(dir.x);
  const stepY = Math.sign(dir.y);
  const next = (p: number, d: number, cell: number): number =>
    d > 0 ? (cell + 1 - p) / d : d < 0 ? (cell - p) / d : Infinity;
  let tMaxX = next(pivot.x, dir.x, tx);
  let tMaxY = next(pivot.y, dir.y, ty);
  const tDeltaX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
  const tDeltaY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
  let t = 0;
  while (t < hit) {
    const box = boxAt(tx, ty);
    if (box) {
      const at = rayBox(pivot, dir, box, hit);
      if (at !== null && at < hit) hit = at;
    }
    if (tMaxX < tMaxY) {
      t = tMaxX;
      tMaxX += tDeltaX;
      tx += stepX;
    } else {
      t = tMaxY;
      tMaxY += tDeltaY;
      ty += stepY;
    }
    if (!Number.isFinite(t)) break;
  }
  return Math.min(hit, maxDist);
}
