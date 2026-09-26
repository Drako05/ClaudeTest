/**
 * Cuanto tronco desnudo lleva cada arbol adulto, en bloques.
 *
 * Encargo del autor: **solo el tronco de un arbol adulto mide de 2 a 5 bloques,
 * asignado por una distribucion normal**, para que el jugador —1,93 bloques—
 * pueda ver por debajo del follaje. «Tronco» se lee como el tramo DESNUDO, del
 * suelo al borde bajo de la copa, que es lo que decide si se ve por debajo; la
 * copa conserva su tamano y sube encima.
 *
 * Son deduccion mia, y estan en `docs/pendiente.md` para que el autor las
 * corrija: la media 3,5 y la desviacion 0,75 —asi 2 y 5 caen justo a ±2σ—, que
 * la normal se TRUNCA en vez de recortarse, y el paso de un cuarto de bloque.
 *
 * **Truncada, no recortada.** Recortar a [2, 5] amontonaria un 2,3 % de los
 * arboles exactamente en cada tope, y un bosque con una fila de arboles clavados
 * a la misma altura se nota. Una muestra que se sale se vuelve a sortear con
 * otra sal, que es lo que da la normal truncada de verdad.
 *
 * **Es de la casilla**, como el giro del aspa: sale de `hash2DFloat` y no de
 * `Math.random`, asi que un arbol no cambia de altura cuando su chunk se
 * descarta y se regenera (regla 3). Y es ARTE: `packages/sim` no se entera.
 */

import { hash2DFloat } from '@verdant/sim';

export const TRUNK_MIN = 2;
export const TRUNK_MAX = 5;
export const TRUNK_MEAN = 3.5;
export const TRUNK_SD = 0.75;
/**
 * Resolucion a la que se redibuja el arte: un cuarto de bloque son unos 3 px de
 * arte, asi que la normal se sigue viendo continua con 13 alturas distintas.
 */
export const TRUNK_STEP = 0.25;
export const TRUNK_BUCKETS = Math.round((TRUNK_MAX - TRUNK_MIN) / TRUNK_STEP) + 1;

/** Sal propia, para que la altura no se correlacione con el giro del aspa. */
const SALT = 0x7b1a5e3d;
/**
 * Intentos antes de rendirse y recortar. Cada uno se sale con probabilidad
 * 0,0455, asi que llegar al ultimo es del orden de 1 entre 10^10.
 */
const TRIES = 8;

/** Una muestra de la normal truncada para esa casilla, en bloques. */
export function trunkBlocks(seed: number, x: number, y: number): number {
  let value = TRUNK_MEAN;
  for (let k = 0; k < TRIES; k++) {
    const salt = (seed ^ SALT) + k * 0x9e3779b1;
    // Box-Muller. `1 - u` lleva el primero a (0, 1], donde el logaritmo existe.
    const u1 = 1 - hash2DFloat(salt, x, y);
    const u2 = hash2DFloat(salt + 0x51ed27, x, y);
    value = TRUNK_MEAN + TRUNK_SD * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    if (value >= TRUNK_MIN && value <= TRUNK_MAX) return value;
  }
  return Math.min(TRUNK_MAX, Math.max(TRUNK_MIN, value));
}

/** El escalon de arte que le toca a esa altura: 0 es `TRUNK_MIN`. */
export function trunkBucket(blocks: number): number {
  const index = Math.round((blocks - TRUNK_MIN) / TRUNK_STEP);
  return Math.min(TRUNK_BUCKETS - 1, Math.max(0, index));
}

/** La altura, en bloques, que dibuja ese escalon. */
export function bucketBlocks(bucket: number): number {
  return TRUNK_MIN + bucket * TRUNK_STEP;
}
