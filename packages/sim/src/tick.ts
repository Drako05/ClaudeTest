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
import { moveAirborne, moveEntity, RUN_MULTIPLIER } from './systems/movement.js';
import { applyVertical, takeOff } from './systems/jump.js';
import { autoJumpDue } from './systems/autojump.js';
import { spendJump, updateSurvival } from './systems/survival.js';
import {
  craftNear,
  tryHarvestArea,
  tryUse,
  WorkState,
  type Blocked,
  type HarvestResult,
  type Hit,
  type Opened,
  type Placed,
  type Used,
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
  /** Lo golpeado en el ultimo tick que siguio en pie. Efimero. */
  lastHits: Hit[];
  /** Que hizo el ultimo `use`: comer, sembrar, colocar, abrir o nada. Efimero. */
  lastUsed: Used | null;
  /**
   * La estacion que abrio el ultimo `use`, o `null`. Efimero: el cliente abre su
   * panel al verlo (decision del autor: sus recetas solo se ven al usarla).
   */
  lastOpened: Opened | null;
  /**
   * La estacion que coloco el ultimo `use`, con la altura a la que la tocaba la
   * mirada, o `null`. Efimero: el cliente la deja caer desde ahi.
   */
  lastPlaced: Placed | null;
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
    lastHits: [],
    lastUsed: null,
    lastOpened: null,
    lastPlaced: null,
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
  state.lastHits = [];
  state.lastUsed = null;
  state.lastOpened = null;
  state.lastPlaced = null;
  state.lastBlocked = null;
  state.lastBroke = false;
  state.lastCrafted = -1;

  // El tiempo avanza antes que nada: el resto del tick actua sobre el mundo tal
  // y como esta AHORA, con la vegetacion ya puesta al dia.
  world.setNow(state.tick);

  if (entities.alive[playerId]) {
    // En el suelo y en el aire se anda igual; lo unico que cambia es el margen
    // de subida, y por eso se bifurca aqui. El eje vertical va DESPUES de los
    // dos, porque la altura del suelo que decide todo es la del sitio al que se
    // ha llegado, no la del que se salio.
    const fromX = entities.x[playerId];
    const fromY = entities.y[playerId];
    let jumped = false;
    if (entities.grounded[playerId]) {
      moveEntity(world, entities, playerId, intent.moveX, intent.moveY, TICK_DT, intent.run);
      // El auto salto es un salto como otro: despega igual y cobra igual.
      const autoJump =
        intent.autoJump && autoJumpDue(world, entities, playerId, intent.moveX, intent.moveY, intent.run);
      if (intent.jump || autoJump) jumped = takeOff(entities, playerId);
    } else {
      moveAirborne(world, entities, playerId, intent.moveX, intent.moveY, TICK_DT, intent.run);
    }
    applyVertical(world, entities, playerId, TICK_DT);
    // Correr gasta mas hambre solo si de verdad se avanza: con la carrera
    // encendida y quieto, o empujando contra una pared, se gasta como andando.
    const advanced = entities.x[playerId] !== fromX || entities.y[playerId] !== fromY;
    const effort = intent.run && advanced ? RUN_MULTIPLIER : 1;

    // El apuntado manda sobre la mirada que acaba de fijar el movimiento: con
    // raton se mira a donde apunta el cursor aunque se ande en otra direccion.
    // Sin apuntado la mirada sigue al movimiento, que es lo de siempre.
    // La mirada entra tal cual, sin encajarla en ocho direcciones: es el eje del
    // sector del golpe (`sim/aim.ts`), y redondearla era justo lo que hacia que
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
    if (intent.moveFrom >= 0 && intent.moveTo >= 0) inventory.move(intent.moveFrom, intent.moveTo);
    if (intent.discard >= 0) inventory.discard(intent.discard);
    if (intent.craft >= 0) {
      const crafted = craftNear(world, entities, playerId, inventory, intent.craft);
      if (crafted === 'ok') state.lastCrafted = intent.craft;
      else if (crafted === 'full') state.lastBlocked = 'full';
    }

    if (intent.harvest) {
      const swing = tryHarvestArea(
        world,
        entities,
        playerId,
        inventory,
        state.tick,
        state.work,
        intent.precise,
      );
      state.lastHarvest = swing.results;
      state.lastHits = swing.hits;
      state.lastBlocked = swing.blocked;
      state.lastBroke = swing.broke;
    }
    if (intent.use) {
      state.lastUsed = tryUse(world, entities, playerId, inventory, {
        opened: (o) => (state.lastOpened = o),
        placed: (p) => (state.lastPlaced = p),
      });
    }
    if (!state.survivalFrozen) {
      if (jumped) spendJump(entities, playerId);
      updateSurvival(entities, playerId, TICK_DT, effort);
    }
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
