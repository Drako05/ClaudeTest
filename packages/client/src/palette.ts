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

/**
 * Los colores de partida de una especie: de cada uno saca el generador los
 * cuatro tonos de su dibujo (`ramp` en `tools/pixel-mundo.ts`). La forma y el
 * tamano de cada una, en su dibujo (`world-art.ts`) y en `tree-shapes.ts`.
 */
export interface SpeciesLook {
  /** La corteza, o los tallos de una mata. */
  readonly trunk: string;
  /** Las hojas. */
  readonly mid: string;
  /** Color de los frutos, si la especie los tiene. */
  readonly fruit?: string;
}

export const LOOKS: Partial<Record<Feature, SpeciesLook>> = {
  [Feature.ForestTree]: {
    trunk: '#4a3420', mid: '#2a5f23',
  },
  [Feature.ForestTreeRare]: {
    trunk: '#5a3f26', mid: '#a8761a',
  },
  [Feature.MeadowTree]: {
    trunk: '#6b4a2c', mid: '#438a33',
  },
  [Feature.MeadowTreeRare]: {
    trunk: '#6b4a2c', mid: '#bd5a8e',
  },
  [Feature.ForestPlant]: {
    trunk: '#3a5a24', mid: '#33682a', fruit: '#c8384a',
  },
  [Feature.ForestPlantRare]: {
    trunk: '#3a5a24', mid: '#2a6878', fruit: '#5fd8f0',
  },
  [Feature.MeadowPlant]: {
    trunk: '#4a6b2c', mid: '#3f7534', fruit: '#c8384a',
  },
  [Feature.MeadowPlantRare]: {
    trunk: '#4a6b2c', mid: '#8a7a2c', fruit: '#ffd75e',
  },
  // El frio: coniferas apagadas y azuladas, y matas bajas escarchadas.
  [Feature.TundraTree]: {
    trunk: '#4b4038', mid: '#2f5c52',
  },
  [Feature.TundraTreeRare]: {
    trunk: '#55483d', mid: '#54598c',
  },
  [Feature.TundraPlant]: {
    trunk: '#4a5148', mid: '#3a6158', fruit: '#d8e4ea',
  },
  [Feature.TundraPlantRare]: {
    trunk: '#4a5148', mid: '#63467a', fruit: '#e0b7ff',
  },
};

/** Los colores de un mineral: los de sus vetas y sus cristales. */
export interface OreTones {
  /** Luz, base, sombra y hondo. */
  readonly tones: readonly [string, string, string, string];
  /** El brillo del cristal. */
  readonly shine: string;
  /** Un tono que salpica las vetas (el cardenillo del cobre), o ninguno. */
  readonly accent: string | null;
}

/**
 * Los colores de cada mineral (el autor, 2026-10-20: «directo al juego»). Una
 * mena es la piedra de la roca con vetas del mineral y cristales que brotan de
 * ella (`ore-mesh.ts`, el boceto de `docs/bocetos/minerales/`). El cobre y el
 * carbon son los del boceto; el hierro no estaba en el boceto y es *deduccion*: los
 * tonos de antes de sus vetas, con una luz encima, mas claros que la roca (el
 * autor, 2026-10-17: «has la piedra un poco más oscura y el hierro un poco más
 * claro»).
 */
export const ORE_TONES: Partial<Record<Feature, OreTones>> = {
  [Feature.CoalNode]: { tones: ['#8b93a6', '#454953', '#2a2c33', '#15161a'], shine: '#d7e0f0', accent: null },
  [Feature.IronNode]: { tones: ['#e6cab6', '#c2a28e', '#9c7d6c', '#6e584e'], shine: '#fff3e8', accent: null },
  [Feature.CopperNode]: { tones: ['#ffd29c', '#ee9248', '#b95c2b', '#7a3519'], shine: '#fff1dc', accent: '#4fae8f' },
};

/**
 * El color de la piedra de la roca y de los minerales, base de sus cuatro
 * tonos. Mas oscuro desde el 2026-10-17 (el autor: «has la piedra un poco más
 * oscura»).
 */
export const ROCK_BASE = '#84848e';

/**
 * El color de cada estacion, base de los cuatro tonos de sus caras (`workbench`
 * y `furnace` en `tools/pixel-mundo.ts`, que ponen tambien los de su detalle:
 * la sierra, la brasa). **Mios.**
 */
export const STATION_BASE: Partial<Record<Feature, string>> = {
  [Feature.Workbench]: '#8a5a30',
  // Es de piedra, y se oscurecio con ella (2026-10-17; *deduccion*).
  [Feature.Furnace]: '#6c6c75',
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
 * variedad al estallido; en un mineral, la piedra de la roca y los colores
 * de sus vetas y sus cristales. Los brotes no se recolectan y no sueltan nada.
 */
export function debrisPalette(feature: Feature): number[] {
  if (feature === Feature.Pebbles) return colorsOf(PEBBLES);
  const ore = ORE_TONES[feature];
  if (ore) {
    const own = [...ore.tones, ore.shine, ...(ore.accent ? [ore.accent] : [])].map((c) => Number.parseInt(c.slice(1), 16));
    return [...new Set([...colorsOf(STONES[Feature.RockNode]!), ...own])];
  }
  const art = STONES[feature] ?? CROWNS[feature] ?? BUSHES[feature];
  if (art) return colorsOf(art);
  const station = STATION_ART[feature];
  return station ? colorsOf(station.top, station.side, station.front) : [];
}
