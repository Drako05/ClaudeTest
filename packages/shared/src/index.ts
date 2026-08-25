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

/** Capa de terreno. */
export enum Terrain {
  DeepWater = 0,
  Water = 1,
  Sand = 2,
  Grass = 3,
  Forest = 4,
  Rock = 5,
  Snow = 6,
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
