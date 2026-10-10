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

import { footing, headroom, PLAYER_HEIGHT } from '../boxes.js';
import { EntityKind, type EntityStore } from '../entities.js';
import type { World } from '../world.js';

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
 * Desnivel que se sube andando, inclusive. Por encima, hay que saltar.
 *
 * **Medio bloque** (decision del autor, 2026-10-06): todo lo que mida ≤ 0,5 se
 * sube andando —el voxel del terreno, una caja baja—, y es una caracteristica
 * de la fisica, no de cada cosa. La pared mas baja que pide saltar mide 1.
 *
 * Y **solo subir es de golpe** (el autor, 2026-10-10): «solo al subir escalones
 * ≤ 0.5 se permite teletransportar». Bajar, por poco que sea, es caer con la
 * gravedad: un escalon de medio bloque tarda 0,13 s, y mientras se cae no se
 * salta (sin margen, decision suya del mismo dia).
 */
export const STEP_UP = 0.5;

/**
 * Despegue. **Solo empuja hacia arriba** (decision del autor, 2026-09-30): lo
 * horizontal lo sigue poniendo el mando, en el aire como en el suelo
 * (`moveAirborne`). Hasta entonces conservaba el impulso del suelo y en el aire
 * solo admitia un 30 % de desviacion.
 *
 * Devuelve si ha despegado de verdad: en el aire no se salta, y un salto que no
 * ocurre no cuesta hambre.
 */
export function takeOff(store: EntityStore, id: number): boolean {
  if (!store.grounded[id]) return false;
  store.grounded[id] = 0;
  store.vz[id] = JUMP_SPEED;
  return true;
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
 * misma parabola con `vz = 0`. Y desde el 2026-10-10 bajar un escalon, por
 * pequeno que sea, tambien: solo se sube de golpe (`STEP_UP`).
 */
export function applyVertical(world: World, store: EntityStore, id: number, dt: number): void {
  // Lo que se pisa, con la huella entera: el terreno y las cajas que la tocan;
  // encima de una roca o de una mesa se esta de pie, y al bajarse o si se
  // desmonta, se cae. Una caja que asoma mas de lo que se sube andando no se
  // pisa (`footing`).
  const ground = footing(world, store, id, store.z[id] + STEP_UP);

  if (store.grounded[id]) {
    if (store.z[id] <= ground + 1e-9) {
      // El suelo sigue a la misma altura, o sube lo que se sube andando: los
      // pies lo siguen de golpe.
      store.z[id] = ground;
      return;
    }
    // Se ha salido por un borde: se cae sin impulso vertical, y lo horizontal
    // lo sigue poniendo el mando, como en un salto.
    store.grounded[id] = 0;
    store.vz[id] = 0;
  }

  // Integracion por el promedio de las dos velocidades. Con aceleracion
  // constante NO es una aproximacion: da la parabola exacta,
  // `z += v0·dt − g·dt²/2`. Con el Euler de toda la vida —avanzar con la
  // velocidad ya frenada— el apice medido salia 1.06 en vez de los 1.16 de la
  // derivacion, y ese decimo de nivel es justo el margen que el autor pidio
  // para que subirse a un bloque no fuera al milimetro: 1.06 deja un pelo de un
  // pixel.
  const vz0 = store.vz[id];
  const ceiling = vz0 > 0 ? headroom(world, store, id) : Infinity;
  store.vz[id] = vz0 - GRAVITY * dt;
  store.z[id] += ((vz0 + store.vz[id]) / 2) * dt;

  // La cabeza contra un techo corta la subida: se queda debajo y empieza a caer.
  const top = store.z[id] + (store.kind[id] === EntityKind.Player ? PLAYER_HEIGHT : 0);
  if (top > ceiling) {
    store.z[id] -= top - ceiling;
    store.vz[id] = Math.min(0, store.vz[id]);
  }

  // Solo se aterriza cayendo: subiendo se atraviesa el suelo de un saliente por
  // debajo sin quedarse pegado a el.
  if (store.vz[id] <= 0 && store.z[id] <= ground) {
    store.z[id] = ground;
    store.vz[id] = 0;
    store.grounded[id] = 1;
  }
}
