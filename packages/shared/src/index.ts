/**
 * Vocabulario comun entre sim, client y (a futuro) server.
 * No contiene logica de juego: solo los tipos y las constantes del proyecto.
 */

export * from './base.js';
export * from './ecology.js';

import { BiomeKind, CHUNK_SIZE, LifeKind, Terrain } from './base.js';

/**
 * Que hay sobre un tile.
 *
 * Cada bioma con vegetacion tiene su arbol y su planta caracteristicos, mas una
 * variante rara de cada uno. Los brotes son lo que siembra el jugador antes de
 * madurar. La roca es inerte: no es vida y queda fuera del equilibrio.
 */
export enum Feature {
  None = 0,
  RockNode = 1,

  ForestTree = 2,
  ForestTreeRare = 3,
  ForestPlant = 4,
  ForestPlantRare = 5,

  MeadowTree = 6,
  MeadowTreeRare = 7,
  MeadowPlant = 8,
  MeadowPlantRare = 9,

  ForestTreeSapling = 10,
  ForestPlantSapling = 11,
  MeadowTreeSapling = 12,
  MeadowPlantSapling = 13,
}

export function biomeOfTerrain(t: Terrain): BiomeKind {
  switch (t) {
    case Terrain.DeepWater:
    case Terrain.Water:
      return BiomeKind.Ocean;
    case Terrain.Sand:
      return BiomeKind.Coast;
    case Terrain.Forest:
      return BiomeKind.Forest;
    case Terrain.Rock:
      return BiomeKind.Highland;
    default:
      // Tundra y nieve heredan de momento las especies de pradera.
      return BiomeKind.Meadow;
  }
}

/** Especie adulta que corresponde a un bioma. None si ahi no crece esa vida. */
export function speciesFor(biome: BiomeKind, kind: LifeKind): Feature {
  if (biome === BiomeKind.Forest) {
    if (kind === LifeKind.Tree) return Feature.ForestTree;
    if (kind === LifeKind.Plant) return Feature.ForestPlant;
  }
  if (biome === BiomeKind.Meadow) {
    if (kind === LifeKind.Tree) return Feature.MeadowTree;
    if (kind === LifeKind.Plant) return Feature.MeadowPlant;
  }
  return Feature.None;
}

/** Variante rara de una especie comun, si la tiene. */
export function rareOf(f: Feature): Feature {
  switch (f) {
    case Feature.ForestTree:
      return Feature.ForestTreeRare;
    case Feature.ForestPlant:
      return Feature.ForestPlantRare;
    case Feature.MeadowTree:
      return Feature.MeadowTreeRare;
    case Feature.MeadowPlant:
      return Feature.MeadowPlantRare;
    default:
      return f;
  }
}

export function isRare(f: Feature): boolean {
  return (
    f === Feature.ForestTreeRare ||
    f === Feature.ForestPlantRare ||
    f === Feature.MeadowTreeRare ||
    f === Feature.MeadowPlantRare
  );
}

/** Brote que precede a una especie adulta. */
export function saplingOf(f: Feature): Feature {
  switch (f) {
    case Feature.ForestTree:
      return Feature.ForestTreeSapling;
    case Feature.ForestPlant:
      return Feature.ForestPlantSapling;
    case Feature.MeadowTree:
      return Feature.MeadowTreeSapling;
    case Feature.MeadowPlant:
      return Feature.MeadowPlantSapling;
    default:
      return Feature.None;
  }
}

/** En que se convierte un brote al madurar. None si no es un brote. */
export function maturesInto(f: Feature): Feature {
  switch (f) {
    case Feature.ForestTreeSapling:
      return Feature.ForestTree;
    case Feature.ForestPlantSapling:
      return Feature.ForestPlant;
    case Feature.MeadowTreeSapling:
      return Feature.MeadowTree;
    case Feature.MeadowPlantSapling:
      return Feature.MeadowPlant;
    default:
      return Feature.None;
  }
}

export function isSapling(f: Feature): boolean {
  return maturesInto(f) !== Feature.None;
}

/**
 * A que tipo de vida pertenece una feature. `null` para lo inerte.
 * La roca devuelve null a proposito: el autor pidio que lo no renovable quede
 * fuera del sistema de equilibrio.
 */
export function lifeKindOf(f: Feature): LifeKind | null {
  switch (f) {
    case Feature.ForestTree:
    case Feature.ForestTreeRare:
    case Feature.MeadowTree:
    case Feature.MeadowTreeRare:
    case Feature.ForestTreeSapling:
    case Feature.MeadowTreeSapling:
      return LifeKind.Tree;
    case Feature.ForestPlant:
    case Feature.ForestPlantRare:
    case Feature.MeadowPlant:
    case Feature.MeadowPlantRare:
    case Feature.ForestPlantSapling:
    case Feature.MeadowPlantSapling:
      return LifeKind.Plant;
    default:
      return null;
  }
}

/** Terrenos que bloquean el paso. */
export function isTerrainSolid(t: Terrain): boolean {
  return t === Terrain.DeepWater || t === Terrain.Water || t === Terrain.Rock;
}

/** Features que bloquean el paso. Los brotes no estorban: aun son pequenos. */
export function isFeatureSolid(f: Feature): boolean {
  if (isSapling(f)) return false;
  return f === Feature.RockNode || lifeKindOf(f) === LifeKind.Tree;
}

export enum Resource {
  Wood = 0,
  Stone = 1,
  Berries = 2,
  TreeSeed = 3,
  PlantSeed = 4,
}
export const RESOURCE_COUNT = 5;
export const RESOURCE_NAMES: readonly string[] = [
  'Madera',
  'Piedra',
  'Bayas',
  'Semilla de arbol',
  'Semilla de planta',
];

export interface Harvest {
  resource: Resource;
  amount: number;
  /** Semilla que puede caer. None si no la hay. */
  seed: Resource | null;
}

/**
 * Que entrega recolectar cada feature.
 * Los brotes no se recolectan: aun no han madurado.
 */
export function harvestOf(f: Feature): Harvest | null {
  if (isSapling(f)) return null;
  const rare = isRare(f);
  switch (lifeKindOf(f)) {
    case LifeKind.Tree:
      return { resource: Resource.Wood, amount: rare ? 6 : 3, seed: Resource.TreeSeed };
    case LifeKind.Plant:
      return { resource: Resource.Berries, amount: rare ? 8 : 4, seed: Resource.PlantSeed };
    default:
      break;
  }
  if (f === Feature.RockNode) {
    // Inerte y finita: da piedra y no deja semilla ni cuenta para el equilibrio.
    return { resource: Resource.Stone, amount: 2, seed: null };
  }
  return null;
}

/** Semilla que hace falta para sembrar cada tipo de vida. */
export function seedFor(kind: LifeKind): Resource | null {
  if (kind === LifeKind.Tree) return Resource.TreeSeed;
  if (kind === LifeKind.Plant) return Resource.PlantSeed;
  return null;
}

/** Intencion del jugador para un tick. El cliente produce esto; nunca muta el estado. */
export interface Intent {
  /** Direccion deseada. La magnitud, acotada a 1, escala la velocidad. */
  moveX: number;
  moveY: number;
  harvest: boolean;
  eat: boolean;
  /** Sembrar en el tile mirado. */
  plant: boolean;
  /**
   * Direccion a la que se quiere mirar, independiente de hacia donde se anda.
   *
   * En (0,0) no hay apuntado y la mirada sigue al movimiento, que es como se
   * comporta el teclado solo y el joystick en reposo. Viaja en la Intent y no se
   * escribe a mano en la entidad para que la misma estructura pueda ir por red
   * sin reescribir nada.
   */
  aimX: number;
  aimY: number;
}

export function emptyIntent(): Intent {
  return { moveX: 0, moveY: 0, harvest: false, eat: false, plant: false, aimX: 0, aimY: 0 };
}
