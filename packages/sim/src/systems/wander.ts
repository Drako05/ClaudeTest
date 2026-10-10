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
import { BODY_RADIUS, footing } from '../boxes.js';
import { applyVertical, STEP_UP } from './jump.js';
import { bodyBoxes, bodyClashes, groundRound } from '../body.js';
import { airborneAnimal, brakeAnimal, collides, walkAnimal } from './movement.js';

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
  if (covered(world, x, y)) ({ x, y } = { x: animal.homeX, y: animal.homeY });
  if (!covered(world, x, y)) {
    store.x[id] = x;
    store.y[id] = y;
  }
  store.z[id] = world.groundHeightAt(store.x[id], store.y[id]);
  // Mirando de su origen a su punto de paso: lo mismo lo mire alguien o no.
  faceToFit(world, store, id, animal, Math.atan2(target.y - animal.homeY, target.x - animal.homeX));
  // Ya girado: sus pies, sobre lo que pisan todas sus cajas (`partsRest`).
  store.z[id] = footing(world, store, id, store.z[id] + STEP_UP);
  store.vz[id] = 0;
  store.grounded[id] = 1;
  store.vx[id] = 0;
  store.vy[id] = 0;
  store.wanderPeriod[id] = period;
  store.wanderX[id] = target.x;
  store.wanderY[id] = target.y;
  forgetObstacles(store, id);
}

/**
 * Si el punto queda tapado: agua, o una casilla con un objeto que choca bajo
 * una huella como la del jugador (la medida por casilla, `World.isSolidAt`).
 */
function covered(world: World, x: number, y: number): boolean {
  if (collides(world, x, y)) return true;
  for (let ty = Math.floor(y - BODY_RADIUS); ty <= Math.floor(y + BODY_RADIUS); ty++) {
    for (let tx = Math.floor(x - BODY_RADIUS); tx <= Math.floor(x + BODY_RADIUS); tx++) {
      if (world.isSolidAt(tx, ty)) return true;
    }
  }
  return false;
}

/** Lo que estorbaba camino del punto de paso de antes ya no cuenta. */
function forgetObstacles(store: EntityStore, id: number): void {
  store.detourLeft[id] = 0;
  store.backedUp[id] = 0;
}

/**
 * El rumbo con que se pone a un animal: de 8, el primero en que su cuerpo cabe
 * en el terreno, empezando por `start`; si no cabe en ninguno, el que
 * menos se mete, y desde ahi `walkAnimal` le deja salir. **Deduccion mia.**
 */
function faceToFit(world: World, store: EntityStore, id: number, animal: Animal, start: number): void {
  const x = store.x[id];
  const y = store.y[id];
  const z = store.z[id];
  const best = groundRound(world, x, y, () => {
    let fewest = Infinity;
    let angle = start;
    for (let k = 0; k < 8; k++) {
      const a = start + (k * Math.PI) / 4;
      const clashes = bodyClashes(world, bodyBoxes(animal.species, animal.stage, x, y, z, Math.cos(a), Math.sin(a)), z, STEP_UP);
      if (clashes < fewest) {
        fewest = clashes;
        angle = a;
        if (clashes === 0) break;
      }
    }
    return angle;
  });
  store.facingX[id] = Math.cos(best);
  store.facingY[id] = Math.sin(best);
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
 * llegar; lo que estorba lo salta o lo bordea (`walkAnimal`), y en el aire
 * sigue su salto (`airborneAnimal`). La gravedad, como al jugador.
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
      forgetObstacles(store, id);
    }
    const dx = store.wanderX[id] - store.x[id];
    const dy = store.wanderY[id] - store.y[id];
    const info = SPECIES[animal.species];
    const keep = (x: number, y: number) => biomeOfTerrain(world.terrainAt(Math.floor(x), Math.floor(y))) === info.biome;
    // Una ronda de consultas para el andar y la vertical: leen casi las mismas
    // casillas.
    groundRound(world, store.x[id], store.y[id], () => {
      if (!store.grounded[id]) {
        airborneAnimal(world, store, id, TICK_DT, keep);
      } else if (Math.hypot(dx, dy) > ARRIVE_DISTANCE) {
        walkAnimal(world, store, id, dx, dy, info.speed, TICK_DT, keep);
      } else {
        brakeAnimal(world, store, id, info.speed, TICK_DT, keep);
      }
      applyVertical(world, store, id, TICK_DT);
    });
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
