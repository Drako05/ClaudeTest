/**
 * Parametros del equilibrio ecologico.
 *
 * Todos los numeros que gobiernan la vida del mundo estan aqui y en ningun otro
 * sitio, para poder ajustarlos sin perseguirlos por el codigo.
 *
 * Las tasas se expresan por HORA REAL porque asi las fijo el autor, y se
 * convierten a pasos de vida con LIFE_STEPS_PER_HOUR. Los dos valores estan
 * calibrados contra dos anclas concretas que el dio, no elegidos a ojo:
 *
 *   - Un chunk colonizado desde cero alcanza el rango de equilibrio en 5 h.
 *   - Un chunk saturado al 200 % vuelve al rango en 2.5 h.
 *
 * Si se cambia el ancho del rango, esas dos anclas se mueven: hay que
 * recalibrar r y m, y `tests/ecology.test.ts` avisara de que ya no se cumplen.
 */

import { DAY_TICKS, LIFE_STEPS_PER_HOUR, LifeKind, Terrain } from './base.js';

/** Ancho del rango de equilibrio, como fraccion del valor de referencia. */
export const EQUILIBRIUM_BAND = 0.15;

/**
 * Ritmo de crecimiento logistico, por hora real.
 *
 * Resuelto de: t = (1/r)·ln[ (v1/(K−v1)) · ((K−v0)/v0) ] con v0 = 2 % (la
 * siembra por colonizacion), v1 = 85 % (el borde inferior del rango) y t = 5 h.
 *
 * La curva es lenta en los extremos y rapida en el medio, tal y como pidio el
 * autor. Como consecuencia inevitable de esa forma, los tiempos intermedios son
 * mas cortos que con una recta: desde el 50 % son ~1.5 h, no 2.5.
 */
export const GROWTH_RATE_PER_HOUR = 1.1253;
export const GROWTH_RATE_PER_STEP = GROWTH_RATE_PER_HOUR / LIFE_STEPS_PER_HOUR;

/**
 * Siembra inicial que recibe un chunk vacio con fuente cercana, como fraccion
 * del referente.
 *
 * No es decorativa: en una logistica pura el cero es un punto fijo, asi que sin
 * este empujon un chunk arrasado no volveria a crecer JAMAS y las 5 horas del
 * autor no podrian existir. Va condicionada a que haya vida de esa especie en el
 * chunk o en los aledanos, que es lo que preserva la ley del origen rastreable.
 */
export const COLONIZATION_SEED = 0.02;

/**
 * Ritmo de mortandad por saturacion, por hora real.
 *
 * Resuelto de: t = (1/m)·ln(exceso_inicial / exceso_final), con 200 % -> 115 %
 * en 2.5 h. Decae hacia el referente, asi que corrige mucho al principio y se va
 * frenando, que es la forma que pidio el autor.
 */
export const MORTALITY_RATE_PER_HOUR = 0.7588;
export const MORTALITY_RATE_PER_STEP = MORTALITY_RATE_PER_HOUR / LIFE_STEPS_PER_HOUR;

/** Tope de densidad por chunk. Por encima hay saturacion. */
export const DENSITY_CAP = 1.6;

/** Cuanto rinde de mas recolectar en un bioma equilibrado. */
export const BALANCED_HARVEST_BONUS = 0.3;

/** Probabilidad de que lo que brota sea la variante rara, solo en equilibrio. */
export const RARE_CHANCE = 0.08;

/** Ticks que tarda un brote sembrado en convertirse en adulto: un dia del mundo. */
export const MATURATION_TICKS = DAY_TICKS;

/** Chunks maximos que recorre la inundacion que delimita un bioma. */
export const BIOME_MAX_CHUNKS = 512;

/** Semillas maximas que deja una recoleccion. Se sortea 0..MAX inclusive. */
export const MAX_SEEDS_PER_HARVEST = 2;

/**
 * Con que frecuencia coloca el generador cada tipo de vida en cada terreno.
 *
 * Esta tabla es la UNICA fuente: el generador la usa para decidir que planta en
 * cada tile, y el equilibrio la usa para saber cuanta vida deberia haber. Si
 * cada uno tuviera la suya, el mundo naceria desequilibrado en cuanto se
 * separasen.
 */
export interface TerrainDensity {
  tree: number;
  plant: number;
  rock: number;
  coal: number;
  iron: number;
  copper: number;
}

const EMPTY: TerrainDensity = { tree: 0, plant: 0, rock: 0, coal: 0, iron: 0, copper: 0 };

/**
 * Cuanto se ralea la piedra fuera de la montana. Decision del autor.
 *
 * Antes la piedra se minaba en la hierba y en la arena y no en la roca, que era
 * ademas intransitable. Ahora la montana es su sitio y el resto del mundo la da
 * a cuentagotas.
 */
export const ROCK_ELSEWHERE = 0.6;

/**
 * Piedra en la montana: el mismo indice que los arboles de la pradera.
 * Es la referencia que fijo el autor, no un numero suelto.
 */
export const HIGHLAND_ROCK = 0.045;

/**
 * Los tres minerales suman un 10 % de esa piedra: carbon 5 %, cobre 2.5 % y
 * hierro 2.5 %. Numeros de arranque, para ajustar mas adelante.
 */
export const MINERAL_SHARE = { coal: 0.05, iron: 0.025, copper: 0.025 } as const;

const MINERALS = {
  coal: HIGHLAND_ROCK * MINERAL_SHARE.coal,
  iron: HIGHLAND_ROCK * MINERAL_SHARE.iron,
  copper: HIGHLAND_ROCK * MINERAL_SHARE.copper,
};

const NO_MINERALS = { coal: 0, iron: 0, copper: 0 };

export function densityFor(t: Terrain): TerrainDensity {
  switch (t) {
    case Terrain.Forest:
      return { tree: 0.3, plant: 0.06, rock: 0, ...NO_MINERALS };
    case Terrain.Grass:
      return { tree: 0.045, plant: 0.03, rock: 0.015 * ROCK_ELSEWHERE, ...NO_MINERALS };
    case Terrain.Tundra:
      return { tree: 0.07, plant: 0.02, rock: 0.03 * ROCK_ELSEWHERE, ...NO_MINERALS };
    case Terrain.Snow:
      // La nieve sostiene arboles pero no plantas: es la franja extrema del
      // bioma frio, que se ralea solo al subir sin reglas aparte.
      return { tree: 0.04, plant: 0, rock: 0, ...NO_MINERALS };
    case Terrain.Sand:
      return { tree: 0, plant: 0, rock: 0.02 * ROCK_ELSEWHERE, ...NO_MINERALS };
    case Terrain.Rock:
      // La montana: sin vegetacion, pero es donde vive lo mineral.
      return { tree: 0, plant: 0, rock: HIGHLAND_ROCK, ...MINERALS };
    default:
      return EMPTY;
  }
}

/** Densidad esperada de un tipo de vida en un terreno. */
export function densityOfKind(t: Terrain, kind: LifeKind): number {
  const d = densityFor(t);
  if (kind === LifeKind.Tree) return d.tree;
  if (kind === LifeKind.Plant) return d.plant;
  return 0; // la fauna aun no existe
}

/** Borde inferior y superior del rango de equilibrio para un referente dado. */
export function equilibriumRange(reference: number): { low: number; high: number } {
  return {
    low: reference * (1 - EQUILIBRIUM_BAND),
    high: reference * (1 + EQUILIBRIUM_BAND),
  };
}

/**
 * Holgura absoluta que se suma a los margenes relativos.
 *
 * Sin ella, un chunk cuyo referente es medio arbol quedaria marcado como
 * saturado en cuanto el azar colocase dos, y eso bastaria para dejar sin
 * recompensas a un bioma entero de forma permanente. Colocar N elementos con
 * probabilidad p tiene una dispersion del orden de la raiz de N, asi que un
 * umbral puramente relativo es inservible con N pequeno.
 */
export const COUNT_SLACK = 4;

/** True si un valor esta dentro del rango sano de su referente. */
export function withinEquilibrium(value: number, reference: number): boolean {
  if (reference <= 0) return value <= COUNT_SLACK;
  const { low, high } = equilibriumRange(reference);
  return value >= low - COUNT_SLACK && value <= high + COUNT_SLACK;
}

/** True si un recuento supera el tope de densidad de su referente. */
export function isOvercrowded(count: number, reference: number): boolean {
  if (reference <= 0) return count > COUNT_SLACK;
  return count > reference * DENSITY_CAP + COUNT_SLACK;
}

/**
 * Un paso de crecimiento logistico hacia la capacidad.
 * Con v = 0 devuelve exactamente 0: la vida no surge sola.
 */
export function growthStep(v: number, capacity: number): number {
  if (capacity <= 0 || v <= 0) return 0;
  return GROWTH_RATE_PER_STEP * v * (1 - v / capacity);
}

/** Un paso de mortandad por saturacion, decayendo hacia el referente. */
export function mortalityStep(v: number, reference: number): number {
  const excess = v - reference;
  if (excess <= 0) return 0;
  return MORTALITY_RATE_PER_STEP * excess;
}
