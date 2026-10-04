/**
 * Vocabulario comun entre sim, client y (a futuro) server.
 * No contiene logica de juego: solo los tipos y las constantes del proyecto.
 */

export * from './base.js';
export * from './ecology.js';
export * from './fauna.js';
export * from './fauna-body.js';

import { BiomeKind, CHUNK_SIZE, LifeKind, Terrain } from './base.js';
import { AnimalClass, animalMass, SPECIES, Species, Stage } from './fauna.js';

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

  /**
   * Las estaciones de fabricacion (tanda 2). No las genera el mundo nunca: solo
   * las pone el jugador, con USAR y la estacion en la mano, asi que viven en el
   * overlay (regla 4). Estorban el paso y se desmontan a mano con 3 golpes
   * (decisiones del autor).
   */
  Workbench = 24,
  Furnace = 25,
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

/**
 * Features que bloquean el paso de arriba abajo. Los brotes no estorban: aun
 * son pequenos. Las estaciones tampoco estan aqui: no son un muro sino suelo
 * que se pisa (`stationHeight`), y estorban de lado por la regla 21, como una
 * pared de terreno.
 */
export function isFeatureSolid(f: Feature): boolean {
  if (isSapling(f) || f === Feature.Pebbles) return false;
  return isInert(f) || lifeKindOf(f) === LifeKind.Tree;
}

/** True si es una estacion de fabricacion puesta por el jugador. */
export function isStation(f: Feature): boolean {
  return f === Feature.Workbench || f === Feature.Furnace;
}

/**
 * Lo que mide de alto una estacion, o 0 si no lo es. **Es suelo que se pisa**
 * (decision del autor, 2026-09-30: fisica como un bloque, se choca de lado y se
 * sube encima), asi que entra en `World.floorHeightAt`. El horno mide mas que el
 * salto a proposito: «que haya bloques de diferente altura sera una de las
 * caracteristicas del juego». Las medidas son propuesta mia.
 */
export function stationHeight(f: Feature): number {
  if (f === Feature.Workbench) return 1;
  if (f === Feature.Furnace) return 1.25;
  return 0;
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
  // Tanda 2. Al final, para no mover los numeros de los que ya existian.
  /** Lo que sale del horno (decision del autor: los metales se funden). */
  CopperIngot = 12,
  IronIngot = 13,
  CopperAxe = 14,
  CopperPickaxe = 15,
  IronAxe = 16,
  IronPickaxe = 17,
  /** Las estaciones, en la mano: USAR las coloca donde toca la mirada. */
  Workbench = 18,
  Furnace = 19,
  /** La ropa: se equipa en PERSONAJE y abre casillas (decision del autor). */
  FiberBag = 20,
  FrameBackpack = 21,
  // Fauna, primera tanda: lo que sueltan los animales (decision del autor: la
  // carne se asa en el horno y la asada se come; lo demas espera su uso).
  RawMeat = 22,
  CookedMeat = 23,
  Hide = 24,
  Feather = 25,
  Shell = 26,
  // Las primeras armas (decision del autor, 2026-10-04): se equipan en la
  // casilla Arma de PERSONAJE y golpean a los seres vivos.
  StoneDagger = 27,
  CopperSword = 28,
  IronSword = 29,
}
/**
 * Cuantos objetos distintos hay. «Recurso» abarca tambien las herramientas:
 * todo lo que ocupa una casilla del inventario.
 */
export const RESOURCE_COUNT = 30;
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
  'Lingote de cobre',
  'Lingote de hierro',
  'Hacha de cobre',
  'Pico de cobre',
  'Hacha de hierro',
  'Pico de hierro',
  'Mesa de trabajo',
  'Horno',
  'Bolsa de fibra',
  'Mochila de armazon',
  'Carne cruda',
  'Carne asada',
  'Piel',
  'Pluma',
  'Caparazon',
  'Punal de piedra',
  'Espada de cobre',
  'Espada de hierro',
];

/**
 * Lo que suelta un animal y aun no sirve para nada, esperando su tanda
 * (decision del autor, 2026-10-02). El test de «todo recurso tiene destino» lo
 * acepta solo si esta aqui con su nombre: un objeto nuevo sin uso que no se
 * anada a esta lista lo sigue haciendo caer.
 */
export const AWAITING_USE: readonly Resource[] = [Resource.Hide, Resource.Feather, Resource.Shell];

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
  /**
   * Un arma: no trabaja nada (poder 0, asi no casa con lo que pide hacha o
   * pico) y contra lo inerte pega como la mano. Su `damage` es lo que hace a
   * un ser vivo.
   */
  Weapon = 3,
}

export interface ToolStats {
  kind: ToolKind;
  /** Trabajo que suma cada golpe a lo de su clase. */
  power: number;
  /** Nivel: el hierro pide un pico de nivel 2 (cobre). */
  tier: number;
  /**
   * Golpes hasta romperse (decision del autor: se desgastan). **Todo golpe que
   * toca algo gasta uno**, sea suyo o no (el autor, 2026-10-04).
   */
  uses: number;
  /** Daño a un ser vivo, en PV, si no es el de su poder (`strikeDamage`): las armas. */
  damage?: number;
}

/**
 * Las de piedra son **propuesta mia** (plan de la tanda 1); las de metal, del
 * plan de la tanda 2 que aprobo el autor: cobre poder 2 y 120 usos, hierro
 * poder 3 y 250. El nivel sube uno por metal, asi el pico de cobre mina hierro.
 */
export function toolStats(item: Resource): ToolStats | null {
  switch (item) {
    case Resource.StoneAxe:
      return { kind: ToolKind.Axe, power: 1, tier: 1, uses: 40 };
    case Resource.StonePickaxe:
      return { kind: ToolKind.Pickaxe, power: 1, tier: 1, uses: 40 };
    case Resource.CopperAxe:
      return { kind: ToolKind.Axe, power: 2, tier: 2, uses: 120 };
    case Resource.CopperPickaxe:
      return { kind: ToolKind.Pickaxe, power: 2, tier: 2, uses: 120 };
    case Resource.IronAxe:
      return { kind: ToolKind.Axe, power: 3, tier: 3, uses: 250 };
    case Resource.IronPickaxe:
      return { kind: ToolKind.Pickaxe, power: 3, tier: 3, uses: 250 };
    // Las armas (decision del autor, 2026-10-04): el daño, suyo; que duren
    // menos que la herramienta de su material, tambien. Los usos, tres cuartos
    // de los de esa herramienta, son **deduccion mia**.
    case Resource.StoneDagger:
      return { kind: ToolKind.Weapon, power: 0, tier: 0, uses: 30, damage: 15 };
    case Resource.CopperSword:
      return { kind: ToolKind.Weapon, power: 0, tier: 0, uses: 90, damage: 30 };
    case Resource.IronSword:
      return { kind: ToolKind.Weapon, power: 0, tier: 0, uses: 180, damage: 45 };
    default:
      return null;
  }
}

/**
 * Cuantos caben en una casilla: uno si es herramienta o equipable, cien si no
 * (el autor). Las estaciones se apilan como un material (propuesta mia).
 */
export function stackMax(item: Resource): number {
  return toolStats(item) || equipOf(item) !== null ? 1 : 100;
}

// ---------------------------------------------------------------- equipables

/**
 * Las catorce casillas de PERSONAJE, en orden de lectura de la rejilla
 * (decision del autor, 2026-10-04): tres filas de una a la izquierda del
 * dibujo y dos a su derecha, y cinco debajo. El indice es tambien el orden en
 * que el panel las pone. La mayoria aun no tiene nada que ponerse.
 */
export enum Equip {
  Cape = 0,
  Helmet = 1,
  Shoulders = 2,
  /** Lo que da casillas de inventario: la bolsa o la mochila, una sola. */
  Bag = 3,
  Chest = 4,
  Necklace = 5,
  Belt = 6,
  Pants = 7,
  Ring = 8,
  Boots = 9,
  Pet = 10,
  Mount = 11,
  /** El arma equipada golpea a los seres vivos, lleves lo que lleves en la mano. */
  Weapon = 12,
  Emblem = 13,
}
export const EQUIP_COUNT = 14;
export const EQUIP_NAMES: readonly string[] = [
  'Capa',
  'Casco',
  'Hombreras',
  'Bolso',
  'Pechera',
  'Collar',
  'Cinturon',
  'Pantalon',
  'Anillo',
  'Botas',
  'Mascota',
  'Montura',
  'Arma',
  'Emblema',
];

/** La casilla de PERSONAJE donde va un objeto, o `null` si no se equipa. */
export function equipOf(item: Resource): Equip | null {
  if (item === Resource.FiberBag || item === Resource.FrameBackpack) return Equip.Bag;
  if (toolStats(item)?.kind === ToolKind.Weapon) return Equip.Weapon;
  return null;
}

/**
 * El tramo fijo de casillas del Bolso, detras de las base: lo que abre lo mas
 * grande que cabe en el (la mochila).
 */
export const BAG_RANGE = 6;

/** Casillas que abre lo que va en el Bolso (plan de la tanda 2): 0 si no es bolso. */
export function bagCapacity(item: Resource | null): number {
  if (item === Resource.FiberBag) return 2;
  if (item === Resource.FrameBackpack) return 6;
  return 0;
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
    // Una estacion se desmonta a mano con 3 golpes (plan aprobado).
    case Feature.Workbench:
    case Feature.Furnace:
      return { tool: ToolKind.Hand, tier: 0, work: 3 };
    default:
      return null;
  }
}

// ---------------------------------------------------------------- fabricar

/**
 * Donde se fabrica: lo basico, a mano en cualquier sitio; lo mejor, en una mesa
 * o un horno (decision del autor). Las recetas de una estacion solo se ven al
 * usarla, y solo se fabrican con ella al alcance (`stationNear`).
 */
export enum Station {
  Hand = 0,
  Workbench = 1,
  Furnace = 2,
}


export const STATION_NAMES: readonly string[] = ['A mano', 'Mesa de trabajo', 'Horno'];

/** La feature que es cada estacion puesta en el mundo. */
export function featureOfStation(s: Station): Feature {
  if (s === Station.Workbench) return Feature.Workbench;
  if (s === Station.Furnace) return Feature.Furnace;
  return Feature.None;
}

/** La estacion que es una feature, o `null`. */
export function stationOfFeature(f: Feature): Station | null {
  if (f === Feature.Workbench) return Station.Workbench;
  if (f === Feature.Furnace) return Station.Furnace;
  return null;
}

/** La feature que se coloca al USAR un objeto de la mano, o `None`. */
export function placedFeatureOf(item: Resource): Feature {
  if (item === Resource.Workbench) return Feature.Workbench;
  if (item === Resource.Furnace) return Feature.Furnace;
  return Feature.None;
}

export interface Recipe {
  /** Categoria del recetario; cada estacion ensena solo las suyas. */
  category: string;
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
    category: 'Herramientas',
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
    category: 'Herramientas',
    output: Resource.StonePickaxe,
    count: 1,
    inputs: [
      { item: Resource.Branch, count: 3 },
      { item: Resource.Stone, count: 3 },
      { item: Resource.Fiber, count: 2 },
    ],
    station: Station.Hand,
  },

  // Tanda 2: cifras del plan que aprobo el autor. Las categorias son mias.
  {
    category: 'Estaciones',
    output: Resource.Workbench,
    count: 1,
    inputs: [{ item: Resource.Wood, count: 8 }],
    station: Station.Hand,
  },
  {
    category: 'Estaciones',
    output: Resource.Furnace,
    count: 1,
    inputs: [
      { item: Resource.Stone, count: 10 },
      { item: Resource.Coal, count: 2 },
    ],
    station: Station.Hand,
  },
  {
    category: 'Fundicion',
    output: Resource.CopperIngot,
    count: 1,
    inputs: [
      { item: Resource.Copper, count: 2 },
      { item: Resource.Coal, count: 1 },
    ],
    station: Station.Furnace,
  },
  {
    category: 'Fundicion',
    output: Resource.IronIngot,
    count: 1,
    inputs: [
      { item: Resource.Iron, count: 2 },
      { item: Resource.Coal, count: 2 },
    ],
    station: Station.Furnace,
  },
  {
    category: 'Herramientas',
    output: Resource.CopperAxe,
    count: 1,
    inputs: [
      { item: Resource.Branch, count: 2 },
      { item: Resource.CopperIngot, count: 3 },
    ],
    station: Station.Workbench,
  },
  {
    category: 'Herramientas',
    output: Resource.CopperPickaxe,
    count: 1,
    inputs: [
      { item: Resource.Branch, count: 2 },
      { item: Resource.CopperIngot, count: 3 },
    ],
    station: Station.Workbench,
  },
  {
    category: 'Herramientas',
    output: Resource.IronAxe,
    count: 1,
    inputs: [
      { item: Resource.Branch, count: 2 },
      { item: Resource.IronIngot, count: 3 },
    ],
    station: Station.Workbench,
  },
  {
    category: 'Herramientas',
    output: Resource.IronPickaxe,
    count: 1,
    inputs: [
      { item: Resource.Branch, count: 2 },
      { item: Resource.IronIngot, count: 3 },
    ],
    station: Station.Workbench,
  },
  {
    category: 'Ropa',
    output: Resource.FiberBag,
    count: 1,
    inputs: [{ item: Resource.Fiber, count: 8 }],
    station: Station.Workbench,
  },
  {
    category: 'Ropa',
    output: Resource.FrameBackpack,
    count: 1,
    inputs: [
      { item: Resource.Fiber, count: 10 },
      { item: Resource.Wood, count: 4 },
      { item: Resource.CopperIngot, count: 2 },
    ],
    station: Station.Workbench,
  },

  // Fauna, primera tanda: asar en el horno (decision del autor). Las cifras y la
  // categoria son deduccion mia.
  {
    category: 'Cocina',
    output: Resource.CookedMeat,
    count: 2,
    inputs: [
      { item: Resource.RawMeat, count: 2 },
      { item: Resource.Coal, count: 1 },
    ],
    station: Station.Furnace,
  },
  // Las primeras armas (decision del autor, 2026-10-04, recetas y categoria
  // propuestas mias que aprobo). Al final, para no mover los indices.
  {
    category: 'Armas',
    output: Resource.StoneDagger,
    count: 1,
    inputs: [
      { item: Resource.Branch, count: 1 },
      { item: Resource.Stone, count: 2 },
      { item: Resource.Fiber, count: 1 },
    ],
    station: Station.Hand,
  },
  {
    category: 'Armas',
    output: Resource.CopperSword,
    count: 1,
    inputs: [
      { item: Resource.Branch, count: 1 },
      { item: Resource.CopperIngot, count: 4 },
    ],
    station: Station.Workbench,
  },
  {
    category: 'Armas',
    output: Resource.IronSword,
    count: 1,
    inputs: [
      { item: Resource.Branch, count: 1 },
      { item: Resource.IronIngot, count: 4 },
    ],
    station: Station.Workbench,
  },
];

// ---------------------------------------------------------------- fauna

/**
 * El daño de un golpe a algo vivo, en PV (es el primer daño que hay). A mano,
 * 5; con herramienta, 10 por punto de su poder, y vale cualquier hacha o pico.
 * **Deduccion mia.** Asi una liebre adulta (38) cae en 8 golpes a mano y en 2
 * con hierro, y un bisonte adulto (205) en 7 con hierro. Las armas traen el
 * suyo (`ToolStats.damage`, del autor): 15, 30 y 45.
 */
export const HAND_DAMAGE = 5;
export const DAMAGE_PER_POWER = 10;

export function strikeDamage(stats: ToolStats | null): number {
  if (!stats) return HAND_DAMAGE;
  return stats.damage ?? DAMAGE_PER_POWER * stats.power;
}

/**
 * La carne cruda que da una masa: `0,6 × √(kg)`, redondeada, 1 como minimo.
 * **Deduccion mia.** La raiz, como la densidad, conserva el orden sin que un
 * bisonte llene medio inventario: 15 el adulto, 1 una liebre.
 */
export function meatOf(massKg: number): number {
  return Math.max(1, Math.round(0.6 * Math.sqrt(massKg)));
}

/**
 * Lo que suelta un animal de una etapa (todo **deduccion mia**):
 * - carne cruda segun su masa, salvo el cangrejo, que da su caparazon;
 * - piel, 1 de cada mamifero joven o adulto y 2 del bisonte adulto;
 * - plumas de la gaviota, 1, 2 o 3 segun la etapa;
 * - caparazon del cangrejo joven o adulto.
 */
export function animalLoot(species: Species, stage: Stage): { item: Resource; count: number }[] {
  const info = SPECIES[species];
  const out: { item: Resource; count: number }[] = [];
  if (info.cls !== AnimalClass.Crustacean) {
    out.push({ item: Resource.RawMeat, count: meatOf(animalMass(species, stage)) });
  }
  if (info.cls === AnimalClass.Mammal && stage !== Stage.Infant) {
    const hides = species === Species.Bison && stage === Stage.Adult ? 2 : 1;
    out.push({ item: Resource.Hide, count: hides });
  }
  if (info.cls === AnimalClass.Bird) out.push({ item: Resource.Feather, count: stage + 1 });
  if (info.cls === AnimalClass.Crustacean && stage !== Stage.Infant) {
    out.push({ item: Resource.Shell, count: 1 });
  }
  return out;
}

/**
 * Cuanta hambre llena comer cada cosa, o 0 si no se come. Las bayas, 14, como
 * siempre; la carne asada, 35 (**deduccion mia**: la carne cocinada tiene unas
 * cinco veces mas calorias por peso que una baya, rebajado a la mitad). La
 * cruda no se come.
 */
export function foodValue(item: Resource): number {
  if (item === Resource.Berries) return 14;
  if (item === Resource.CookedMeat) return 35;
  return 0;
}

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
    // Desmontar una estacion devuelve la estacion, entera.
    case Feature.Workbench:
      return { resource: Resource.Workbench, amount: 1, max: 1, seed: null, inert: true };
    case Feature.Furnace:
      return { resource: Resource.Furnace, amount: 1, max: 1, seed: null, inert: true };
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
  /**
   * Usar o interactuar (clic derecho, boton USAR). Mirando una estacion, la
   * abre; si no, con lo que se lleva en la mano: una baya se come, una semilla
   * se siembra y una estacion se coloca. Decisiones del autor: sustituye a
   * comer y sembrar por tecla.
   */
  use: boolean;
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
   * Golpe en **modo preciso**: solo el primer objetivo del centro de la mira.
   * Apagado, el barrido de siempre (regla 12). Es un ESTADO, como `run`: viaja
   * puesto cada tick mientras el modo este elegido (decision del autor,
   * 2026-09-30: TAB o el boton MODO).
   */
  precise: boolean;
  /**
   * **Auto salto** (decision del autor, 2026-09-30; boton del movil): andando
   * hacia un bloque que se sube de un salto, se salta solo justo antes de
   * chocar. Es un ESTADO, como `run`; lo que decide si toca saltar es el
   * nucleo (`systems/autojump.ts`), que es quien sabe de alturas.
   */
  autoJump: boolean;
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
   * abajo. Inclina el sector del golpe y decide donde toca el suelo para
   * sembrar (regla 12, `sim/aim.ts`). Sale de la camara, como `aimX`/`aimY`.
   */
  aimZ: number;
  /**
   * Giro del plano del sector del barrido alrededor de la mirada, en radianes
   * (positivo: su derecha sube). 0 es el de siempre; lo usa el modo TAP para
   * que el barrido se vea horizontal en pantalla tocando a un lado (decision
   * del autor, 2026-10-01). El golpe preciso, sembrar y abrir no lo miran.
   */
  aimRoll: number;
  /** Casilla de la barra que se quiere en la mano, o -1 si no cambia. */
  select: number;
  /** Receta que se quiere fabricar (indice en `RECIPES`), o -1. */
  craft: number;
  /**
   * Mover lo de una casilla a otra (arrastrar): el mismo objeto se apila y uno
   * distinto se intercambia. Los huecos de PERSONAJE tienen indice propio
   * (`equipSlot` en `sim/inventory.ts`): hacia ellos se equipa, desde ellos se
   * quita. -1 si no.
   */
  moveFrom: number;
  moveTo: number;
  /** Casilla que se tira, o -1. */
  discard: number;
}

export function emptyIntent(): Intent {
  return {
    moveX: 0,
    moveY: 0,
    harvest: false,
    use: false,
    jump: false,
    run: false,
    precise: false,
    autoJump: false,
    aimX: 0,
    aimY: 0,
    aimZ: 0,
    aimRoll: 0,
    select: -1,
    craft: -1,
    moveFrom: -1,
    moveTo: -1,
    discard: -1,
  };
}
