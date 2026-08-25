/**
 * Constantes y tipos compartidos entre sim, client y (a futuro) server.
 * No contiene logica: solo el vocabulario comun del proyecto.
 */

/** Lado de un chunk, en tiles. Potencia de 2 para permitir >> y & en vez de / y %. */
export const CHUNK_SIZE = 32;
export const CHUNK_SHIFT = 5;
export const CHUNK_MASK = CHUNK_SIZE - 1;

/** Frecuencia logica de la simulacion. El render va desacoplado de esto. */
export const TICK_HZ = 60;
export const TICK_DT = 1 / TICK_HZ;

/** Duracion de un dia completo del mundo: 8 minutos reales. */
export const DAY_TICKS = 8 * 60 * TICK_HZ;

/**
 * Cada cuantos ticks avanza la vida vegetal.
 *
 * Que sea un paso FIJO y global no es un detalle de rendimiento: es lo que hace
 * que ponerse al dia de golpe y simular continuamente den exactamente el mismo
 * resultado, y por tanto lo que sostiene la ley de que el mundo existe
 * independientemente de cualquier observador.
 */
export const LIFE_STEP_TICKS = 300;

/** Capa de terreno. */
export enum Terrain {
  DeepWater = 0,
  Water = 1,
  Sand = 2,
  Grass = 3,
  Forest = 4,
  Rock = 5,
  Snow = 6,
  Tundra = 7,
}

/** Capa de features: lo que se puede recolectar o estorba el paso. */
export enum Feature {
  None = 0,
  Tree = 1,
  RockNode = 2,
  BerryBush = 3,
}

export enum Resource {
  Wood = 0,
  Stone = 1,
  Berries = 2,
}

export const RESOURCE_COUNT = 3;

export const RESOURCE_NAMES: readonly string[] = ['Madera', 'Piedra', 'Bayas'];

/** Terrenos que bloquean el paso. */
export function isTerrainSolid(t: Terrain): boolean {
  return t === Terrain.DeepWater || t === Terrain.Water || t === Terrain.Rock;
}

/** Features que bloquean el paso. */
export function isFeatureSolid(f: Feature): boolean {
  return f === Feature.Tree || f === Feature.RockNode;
}

/** Que recurso entrega recolectar cada feature, y cuanto. */
export interface Harvest {
  resource: Resource;
  amount: number;
}

/**
 * Ticks que tarda un recurso en volver tras recolectarlo.
 *
 * Cero significa que NO vuelve. El libro dice que los recursos, «segun su
 * naturaleza, pueden ser finitos, consumibles y renovables»: la madera y las
 * bayas se renuevan, la piedra no.
 */
export function regrowTicksOf(f: Feature): number {
  switch (f) {
    case Feature.Tree:
      return DAY_TICKS * 2;
    case Feature.BerryBush:
      return Math.round(DAY_TICKS * 0.6);
    default:
      return 0;
  }
}

/** True si la feature forma parte del reino vegetal y depende del ecosistema. */
export function isPlant(f: Feature): boolean {
  return f === Feature.Tree || f === Feature.BerryBush;
}

export function harvestOf(f: Feature): Harvest | null {
  switch (f) {
    case Feature.Tree:
      return { resource: Resource.Wood, amount: 3 };
    case Feature.RockNode:
      return { resource: Resource.Stone, amount: 2 };
    case Feature.BerryBush:
      return { resource: Resource.Berries, amount: 4 };
    default:
      return null;
  }
}

/** Intencion del jugador para un tick. El cliente produce esto; nunca muta el sim. */
export interface Intent {
  /** Direccion deseada, componentes en [-1, 1]. */
  moveX: number;
  moveY: number;
  /** Recolectar el tile mirado este tick. */
  harvest: boolean;
  /** Consumir bayas este tick. */
  eat: boolean;
}

export function emptyIntent(): Intent {
  return { moveX: 0, moveY: 0, harvest: false, eat: false };
}
