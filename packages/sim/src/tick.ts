/**
 * Orquestacion de la simulacion: un paso de tiempo FIJO que consume una Intent
 * y avanza el estado.
 *
 * El paso fijo no es un detalle: con dt variable la simulacion deja de ser
 * determinista y se cae todo lo que depende de eso (multijugador con prediccion,
 * repeticion de bugs, tests). El render interpola aparte, en el cliente.
 */

import { CHUNK_SIZE, DAY_TICKS, TICK_DT, type Intent } from '@verdant/shared';
import { EntityKind, EntityStore } from './entities.js';
import { moveAirborne, moveEntity } from './systems/movement.js';
import { applyVertical, takeOff } from './systems/jump.js';
import { updateSurvival } from './systems/survival.js';
import {
  tryCraft,
  tryEat,
  tryHarvestArea,
  tryPlant,
  WorkState,
  type Blocked,
  type HarvestResult,
} from './systems/gathering.js';
import { Inventory } from './inventory.js';
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
  /** El inventario por casillas (decision del autor). Se nace sin nada. */
  readonly inventory: Inventory;
  /** Dano acumulado y ramas arrancadas: el trabajo a medias del jugador. */
  readonly work: WorkState;
  tick: number;
  /** Lo recolectado en el ultimo tick, una entrada por casilla. Efimero. */
  lastHarvest: HarvestResult[];
  /** Por que el ultimo golpe no hizo algo (inventario lleno, falta pico). Efimero. */
  lastBlocked: Blocked | null;
  /** True si en el ultimo tick se rompio la herramienta de la mano. Efimero. */
  lastBroke: boolean;
  /** Receta fabricada en el ultimo tick, o -1. Efimero. */
  lastCrafted: number;
  /** Chunk en el que estaba el jugador el tick anterior, para streaming perezoso. */
  streamCx: number;
  streamCy: number;
  /**
   * Congela hambre y salud. Interruptor de desarrollo, no de juego.
   *
   * Existe porque el hambre hacia inservibles el acelerador y los saltos: a 64x
   * se pierden unos 35 puntos por segundo real, y saltar un dia son 264 — muerte
   * segura antes de poder observar nada del ecosistema. Lo respetan por igual
   * `step` y `skipTime`, asi que saltar sigue equivaliendo a esperar este puesto
   * o no.
   */
  survivalFrozen: boolean;
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
  // El almacen no conoce el mundo, asi que la altura de nacimiento se pone
  // aqui. Sin esto se nace a nivel 0 y el primer tick te sube de golpe.
  entities.z[playerId] = world.groundHeightAt(spawn.x, spawn.y);

  const state: GameState = {
    world,
    entities,
    playerId,
    inventory: new Inventory(),
    work: new WorkState(),
    tick: Math.max(0, Math.floor(startTick)),
    lastHarvest: [],
    lastBlocked: null,
    lastBroke: false,
    lastCrafted: -1,
    streamCx: Number.NaN,
    streamCy: Number.NaN,
    survivalFrozen: false,
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
  state.lastHarvest = [];
  state.lastBlocked = null;
  state.lastBroke = false;
  state.lastCrafted = -1;

  // El tiempo avanza antes que nada: el resto del tick actua sobre el mundo tal
  // y como esta AHORA, con la vegetacion ya puesta al dia.
  world.setNow(state.tick);

  if (entities.alive[playerId]) {
    // Andar y volar son dos leyes distintas, y por eso se bifurca aqui y no
    // dentro: en el suelo se manda sobre la velocidad, en el aire solo se
    // corrige la que ya se llevaba. El eje vertical va DESPUES de los dos,
    // porque la altura del suelo que decide todo es la del sitio al que se ha
    // llegado, no la del que se salio.
    if (entities.grounded[playerId]) {
      moveEntity(world, entities, playerId, intent.moveX, intent.moveY, TICK_DT, intent.run);
      if (intent.jump) takeOff(entities, playerId);
    } else {
      moveAirborne(world, entities, playerId, intent.moveX, intent.moveY, TICK_DT, intent.run);
    }
    applyVertical(world, entities, playerId, TICK_DT);

    // El apuntado manda sobre la mirada que acaba de fijar el movimiento: con
    // raton se mira a donde apunta el cursor aunque se ande en otra direccion.
    // Sin apuntado la mirada sigue al movimiento, que es lo de siempre.
    // La mirada entra tal cual, sin encajarla en ocho direcciones: es el eje del
    // cono de la accion (`sim/aim.ts`), y redondearla era justo lo que hacia que
    // en primera persona se golpeara lo que no estaba delante de los ojos.
    const aimLen = Math.hypot(intent.aimX, intent.aimY);
    if (aimLen > 0) {
      entities.facingX[playerId] = intent.aimX / aimLen;
      entities.facingY[playerId] = intent.aimY / aimLen;
    }
    entities.lookZ[playerId] = intent.aimZ ?? 0;

    // El inventario antes que el golpe: elegir la herramienta y golpear en el
    // mismo tick golpea ya con ella.
    if (intent.select >= 0) inventory.select(intent.select);
    if (intent.swapA >= 0 && intent.swapB >= 0) inventory.swap(intent.swapA, intent.swapB);
    if (intent.discard >= 0) inventory.discard(intent.discard);
    if (intent.craft >= 0 && tryCraft(inventory, intent.craft)) state.lastCrafted = intent.craft;

    if (intent.harvest) {
      const swing = tryHarvestArea(world, entities, playerId, inventory, state.tick, state.work);
      state.lastHarvest = swing.results;
      state.lastBlocked = swing.blocked;
      state.lastBroke = swing.broke;
    }
    if (intent.plant) {
      tryPlant(world, entities, playerId, inventory);
    }
    if (intent.eat) {
      tryEat(entities, playerId, inventory);
    }
    if (!state.survivalFrozen) updateSurvival(entities, playerId, TICK_DT);
  }

  streamChunks(state);
  state.tick++;
}

/**
 * Salta hacia adelante en el tiempo del mundo.
 *
 * Herramienta de desarrollo: comprobar el reequilibrio o la maduracion de un
 * brote exige esperar horas reales, y sin esto no hay forma de verlo.
 *
 * Es exactamente `step` con una Intent vacia, sin mover al personaje: mismo
 * orden, mismo reloj, mismo hambre tick a tick. Tenia que serlo, porque si un
 * salto no dejara el mundo igual que vivir ese rato quieto, lo que se verifique
 * con el no diria nada de la partida real. Lo unico que no ocurre es el
 * movimiento, porque el personaje no se ha movido.
 *
 * La vida no se recalcula 216.000 veces: `World.setNow` solo trabaja al cruzar
 * un paso de vida y el resto de llamadas salen de vacio.
 */
export function skipTime(state: GameState, ticks: number): void {
  const span = Math.max(0, Math.floor(ticks));
  if (span === 0) return;

  for (let i = 0; i < span; i++) {
    state.world.setNow(state.tick);
    // La gravedad tambien: no es movimiento, es el mundo actuando sobre uno. Sin
    // esto, saltar una hora en pleno vuelo dejaria al personaje colgado en el
    // aire y la equivalencia «saltar una hora == vivirla quieto» se romperia
    // justo cuando mas se nota. Quieto en el suelo no cambia nada, que es el
    // caso normal de usar el panel.
    applyVertical(state.world, state.entities, state.playerId, TICK_DT);
    if (!state.survivalFrozen) updateSurvival(state.entities, state.playerId, TICK_DT);
    state.tick++;
  }
}
