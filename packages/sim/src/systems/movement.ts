/**
 * Movimiento y colision contra la rejilla de tiles.
 *
 * Se resuelve eje por eje (primero X, luego Y). Es lo que permite deslizarse a
 * lo largo de una pared en vez de quedarse clavado al chocar en diagonal.
 *
 * **La altura estorba, y estorba con una sola regla**: no se entra donde el
 * suelo esta por encima de los pies. De ahi salen las tres cosas a la vez, sin
 * casos especiales — un escalon de medio bloque se sube andando, una pared de
 * uno no se sube porque pasa del margen, y en el aire uno se estampa
 * contra la cara de un bloque porque a esa altura su suelo sigue estando encima.
 * Lo unico que cambia entre andar y volar es **cuanto** margen hay: andando,
 * `STEP_UP`; volando, ninguno.
 *
 * Antes de esto el jugador cambiaba de nivel sin mas, teletransportandose de un
 * tile bajo a uno alto y al reves, porque la colision solo miraba `isSolidAt` y
 * el relieve solo se veia.
 */

import { EntityKind, type EntityStore } from '../entities.js';
import type { World } from '../world.js';
import { bodyBoxes, bodyClashes, groundRound } from '../body.js';
import { BODY_RADIUS, partsRest, PLAYER_HEIGHT, squareFloor } from '../boxes.js';
import { applyVertical, STEP_UP, takeOff } from './jump.js';

/** Medio ancho del cuerpo del jugador, en tiles: su huella. Vive en `boxes.ts`. */
export { BODY_RADIUS };
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
 * No obliga a recalibrar nada de lo que ya habia, y esta comprobado: el paso por
 * tick a la carrera (`RUN_SPEED · TICK_DT ≈ 0.139`) sigue siendo mucho menor
 * que `BODY_RADIUS`, asi que no se atraviesan paredes.
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

/**
 * True si la huella centrada en (cx, cy) solapa una casilla cuyo terreno corta
 * el paso: el agua. Los objetos no estan aqui: estorban por su caja, que entra
 * en el suelo que se pisa (`squareFloor`).
 */
export function collides(world: World, cx: number, cy: number): boolean {
  const minX = Math.floor(cx - BODY_RADIUS);
  const maxX = Math.floor(cx + BODY_RADIUS);
  const minY = Math.floor(cy - BODY_RADIUS);
  const maxY = Math.floor(cy + BODY_RADIUS);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (world.isTerrainSolidAt(tx, ty)) return true;
    }
  }
  return false;
}

/**
 * True si NO se puede poner el cuerpo en (cx, cy) teniendo los pies a `feet`.
 *
 * La altura se mide con la **huella entera** (el autor, 2026-10-10: «todas las
 * cajas chocan con el terreno en todo momento»): lo mas alto que toca la
 * huella, terreno o caja, no puede pasar de los pies mas `margin`. Hasta
 * entonces el terreno se media en el centro, para no subirse de lado a una
 * pared al arrimarse; con la huella eso no pasa, porque arrimarse es tocar la
 * cara, no solaparla. Las cajas que empiezan por encima de la cabeza no
 * estorban: son techo.
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
  // El terreno bajo la huella y, encima, el techo de cada caja que toca la
  // huella: un tronco, una roca o una mesa estorban de lado como una pared, y
  // lo que no pasa del salto se sube saltando (decisiones del autor,
  // 2026-09-30 y 2026-10-05).
  return squareFloor(world, cx, cy, BODY_RADIUS, feet + PLAYER_HEIGHT) > feet + margin;
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

  // Un eje que no se puede andar pierde su velocidad: contra una pared no se
  // acumula impulso que salga disparado al rodearla.
  const nextX = store.x[id] + stepX;
  if (stepX !== 0 && !blocked(world, nextX, curY, feet, margin, keep)) store.x[id] = nextX;
  else store.vx[id] = 0;

  const nextY = curY + stepY;
  if (stepY !== 0 && !blocked(world, store.x[id], nextY, feet, margin, keep)) store.y[id] = nextY;
  else store.vy[id] = 0;
}

/**
 * Movimiento en el suelo.
 *
 * `vx`/`vy` son la velocidad que se lleva, **con inercia** (`steer`): la
 * posicion avanza con ella, y quien dibuja o mide la lee de ahi.
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
 * mando a la velocidad de andar o de correr; sin mando se frena, con la misma
 * inercia que en el suelo (`INERTIA_TIME`). Hasta entonces se conservaba el
 * impulso del despegue y solo se admitia un 30 % de desviacion.
 *
 * Lo que cambia es el choque, segun vaya (el autor, 2026-10-13):
 * - **subiendo**, choca por todas sus caras, **sin margen de subida**: la cara
 *   de un bloque es una pared contra la que estamparse; por debajo de su
 *   altura no se entra, y por encima si;
 * - **bajando**, solo choca la base, que es donde aterriza (`landingFloor`):
 *   las caras no lo detienen, y si se mete en algo, lo saca la repulsion
 *   (`repel`).
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
  walk(world, store, id, moveX, moveY, dt, running, store.vz[id] > 0 ? 0 : Infinity);
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
  const speed = speedOf(running);
  let targetX = 0;
  let targetY = 0;
  if (len > 1e-6) {
    // La direccion se normaliza, y con eso la diagonal deja de ser mas rapida
    // que la ortogonal. La magnitud NO se mira: el vector es direccion y ya esta.
    const dirX = moveX / len;
    const dirY = moveY / len;
    store.facingX[id] = dirX;
    store.facingY[id] = dirY;
    targetX = dirX * speed;
    targetY = dirY * speed;
  }

  steer(store, id, targetX, targetY, speed / INERTIA_TIME, dt);
  // Mientras se repele, lo que empuja hacia dentro se pierde, como contra una
  // pared: gana la repulsion (el autor, 2026-10-13).
  if (store.repelling[id] === 1) {
    const [vx, vy] = outward(store, id, store.vx[id], store.vy[id]);
    store.vx[id] = vx;
    store.vy[id] = vy;
  }
  if (store.vx[id] !== 0 || store.vy[id] !== 0) slide(world, store, id, store.vx[id] * dt, store.vy[id] * dt, margin);
  repel(world, store, id, dt, margin === Infinity);
}

/**
 * La velocidad de la repulsion, en bloques por segundo (el autor, 2026-10-13:
 * «rapida pero no instantanea, se debe lograr ver el efecto»; eligio 4 m/s):
 * medio bloque en 0,125 s.
 */
export const REPEL_SPEED = 4;

/**
 * Los rumbos que se prueban para salir: el autor quiere **cualquiera del plano
 * horizontal**, y nunca arriba ni abajo (2026-10-13). 32, uno cada 11,25°, es
 * **deduccion mia**.
 */
const REPEL_DIRS = 32;

/** Hasta donde se busca la salida, y de cuanto en cuanto. **Deduccion mia.** */
const REPEL_REACH = 1;
const REPEL_PROBE = 0.02;

/** (`vx`, `vy`) sin lo que va contra el rumbo de la repulsion en curso. */
function outward(store: EntityStore, id: number, vx: number, vy: number): [number, number] {
  const rx = store.repelX[id];
  const ry = store.repelY[id];
  const into = vx * rx + vy * ry;
  return into < 0 ? [vx - into * rx, vy - into * ry] : [vx, vy];
}

/** Si el cuerpo, puesto en (`x`, `y`) a su altura, esta metido en algo por alguna caja. */
function insideAt(world: World, store: EntityStore, id: number, x: number, y: number): boolean {
  const z = store.z[id];
  if (store.kind[id] === EntityKind.Player) return squareFloor(world, x, y, BODY_RADIUS, z + PLAYER_HEIGHT) > z + 1e-6;
  return clashesAt(world, store, id, x, y, z, store.facingX[id], store.facingY[id], 0, 0) > 0;
}

/** Si el cuerpo puede estar en (`x`, `y`): no en el agua, y un animal, en su bioma. */
function standable(
  world: World,
  store: EntityStore,
  id: number,
  x: number,
  y: number,
  keep?: (x: number, y: number) => boolean,
): boolean {
  if (keep && !keep(x, y)) return false;
  return store.kind[id] === EntityKind.Player ? !collides(world, x, y) : !world.isTerrainSolidAt(Math.floor(x), Math.floor(y));
}

/**
 * **La repulsion** (el autor, 2026-10-13): cayendo solo choca la base, y si
 * otra caja se mete en algo no lo detiene, pero el cuerpo entero se repele
 * —en el plano horizontal, por el rumbo que antes lo saca— hasta que todas sus
 * cajas esten fuera, a `REPEL_SPEED`.
 *
 * Empieza cayendo (`falling`) y sigue, ya de pie, hasta salir. El rumbo se
 * elige al empezar y no cambia: de los `REPEL_DIRS`, el que saca el cuerpo con
 * menos recorrido, probando desde el contrario a su avance y alternando a un
 * lado y a otro (**deduccion mia**: determinista). No vale uno que lo deje en
 * el agua o, a un animal, fuera de su bioma. Si no hay salida a `REPEL_REACH`,
 * no se repele hasta que deje de estar metido.
 */
export function repel(
  world: World,
  store: EntityStore,
  id: number,
  dt: number,
  falling: boolean,
  keep?: (x: number, y: number) => boolean,
): void {
  const state = store.repelling[id];
  if (state === 0 && !falling) return;
  const x = store.x[id];
  const y = store.y[id];
  if (!insideAt(world, store, id, x, y)) {
    store.repelling[id] = 0;
    return;
  }
  if (state === 2) return;
  if (state === 0) {
    const moving = Math.hypot(store.vx[id], store.vy[id]) > 1e-9;
    const start = moving
      ? Math.atan2(-store.vy[id], -store.vx[id])
      : Math.atan2(-store.facingY[id], -store.facingX[id]);
    let found = false;
    for (let d = REPEL_PROBE; d <= REPEL_REACH + 1e-9 && !found; d += REPEL_PROBE) {
      // En el primer anillo en que sale por algun rumbo, el de menos recorrido
      // exacto: la rejilla del anillo no distingue uno recto de uno torcido.
      let best = Infinity;
      for (let k = 0; k < REPEL_DIRS; k++) {
        // 0, +1, -1, +2, -2...: a un lado y a otro del contrario al avance.
        const turn = (k % 2 === 1 ? 1 : -1) * Math.ceil(k / 2);
        const a = start + (turn * 2 * Math.PI) / REPEL_DIRS;
        const ax = Math.cos(a);
        const ay = Math.sin(a);
        if (!standable(world, store, id, x + ax * d, y + ay * d, keep) || insideAt(world, store, id, x + ax * d, y + ay * d)) continue;
        let lo = d - REPEL_PROBE;
        let hi = d;
        for (let i = 0; i < 10; i++) {
          const mid = (lo + hi) / 2;
          if (insideAt(world, store, id, x + ax * mid, y + ay * mid)) lo = mid;
          else hi = mid;
        }
        if (hi < best - 1e-6) {
          best = hi;
          store.repelX[id] = ax;
          store.repelY[id] = ay;
          found = true;
        }
      }
    }
    if (!found) {
      store.repelling[id] = 2;
      return;
    }
    store.repelling[id] = 1;
  }
  const rx = store.repelX[id];
  const ry = store.repelY[id];
  const step = REPEL_SPEED * dt;
  if (!standable(world, store, id, x + rx * step, y + ry * step, keep)) {
    store.repelling[id] = 2;
    return;
  }
  if (insideAt(world, store, id, x + rx * step, y + ry * step)) {
    store.x[id] = x + rx * step;
    store.y[id] = y + ry * step;
    return;
  }
  // Sale en este tick: justo hasta donde deja de estar metido, no mas.
  let lo = 0;
  let hi = step;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (insideAt(world, store, id, x + rx * mid, y + ry * mid)) lo = mid;
    else hi = mid;
  }
  store.x[id] = x + rx * hi;
  store.y[id] = y + ry * hi;
  store.repelling[id] = 0;
}

/**
 * Lo que se tarda en arrancar o en pararse: **0,1 s** (el autor, 2026-10-10:
 * «no se parara el instante, sino que tendrá ese pequeño instante de
 * desplazamiento en la dirección que llevaba»; eligio arranque y frenada en
 * 0,1 s). Andando, al soltar se resbalan unos 0,22 m a 60 Hz; corriendo, 0,35
 * (en tiempo continuo serian 0,26 y 0,42); y dar media vuelta tarda el doble,
 * 0,2 s. Igual en el suelo y en el aire.
 */
export const INERTIA_TIME = 0.1;

/**
 * La inercia: la velocidad (`vx`, `vy`) va hacia la que se quiere
 * (`targetX`, `targetY`) cambiando como mucho `accel · dt` por tick, en linea
 * recta entre las dos. Con `accel` = velocidad del paso / `INERTIA_TIME`,
 * arrancar y parar duran 0,1 s a ritmo constante. **Deduccion mia**: el ritmo
 * es el del paso que se lleva puesto, asi que soltar a la vez la direccion y la
 * carrera frena desde correr al ritmo de andar, en 0,16 s.
 */
export function steer(store: EntityStore, id: number, targetX: number, targetY: number, accel: number, dt: number): void {
  const dx = targetX - store.vx[id];
  const dy = targetY - store.vy[id];
  const gap = Math.hypot(dx, dy);
  const reach = accel * dt;
  // Con una holgura de redondeo: 0,1 s son 6 ticks justos, no 7.
  if (gap <= reach + 1e-9) {
    store.vx[id] = targetX;
    store.vy[id] = targetY;
    return;
  }
  store.vx[id] += (dx / gap) * reach;
  store.vy[id] += (dy / gap) * reach;
}

/** Cuanto gira un animal, en radianes por segundo: media vuelta por segundo. **Deduccion mia.** */
export const ANIMAL_TURN_RATE = Math.PI;

/**
 * Lo que puede desviarse el rumbo de un animal de su destino para avanzar: mas
 * alla, gira sin moverse, porque los animales no andan de lado. **Deduccion
 * mia.**
 */
export const ANIMAL_WALK_CONE = Math.PI / 4;

/**
 * Lo que retrocede un animal, como mucho, para que le quepa un giro: el autor
 * eligio «retrocede y gira» (2026-10-05); el bloque es **deduccion mia**.
 */
export const ANIMAL_BACKUP = 1;

/**
 * Lo que anda un animal por su rodeo antes de volver a apuntar a su punto de
 * paso. **Deduccion mia.**
 */
export const ANIMAL_DETOUR = 1;

/** El desnivel que salta un animal, cualquier especie: un bloque (el autor, 2026-10-05). */
export const ANIMAL_JUMP_UP = 1;

/**
 * Hasta donde se busca el impulso minimo de un salto, a que saltos y con que
 * precision, en bloques por segundo. **Deduccion mia**: el bisonte adulto, el
 * de hocico mas largo, necesita unos 3 ante un escalon de 1 m.
 */
export const IMPULSE_MAX = 6;
const IMPULSE_PROBE = 0.5;
const IMPULSE_STEP = 0.05;

/**
 * Los rumbos de un rodeo, desde el de su destino: de mas cerca a mas lejos, y
 * el izquierdo antes que el derecho (**deduccion mia**: determinista, sin azar).
 */
const DETOUR_TURNS = [1, -1, 2, -2, 3, -3, 4].map((k) => (k * Math.PI) / 4);

/** Por debajo de esta fraccion de su paso, el avance no progresa: algo estorba. */
const STALL = 0.3;

/** El angulo de `a` a `b`, por el camino corto, en (-π, π]. */
function turnBetween(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * Si los pies de un animal pueden ir a (cx, cy): su casilla no es agua, el
 * punto lo admite `keep` —no sale de los tiles de su bioma— y el terreno no
 * sube mas de `margin`: `STEP_UP` andando y 0 en el aire. Lo demas —las cajas
 * de los objetos incluidas— lo miran sus partes (`body.ts`), patas incluidas.
 */
function feetBlocked(
  world: World,
  cx: number,
  cy: number,
  feet: number,
  keep?: (x: number, y: number) => boolean,
  margin = STEP_UP,
): boolean {
  if (world.isTerrainSolidAt(Math.floor(cx), Math.floor(cy))) return true;
  if (keep && !keep(cx, cy)) return true;
  return world.groundHeightAt(cx, cy) > feet + margin;
}

/**
 * Cuantas veces se mete en el terreno el cuerpo del animal `id` puesto asi. Por
 * defecto, como anda (el autor, 2026-10-13): la base sube `STEP_UP` de golpe y
 * las demas cajas chocan por todas sus caras, sin margen. Subiendo en el aire,
 * todas sin margen (0, 0).
 */
function clashesAt(
  world: World,
  store: EntityStore,
  id: number,
  x: number,
  y: number,
  z: number,
  fx: number,
  fy: number,
  margin = 0,
  baseMargin = STEP_UP,
): number {
  const animal = store.animal[id]!;
  return bodyClashes(world, bodyBoxes(animal.species, animal.stage, x, y, z, fx, fy), z, margin, baseMargin);
}

/** Lleva al animal a (`x`, `y`) y deja puesta la velocidad que eso supone. */
function moveTo(store: EntityStore, id: number, x: number, y: number, dt: number): void {
  store.vx[id] = (x - store.x[id]) / dt;
  store.vy[id] = (y - store.y[id]) / dt;
  store.x[id] = x;
  store.y[id] = y;
}

/**
 * Un tick del andar de un animal hacia (`dirX`, `dirY`), a su velocidad. Solo
 * en el suelo: en el aire, `airborneAnimal`.
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
 *
 * Y para que lo que estorba no lo deje clavado (el autor, 2026-10-05):
 * - si el giro no cabe, **retrocede** a lo largo de su rumbo hasta que quepa,
 *   `ANIMAL_BACKUP` como mucho;
 * - si el paso siguiente meteria una caja en un escalon de hasta
 *   `ANIMAL_JUMP_UP` que no se sube andando, **salta antes de tocarlo**, con
 *   el impulso minimo para que sus patas delanteras lleguen arriba (el autor,
 *   2026-10-13; `tryJump`);
 * - si no, **lo bordea**: `ANIMAL_DETOUR` por el rumbo libre mas cercano al de
 *   su destino, y vuelta a apuntarle. Un rodeo que no se puede ni empezar es un
 *   callejon sin salida: espera quieto al siguiente punto de paso.
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

/** Un tick de andar y, si estaba saliendo de algo, la repulsion. */
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
  walkAnimalMove(world, store, id, dirX, dirY, speed, dt, keep);
  if (store.animal[id]) repel(world, store, id, dt, false, keep);
}

function walkAnimalMove(
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
  // La inercia (el autor, 2026-10-10): el avance arranca desde lo que llevaba
  // y llega a su paso en `INERTIA_TIME`.
  const before = Math.hypot(store.vx[id], store.vy[id]);
  store.vx[id] = 0;
  store.vy[id] = 0;
  // En el suelo, el impulso del salto ya no cuenta.
  store.impulse[id] = 0;
  if (!animal || Math.hypot(dirX, dirY) <= 1e-6 || speed <= 0) return;
  const accel = (speed / INERTIA_TIME) * dt;
  // Sin salida: espera a su siguiente punto de paso (`stepFauna` lo olvida).
  if (store.detourLeft[id] < 0) return;
  const feet = store.z[id];
  const clashes = (x: number, y: number, fx: number, fy: number) => clashesAt(world, store, id, x, y, feet, fx, fy);
  const detouring = store.detourLeft[id] > 0;
  const goal = detouring ? Math.atan2(store.detourY[id], store.detourX[id]) : Math.atan2(dirY, dirX);
  let x = store.x[id];
  let y = store.y[id];
  let fx = store.facingX[id];
  let fy = store.facingY[id];
  let here = clashes(x, y, fx, fy);

  // El giro, hasta lo que da un tick.
  const have = Math.atan2(fy, fx);
  let left = turnBetween(have, goal);
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
    } else {
      // No cabe el giro: un paso atras, a lo largo de su rumbo, y a probar.
      const back = speed * dt;
      const bx = x - fx * back;
      const by = y - fy * back;
      if (
        store.backedUp[id] + back <= ANIMAL_BACKUP + 1e-9 &&
        !feetBlocked(world, bx, by, feet, keep) &&
        clashes(bx, by, fx, fy) === 0
      ) {
        store.backedUp[id] += back;
        moveTo(store, id, bx, by, dt);
        return;
      }
      stuck(world, store, id, dirX, dirY, speed, dt, keep, detouring);
      return;
    }
  }
  // Girando sin avanzar: lo que llevaba se frena deslizandose por su rumbo.
  if (Math.abs(left) > ANIMAL_WALK_CONE) {
    glide(world, store, id, Math.max(0, before - accel), dt, keep);
    return;
  }

  // El avance, a lo largo de su rumbo y eje a eje, a lo que da la inercia; si
  // esta saliendo de algo, sin lo que empuja hacia dentro.
  const pace = Math.min(speed, before + accel);
  const [stepX, stepY] = store.repelling[id] === 1 ? outward(store, id, fx * pace * dt, fy * pace * dt) : [fx * pace * dt, fy * pace * dt];
  if (!feetBlocked(world, x + stepX, y, feet, keep)) {
    const there = here > 0 ? here : clashes(x + stepX, y, fx, fy);
    if (here > 0 || there === 0) x += stepX;
  }
  if (!feetBlocked(world, x, y + stepY, feet, keep)) {
    if (here > 0 || clashes(x, y + stepY, fx, fy) === 0) y += stepY;
  }
  const moved = Math.hypot(x - store.x[id], y - store.y[id]);
  if (moved < STALL * pace * dt) {
    // El paso lo meteria en algo que no se sube andando, y no se da: si es un
    // escalon que se salta, salta ya, sin haber tocado (el autor, 2026-10-13).
    // Sale con lo que llevaba andando, y en el aire sigue andando. Si puede
    // deslizarse a lo largo de lo que estorba, se desliza: no salta.
    if (here === 0) {
      store.vx[id] = fx * before;
      store.vy[id] = fy * before;
      if (tryJump(world, store, id, store.x[id] + stepX, store.y[id] + stepY, speed, dt, keep)) return;
      store.vx[id] = 0;
      store.vy[id] = 0;
    }
    stuck(world, store, id, dirX, dirY, speed, dt, keep, detouring);
    return;
  }
  store.backedUp[id] = 0;
  if (detouring) store.detourLeft[id] = Math.max(0, store.detourLeft[id] - moved);
  // Si con este paso se cae por un borde, en el aire sigue andando con lo que
  // llevaba (`airStep`).
  moveTo(store, id, x, y, dt);
}

/**
 * Avanza `pace` por segundo a lo largo de su rumbo, eje a eje, sin meter el
 * cuerpo en el terreno: lo que se desliza un animal que frena.
 */
function glide(
  world: World,
  store: EntityStore,
  id: number,
  pace: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): void {
  if (pace <= 0) return;
  const feet = store.z[id];
  const fx = store.facingX[id];
  const fy = store.facingY[id];
  let x = store.x[id];
  let y = store.y[id];
  const here = clashesAt(world, store, id, x, y, feet, fx, fy);
  const [stepX, stepY] = store.repelling[id] === 1 ? outward(store, id, fx * pace * dt, fy * pace * dt) : [fx * pace * dt, fy * pace * dt];
  if (!feetBlocked(world, x + stepX, y, feet, keep) && (here > 0 || clashesAt(world, store, id, x + stepX, y, feet, fx, fy) === 0)) {
    x += stepX;
  }
  if (!feetBlocked(world, x, y + stepY, feet, keep) && (here > 0 || clashesAt(world, store, id, x, y + stepY, feet, fx, fy) === 0)) {
    y += stepY;
  }
  moveTo(store, id, x, y, dt);
}

/**
 * Un animal que ha llegado a su punto de paso **no se para en seco**: frena
 * deslizandose por su rumbo en `INERTIA_TIME` (el autor, 2026-10-10), al ritmo
 * de su paso `speed`.
 */
export function brakeAnimal(
  world: World,
  store: EntityStore,
  id: number,
  speed: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): void {
  const before = Math.hypot(store.vx[id], store.vy[id]);
  store.vx[id] = 0;
  store.vy[id] = 0;
  store.impulse[id] = 0;
  if (!store.animal[id]) return;
  groundRound(world, store.x[id], store.y[id], () => {
    glide(world, store, id, Math.max(0, before - (speed / INERTIA_TIME) * dt), dt, keep);
    repel(world, store, id, dt, false, keep);
  });
}

/**
 * Algo estorba y no se salta: empieza un rodeo, por el primer rumbo de
 * `DETOUR_TURNS` cuyo ensayo (`rehearseDetour`) lo deja andado entero. Si
 * estaba en un rodeo que no llego a empezar, o ninguno sale, se rinde hasta su
 * siguiente punto de paso. Dentro de un ensayo, atascarse es que el ensayo
 * falla.
 */
function stuck(
  world: World,
  store: EntityStore,
  id: number,
  dirX: number,
  dirY: number,
  speed: number,
  dt: number,
  keep: ((x: number, y: number) => boolean) | undefined,
  detouring: boolean,
): void {
  if (rehearsing) {
    rehearsalFailed = true;
    return;
  }
  if (detouring && store.detourLeft[id] >= ANIMAL_DETOUR) {
    store.detourLeft[id] = -1;
    return;
  }
  const toward = Math.atan2(dirY, dirX);
  for (const offset of DETOUR_TURNS) {
    const ax = Math.cos(toward + offset);
    const ay = Math.sin(toward + offset);
    if (rehearseDetour(world, store, id, ax, ay, speed, dt, keep)) {
      store.detourX[id] = ax;
      store.detourY[id] = ay;
      store.detourLeft[id] = ANIMAL_DETOUR;
      store.backedUp[id] = 0;
      return;
    }
  }
  store.detourLeft[id] = -1;
}

/** Si hay un ensayo en marcha, y si en el se atasco. */
let rehearsing = false;
let rehearsalFailed = false;

/** Lo que un ensayo cambia de un animal, para deshacerlo. */
const SAVED = [
  'x', 'y', 'z', 'vx', 'vy', 'vz', 'grounded', 'facingX', 'facingY', 'detourX', 'detourY', 'detourLeft', 'backedUp', 'impulse',
  'repelling', 'repelX', 'repelY',
] as const;
const saved = new Float64Array(SAVED.length);

/**
 * **Ensaya un rodeo** por (`ax`, `ay`) con las mismas funciones que lo van a
 * mover, tick a tick como `stepFauna` —girar, retroceder, andar, saltar—, y lo
 * deshace: sale si anda sus `ANIMAL_DETOUR` sin atascarse en el tiempo que
 * tardaria en dar media vuelta, retroceder y andarlo. Como todo es
 * determinista, el rodeo de verdad es el ensayado.
 */
function rehearseDetour(
  world: World,
  store: EntityStore,
  id: number,
  ax: number,
  ay: number,
  speed: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): boolean {
  for (let i = 0; i < SAVED.length; i++) saved[i] = store[SAVED[i]][id];
  store.detourX[id] = ax;
  store.detourY[id] = ay;
  store.detourLeft[id] = ANIMAL_DETOUR;
  store.backedUp[id] = 0;
  rehearsing = true;
  rehearsalFailed = false;
  const ticks = Math.ceil((Math.PI / ANIMAL_TURN_RATE + (ANIMAL_BACKUP + ANIMAL_DETOUR) / speed + INERTIA_TIME) / dt) + 1;
  try {
    for (let t = 0; t < ticks && !rehearsalFailed && store.detourLeft[id] > 0; t++) {
      if (store.grounded[id]) walkAnimalStep(world, store, id, ax, ay, speed, dt, keep);
      else airStep(world, store, id, speed, dt, keep);
      applyVertical(world, store, id, dt);
    }
    return !rehearsalFailed && store.detourLeft[id] === 0;
  } finally {
    rehearsing = false;
    for (let i = 0; i < SAVED.length; i++) store[SAVED[i]][id] = saved[i];
  }
}

/**
 * **Salta antes de tocar** (el autor, 2026-10-13): el paso a (`nx`, `ny`)
 * meteria una caja en algo que no se sube andando —la cabeza, el hocico o el
 * cuello en cualquier escalon; las patas en uno de mas de medio bloque—. Si eso
 * es un escalon de hasta `ANIMAL_JUMP_UP`, salta ya.
 *
 * - **El escalon** es lo mas alto bajo las cajas que chocarian, desde sus pies.
 * - **El impulso**: el salto solo empuja hacia arriba, y en el aire anda a su
 *   paso; como eso no basta para que lleguen las patas cuando lo que sobresale
 *   es la cabeza, lleva ademas un impulso horizontal por su rumbo, **el minimo**
 *   para que sus patas delanteras lleguen arriba. Constante todo el vuelo,
 *   sumado a lo que anda, y aunque estuviera parado: solo, no basta.
 * - **Ensaya cada salto entero** con las mismas funciones que lo van a mover
 *   —`takeOff`, `airStep` y `applyVertical`, en el orden de `stepFauna`— y lo
 *   deshace. El minimo se busca biseccionando entre 0 e `IMPULSE_MAX`, a
 *   `IMPULSE_STEP` (**deduccion mia**). Si ni con el maximo llega, no salta, y
 *   lo bordea. Como todo es determinista, el salto de verdad es el ensayado.
 */
function tryJump(
  world: World,
  store: EntityStore,
  id: number,
  nx: number,
  ny: number,
  speed: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): boolean {
  if (!store.grounded[id]) return false;
  const animal = store.animal[id]!;
  const z = store.z[id];
  // Lo que pisarian las cajas que chocan, en lo alto de lo que tocan.
  let rise = -Infinity;
  for (const b of bodyBoxes(animal.species, animal.stage, nx, ny, z, store.facingX[id], store.facingY[id])) {
    const rest = partsRest(world, [b], z);
    if (rest <= z + (b.base ? STEP_UP : 0) + 1e-6) continue;
    rise = Math.max(rise, rest + (b.cz - b.hh - z) - z);
  }
  if (!(rise > 1e-6) || rise > ANIMAL_JUMP_UP + 1e-6) return false;
  // De menos a mas, a saltos de `IMPULSE_PROBE`, hasta el primero que llega; y
  // de ahi, afinado. No vale empezar por el maximo y biseccionar: llegar no
  // crece con el impulso. En una escalera, el que se pasa aterriza con la
  // cabeza en el escalon siguiente, y no cabe.
  let found = -1;
  for (let probe = 0; probe <= IMPULSE_MAX + 1e-9; probe += IMPULSE_PROBE) {
    if (rehearseJump(world, store, id, speed, probe, rise, dt, keep)) {
      found = probe;
      break;
    }
  }
  if (found < 0) return false;
  let lo = found - IMPULSE_PROBE;
  let hi = found;
  while (found > 0 && hi - lo > IMPULSE_STEP) {
    const mid = (lo + hi) / 2;
    if (rehearseJump(world, store, id, speed, mid, rise, dt, keep)) hi = mid;
    else lo = mid;
  }
  store.impulse[id] = hi;
  takeOff(store, id);
  return true;
}

/**
 * Ensaya un salto con ese `impulse` y lo deshace: sale si aterriza a `rise`
 * por encima, o mas, de pie y con el cuerpo cabiendo.
 */
function rehearseJump(
  world: World,
  store: EntityStore,
  id: number,
  speed: number,
  impulse: number,
  rise: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): boolean {
  // Lo suyo, aparte: un ensayo de salto puede ir dentro del de un rodeo.
  const kept = SAVED.map((k) => store[k][id]);
  const z = store.z[id];
  store.impulse[id] = impulse;
  takeOff(store, id);
  applyVertical(world, store, id, dt);
  for (let t = 0; t < 120 && !store.grounded[id]; t++) {
    airStep(world, store, id, speed, dt, keep);
    applyVertical(world, store, id, dt);
  }
  const lands =
    store.grounded[id] === 1 &&
    store.repelling[id] === 0 &&
    store.z[id] - z >= rise - 1e-6 &&
    clashesAt(world, store, id, store.x[id], store.y[id], store.z[id], store.facingX[id], store.facingY[id]) === 0;
  SAVED.forEach((k, i) => (store[k][id] = kept[i]));
  return lands;
}

/**
 * Un tick de un animal en el aire: no gira, y **anda**, como el jugador (el
 * autor, 2026-10-10: «usando las mismas físicas que el jugador»): su paso
 * `speed` por su rumbo, con la inercia de `INERTIA_TIME` desde lo que llevaba
 * —`vx`, `vy` son lo que anda—, mas el impulso de su salto (`impulse`), que no
 * cambia en todo el vuelo (el autor, 2026-10-13). La altura la pone despues
 * `applyVertical`. El choque, como el del jugador (el autor, 2026-10-13):
 * - **subiendo**, todas sus cajas por todas sus caras y sin margen: se estampa
 *   contra la cara de lo que no alcanzo;
 * - **bajando**, solo su base, que es donde aterriza (`landingFloor`); si otra
 *   caja —o una pata de lado— se mete en algo, no lo detiene: lo saca la
 *   repulsion (`repel`).
 */
export function airborneAnimal(
  world: World,
  store: EntityStore,
  id: number,
  speed: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): void {
  groundRound(world, store.x[id], store.y[id], () => airStep(world, store, id, speed, dt, keep));
}

function airStep(
  world: World,
  store: EntityStore,
  id: number,
  speed: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): void {
  if (!store.animal[id]) {
    store.vx[id] = 0;
    store.vy[id] = 0;
    return;
  }
  const z = store.z[id];
  const fx = store.facingX[id];
  const fy = store.facingY[id];
  const rising = store.vz[id] > 0;
  steer(store, id, fx * speed, fy * speed, speed / INERTIA_TIME, dt);
  const push = store.impulse[id];
  let x = store.x[id];
  let y = store.y[id];
  const [stepX, stepY] = store.repelling[id] === 1
    ? outward(store, id, (store.vx[id] + fx * push) * dt, (store.vy[id] + fy * push) * dt)
    : [(store.vx[id] + fx * push) * dt, (store.vy[id] + fy * push) * dt];
  // Un eje que no avanza pierde lo que anda, como el jugador contra una pared;
  // el impulso no, que es de todo el vuelo (**deduccion mia**: si no, la
  // cabeza pegada a la cara al despegar se lo comeria).
  let movedX: boolean;
  let movedY: boolean;
  if (rising) {
    const here = clashesAt(world, store, id, x, y, z, fx, fy, 0, 0);
    movedX = !feetBlocked(world, x + stepX, y, z, keep, 0) &&
      (here > 0 || clashesAt(world, store, id, x + stepX, y, z, fx, fy, 0, 0) === 0);
    if (movedX) x += stepX;
    movedY = !feetBlocked(world, x, y + stepY, z, keep, 0) &&
      (here > 0 || clashesAt(world, store, id, x, y + stepY, z, fx, fy, 0, 0) === 0);
    if (movedY) y += stepY;
  } else {
    // Bajando, las caras no detienen: solo el agua y el borde de su bioma.
    movedX = !feetBlocked(world, x + stepX, y, z, keep, Infinity);
    if (movedX) x += stepX;
    movedY = !feetBlocked(world, x, y + stepY, z, keep, Infinity);
    if (movedY) y += stepY;
  }
  if (!movedX) store.vx[id] = 0;
  if (!movedY) store.vy[id] = 0;
  store.x[id] = x;
  store.y[id] = y;
  repel(world, store, id, dt, !rising, keep);
}
