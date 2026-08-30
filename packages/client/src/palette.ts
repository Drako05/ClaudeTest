/**
 * Los colores de cada especie, en un sitio y sin DOM.
 *
 * Estaban dentro de `tiles.ts`, junto al codigo que los pinta. Salieron aqui
 * porque ahora hay un segundo consumidor: los escombros que saltan al recolectar
 * algo tienen que ser **los colores de ese objeto**, no unos parecidos. Con la
 * tabla compartida no pueden separarse; con una copia, se separarian al primer
 * retoque.
 *
 * Sin dependencias del navegador, para poder comprobarlo en Node igual que
 * `projection.ts`.
 */

import { Feature } from '@verdant/shared';

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
  [Feature.IronNode]: ['#5d4a41', '#87695a', '#a98a78'],
  [Feature.CopperNode]: ['#6b4326', '#a5643a', '#d19a5c'],
};

/** Las tres caras de la roca, en el mismo orden en que se pintan. */
export const ROCK_FACES: readonly string[] = ['#6f6f78', '#9a9aa4', '#b8b8c2'];

function toHex(color: string): number {
  return Number.parseInt(color.slice(1), 16);
}

/**
 * Colores que sueltan los escombros de una feature al ser derribada.
 *
 * El tronco va aparte de la copa porque al talar un arbol saltan las dos cosas,
 * y el fruto entra cuando la especie lo tiene: son los rojos y amarillos que
 * dan variedad al estallido de un arbusto.
 */
export function debrisPalette(feature: Feature): number[] {
  if (feature === Feature.RockNode) return ROCK_FACES.map(toHex);
  const mineral = MINERAL_FACES[feature];
  if (mineral) return mineral.map(toHex);

  const look = LOOKS[feature];
  if (!look) return [];

  const colors = [look.dark, look.mid, look.light, look.trunk];
  if (look.fruit) colors.push(look.fruit);
  return colors.map(toHex);
}
