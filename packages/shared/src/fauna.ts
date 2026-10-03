/**
 * La fauna: las especies, sus etapas y los numeros que salen de la vida real.
 *
 * Primera tanda (decisiones del autor, 2026-10-02): dos animales reales por
 * bioma de tierra, tres etapas —cria, joven y adulto— y dos sexos sin
 * diferencias de dibujo, que de momento **solo deambulan**. El oceano queda
 * escrito para la tanda del nado (`docs/fauna.md`).
 *
 * Todo lo de aqui sale de unos pocos datos reales por especie —masa, alto,
 * densidad, tamano de grupo— y de formulas comunes, para que una especie nueva
 * se anada con sus datos y no con numeros elegidos a ojo. Que formula y que
 * constante son del autor y cuales deduccion mia lo dice cada una, y las
 * deducciones estan en `docs/pendiente.md`.
 *
 * Solo depende de `base.ts`: `index.ts` reexporta este modulo, y lo que necesita
 * los recursos (el botin) vive alli, para no cerrar un ciclo de importacion.
 */

import { BiomeKind } from './base.js';

export enum Species {
  Hare = 0,
  Bison = 1,
  RedDeer = 2,
  Boar = 3,
  Reindeer = 4,
  ArcticFox = 5,
  Ibex = 6,
  Marmot = 7,
  Crab = 8,
  Gull = 9,
}
export const SPECIES_COUNT = 10;

export enum Stage {
  Infant = 0,
  Juvenile = 1,
  Adult = 2,
}
export const STAGE_COUNT = 3;

/** Los dos sexos. De momento no cambian ni el dibujo ni los numeros (el autor). */
export enum Sex {
  Female = 0,
  Male = 1,
}

/** Que clase de animal es: decide que botin suelta ademas de la carne. */
export enum AnimalClass {
  Mammal = 0,
  Bird = 1,
  Crustacean = 2,
}

export interface SpeciesInfo {
  name: string;
  scientific: string;
  biome: BiomeKind;
  cls: AnimalClass;
  /** Masa media del adulto, en kg (vida real, simplificada). */
  massKg: number;
  /** Esperanza de vida en libertad, en anos. Solo informativa por ahora. */
  lifespanYears: number;
  /** Individuos por km² en su habitat (vida real, orden de magnitud). */
  densityKm2: number;
  /** Tamano de grupo real, de menos a mas. 1 y 1 es solitario. */
  groupMin: number;
  groupMax: number;
  /** Alto del adulto en bloques, de su alto real con la vara del jugador. */
  height: number;
  /** Velocidad de paseo, en bloques por segundo. **Deduccion mia.** */
  speed: number;
  /** Radio de su territorio, en casillas. **Deduccion mia.** */
  territory: number;
}

/**
 * Las diez especies. Masa, vida, densidad y grupo son datos reales
 * simplificados; el alto, de su alto real a 1,1 bloques por metro (el jugador
 * mide 1,93 para 1,75 m). Paseo y territorio son deduccion mia; el cuerpo, caja a
 * caja, esta en `fauna-body.ts`.
 */
export const SPECIES: readonly SpeciesInfo[] = [
  {
    name: 'Liebre europea', scientific: 'Lepus europaeus', biome: BiomeKind.Meadow, cls: AnimalClass.Mammal,
    massKg: 4, lifespanYears: 5, densityKm2: 30, groupMin: 1, groupMax: 1,
    height: 0.45, speed: 1.2, territory: 12,
  },
  {
    name: 'Bisonte europeo', scientific: 'Bison bonasus', biome: BiomeKind.Meadow, cls: AnimalClass.Mammal,
    massKg: 600, lifespanYears: 20, densityKm2: 2, groupMin: 4, groupMax: 10,
    height: 2.0, speed: 0.8, territory: 16,
  },
  {
    name: 'Ciervo rojo', scientific: 'Cervus elaphus', biome: BiomeKind.Forest, cls: AnimalClass.Mammal,
    massKg: 150, lifespanYears: 15, densityKm2: 8, groupMin: 2, groupMax: 5,
    height: 1.4, speed: 1.0, territory: 14,
  },
  {
    name: 'Jabali', scientific: 'Sus scrofa', biome: BiomeKind.Forest, cls: AnimalClass.Mammal,
    massKg: 90, lifespanYears: 10, densityKm2: 5, groupMin: 2, groupMax: 6,
    height: 1.0, speed: 0.9, territory: 12,
  },
  {
    name: 'Reno', scientific: 'Rangifer tarandus', biome: BiomeKind.Tundra, cls: AnimalClass.Mammal,
    massKg: 120, lifespanYears: 15, densityKm2: 3, groupMin: 3, groupMax: 8,
    height: 1.9, speed: 1.0, territory: 16,
  },
  {
    name: 'Zorro artico', scientific: 'Vulpes lagopus', biome: BiomeKind.Tundra, cls: AnimalClass.Mammal,
    massKg: 4, lifespanYears: 4, densityKm2: 0.5, groupMin: 1, groupMax: 2,
    height: 0.4, speed: 1.1, territory: 14,
  },
  {
    name: 'Ibice alpino', scientific: 'Capra ibex', biome: BiomeKind.Highland, cls: AnimalClass.Mammal,
    massKg: 70, lifespanYears: 15, densityKm2: 6, groupMin: 2, groupMax: 6,
    height: 1.3, speed: 0.9, territory: 12,
  },
  {
    name: 'Marmota alpina', scientific: 'Marmota marmota', biome: BiomeKind.Highland, cls: AnimalClass.Mammal,
    massKg: 5, lifespanYears: 13, densityKm2: 50, groupMin: 2, groupMax: 5,
    height: 0.4, speed: 0.7, territory: 6,
  },
  {
    name: 'Cangrejo verde', scientific: 'Carcinus maenas', biome: BiomeKind.Coast, cls: AnimalClass.Crustacean,
    massKg: 0.06, lifespanYears: 4, densityKm2: 400, groupMin: 1, groupMax: 1,
    // El real mediria 0,1: se sube al minimo visible (deduccion mia).
    height: 0.3, speed: 0.6, territory: 6,
  },
  {
    name: 'Gaviota patiamarilla', scientific: 'Larus michahellis', biome: BiomeKind.Coast, cls: AnimalClass.Bird,
    massKg: 1, lifespanYears: 15, densityKm2: 100, groupMin: 2, groupMax: 6,
    height: 0.6, speed: 0.8, territory: 10,
  },
];

// ---------------------------------------------------------------- etapas

/**
 * Masa de cada etapa respecto del adulto: la cria ~15 %, el joven ~60 %.
 * **Deduccion mia**, comun a todas las especies. Todo lo de cada etapa —PV,
 * tamano, botin— sale de esta masa con las mismas formulas que el adulto.
 */
export const STAGE_MASS: readonly number[] = [0.15, 0.6, 1];

/**
 * Proporcion de cada etapa en el mundo: 20 % crias, 25 % jovenes y 55 %
 * adultos. **Deduccion mia.** En esta tanda la etapa es fija (decision del
 * autor): se nace en el mundo con ella y se conserva hasta la reproduccion.
 */
export const STAGE_SHARE: readonly number[] = [0.2, 0.25, 0.55];

/** Escala lineal de una etapa: la raiz cubica de su masa relativa. */
export function stageScale(stage: Stage): number {
  return Math.cbrt(STAGE_MASS[stage]);
}

/** Lo minimo que mide algo vivo en pantalla, en bloques. **Deduccion mia.** */
export const MIN_ANIMAL_HEIGHT = 0.22;

/** Alto de un animal de una etapa, en bloques. */
export function animalHeight(species: Species, stage: Stage): number {
  return Math.max(MIN_ANIMAL_HEIGHT, SPECIES[species].height * stageScale(stage));
}

// ---------------------------------------------------------------- puntos de vida

/**
 * La masa de referencia: la del jugador, una persona de 70 kg, que tiene 100 PV.
 */
export const REFERENCE_MASS_KG = 70;
export const REFERENCE_HIT_POINTS = 100;

/**
 * **Los puntos de vida salen de la masa** (decision del autor, 2026-10-02):
 * `PV = 100 × (masa / 70 kg)^(1/3)`. La raiz cubica de la masa es el tamano
 * lineal del cuerpo, que es lo que aguanta un golpe: ocho veces la masa es el
 * doble de alto y el doble de vida. Vale para cualquier forma de vida que tenga
 * masa —aves, peces, reptiles—, y el jugador sale con sus 100.
 */
export function hitPointsOf(massKg: number): number {
  return Math.max(1, Math.round(REFERENCE_HIT_POINTS * Math.cbrt(massKg / REFERENCE_MASS_KG)));
}

/** La masa de un animal de una etapa, en kg. */
export function animalMass(species: Species, stage: Stage): number {
  return SPECIES[species].massKg * STAGE_MASS[stage];
}

/** Los PV completos de un animal de una etapa. */
export function animalHitPoints(species: Species, stage: Stage): number {
  return hitPointsOf(animalMass(species, stage));
}

// ---------------------------------------------------------------- aparicion

/**
 * Cuantos individuos hay en un chunk lleno de su bioma: `0,45 × √(densidad
 * real por km²)`. **Deduccion mia.** Con la densidad real, un chunk de 29 × 29 m
 * casi nunca tendria un animal; la raiz conserva el orden (mas liebres que
 * bisontes) y comprime la distancia, de 60 a 1 a unos 8 a 1.
 */
export const DENSITY_GAIN = 0.45;

export function densityPerChunk(species: Species): number {
  return DENSITY_GAIN * Math.sqrt(SPECIES[species].densityKm2);
}

/** El tamano medio de grupo de una especie. */
export function meanGroup(species: Species): number {
  const s = SPECIES[species];
  return (s.groupMin + s.groupMax) / 2;
}
