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

  TundraTree = 14,
  TundraTreeRare = 15,
  TundraPlant = 16,
  TundraPlantRare = 17,
  TundraTreeSapling = 18,
  TundraPlantSapling = 19,

  /** Minerales de la montana. Inertes y finitos, como la roca. */
  CoalNode = 20,
  IronNode = 21,
  CopperNode = 22,
}

/** Los tres minerales, en el orden en que se sortean. */
export const MINERAL_NODES: readonly Feature[] = [
  Feature.CoalNode,
  Feature.IronNode,
  Feature.CopperNode,
];

/** True si es roca o mineral: no cuenta como vida y no se repone. */
export function isInert(f: Feature): boolean {
  return f === Feature.RockNode || MINERAL_NODES.includes(f);
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
    case Terrain.Tundra:
    case Terrain.Snow:
      // El frio es un bioma propio. Mandarlos a pradera hacia que el panel
      // anunciara «Pradera» pisando nieve y que un arbol de pradera pudiera
      // brotar sobre hielo.
      return BiomeKind.Tundra;
    default:
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
  if (biome === BiomeKind.Tundra) {
    if (kind === LifeKind.Tree) return Feature.TundraTree;
    if (kind === LifeKind.Plant) return Feature.TundraPlant;
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
    case Feature.TundraTree:
      return Feature.TundraTreeRare;
    case Feature.TundraPlant:
      return Feature.TundraPlantRare;
    default:
      return f;
  }
}

export function isRare(f: Feature): boolean {
  return (
    f === Feature.ForestTreeRare ||
    f === Feature.ForestPlantRare ||
    f === Feature.MeadowTreeRare ||
    f === Feature.MeadowPlantRare ||
    f === Feature.TundraTreeRare ||
    f === Feature.TundraPlantRare
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
    case Feature.TundraTree:
      return Feature.TundraTreeSapling;
    case Feature.TundraPlant:
      return Feature.TundraPlantSapling;
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
    case Feature.TundraTreeSapling:
      return Feature.TundraTree;
    case Feature.TundraPlantSapling:
      return Feature.TundraPlant;
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
    case Feature.TundraTree:
    case Feature.TundraTreeRare:
    case Feature.TundraTreeSapling:
      return LifeKind.Tree;
    case Feature.ForestPlant:
    case Feature.ForestPlantRare:
    case Feature.MeadowPlant:
    case Feature.MeadowPlantRare:
    case Feature.ForestPlantSapling:
    case Feature.MeadowPlantSapling:
    case Feature.TundraPlant:
    case Feature.TundraPlantRare:
    case Feature.TundraPlantSapling:
      return LifeKind.Plant;
    default:
      return null;
  }
}

/** Terrenos que bloquean el paso. */
/**
 * Terrenos que no se pueden pisar.
 *
 * La roca ESTABA aqui, y eso convertia el bioma de montana entero en un muro: el
 * jugador chocaba contra su borde y no habia forma de entrar. De paso explicaba
 * que su densidad de vida fuera cero, porque no tenia sentido poner nada donde
 * no se podia llegar. Solo el agua detiene el paso.
 */
export function isTerrainSolid(t: Terrain): boolean {
  return t === Terrain.DeepWater || t === Terrain.Water;
}

/** Features que bloquean el paso. Los brotes no estorban: aun son pequenos. */
export function isFeatureSolid(f: Feature): boolean {
  if (isSapling(f)) return false;
  return isInert(f) || lifeKindOf(f) === LifeKind.Tree;
}

export enum Resource {
  Wood = 0,
  Stone = 1,
  Berries = 2,
  TreeSeed = 3,
  PlantSeed = 4,
  Coal = 5,
  Iron = 6,
  Copper = 7,
}
export const RESOURCE_COUNT = 8;
export const RESOURCE_NAMES: readonly string[] = [
  'Madera',
  'Piedra',
  'Bayas',
  'Semilla de arbol',
  'Semilla de planta',
  'Carbon',
  'Hierro',
  'Cobre',
];

export interface Harvest {
  resource: Resource;
  /** Minimo del botin. Con `max` igual, la cantidad es fija. */
  amount: number;
  /** Maximo del botin. Los minerales son los primeros que dan un rango. */
  max: number;
  /** Semilla que puede caer. None si no la hay. */
  seed: Resource | null;
  /**
   * True si lo recolectado es inerte.
   *
   * El bonus del +30 % premia cuidar un ecosistema, y la montana no tiene
   * ninguno: su bioma esta siempre «equilibrado» por vacio, asi que sin esto los
   * minerales cobrarian el bonus gratis y para siempre.
   */
  inert: boolean;
}

/**
 * Que entrega recolectar cada feature.
 * Los brotes no se recolectan: aun no han madurado.
 */
export function harvestOf(f: Feature): Harvest | null {
  if (isSapling(f)) return null;
  const rare = isRare(f);
  switch (lifeKindOf(f)) {
    case LifeKind.Tree: {
      const n = rare ? 6 : 3;
      return { resource: Resource.Wood, amount: n, max: n, seed: Resource.TreeSeed, inert: false };
    }
    case LifeKind.Plant: {
      const n = rare ? 8 : 4;
      return {
        resource: Resource.Berries,
        amount: n,
        max: n,
        seed: Resource.PlantSeed,
        inert: false,
      };
    }
    default:
      break;
  }

  // Lo inerte: finito, sin semilla y fuera del sistema de equilibrio.
  switch (f) {
    case Feature.RockNode:
      return { resource: Resource.Stone, amount: 2, max: 2, seed: null, inert: true };
    case Feature.CoalNode:
      return { resource: Resource.Coal, amount: 2, max: 5, seed: null, inert: true };
    case Feature.IronNode:
      return { resource: Resource.Iron, amount: 1, max: 2, seed: null, inert: true };
    case Feature.CopperNode:
      return { resource: Resource.Copper, amount: 2, max: 3, seed: null, inert: true };
    default:
      return null;
  }
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
