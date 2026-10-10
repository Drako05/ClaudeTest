/**
 * La camara con retraso (pedido del autor, 2026-10-10).
 *
 * > «el retraso igual en todas las vistas y direcciones, el centro de la
 * > pantalla sigue siendo el punto hacia donde mira y apunta el personaje sin
 * > importar la ubicacion del personaje.»
 *
 * Dos piezas, y las dos son de dibujo: la mirada que viaja en la `Intent` sigue
 * siendo la de la camara tal cual (regla 5), sin retraso ninguno.
 *
 * - **Donde esta la camara**: persigue los ojos del personaje con un retraso
 *   exponencial (`chase`). Es lo que suaviza el escalon: subir medio bloque es
 *   de golpe en el nucleo, y la camara lo sube en una curva.
 * - **Adonde mira**: al punto que mira el personaje (`aimPoint`), el primer
 *   choque del rayo que sale de sus ojos DE VERDAD por la mirada. Asi el centro
 *   de la pantalla es siempre donde apunta, aunque la camara vaya rezagada.
 *
 * **Puro**: sin three.js ni DOM, para afirmarlo en Node.
 */

/**
 * El retraso, en segundos: la constante de tiempo de la persecucion. Lo dio el
 * autor (0,1 s, ajustable: el panel de desarrollo lo mueve de 0 a 0,3).
 *
 * **Que sea exponencial es deduccion mia**: un retraso puro —la camara donde
 * estaban los ojos hace 0,1 s— daria el mismo salto del escalon, solo 0,1 s
 * despues. La exponencial lo convierte en una curva, y andando a ritmo
 * constante se queda ~0,1 s por detras: la distancia es la velocidad por el
 * retraso (con fotogramas de 1/60 s, la cuenta discreta da 0,092 s).
 */
export const CAMERA_LAG = 0.1;
/** Lo que mueve el deslizador del panel de desarrollo. */
export const CAMERA_LAG_MAX = 0.3;

/**
 * Mas lejos que esto, la camara no persigue: salta. Es para lo que no es
 * moverse —nacer, reaparecer al morir, abrir con `?x=&y=`—, donde una camara
 * cruzando el mapa en una curva no tiene sentido. **Deduccion mia**: cayendo
 * diez bloques se llega a ~35 casillas/s, que con 0,1 s de retraso son 3,5 de
 * distancia; 8 deja margen.
 */
export const CAMERA_SNAP = 8;

/**
 * Hasta donde se busca el punto de mira. Sin nada en ese tramo, el punto es
 * el final del rayo. **Deduccion mia**: el doble de la camara mas alejada
 * (31 casillas en perspectiva), para que mirando al cielo el desvio de una
 * camara rezagada sea un angulo despreciable.
 */
export const AIM_FAR = 64;
/**
 * Lo mas cerca que se pone el punto de mira. Pegado a una pared el rayo choca
 * a cero, y una camara en primera persona mirando a su propia posicion no
 * tiene direccion.
 */
export const AIM_NEAR = 0.05;

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Acerca `current` a `target` lo que toca en `dt` segundos con un retraso
 * `lag`, en su sitio. Con `lag` cero, o mas lejos que `CAMERA_SNAP`, salta.
 */
export function chase(current: Point3, target: Point3, lag: number, dt: number): void {
  const gap = Math.hypot(target.x - current.x, target.y - current.y, target.z - current.z);
  const k = lag <= 0 || gap > CAMERA_SNAP ? 1 : 1 - Math.exp(-Math.max(0, dt) / lag);
  current.x += (target.x - current.x) * k;
  current.y += (target.y - current.y) * k;
  current.z += (target.z - current.z) * k;
}

/**
 * El punto que mira el personaje: desde `eyes` por la direccion unitaria
 * `look`, a la distancia del primer choque (`hit`, que recibe el tope y
 * devuelve la distancia, o el tope si no choca nada).
 */
export function aimPoint(eyes: Point3, look: Point3, hit: (far: number) => number): Point3 {
  const t = Math.max(AIM_NEAR, Math.min(AIM_FAR, hit(AIM_FAR)));
  return { x: eyes.x + look.x * t, y: eyes.y + look.y * t, z: eyes.z + look.z * t };
}
