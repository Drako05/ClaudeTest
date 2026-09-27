/**
 * Cuanto tronco desnudo lleva cada arbol adulto, en bloques.
 *
 * Primero fue un encargo comun a todos —de 2 a 5 bloques segun una normal, para
 * que el jugador (1,93) pudiera ver por debajo del follaje— y despues el autor
 * lo quiso **por especie**: un palo largo bajo la picea negra, tan estrecha, se
 * veia raro. Cada especie trae su media y su desviacion (`tree-shapes.ts`) y de
 * lo comun queda **una sola regla, suya: nunca menos de 2 bloques**.
 *
 * «Tronco» se lee como el tramo DESNUDO, del suelo al borde bajo de la copa,
 * que es lo que decide si se ve por debajo.
 *
 * **Truncada, no recortada.** Cada especie se corta en `[max(2, μ−2σ), μ+2σ]`.
 * Recortar amontonaria arboles exactamente en cada tope, y un bosque con una
 * fila de arboles clavados a la misma altura se nota. Una muestra que se sale se
 * vuelve a sortear con otra sal, que es lo que da la normal truncada de verdad.
 *
 * **Es de la casilla**, como el giro del aspa: sale de `hash2DFloat` y no de
 * `Math.random`, asi que un arbol no cambia de altura cuando su chunk se
 * descarta y se regenera (regla 3). Y es ARTE: `packages/sim` no se entera.
 */

import { hash2DFloat } from '@verdant/sim';

/** La regla del autor: ningun tronco desnudo mide menos de esto. */
export const TRUNK_MIN = 2;
/** Techo de la rejilla de arte; ninguna especie llega mas arriba. */
export const TRUNK_MAX = 5;
/**
 * Resolucion a la que se redibuja el arte: un cuarto de bloque son unos 3 px de
 * arte, asi que la normal se sigue viendo continua.
 */
export const TRUNK_STEP = 0.25;
export const TRUNK_BUCKETS = Math.round((TRUNK_MAX - TRUNK_MIN) / TRUNK_STEP) + 1;

/** La normal de tronco desnudo de una especie. */
export interface TrunkLaw {
  readonly bareMean: number;
  readonly bareSd: number;
}

/** Entre que alturas se corta la normal de esa especie. */
export function trunkRange(law: TrunkLaw): [number, number] {
  return [
    Math.max(TRUNK_MIN, law.bareMean - 2 * law.bareSd),
    Math.min(TRUNK_MAX, law.bareMean + 2 * law.bareSd),
  ];
}

/** Sal propia, para que la altura no se correlacione con el giro del aspa. */
const SALT = 0x7b1a5e3d;
/**
 * Intentos antes de rendirse y recortar. Donde mas se sale una muestra es en la
 * picea negra, que corta a una desviacion por debajo: un 18 % de las veces. Con
 * doce intentos, acabar recortando es de uno entre mil millones.
 */
const TRIES = 12;

/** Una muestra de la normal truncada de esa especie para esa casilla, en bloques. */
export function trunkBlocks(seed: number, x: number, y: number, law: TrunkLaw): number {
  const [lo, hi] = trunkRange(law);
  let value = law.bareMean;
  for (let k = 0; k < TRIES; k++) {
    const salt = (seed ^ SALT) + k * 0x9e3779b1;
    // Box-Muller. `1 - u` lleva el primero a (0, 1], donde el logaritmo existe.
    const u1 = 1 - hash2DFloat(salt, x, y);
    const u2 = hash2DFloat(salt + 0x51ed27, x, y);
    value = law.bareMean + law.bareSd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    if (value >= lo && value <= hi) return value;
  }
  return Math.min(hi, Math.max(lo, value));
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
