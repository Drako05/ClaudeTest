/**
 * La fauna que anda: se materializa cerca del jugador y pasea hacia sus puntos
 * de paso (`fauna.ts`).
 *
 * Materializar no crea vida: el animal ya existia como potencial de su chunk, y
 * solo pasa a ser una entidad que se mueve y se golpea mientras su chunk esta a
 * `FAUNA_RADIUS_CHUNKS` del jugador. Al alejarse se retira, y al volver
 * reaparece donde le toca en ese periodo y **entero**: el daño no sobrevive a
 * recargarse (decision del autor, 2026-10-03). Lo que si sobrevive es la
 * muerte (el overlay de `World`): los muertos no se materializan nunca.
 */

import {
  animalHitPoints,
  biomeOfTerrain,
  SPECIES,
  TICK_DT,
} from '@verdant/shared';
import { EntityKind, INVALID_ENTITY, type EntityStore } from '../entities.js';
import {
  ARRIVE_DISTANCE,
  FAUNA_RADIUS_CHUNKS,
  periodOf,
  waypointOf,
  type Animal,
} from '../fauna.js';
import { toChunkCoord, type World } from '../world.js';
import { applyVertical } from './jump.js';
import { collides, walkAt } from './movement.js';

/** Los animales materializados, por su clave: la entidad que es cada uno. */
export type FaunaIndex = Map<string, number>;

/** El chunk de origen de un animal, de su clave `cx,cy,n`. */
function homeChunk(animal: Animal): { cx: number; cy: number } {
  const [cx, cy] = animal.key.split(',');
  return { cx: Number(cx), cy: Number(cy) };
}

/** Pone al animal en su punto de paso del periodo de `tick`, con los pies en el suelo. */
function placeAt(world: World, store: EntityStore, id: number, animal: Animal, tick: number): void {
  const period = periodOf(animal, tick);
  const target = waypointOf(world.gen, animal, period);
  // Si el punto de paso quedo tapado —un arbol que crecio, una estacion—, el
  // origen; y si tampoco, se queda donde este.
  let { x, y } = target;
  if (collides(world, x, y)) ({ x, y } = { x: animal.homeX, y: animal.homeY });
  if (!collides(world, x, y)) {
    store.x[id] = x;
    store.y[id] = y;
  }
  store.z[id] = world.floorHeightAt(store.x[id], store.y[id]);
  store.vz[id] = 0;
  store.grounded[id] = 1;
  store.vx[id] = 0;
  store.vy[id] = 0;
  store.wanderPeriod[id] = period;
  store.wanderX[id] = target.x;
  store.wanderY[id] = target.y;
}

/**
 * Pone al dia que animales estan materializados: los de los chunks a
 * `FAUNA_RADIUS_CHUNKS` del jugador que esten vivos, ni uno mas. Se llama
 * cuando el jugador cambia de chunk, como el streaming.
 */
export function syncFauna(
  world: World,
  store: EntityStore,
  index: FaunaIndex,
  playerX: number,
  playerY: number,
  tick: number,
): void {
  const pcx = toChunkCoord(Math.floor(playerX));
  const pcy = toChunkCoord(Math.floor(playerY));
  const near = (cx: number, cy: number) =>
    Math.abs(cx - pcx) <= FAUNA_RADIUS_CHUNKS && Math.abs(cy - pcy) <= FAUNA_RADIUS_CHUNKS;

  for (const [key, id] of index) {
    const animal = store.animal[id];
    const home = animal ? homeChunk(animal) : null;
    if (!home || !near(home.cx, home.cy) || world.isFaunaDead(key)) {
      store.despawn(id);
      index.delete(key);
    }
  }

  for (let cy = pcy - FAUNA_RADIUS_CHUNKS; cy <= pcy + FAUNA_RADIUS_CHUNKS; cy++) {
    for (let cx = pcx - FAUNA_RADIUS_CHUNKS; cx <= pcx + FAUNA_RADIUS_CHUNKS; cx++) {
      for (const animal of world.faunaOfChunk(cx, cy)) {
        if (index.has(animal.key) || world.isFaunaDead(animal.key)) continue;
        const id = store.spawn(EntityKind.Critter, animal.homeX, animal.homeY);
        if (id === INVALID_ENTITY) return;
        const full = animalHitPoints(animal.species, animal.stage);
        store.animal[id] = animal;
        store.maxHealth[id] = full;
        // Entero: el daño no sobrevive a retirarse (decision del autor,
        // 2026-10-03). Lo unico que se guarda de el es si murio.
        store.health[id] = full;
        placeAt(world, store, id, animal, tick);
        index.set(animal.key, id);
      }
    }
  }
}

/**
 * Un tick de paseo: cada animal anda hacia su punto de paso del periodo en
 * curso a su velocidad, sin salir de los tiles de su bioma, y se para al
 * llegar. La gravedad, como al jugador.
 */
export function stepFauna(world: World, store: EntityStore, index: FaunaIndex, tick: number): void {
  for (const id of index.values()) {
    const animal = store.animal[id];
    if (!animal) continue;
    const period = periodOf(animal, tick);
    if (store.wanderPeriod[id] !== period) {
      const target = waypointOf(world.gen, animal, period);
      store.wanderPeriod[id] = period;
      store.wanderX[id] = target.x;
      store.wanderY[id] = target.y;
    }
    const dx = store.wanderX[id] - store.x[id];
    const dy = store.wanderY[id] - store.y[id];
    const info = SPECIES[animal.species];
    if (store.grounded[id] && Math.hypot(dx, dy) > ARRIVE_DISTANCE) {
      walkAt(world, store, id, dx, dy, info.speed, TICK_DT, (x, y) =>
        biomeOfTerrain(world.terrainAt(Math.floor(x), Math.floor(y))) === info.biome,
      );
    } else {
      store.vx[id] = 0;
      store.vy[id] = 0;
    }
    applyVertical(world, store, id, TICK_DT);
  }
}

/**
 * Tras un salto en el tiempo, cada animal donde le toca: en el punto de paso
 * del periodo en curso. Es lo que haria quien no lo miro (`syncFauna`), asi que
 * saltar y volver a cargar el chunk dan lo mismo.
 */
export function settleFauna(world: World, store: EntityStore, index: FaunaIndex, tick: number): void {
  for (const id of index.values()) {
    const animal = store.animal[id];
    if (animal) placeAt(world, store, id, animal, tick);
  }
}
