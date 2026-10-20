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
 * **Todo cuerpo es una caja** alineada con los ejes, que no gira y choca por
 * todas sus caras siempre (el autor, 2026-10-14): el jugador, la suya; un
 * animal, la de su especie, de base cuadrada y alta hasta el lomo
 * (`bodyOf`). Asi un animal gira en cualquier sitio, y siempre tiene apoyo.
 * Choca con el terreno, el agua y los objetos; **con otros cuerpos no**: se
 * pueden meter uno en otro, y los aparta `pushBodies` (`push.ts`).
 *
 * Antes de esto el jugador cambiaba de nivel sin mas, teletransportandose de un
 * tile bajo a uno alto y al reves, porque la colision solo miraba `isSolidAt` y
 * el relieve solo se veia.
 */

import type { EntityStore } from '../entities.js';
import type { World } from '../world.js';
import { BODY_RADIUS, bodyOf, ceilingOver, groundRound, squareFloor } from '../boxes.js';
import { ANIMAL_JUMP_MARGIN, applyVertical, jumpSpeedFor, STEP_UP, takeOff } from './jump.js';

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
 * True si una caja de medio lado `half` centrada en (cx, cy) solapa una casilla
 * cuyo terreno corta el paso: el agua. Los objetos no estan aqui: estorban por
 * su caja, que entra en el suelo que se pisa (`squareFloor`).
 */
export function collides(world: World, cx: number, cy: number, half = BODY_RADIUS): boolean {
  const minX = Math.floor(cx - half);
  const maxX = Math.floor(cx + half);
  const minY = Math.floor(cy - half);
  const maxY = Math.floor(cy + half);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (world.isTerrainSolidAt(tx, ty)) return true;
    }
  }
  return false;
}

/**
 * True si NO se puede poner la caja del cuerpo `id` en (cx, cy) teniendo los
 * pies a `feet`.
 *
 * La altura se mide con la **caja entera** (el autor, 2026-10-10: «todas las
 * cajas chocan con el terreno en todo momento»): lo mas alto que toca la
 * huella, terreno o caja, no puede pasar de los pies mas `margin`. Y donde
 * quedarian los pies, el cuerpo entero tiene que caber debajo de lo que haya
 * encima (`ceilingOver`): desde los voxeles (el autor, 2026-10-20) hay terreno
 * en el aire, y un escalon con techo encima no se sube. Y `keep` dice donde
 * puede estar: a un animal, solo en su bioma.
 */
function blocked(
  world: World,
  store: EntityStore,
  id: number,
  cx: number,
  cy: number,
  feet: number,
  margin: number,
  keep?: (x: number, y: number) => boolean,
  half = bodyOf(store, id).half,
): boolean {
  if (collides(world, cx, cy, half)) return true;
  if (keep && !keep(cx, cy)) return true;
  // El terreno bajo la huella y, encima, el techo de cada caja que toca la
  // huella: un tronco, una roca o una mesa estorban de lado como una pared, y
  // lo que no pasa del salto se sube saltando (decisiones del autor,
  // 2026-09-30 y 2026-10-05).
  const floor = squareFloor(world, cx, cy, half, feet + margin);
  if (floor > feet + margin) return true;
  const z = Math.max(feet, floor);
  return ceilingOver(world, cx, cy, half, z) < z + bodyOf(store, id).height - 1e-9;
}

/**
 * Un paso de movimiento horizontal, eje a eje. Un eje que no se puede andar
 * pierde su velocidad: contra una pared no se acumula impulso que salga
 * disparado al rodearla.
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
  const nextX = store.x[id] + stepX;
  if (stepX !== 0 && !blocked(world, store, id, nextX, store.y[id], feet, margin, keep)) store.x[id] = nextX;
  else store.vx[id] = 0;

  const nextY = store.y[id] + stepY;
  if (stepY !== 0 && !blocked(world, store, id, store.x[id], nextY, feet, margin, keep)) store.y[id] = nextY;
  else store.vy[id] = 0;
}

/**
 * Desplaza el cuerpo (`dx`, `dy`) eje a eje con el mismo choque que andar
 * —medio bloque de subida de pie, ninguno en el aire—, **sin tocar su
 * velocidad**: es lo que mueve un empuje (`systems/push.ts`), que no es andar.
 * Lo que no cabe en un eje se pierde en ese eje.
 */
export function nudge(
  world: World,
  store: EntityStore,
  id: number,
  dx: number,
  dy: number,
  keep?: (x: number, y: number) => boolean,
): void {
  const feet = store.z[id];
  const margin = store.grounded[id] ? STEP_UP : 0;
  if (dx !== 0 && !blocked(world, store, id, store.x[id] + dx, store.y[id], feet, margin, keep)) store.x[id] += dx;
  if (dy !== 0 && !blocked(world, store, id, store.x[id], store.y[id] + dy, feet, margin, keep)) store.y[id] += dy;
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
 * Lo unico que cambia es que va **sin margen de subida**, que es lo que
 * convierte la cara de un bloque en una pared contra la que estamparse, suba o
 * baje: la caja choca por todas sus caras siempre (el autor, 2026-10-14; del
 * 2026-10-13 al 14, cayendo solo chocaba la base).
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
  if (store.vx[id] === 0 && store.vy[id] === 0) return;
  slide(world, store, id, store.vx[id] * dt, store.vy[id] * dt, margin);
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
 * Lo que anda un animal por su rodeo antes de volver a apuntar a su punto de
 * paso. **Deduccion mia.**
 */
export const ANIMAL_DETOUR = 1;

/**
 * Lo mas alto que salta un animal: un bloque, todas las especies (el autor,
 * 2026-10-05, y el 2026-10-14: «en la mayoría de animales, el máximo seria lo
 * justo para subir 1m»; los maximos de alguna especie, mas adelante).
 */
export const ANIMAL_JUMP_UP = 1;

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
 * Choca con **su caja**, de base cuadrada y alineada con los ejes (el autor,
 * 2026-10-14; `bodyOf`), con la misma regla que el jugador. Por eso:
 * - **gira hacia su destino** a `ANIMAL_TURN_RATE`, siempre: la caja no gira,
 *   asi que girar nunca choca (hasta el 2026-10-14 sus partes giraban, y a
 *   veces no cabia el giro);
 * - **avanza a lo largo de su rumbo**, eje a eje como el jugador, cuando ese
 *   rumbo esta a menos de `ANIMAL_WALK_CONE` de su destino, y sube andando,
 *   tick a tick, lo que no pasa de `STEP_UP`;
 * - si delante, por su rumbo, hay un escalon de mas de `STEP_UP` y no mas de
 *   `ANIMAL_JUMP_UP`, **salta**, con la fuerza justa (`tryJump`);
 * - si no avanza, **lo bordea**: `ANIMAL_DETOUR` por el rumbo libre mas
 *   cercano al de su destino, y vuelta a apuntarle. Un rodeo que no se puede
 *   ni empezar es un callejon sin salida: espera quieto al siguiente punto de
 *   paso.
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
  // La inercia (el autor, 2026-10-10): el avance arranca desde lo que llevaba
  // y llega a su paso en `INERTIA_TIME`.
  const before = Math.hypot(store.vx[id], store.vy[id]);
  store.vx[id] = 0;
  store.vy[id] = 0;
  if (!store.animal[id] || Math.hypot(dirX, dirY) <= 1e-6 || speed <= 0) return;
  // Sin salida: espera a su siguiente punto de paso (`stepFauna` lo olvida).
  if (store.detourLeft[id] < 0) return;
  const accel = (speed / INERTIA_TIME) * dt;
  const detouring = store.detourLeft[id] > 0;
  const goal = detouring ? Math.atan2(store.detourY[id], store.detourX[id]) : Math.atan2(dirY, dirX);

  // El giro, hasta lo que da un tick: siempre cabe.
  const have = Math.atan2(store.facingY[id], store.facingX[id]);
  const left = turnBetween(have, goal);
  const turn = Math.max(-ANIMAL_TURN_RATE * dt, Math.min(ANIMAL_TURN_RATE * dt, left));
  const fx = Math.cos(have + turn);
  const fy = Math.sin(have + turn);
  store.facingX[id] = fx;
  store.facingY[id] = fy;
  // Girando sin avanzar: lo que llevaba se frena deslizandose por su rumbo.
  if (Math.abs(left - turn) > ANIMAL_WALK_CONE) {
    glide(world, store, id, Math.max(0, before - accel), dt, keep);
    return;
  }

  // El avance, a lo largo de su rumbo y eje a eje, a lo que da la inercia.
  const pace = Math.min(speed, before + accel);
  if (tryJump(world, store, id, pace, dt, keep)) return;
  const feet = store.z[id];
  let x = store.x[id];
  let y = store.y[id];
  const stepX = fx * pace * dt;
  const stepY = fy * pace * dt;
  // Si su caja ya esta metida en algo —un arbol que crecio dentro—, anda
  // mirando solo el punto de sus pies, hasta que vuelve a caber: asi nunca se
  // queda clavado. **Deduccion mia**, la misma que tenian sus partes.
  const half = blocked(world, store, id, x, y, feet, STEP_UP, keep) ? 0 : undefined;
  if (!blocked(world, store, id, x + stepX, y, feet, STEP_UP, keep, half)) x += stepX;
  if (!blocked(world, store, id, x, y + stepY, feet, STEP_UP, keep, half)) y += stepY;
  const moved = Math.hypot(x - store.x[id], y - store.y[id]);
  if (moved < STALL * pace * dt) {
    stuck(world, store, id, dirX, dirY, speed, dt, keep, detouring);
    return;
  }
  if (detouring) store.detourLeft[id] = Math.max(0, store.detourLeft[id] - moved);
  moveTo(store, id, x, y, dt);
}

/**
 * Avanza `pace` por segundo a lo largo de su rumbo, eje a eje, sin meter la
 * caja en nada: lo que se desliza un animal que frena.
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
  let x = store.x[id];
  let y = store.y[id];
  const stepX = store.facingX[id] * pace * dt;
  const stepY = store.facingY[id] * pace * dt;
  if (!blocked(world, store, id, x + stepX, y, feet, STEP_UP, keep)) x += stepX;
  if (!blocked(world, store, id, x, y + stepY, feet, STEP_UP, keep)) y += stepY;
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
  if (!store.animal[id]) return;
  groundRound(world, store.x[id], store.y[id], () =>
    glide(world, store, id, Math.max(0, before - (speed / INERTIA_TIME) * dt), dt, keep),
  );
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
      return;
    }
  }
  store.detourLeft[id] = -1;
}

/** Si hay un ensayo en marcha, y si en el se atasco. */
let rehearsing = false;
let rehearsalFailed = false;

/** Lo que un ensayo cambia de un animal, para deshacerlo. */
const SAVED = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'grounded', 'facingX', 'facingY', 'detourX', 'detourY', 'detourLeft'] as const;

/**
 * **Ensaya un rodeo** por (`ax`, `ay`) con las mismas funciones que lo van a
 * mover, tick a tick como `stepFauna` —girar, andar, saltar—, y lo deshace:
 * sale si anda sus `ANIMAL_DETOUR` sin atascarse en el tiempo que tardaria en
 * dar media vuelta y andarlo. Como todo es determinista, el rodeo de verdad es
 * el ensayado.
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
  const kept = SAVED.map((k) => store[k][id]);
  store.detourX[id] = ax;
  store.detourY[id] = ay;
  store.detourLeft[id] = ANIMAL_DETOUR;
  rehearsing = true;
  rehearsalFailed = false;
  const ticks = Math.ceil((Math.PI / ANIMAL_TURN_RATE + ANIMAL_DETOUR / speed + INERTIA_TIME) / dt) + 1;
  try {
    for (let t = 0; t < ticks && !rehearsalFailed && store.detourLeft[id] > 0; t++) {
      if (store.grounded[id]) walkAnimalStep(world, store, id, ax, ay, speed, dt, keep);
      else airStep(world, store, id, speed, dt, keep);
      applyVertical(world, store, id, dt);
    }
    return !rehearsalFailed && store.detourLeft[id] === 0;
  } finally {
    rehearsing = false;
    SAVED.forEach((k, i) => (store[k][id] = kept[i]));
  }
}

/**
 * **Salta antes de rozar** (el autor, 2026-10-14): si al dar este paso por su
 * rumbo su caja entraria en un escalon de mas de `STEP_UP` y no mas de
 * `ANIMAL_JUMP_UP`, salta ya, aunque pudiera deslizarse de lado a lo largo de
 * el (era el arrastrar la cabeza contra la pared que vio el autor).
 *
 * - **La fuerza es la justa**: el apice, `ANIMAL_JUMP_MARGIN` por encima del
 *   escalon (`jumpSpeedFor`). En el aire anda a su paso, con su inercia.
 * - **Se ensaya entero** con las mismas funciones que lo van a mover
 *   —`takeOff`, `airStep` y `applyVertical`, en el orden de `stepFauna`— y se
 *   deshace: salta si aterriza arriba. Si no, sigue andando, y lo que no se
 *   salta lo bordea.
 */
function tryJump(
  world: World,
  store: EntityStore,
  id: number,
  pace: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): boolean {
  if (!store.grounded[id]) return false;
  const body = bodyOf(store, id);
  const z = store.z[id];
  const d = Math.max(pace * dt, 1e-3);
  const px = store.x[id] + store.facingX[id] * d;
  const py = store.y[id] + store.facingY[id] * d;
  if (collides(world, px, py, body.half) || (keep && !keep(px, py))) return false;
  const rise = squareFloor(world, px, py, body.half, z + ANIMAL_JUMP_UP + body.height) - z;
  if (rise <= STEP_UP + 1e-6 || rise > ANIMAL_JUMP_UP + 1e-6) return false;
  const speed = jumpSpeedFor(rise + ANIMAL_JUMP_MARGIN);
  const launch = () => {
    store.vx[id] = store.facingX[id] * pace;
    store.vy[id] = store.facingY[id] * pace;
    takeOff(store, id, speed);
  };

  const kept = SAVED.map((k) => store[k][id]);
  launch();
  applyVertical(world, store, id, dt);
  for (let t = 0; t < 120 && !store.grounded[id]; t++) {
    airStep(world, store, id, pace, dt, keep);
    applyVertical(world, store, id, dt);
  }
  const lands = store.grounded[id] === 1 && store.z[id] - z >= rise - 1e-6;
  SAVED.forEach((k, i) => (store[k][id] = kept[i]));
  if (!lands) return false;
  launch();
  return true;
}

/**
 * Un tick de un animal en el aire: no gira, y **anda** por su rumbo, como el
 * jugador (el autor, 2026-10-10: «usando las mismas físicas que el jugador»):
 * a su paso `speed`, con la inercia de `INERTIA_TIME` desde lo que llevaba. Su
 * caja choca por todas sus caras, sin margen de subida: se estampa contra la
 * cara de lo que no alcanzo, y cae. La altura la pone despues `applyVertical`.
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
  steer(store, id, store.facingX[id] * speed, store.facingY[id] * speed, Math.max(speed, 1e-9) / INERTIA_TIME, dt);
  slide(world, store, id, store.vx[id] * dt, store.vy[id] * dt, 0, keep);
}
