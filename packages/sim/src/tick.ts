/**
 * Orquestacion de la simulacion: un paso de tiempo FIJO que consume una Intent
 * y avanza el estado.
 *
 * El paso fijo no es un detalle: con dt variable la simulacion deja de ser
 * determinista y se cae todo lo que depende de eso (multijugador con prediccion,
 * repeticion de bugs, tests). El render interpola aparte, en el cliente.
 */

import { CHUNK_SIZE, DAY_TICKS, RESOURCE_COUNT, TICK_DT, type Intent } from '@verdant/shared';
import { EntityKind, EntityStore } from './entities.js';
import { moveEntity } from './systems/movement.js';
import { updateSurvival } from './systems/survival.js';
import { tryEat, tryHarvest, tryPlant, type HarvestResult } from './systems/gathering.js';
import { toChunkCoord, World } from './world.js';

/** Radio de chunks mantenidos cargados alrededor del jugador. */
export const STREAM_RADIUS_CHUNKS = 3;
/** Radio a partir del cual se descartan. Mayor que el anterior para dar histeresis
 *  y evitar cargar/descartar en bucle al caminar sobre un borde de chunk. */
export const PRUNE_RADIUS_CHUNKS = 5;

export interface GameState {
  readonly world: World;
  readonly entities: EntityStore;
  readonly playerId: number;
  /** Cantidades por Resource. Int32Array para mantener el estado en datos planos. */
  readonly inventory: Int32Array;
  tick: number;
  /** Ultima recoleccion, para que el cliente muestre feedback. Efimero. */
  lastHarvest: HarvestResult | null;
  /** Chunk en el que estaba el jugador el tick anterior, para streaming perezoso. */
  streamCx: number;
  streamCy: number;
}

/**
 * Instante en que arranca un mundo nuevo: poco despues del amanecer.
 *
 * El tick 0 es medianoche, asi que sin este desplazamiento toda partida nueva
 * empezaria a oscuras.
 */
export const DEFAULT_START_TICK = Math.round(DAY_TICKS * 0.28);

export function createGame(seed: number, startTick: number = DEFAULT_START_TICK): GameState {
  const world = new World(seed);
  const spawn = world.findSpawn(0, 0);
  const entities = new EntityStore();
  const playerId = entities.spawn(EntityKind.Player, spawn.x, spawn.y);

  const state: GameState = {
    world,
    entities,
    playerId,
    inventory: new Int32Array(RESOURCE_COUNT),
    tick: Math.max(0, Math.floor(startTick)),
    lastHarvest: null,
    streamCx: Number.NaN,
    streamCy: Number.NaN,
  };

  streamChunks(state);
  world.setNow(state.tick);
  return state;
}

/** Carga/descarga chunks solo cuando el jugador cambia de chunk. */
function streamChunks(state: GameState): void {
  const { entities, playerId, world } = state;
  const cx = toChunkCoord(Math.floor(entities.x[playerId]));
  const cy = toChunkCoord(Math.floor(entities.y[playerId]));
  if (cx === state.streamCx && cy === state.streamCy) return;

  state.streamCx = cx;
  state.streamCy = cy;
  const wx = cx * CHUNK_SIZE;
  const wy = cy * CHUNK_SIZE;
  world.ensureAround(wx, wy, STREAM_RADIUS_CHUNKS);
  world.pruneFar(wx, wy, PRUNE_RADIUS_CHUNKS);
}

/** Avanza la simulacion exactamente un tick. */
export function step(state: GameState, intent: Intent): void {
  const { entities, playerId, world, inventory } = state;
  state.lastHarvest = null;

  // El tiempo avanza antes que nada: el resto del tick actua sobre el mundo tal
  // y como esta AHORA, con la vegetacion ya puesta al dia.
  world.setNow(state.tick);

  if (entities.alive[playerId]) {
    moveEntity(world, entities, playerId, intent.moveX, intent.moveY, TICK_DT);
    if (intent.harvest) {
      state.lastHarvest = tryHarvest(world, entities, playerId, inventory, state.tick);
    }
    if (intent.plant) {
      tryPlant(world, entities, playerId, inventory);
    }
    if (intent.eat) {
      tryEat(entities, playerId, inventory);
    }
    updateSurvival(entities, playerId, TICK_DT);
  }

  streamChunks(state);
  state.tick++;
}
