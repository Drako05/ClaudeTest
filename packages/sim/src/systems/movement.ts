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

import type { EntityStore } from '../entities.js';
import type { World } from '../world.js';
import { bodyBoxes, bodyClashes, groundRound } from '../body.js';
import { BODY_RADIUS, PLAYER_HEIGHT, squareFloor } from '../boxes.js';
import { applyVertical, GRAVITY, JUMP_SPEED, STEP_UP, takeOff } from './jump.js';

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
 * Lo unico que cambia es que va **sin margen de subida**, que es lo que
 * convierte la cara de un bloque en una pared contra la que estamparse: por
 * debajo de su altura no se entra, y por encima si.
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
 * Cuanto mira hacia delante un animal buscando el borde de lo que va a saltar:
 * mas que el hocico del bisonte adulto, que es lo que mas sobresale de sus pies.
 */
const JUMP_LOOK = 2.5;


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
 * Cuantas veces se mete en el terreno el cuerpo del animal `id` puesto asi, con
 * el margen de subida de golpe: `STEP_UP` andando, 0 en el aire.
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
  margin = STEP_UP,
): number {
  const animal = store.animal[id]!;
  return bodyClashes(world, bodyBoxes(animal.species, animal.stage, x, y, z, fx, fy), z, margin);
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
 * - si el avance no progresa y delante hay un escalon de hasta
 *   `ANIMAL_JUMP_UP`, **salta** (si el salto llega y el cuerpo cabe arriba);
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
  const animal = store.animal[id];
  // La inercia (el autor, 2026-10-10): el avance arranca desde lo que llevaba
  // y llega a su paso en `INERTIA_TIME`.
  const before = Math.hypot(store.vx[id], store.vy[id]);
  store.vx[id] = 0;
  store.vy[id] = 0;
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

  // El avance, a lo largo de su rumbo y eje a eje, a lo que da la inercia.
  const pace = Math.min(speed, before + accel);
  const stepX = fx * pace * dt;
  const stepY = fy * pace * dt;
  if (!feetBlocked(world, x + stepX, y, feet, keep)) {
    const there = here > 0 ? here : clashes(x + stepX, y, fx, fy);
    if (here > 0 || there === 0) x += stepX;
  }
  if (!feetBlocked(world, x, y + stepY, feet, keep)) {
    if (here > 0 || clashes(x, y + stepY, fx, fy) === 0) y += stepY;
  }
  const moved = Math.hypot(x - store.x[id], y - store.y[id]);
  if (moved < STALL * pace * dt) {
    if (!tryJump(world, store, id, speed, dt, keep)) stuck(world, store, id, dirX, dirY, speed, dt, keep, detouring);
    return;
  }
  store.backedUp[id] = 0;
  // Si con este paso se cae por un borde, cae avanzando a su paso.
  store.leap[id] = speed;
  if (detouring) store.detourLeft[id] = Math.max(0, store.detourLeft[id] - moved);
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
  const stepX = fx * pace * dt;
  const stepY = fy * pace * dt;
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
const SAVED = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'grounded', 'facingX', 'facingY', 'detourX', 'detourY', 'detourLeft', 'backedUp', 'leap'] as const;
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
      else airStep(world, store, id, dt, keep);
      applyVertical(world, store, id, dt);
    }
    return !rehearsalFailed && store.detourLeft[id] === 0;
  } finally {
    rehearsing = false;
    for (let i = 0; i < SAVED.length; i++) store[SAVED[i]][id] = saved[i];
  }
}

/**
 * Si delante hay un escalon que se salta, salta.
 *
 * - **El borde**: el primer punto, a lo largo de su rumbo, en que el suelo sube
 *   mas de `STEP_UP` bajo sus pies. Si antes hay algo solido o fuera de su
 *   bioma, o sube mas de `ANIMAL_JUMP_UP`, no se salta.
 * - **En el aire avanza a su paso**, como el jugador (el autor, 2026-10-10:
 *   «usando las mismas físicas que el jugador»): el salto solo empuja hacia
 *   arriba. Hasta entonces avanzaba lo justo para que sus pies pasaran el borde
 *   en lo alto del salto, mas deprisa que su paso si hacia falta; desde que
 *   todas sus cajas chocan, sus patas delanteras se apoyan arriba antes que el
 *   resto, y a su paso le basta. Si no llega, lo bordea.
 * - **Ensaya cada salto entero** con las mismas funciones que lo van a mover
 *   —`takeOff`, `airStep` y `applyVertical`, en el orden de `stepFauna`— y lo
 *   deshace: salta si aterriza arriba, mas alto de lo que se sube andando, y
 *   con el cuerpo cabiendo. Como todo es determinista, el salto de verdad es el
 *   ensayado.
 */
function tryJump(
  world: World,
  store: EntityStore,
  id: number,
  speed: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): boolean {
  if (!store.grounded[id]) return false;
  const x = store.x[id];
  const y = store.y[id];
  const z = store.z[id];
  const fx = store.facingX[id];
  const fy = store.facingY[id];
  let edge = -1;
  for (let d = 0.05; d <= JUMP_LOOK; d += 0.05) {
    const px = x + fx * d;
    const py = y + fy * d;
    if (world.isTerrainSolidAt(Math.floor(px), Math.floor(py)) || (keep && !keep(px, py))) return false;
    // El suelo en ese punto, con la caja que haya: una roca se salta.
    const rise = squareFloor(world, px, py, 0) - z;
    if (rise > ANIMAL_JUMP_UP + 1e-6) return false;
    if (rise > STEP_UP) {
      edge = d;
      break;
    }
  }
  if (edge < 0) return false;
  if (!rehearseJump(world, store, id, speed, dt, keep)) return false;
  takeOff(store, id);
  return true;
}

/**
 * Ensaya un salto avanzando a `leap` y lo deshace. Si aterriza arriba, deja
 * puesto ese `leap` para el salto de verdad.
 */
function rehearseJump(
  world: World,
  store: EntityStore,
  id: number,
  leap: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): boolean {
  const x = store.x[id];
  const y = store.y[id];
  const z = store.z[id];
  const before = store.leap[id];
  store.leap[id] = leap;
  takeOff(store, id);
  applyVertical(world, store, id, dt);
  for (let t = 0; t < 120 && !store.grounded[id]; t++) {
    airStep(world, store, id, dt, keep);
    applyVertical(world, store, id, dt);
  }
  const lands =
    store.grounded[id] === 1 &&
    store.z[id] - z > STEP_UP &&
    clashesAt(world, store, id, store.x[id], store.y[id], store.z[id], store.facingX[id], store.facingY[id]) === 0;
  store.x[id] = x;
  store.y[id] = y;
  store.z[id] = z;
  store.vz[id] = 0;
  store.grounded[id] = 1;
  store.vx[id] = 0;
  store.vy[id] = 0;
  store.leap[id] = lands ? leap : before;
  return lands;
}

/**
 * Un tick de un animal en el aire: no gira, y avanza a lo largo de su rumbo a
 * `leap`, la de su salto o la de su paso si se cayo andando. Sin margen de
 * subida, como el jugador en el aire: se estampa contra la cara de lo que no
 * alcanzo, y cae. La altura la pone despues `applyVertical`.
 */
export function airborneAnimal(
  world: World,
  store: EntityStore,
  id: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): void {
  groundRound(world, store.x[id], store.y[id], () => airStep(world, store, id, dt, keep));
}

function airStep(
  world: World,
  store: EntityStore,
  id: number,
  dt: number,
  keep?: (x: number, y: number) => boolean,
): void {
  store.vx[id] = 0;
  store.vy[id] = 0;
  if (!store.animal[id]) return;
  const z = store.z[id];
  const fx = store.facingX[id];
  const fy = store.facingY[id];
  let x = store.x[id];
  let y = store.y[id];
  const here = clashesAt(world, store, id, x, y, z, fx, fy, 0);
  const stepX = fx * store.leap[id] * dt;
  const stepY = fy * store.leap[id] * dt;
  if (!feetBlocked(world, x + stepX, y, z, keep, 0)) {
    if (here > 0 || clashesAt(world, store, id, x + stepX, y, z, fx, fy, 0) === 0) x += stepX;
  }
  if (!feetBlocked(world, x, y + stepY, z, keep, 0)) {
    if (here > 0 || clashesAt(world, store, id, x, y + stepY, z, fx, fy, 0) === 0) y += stepY;
  }
  moveTo(store, id, x, y, dt);
}
