/**
 * Los colores de cada especie, en un sitio y sin DOM.
 *
 * Desde el pixelart del mundo (2026-10-19) son **los colores de partida** del
 * generador (`tools/pixel-mundo.ts`), que saca de cada uno los cuatro tonos de
 * su dibujo. Lo que se ve son esos dibujos (`world-art.ts`), y de ellos salen
 * tambien los escombros (`debrisPalette`): las astillas de algo tienen que ser
 * **los colores de ese objeto**, no unos parecidos.
 *
 * Sin dependencias del navegador, para poder comprobarlo en Node.
 */

import { Feature, Terrain } from '@verdant/shared';
import { BUSHES, CROWNS, PEBBLES, STATION_ART, STONES, type WorldArt } from './world-art.js';

/**
 * El color de cada suelo. De el saca el generador los cuatro tonos de sus
 * teselas, con el de partida como base: el suelo se ve con los colores de
 * siempre, ahora en pixelart.
 */
export const TERRAIN_RGB: Record<Terrain, [number, number, number]> = {
  [Terrain.DeepWater]: [22, 48, 82],
  [Terrain.Water]: [41, 96, 148],
  [Terrain.Sand]: [214, 197, 142],
  [Terrain.Grass]: [88, 140, 72],
  [Terrain.Forest]: [56, 100, 52],
  [Terrain.Rock]: [116, 116, 124],
  [Terrain.Snow]: [226, 234, 242],
  [Terrain.Tundra]: [150, 156, 130],
};

/** Paleta de una especie. Basta esto para distinguirlas de un vistazo. */
export interface SpeciesLook {
  /** Silueta: los arboles de bosque son altos y estrechos; los de pradera, anchos. */
  readonly form: 'conifer' | 'broadleaf' | 'bush';
  readonly trunk: string;
  readonly dark: string;
  readonly mid: string;
  readonly light: string;
  /** Color de los frutos, si la especie los tiene. */
  readonly fruit?: string;
  /** Las variantes raras se dibujan algo mas grandes ademas de con otro color. */
  readonly rare: boolean;
}

export const LOOKS: Partial<Record<Feature, SpeciesLook>> = {
  [Feature.ForestTree]: {
    form: 'conifer', trunk: '#4a3420', dark: '#1d4419', mid: '#2a5f23', light: '#3d7d31', rare: false,
  },
  [Feature.ForestTreeRare]: {
    form: 'conifer', trunk: '#5a3f26', dark: '#7a5410', mid: '#a8761a', light: '#d9a531', rare: true,
  },
  [Feature.MeadowTree]: {
    form: 'broadleaf', trunk: '#6b4a2c', dark: '#2f6b28', mid: '#438a33', light: '#5aa844', rare: false,
  },
  [Feature.MeadowTreeRare]: {
    form: 'broadleaf', trunk: '#6b4a2c', dark: '#8e3567', mid: '#bd5a8e', light: '#e08cb4', rare: true,
  },
  [Feature.ForestPlant]: {
    form: 'bush', trunk: '#3a5a24', dark: '#24501f', mid: '#33682a', light: '#457f36', fruit: '#c8384a', rare: false,
  },
  [Feature.ForestPlantRare]: {
    form: 'bush', trunk: '#3a5a24', dark: '#1f4650', mid: '#2a6878', light: '#3f93a6', fruit: '#5fd8f0', rare: true,
  },
  [Feature.MeadowPlant]: {
    form: 'bush', trunk: '#4a6b2c', dark: '#2f5a28', mid: '#3f7534', light: '#57944a', fruit: '#c8384a', rare: false,
  },
  [Feature.MeadowPlantRare]: {
    form: 'bush', trunk: '#4a6b2c', dark: '#5a5220', mid: '#8a7a2c', light: '#c4b04a', fruit: '#ffd75e', rare: true,
  },
  // El frio: coniferas apagadas y azuladas, y matas bajas escarchadas.
  [Feature.TundraTree]: {
    form: 'conifer', trunk: '#4b4038', dark: '#20423c', mid: '#2f5c52', light: '#477a6c', rare: false,
  },
  [Feature.TundraTreeRare]: {
    form: 'conifer', trunk: '#55483d', dark: '#3a3f63', mid: '#54598c', light: '#7c82bd', rare: true,
  },
  [Feature.TundraPlant]: {
    form: 'bush', trunk: '#4a5148', dark: '#2b4a44', mid: '#3a6158', light: '#4f7d70', fruit: '#d8e4ea', rare: false,
  },
  [Feature.TundraPlantRare]: {
    form: 'bush', trunk: '#4a5148', dark: '#453055', mid: '#63467a', light: '#8c66a8', fruit: '#e0b7ff', rare: true,
  },
};

/**
 * Las tres caras de cada mineral, en el mismo orden que las de la roca.
 *
 * Comparten forma con la roca y se distinguen por color, que es lo que hace que
 * se lean como vetas del mismo material y no como objetos ajenos.
 */
export const MINERAL_FACES: Partial<Record<Feature, readonly string[]>> = {
  [Feature.CoalNode]: ['#2b2b31', '#3d3d45', '#55555f'],
  // Mas claro que la roca, para no confundirse con ella (el autor,
  // 2026-10-17: «has la piedra un poco más oscura y el hierro un poco más
  // claro», en los iconos y en el mundo).
  [Feature.IronNode]: ['#6e584e', '#9c7d6c', '#c2a28e'],
  [Feature.CopperNode]: ['#6b4326', '#a5643a', '#d19a5c'],
};

/** Las tres caras de la roca, en el mismo orden en que se pintan. Mas oscuras desde el 2026-10-17 (el autor). */
export const ROCK_FACES: readonly string[] = ['#5c5c65', '#84848e', '#a1a1ab'];

/**
 * Los colores de las estaciones, de oscuro a claro, y el de su detalle (la
 * sierra de la mesa, la brasa del horno). De aqui salen su dibujo
 * (`stations-view.ts`) y sus escombros, como con las especies. **Mios.**
 */
export const STATION_FACES: Partial<Record<Feature, readonly string[]>> = {
  [Feature.Workbench]: ['#5a3a1e', '#8a5a30', '#b07a44', '#c9cdd2'],
  // Es de piedra, y se oscurecio con ella (2026-10-17; *deduccion*).
  [Feature.Furnace]: ['#48484f', '#6c6c75', '#8d8d97', '#ff8a2a'],
};

/** Los colores de unos dibujos, sin repetir, como numeros. */
function colorsOf(...arts: readonly WorldArt[]): number[] {
  const all = new Set(arts.flatMap((art) => Object.values(art.palette)));
  return [...all].map((color) => Number.parseInt(color.slice(1), 16));
}

/**
 * Colores que sueltan los escombros de una feature al ser derribada: **los de
 * su dibujo** (`world-art.ts`), todos. En un arbol saltan la copa y la corteza;
 * en una mata, tambien sus frutos, que son los rojos y amarillos que dan
 * variedad al estallido; en un mineral, su piedra y sus vetas. Los brotes no
 * se recolectan y no sueltan nada.
 */
export function debrisPalette(feature: Feature): number[] {
  if (feature === Feature.Pebbles) return colorsOf(PEBBLES);
  const art = STONES[feature] ?? CROWNS[feature] ?? BUSHES[feature];
  if (art) return colorsOf(art);
  const station = STATION_ART[feature];
  return station ? colorsOf(station.top, station.side, station.front) : [];
}
