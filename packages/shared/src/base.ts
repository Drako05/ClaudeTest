/**
 * Constantes y enumeraciones fundamentales.
 *
 * Estan en su propio modulo para que `ecology.ts` pueda usarlas sin importar de
 * `index.ts`, que a su vez reexporta `ecology.ts`. Ese ciclo pasa desapercibido
 * en los tests pero rompe el bundle del navegador con un error de acceso antes
 * de inicializar.
 */

/** Lado de un chunk, en tiles. Potencia de 2 para permitir >> y & en vez de / y %. */
export const CHUNK_SIZE = 32;
export const CHUNK_SHIFT = 5;
export const CHUNK_MASK = CHUNK_SIZE - 1;
export const CHUNK_TILES = CHUNK_SIZE * CHUNK_SIZE;

/** Frecuencia logica de la simulacion. El render va desacoplado de esto. */
export const TICK_HZ = 60;
export const TICK_DT = 1 / TICK_HZ;

/** Duracion de un dia completo del mundo: 8 minutos reales. */
export const DAY_TICKS = 8 * 60 * TICK_HZ;

/**
 * Cada cuantos ticks avanza la vida.
 *
 * Que sea un paso FIJO y global no es un detalle de rendimiento: es lo que hace
 * que ponerse al dia de golpe y simular continuamente den exactamente el mismo
 * resultado, y por tanto lo que sostiene la ley de que el mundo existe
 * independientemente de cualquier observador.
 */
export const LIFE_STEP_TICKS = 300;
/** Pasos de vida que caben en una hora real. Convierte las tasas del autor. */
export const LIFE_STEPS_PER_HOUR = (3600 * TICK_HZ) / LIFE_STEP_TICKS;

/** Capa de terreno. */
export enum Terrain {
  DeepWater = 0,
  Water = 1,
  Sand = 2,
  Grass = 3,
  Forest = 4,
  Rock = 5,
  Snow = 6,
  Tundra = 7,
}

/** Tipos de vida que el equilibrio contabiliza por separado. */
export enum LifeKind {
  Tree = 0,
  Plant = 1,
  Animal = 2,
}
export const LIFE_KIND_COUNT = 3;
export const LIFE_KIND_NAMES: readonly string[] = ['Arboles', 'Plantas', 'Animales'];
