/**
 * El eje vertical: gravedad, salto y aterrizaje.
 *
 * Va aparte de `movement.ts` porque son dos preguntas distintas: aquel resuelve
 * **hacia donde** se puede ir, y esto **a que altura se esta**. Se tocan en un
 * solo sitio —no se entra donde el suelo esta por encima de los pies—, y esa
 * regla la aplica el horizontal leyendo la `z` que deja este.
 *
 * Nada de esto sabe que existe una camara: es `packages/sim` (regla 1), asi que
 * vale igual para el isometrico, para el 3D y para un servidor autoritativo.
 *
 * **El enunciado del autor, literal**, que es de donde salen los numeros:
 *
 * > «desde la casilla 1 a altura 1, saltando y moviendose al norte, se sube al
 * > bloque 2 en altura 2; pero al bloque 3 en altura 2 no se llega — se estampa
 * > contra su cara y aterriza en el bloque 2, altura 1»
 *
 * Es decir: una parabola simetrica con el **apice a una casilla exacta** y
 * **alcance dos**. `tests/jump.test.ts` lo tiene como tabla.
 */

import type { EntityStore } from '../entities.js';
import type { World } from '../world.js';
import { WALK_SPEED } from './movement.js';

/**
 * Gravedad, en niveles por segundo al cuadrado.
 *
 * **Deduccion del agente, no numero del autor**, y por tanto suya para
 * corregir. Sale de su caso: con `WALK_SPEED = 5.2` casillas/s, un alcance de 2
 * casillas es un vuelo de `T = 2 / 5.2 = 0.385 s`. Una parabola simetrica pone
 * el apice en `T/2`, o sea a una casilla exacta, que es justo donde quiere poder
 * subirse un bloque. Fijando el apice en 1.16 niveles —un pelo por encima del
 * bloque, para que subirse no sea al milimetro—:
 *
 *     g  = 8h / T²  = 8 · 1.16 / 0.385²  ≈ 62
 *     v0 = g · T/2  = 62 · 0.192         ≈ 12
 */
export const GRAVITY = 62;

/** Impulso vertical del salto, en niveles por segundo. Misma deduccion. */
export const JUMP_SPEED = 12;

/**
 * Cuanto puede desviarse en el aire, como fraccion de la velocidad de paso.
 *
 * Numero del autor: «en el aire, correccion parcial — se puede desviar, no dar
 * media vuelta». Se implementa como **tope de desviacion** respecto a la
 * velocidad del despegue, que es medible en un test y no una sensacion.
 */
export const AIR_CONTROL = 0.3;

/**
 * Desnivel que se sube andando. Por encima, hay que saltar.
 *
 * No es una altura de escalon elegida a ojo: es la holgura que separa un talud
 * de una pared. Subiendo un talud a paso completo el suelo asciende
 * `WALK_SPEED · TICK_DT ≈ 0.087` niveles por tick, y la pared mas baja del mundo
 * mide 1 entero. Cualquier valor entre esas dos cifras da el mismo mundo; medio
 * nivel esta comodamente lejos de las dos.
 */
export const STEP_UP = 0.5;

/**
 * Cuanto se pega a un suelo que baja antes de considerarlo una caida.
 *
 * Mismo argumento por el otro lado: bajando un talud el suelo se aleja de los
 * pies esos mismos 0.087 por tick, y sin holgura el personaje iria dando
 * saltitos ladera abajo, en el aire media vida. Un borde de verdad son 1 nivel
 * o mas y sigue tirandote.
 */
export const SNAP_DOWN = 0.5;

/**
 * Despegue. Conserva el impulso que se llevaba, que es lo que hace que a paso
 * completo se lleguen a 2 casillas y a paso lento, menos.
 */
export function takeOff(store: EntityStore, id: number): void {
  if (!store.grounded[id]) return;
  store.grounded[id] = 0;
  store.vz[id] = JUMP_SPEED;
  store.takeoffVx[id] = store.vx[id];
  store.takeoffVy[id] = store.vy[id];
}

/**
 * Integra el eje vertical y decide si se toca suelo.
 *
 * Se llama DESPUES del movimiento horizontal del tick: la altura del suelo que
 * importa es la del sitio al que se ha llegado, no la del que se salio.
 *
 * Las dos transiciones estan aqui juntas a proposito, porque son la misma
 * comparacion mirada desde los dos lados: en el aire se aterriza cuando los pies
 * alcanzan el suelo, y en el suelo se cae cuando el suelo se aleja de los pies.
 * **Caer es caer**: salir de un borde no es un estado distinto de saltar, es la
 * misma parabola con `vz = 0` y el impulso que se llevaba.
 */
export function applyVertical(world: World, store: EntityStore, id: number, dt: number): void {
  const ground = world.groundHeightAt(store.x[id], store.y[id]);

  if (store.grounded[id]) {
    if (store.z[id] <= ground + SNAP_DOWN) {
      // Andando por terreno continuo: los pies siguen al suelo, suba o baje.
      store.z[id] = ground;
      return;
    }
    // Se ha salido por un borde. Sin impulso vertical y con el horizontal
    // intacto, que es exactamente lo que pidio el autor.
    store.grounded[id] = 0;
    store.vz[id] = 0;
    store.takeoffVx[id] = store.vx[id];
    store.takeoffVy[id] = store.vy[id];
  }

  // Integracion por el promedio de las dos velocidades. Con aceleracion
  // constante NO es una aproximacion: da la parabola exacta,
  // `z += v0·dt − g·dt²/2`. Con el Euler de toda la vida —avanzar con la
  // velocidad ya frenada— el apice medido salia 1.06 en vez de los 1.16 de la
  // derivacion, y ese decimo de nivel es justo el margen que el autor pidio
  // para que subirse a un bloque no fuera al milimetro: 1.06 deja un pelo de un
  // pixel.
  const vz0 = store.vz[id];
  store.vz[id] = vz0 - GRAVITY * dt;
  store.z[id] += ((vz0 + store.vz[id]) / 2) * dt;

  // Solo se aterriza cayendo: subiendo se atraviesa el suelo de un saliente por
  // debajo sin quedarse pegado a el.
  if (store.vz[id] <= 0 && store.z[id] <= ground) {
    store.z[id] = ground;
    store.vz[id] = 0;
    store.grounded[id] = 1;
  }
}

/**
 * La velocidad horizontal permitida en el aire.
 *
 * El tope es de **desviacion**, no de velocidad: se parte de la del despegue y
 * se admite alejarse de ella hasta `AIR_CONTROL · WALK_SPEED`. Asi desviarse un
 * poco cuesta lo mismo hacia donde sea, y dar media vuelta es imposible.
 */
export function airVelocity(
  takeoffVx: number,
  takeoffVy: number,
  wantVx: number,
  wantVy: number,
): { x: number; y: number } {
  const dx = wantVx - takeoffVx;
  const dy = wantVy - takeoffVy;
  const drift = Math.hypot(dx, dy);
  const limit = AIR_CONTROL * WALK_SPEED;
  if (drift <= limit) return { x: wantVx, y: wantVy };
  const k = limit / drift;
  return { x: takeoffVx + dx * k, y: takeoffVy + dy * k };
}
