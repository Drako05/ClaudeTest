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

  /**
   * Guijarros sueltos en el suelo: la primera piedra, la que se coge con las
   * manos (decision del autor: una roca a mano no da nada). Inertes y finitos
   * como la roca, pero no estorban el paso.
   */
  Pebbles = 23,
}

/** Los tres minerales, en el orden en que se sortean. */
export const MINERAL_NODES: readonly Feature[] = [
  Feature.CoalNode,
  Feature.IronNode,
  Feature.CopperNode,
];

/** True si es roca o mineral: no cuenta como vida y no se repone. */
export function isInert(f: Feature): boolean {
  return f === Feature.RockNode || f === Feature.Pebbles || MINERAL_NODES.includes(f);
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
  if (isSapling(f) || f === Feature.Pebbles) return false;
  return isInert(f) || lifeKindOf(f) === LifeKind.Tree;
}

export enum Resource {
  Wood = 0,
  Stone = 1,
  Berries = 2,
  TreeSeed = 3,
  PlantSeed = 4,
  Coal = 5,
  /** Mineral, no metal: se funde en un horno (decision del autor). */
  Iron = 6,
  Copper = 7,
  /** Lo que suelta un arbol golpeado sin hacha. */
  Branch = 8,
  /** Lo que suelta un arbusto ademas de sus bayas. */
  Fiber = 9,
  StoneAxe = 10,
  StonePickaxe = 11,
}
/**
 * Cuantos objetos distintos hay. «Recurso» abarca tambien las herramientas:
 * todo lo que ocupa una casilla del inventario.
 */
export const RESOURCE_COUNT = 12;
export const RESOURCE_NAMES: readonly string[] = [
  'Madera',
  'Piedra',
  'Bayas',
  'Semilla de arbol',
  'Semilla de planta',
  'Carbon',
  'Mineral de hierro',
  'Mineral de cobre',
  'Rama',
  'Fibra',
  'Hacha de piedra',
  'Pico de piedra',
];

// ---------------------------------------------------------------- herramientas

/**
 * Con que se trabaja cada cosa. Decision del autor: **trabajo por golpes**,
 * cada objeto pide varios y una herramienta mejor pide menos, y con las manos
 * algunos no se completan.
 */
export enum ToolKind {
  Hand = 0,
  Axe = 1,
  Pickaxe = 2,
}

export interface ToolStats {
  kind: ToolKind;
  /** Trabajo que suma cada golpe a lo de su clase. */
  power: number;
  /** Nivel: el hierro pide un pico de nivel 2 (cobre). */
  tier: number;
  /** Golpes utiles hasta romperse (decision del autor: se desgastan). */
  uses: number;
}

/** Las cifras son **propuesta mia** (plan de la tanda 1), no del autor. */
export function toolStats(item: Resource): ToolStats | null {
  switch (item) {
    case Resource.StoneAxe:
      return { kind: ToolKind.Axe, power: 1, tier: 1, uses: 40 };
    case Resource.StonePickaxe:
      return { kind: ToolKind.Pickaxe, power: 1, tier: 1, uses: 40 };
    default:
      return null;
  }
}

/** Cuantos caben en una casilla: uno si es herramienta, veinte si no. */
export function stackMax(item: Resource): number {
  return toolStats(item) ? 1 : 20;
}

export interface Work {
  /** Con que se trabaja. `Hand` quiere decir que vale cualquier cosa. */
  tool: ToolKind;
  /** Nivel minimo de la herramienta. */
  tier: number;
  /** Golpes de poder 1 que pide. */
  work: number;
}

/**
 * Lo que pide cada objeto para recolectarse. `null` si no se recolecta (un
 * brote, o nada). Cifras **propuestas mias** (plan de la tanda 1).
 */
export function workOf(f: Feature): Work | null {
  if (!harvestOf(f)) return null;
  switch (lifeKindOf(f)) {
    case LifeKind.Tree:
      return { tool: ToolKind.Axe, tier: 1, work: isRare(f) ? 6 : 4 };
    case LifeKind.Plant:
      return { tool: ToolKind.Hand, tier: 0, work: 1 };
    default:
      break;
  }
  switch (f) {
    case Feature.Pebbles:
      return { tool: ToolKind.Hand, tier: 0, work: 1 };
    case Feature.RockNode:
      return { tool: ToolKind.Pickaxe, tier: 1, work: 3 };
    case Feature.CoalNode:
      return { tool: ToolKind.Pickaxe, tier: 1, work: 4 };
    case Feature.CopperNode:
      return { tool: ToolKind.Pickaxe, tier: 1, work: 5 };
    case Feature.IronNode:
      return { tool: ToolKind.Pickaxe, tier: 2, work: 6 };
    default:
      return null;
  }
}

// ---------------------------------------------------------------- fabricar

/** Donde se fabrica: lo basico, a mano en cualquier sitio (decision del autor). */
export enum Station {
  Hand = 0,
}

export interface Recipe {
  output: Resource;
  count: number;
  inputs: readonly { item: Resource; count: number }[];
  station: Station;
}

/**
 * Las recetas, por indice: el indice es lo que viaja en la `Intent`. Cifras
 * **propuestas mias** (plan de la tanda 1).
 */
export const RECIPES: readonly Recipe[] = [
  {
    output: Resource.StoneAxe,
    count: 1,
    inputs: [
      { item: Resource.Branch, count: 3 },
      { item: Resource.Stone, count: 2 },
      { item: Resource.Fiber, count: 2 },
    ],
    station: Station.Hand,
  },
  {
    output: Resource.StonePickaxe,
    count: 1,
    inputs: [
      { item: Resource.Branch, count: 3 },
      { item: Resource.Stone, count: 3 },
      { item: Resource.Fiber, count: 2 },
    ],
    station: Station.Hand,
  },
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
    case Feature.Pebbles:
      return { resource: Resource.Stone, amount: 1, max: 1, seed: null, inert: true };
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
  /**
   * Direccion deseada. **Solo la direccion**: su magnitud no dice nada.
   *
   * Lo dijo el autor al pedir la carrera: antes el joystick hacia de acelerador
   * —cuanto mas desplazado, mas rapido— y eso se sustituye por dos velocidades
   * discretas, marcha y carrera, que elige `run`. Un mando analogico apunta;
   * no dosifica.
   */
  moveX: number;
  moveY: number;
  harvest: boolean;
  eat: boolean;
  /** Sembrar en el tile mirado. */
  plant: boolean;
  /**
   * Saltar. Solo hace algo con los pies en el suelo.
   *
   * Viaja en la Intent como todo lo demas (regla 5): el salto es una decision
   * del jugador, no un estado del cliente, y tiene que poder ir por red igual
   * que andar.
   */
  jump: boolean;
  /**
   * Correr. Es un ESTADO, no una pulsacion: viaja puesto en cada tick mientras
   * el interruptor este encendido.
   *
   * Va en la Intent y no en el cliente por la regla 5: la velocidad a la que se
   * mueve un personaje es cosa de la simulacion, y un servidor autoritativo
   * tiene que poder saberla sin preguntarle al navegador.
   */
  run: boolean;
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
  /**
   * Componente vertical de la mirada: el seno de su inclinacion, negativo hacia
   * abajo. Decide que segunda altura alcanza la accion —la de arriba, o la de
   * abajo si se mira hacia abajo mas de 25 grados— (`levelStep` en `sim/aim.ts`).
   * Sale de la camara, como `aimX`/`aimY`.
   */
  aimZ: number;
  /** Casilla de la barra que se quiere en la mano, o -1 si no cambia. */
  select: number;
  /** Receta que se quiere fabricar (indice en `RECIPES`), o -1. */
  craft: number;
  /** Intercambiar dos casillas del inventario; -1 si no. */
  swapA: number;
  swapB: number;
  /** Casilla que se tira, o -1. */
  discard: number;
}

export function emptyIntent(): Intent {
  return {
    moveX: 0,
    moveY: 0,
    harvest: false,
    eat: false,
    plant: false,
    jump: false,
    run: false,
    aimX: 0,
    aimY: 0,
    aimZ: 0,
    select: -1,
    craft: -1,
    swapA: -1,
    swapB: -1,
    discard: -1,
  };
}
