/**
 * Los objetos sueltos en el mundo: de donde salen, como caen y como se recogen
 * (el autor, 2026-10-18: «todo botin generado debe ser arrojado como items
 * flotantes en el suelo. tendran gravedad pero flotaran a 0.2m de la
 * superficie»). Los datos, en `drop-store.ts`.
 *
 * Del autor: caen con la gravedad y flotan a 0,2 de su suelo; el botin **salta
 * y se esparce** al salir, desde la mitad de la altura de lo que lo suelta y a
 * entre 0 y 0,5 de el; lo tirado **se lanza hacia la mirada** y no se deja
 * recoger unos 2 s; se recogen **solos, al acercarse** (un iman de 1 bloque) y
 * entra lo que quepa; un monton por tipo, y **dos iguales que se juntan se
 * funden**; y caducan a los **2 dias de juego** desde que se generaron, y al
 * fundirse cuenta el reloj del mas nuevo (el autor, 2026-10-19).
 *
 * Todo lo que no es eso es **deduccion mia** (`docs/juicio.md`), y cada numero
 * lo dice. El azar sale de la semilla y del tick (regla 2), nunca de
 * `Math.random`.
 */

import { DAY_TICKS, stackMax, TICK_DT, TICK_HZ, toolStats, type Resource } from '@verdant/shared';
import { EYE_HEIGHT } from '../aim.js';
import { PLAYER_HEIGHT, squareFloor } from '../boxes.js';
import { DROP_HALF, type Drop } from '../drop-store.js';
import type { EntityStore } from '../entities.js';
import type { Bundle, Inventory, Thrown } from '../inventory.js';
import { WATER_SURFACE } from '../relief.js';
import { hash2DFloat } from '../rng.js';
import type { World } from '../world.js';
import { GRAVITY } from './jump.js';

/** A cuanto de su suelo flota un monton posado, en bloques (el autor: 0,2 m). */
export const DROP_FLOAT = 0.2;
/** Hasta donde llega el iman, desde el cuerpo (el autor, 2026-10-18: 1 bloque). */
export const PICKUP_RADIUS = 1;
/** Lo deprisa que vuela hacia el jugador lo que se recoge, en bloques/s. **El autor lo dio por bueno jugando (2026-10-18).** */
export const HOMING_SPEED = 8;
/**
 * Y lo que acelera mientras vuela, en bloques/s² (el autor, 2026-10-20): a 8
 * fijos no alcanzaba a quien corre (8,32), y lo que se recoge tiene que llegar
 * siempre, tambien con lo que haga ir mas deprisa. Sin tope.
 */
export const HOMING_ACCEL = 30;
/** A cuanto se funden dos montones iguales posados. **Deduccion mia.** */
export const MERGE_RADIUS = 0.5;
/** El salto del botin al salir, hacia arriba, en bloques/s. **Deduccion mia.** */
export const SCATTER_UP = 3;
/** A cuanto de su origen cae el botin, como mucho: de 0 a 0,5 (el autor). */
export const SCATTER_REACH = 0.5;
/**
 * Lo que tarda el botin en dejarse recoger: el medio segundo en que se le ve
 * saltar, que si no el iman se lo llevaria antes de verlo. **El autor lo dio por bueno jugando (2026-10-18).**
 */
export const LOOT_DELAY_TICKS = Math.round(TICK_HZ / 2);
/** Lo tirado: su velocidad hacia la mirada y su empuje hacia arriba. Cae a unos 2 bloques. **El autor lo dio por bueno jugando (2026-10-18).** */
export const THROW_SPEED = 6;
export const THROW_UP = 3;
/** Lo tirado no se deja recoger durante unos 2 s (el autor). */
export const THROW_DELAY_TICKS = 2 * TICK_HZ;
/** Lo que dura un monton en el mundo: 2 dias de juego desde que se genero (el autor, 2026-10-19). */
export const DROP_LIFE_TICKS = 2 * DAY_TICKS;

/**
 * El suelo de un monton: el de su huella, terreno o caja solida (`squareFloor`,
 * como el de un cuerpo), y sobre el agua, su superficie: lo que cae al agua
 * flota en ella. **Deduccion mia.** Con `at`, la altura del monton: el terreno
 * que empieza por encima de el es techo, no suelo (bajo un voladizo).
 */
export function dropFloor(world: World, x: number, y: number, at = Infinity): number {
  const floor = squareFloor(world, x, y, DROP_HALF, at + 2 * DROP_HALF);
  return world.isTerrainSolidAt(x, y) ? Math.max(floor, WATER_SURFACE) : floor;
}

/** Lo que trae un objeto nuevo al soltarlo: una herramienta, todos sus usos. */
function freshWear(item: Resource): number {
  return toolStats(item)?.uses ?? 0;
}

/**
 * Los ticks que tarda en posarse algo que sale hacia arriba a `vz` desde
 * `drop` por encima de donde se posara, con la misma cuenta que `fall`.
 */
function flightTicks(vz: number, drop: number, dt: number): number {
  let z = drop;
  let n = 0;
  do {
    vz -= GRAVITY * dt;
    z += vz * dt;
    n++;
  } while (!(z <= 0 && vz <= 0) && n < 600);
  return n;
}

/**
 * Lo que suelta un botin: el centro de su caja, a la mitad de su altura, y la
 * media anchura de su base cuadrada.
 */
export interface LootSource {
  x: number;
  y: number;
  z: number;
  half: number;
}

/**
 * Suelta un botin expulsado de lo que lo suelta (el autor, 2026-10-18: «que
 * los elementos salgan expulsados de su generador con una fuerza que los lleve
 * entre 0 y 0.5m del origen»). Cada monton sale hacia su lado, a la mitad de
 * la altura y por fuera de la caja —su huella entera, sin tocarla—, y con su
 * salto cae a una distancia al azar de 0 a `SCATTER_REACH` de esa cara. El
 * origen es la cara y no el centro (*deduccion*): un tronco es solido, y el
 * que naciera dentro se posaria encima. Rumbo y distancia salen de la semilla,
 * del tick y de `salt`, y la velocidad se calcula para posarse justo ahi.
 */
export function scatterLoot(world: World, loot: readonly Bundle[], from: LootSource, tick: number, salt: number): void {
  loot.forEach((b, k) => {
    if (b.count <= 0) return;
    const turn = hash2DFloat(world.seed ^ 0x3c6ef372, tick * 16 + k, salt) * Math.PI * 2;
    const reach = hash2DFloat(world.seed ^ 0x1b873593, tick * 16 + k, salt) * SCATTER_REACH;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    // Por el rumbo, hasta que la huella del monton deja de pisar la caja.
    const out = (from.half + DROP_HALF) / Math.max(Math.abs(cos), Math.abs(sin));
    const x = from.x + cos * out;
    const y = from.y + sin * out;
    // Pegado a una pared mas alta, nace encima de ella.
    const z = Math.max(from.z, dropFloor(world, x, y, from.z));
    const tx = x + cos * reach;
    const ty = y + sin * reach;
    const time = flightTicks(SCATTER_UP, z - (dropFloor(world, tx, ty, z) + DROP_FLOAT), TICK_DT) * TICK_DT;
    const side = reach / time;
    world.drops.add({
      item: b.item,
      count: b.count,
      wear: freshWear(b.item),
      x,
      y,
      z,
      vx: cos * side,
      vy: sin * side,
      vz: SCATTER_UP,
      pickableAt: tick + LOOT_DELAY_TICKS,
      born: tick,
    });
  });
}

/**
 * Lo que no cabe en el inventario, a los pies del jugador (el autor: lo
 * fabricado que no cabe cae a los pies). Sin salto, y recogible en el acto:
 * no cabia, asi que el iman no lo coge hasta que haya sitio.
 */
export function dropAtFeet(world: World, store: EntityStore, id: number, item: Resource, count: number, tick: number): void {
  if (count <= 0) return;
  world.drops.add({
    item,
    count,
    wear: freshWear(item),
    x: store.x[id],
    y: store.y[id],
    z: store.z[id] + 0.5,
    vx: 0,
    vy: 0,
    vz: 0,
    pickableAt: tick,
    born: tick,
  });
}

/**
 * Lanza lo tirado desde los ojos hacia la mirada, en un arco corto (el autor).
 * Sale un poco por delante de la cara, para no nacer dentro de la cabeza.
 */
export function throwFrom(world: World, store: EntityStore, id: number, thrown: Thrown, tick: number): void {
  const up = Math.max(-1, Math.min(1, store.lookZ[id]));
  const flat = Math.sqrt(1 - up * up);
  const dx = store.facingX[id] * flat;
  const dy = store.facingY[id] * flat;
  world.drops.add({
    item: thrown.item,
    count: thrown.count,
    wear: thrown.wear,
    x: store.x[id] + dx * 0.4,
    y: store.y[id] + dy * 0.4,
    z: store.z[id] + EYE_HEIGHT - 0.3 + up * 0.4,
    vx: dx * THROW_SPEED,
    vy: dy * THROW_SPEED,
    vz: up * THROW_SPEED + THROW_UP,
    pickableAt: tick + THROW_DELAY_TICKS,
    born: tick,
  });
}

/** Un tick de caida de un monton suelto: gravedad, paredes y posarse. */
function fall(world: World, d: Drop, dt: number): void {
  d.vz -= GRAVITY * dt;
  if (d.vx !== 0 || d.vy !== 0) {
    const nx = d.x + d.vx * dt;
    const ny = d.y + d.vy * dt;
    // Contra una pared mas alta que el, se para en seco y cae.
    if (dropFloor(world, nx, ny, d.z) > d.z) {
      d.vx = 0;
      d.vy = 0;
    } else {
      d.x = nx;
      d.y = ny;
    }
  }
  d.z += d.vz * dt;
  const rest = dropFloor(world, d.x, d.y, d.z) + DROP_FLOAT;
  if (d.z <= rest && d.vz <= 0) {
    d.z = rest;
    d.vx = 0;
    d.vy = 0;
    d.vz = 0;
    d.resting = true;
    merge(world, d);
  }
}

/**
 * Un monton que se posa junto a otro igual se funde con el (el autor): el
 * que ya estaba se queda con todo, y con el reloj del mas nuevo (el autor,
 * 2026-10-19). Las herramientas no, que cada una lleva su desgaste.
 */
function merge(world: World, d: Drop): void {
  if (stackMax(d.item) <= 1) return;
  for (const o of world.drops.values()) {
    if (o === d || !o.resting || o.homing || o.item !== d.item) continue;
    if (Math.hypot(o.x - d.x, o.y - d.y) > MERGE_RADIUS || Math.abs(o.z - d.z) > MERGE_RADIUS) continue;
    o.count += d.count;
    // Lo recien tirado no se vuelve recogible por caer junto a otro.
    o.pickableAt = Math.max(o.pickableAt, d.pickableAt);
    o.born = Math.max(o.born, d.born);
    world.drops.remove(d.id);
    return;
  }
}

/**
 * Un tick de lo suelto: lo que cumple `DROP_LIFE_TICKS` desaparece, este
 * posado, cayendo o volando hacia el jugador (*deduccion*: caduca lo que sea),
 * y lo demas que no esta posado ni volando, cae.
 */
export function stepDrops(world: World, tick: number, dt: number = TICK_DT): void {
  if (world.drops.size === 0) return;
  for (const d of world.drops.values()) {
    if (tick - d.born >= DROP_LIFE_TICKS) {
      world.drops.remove(d.id);
      continue;
    }
    if (!d.resting && !d.homing) fall(world, d, dt);
  }
}

/** Lo lejos que esta un punto del cuerpo del jugador: de su eje, entre los pies y la cabeza. */
function fromBody(store: EntityStore, id: number, x: number, y: number, z: number): number {
  const feet = store.z[id];
  const dz = z < feet ? feet - z : z > feet + PLAYER_HEIGHT ? z - feet - PLAYER_HEIGHT : 0;
  return Math.hypot(x - store.x[id], y - store.y[id], dz);
}

/**
 * El iman (el autor: «solo, al acercarse»): lo recogible a `PICKUP_RADIUS` del
 * cuerpo, del que quepa algo, vuela hacia el pecho: sale a `HOMING_SPEED` y
 * acelera `HOMING_ACCEL`, asi que alcanza aunque se corra. Al llegar, entra lo
 * que quepa; el resto vuelve a caer y se queda en el suelo.
 * Si el inventario se llena por el camino, lo suelta.
 */
export function collectDrops(world: World, store: EntityStore, id: number, inventory: Inventory, tick: number, dt: number = TICK_DT): void {
  if (world.drops.size === 0 || !store.alive[id]) return;
  const chestZ = store.z[id] + PLAYER_HEIGHT / 2;
  for (const d of world.drops.values()) {
    const far = fromBody(store, id, d.x, d.y, d.z);
    if (!d.homing) {
      if (tick < d.pickableAt || far > PICKUP_RADIUS || inventory.room(d.item) === 0) continue;
      d.homing = true;
      d.speed = HOMING_SPEED;
      d.resting = false;
      d.vx = 0;
      d.vy = 0;
      d.vz = 0;
    }
    // Una vez en el iman, llega siempre (el autor, 2026-10-20: «que siempre
    // lleguen al jugador rapidamente una vez esten en rango»): ya no lo suelta
    // por alejarse, solo si deja de caber.
    if (inventory.room(d.item) === 0) {
      d.homing = false;
      d.speed = 0;
      continue;
    }
    const step = d.speed * dt;
    d.speed += HOMING_ACCEL * dt;
    const gx = store.x[id] - d.x;
    const gy = store.y[id] - d.y;
    const gz = chestZ - d.z;
    const gap = Math.hypot(gx, gy, gz);
    if (gap > step) {
      d.x += (gx / gap) * step;
      d.y += (gy / gap) * step;
      d.z += (gz / gap) * step;
      continue;
    }
    d.count -= inventory.addSome(d.item, d.count, d.wear);
    if (d.count <= 0) {
      world.drops.remove(d.id);
    } else {
      // No cupo todo: lo que queda cae donde esta.
      d.homing = false;
      d.speed = 0;
      d.resting = false;
    }
  }
}
