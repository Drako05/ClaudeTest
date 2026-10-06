/**
 * El relieve: columnas de medio bloque.
 *
 * Modulo propio y sin dependencias cruzadas por la misma razon que `aim.ts` y
 * `coords.ts`: lo necesitan a la vez el generador, el mundo y el cliente, y si
 * viviera dentro de `worldgen.ts` o de `world.ts` habria ciclo de importacion.
 *
 * **El terreno son voxeles de 0,5** (decision del autor, 2026-10-06), pensando
 * en excavar y construir. En esta primera tanda la generacion da una
 * superficie sin huecos: cada **columna** de 0,5 × 0,5 tiene una altura entera
 * en **medios bloques**, y es solida de ahi para abajo. Una casilla de 1 son
 * 2 × 2 columnas. **Sin rampas** (el autor): el relieve sube a escalones de
 * medio bloque, que se suben andando, y lo que sube de golpe uno entero o mas
 * es pared.
 *
 * Las alturas se cuentan en medios bloques (enteros); en el mundo, un medio
 * bloque mide `VOXEL`.
 */

/** Lo que mide un voxel, en unidades del mundo (una casilla mide 1). */
export const VOXEL = 0.5;

/** Columnas por casilla en cada eje. */
export const VOXELS_PER_TILE = 2;

/**
 * Elevacion a la que empieza la tierra. Es el mismo umbral que ya separaba el
 * agua en `terrainAt`, no uno nuevo: la tierra arranca en 0 y el agua queda en
 * negativo, asi que el mundo generado no cambia de forma.
 */
export const SEA_LEVEL = 0.42;

/**
 * Cuanta elevacion vale un bloque de 1: el escalon del autor, que no se toca sin
 * preguntarle. Con voxeles de 0,5 la altura se lee cada medio bloque, asi que un
 * medio bloque vale la mitad (`HALF_STEP`).
 */
export const LEVEL_STEP = 0.06;

/** Cuanta elevacion vale un medio bloque. */
export const HALF_STEP = LEVEL_STEP / VOXELS_PER_TILE;

/**
 * Bloque de 1 mas alto posible: 40, numero del autor. Queria montanas que haya
 * que rodear o escalar en serio. Fuera de las cordilleras el mundo sigue sin
 * pasar de seis o siete.
 */
export const MAX_LEVEL = 40;

/** La altura mas alta de una columna, en medios bloques. */
export const MAX_HEIGHT = MAX_LEVEL * VOXELS_PER_TILE;

/** Altura de las columnas de agua, en medios bloques: el fondo, a -1. */
export const WATER_HEIGHT = -VOXELS_PER_TILE;

/**
 * Cuanto levanta un saliente, en bloques de 1.
 *
 * De aqui salen las paredes altas: el campo de elevacion es tan suave que sin
 * salientes casi todo el relieve serian escalones que se suben andando. Una
 * cordillera tampoco las fabrica del todo —amplifica la pendiente—, asi que
 * altura y muros son dos mecanismos distintos y hacen falta los dos (regla 14).
 */
export const OUTCROP_RISE = 3;

/**
 * Cuantos medios bloques se suben andando de una columna a la vecina: uno. Lo
 * que mide ≤ 0,5 se sube andando, y es una caracteristica de la fisica, no de
 * cada cosa (el autor, 2026-10-06; `STEP_UP` en `jump.ts`).
 */
export const WALK_HALVES = 1;

/**
 * Cuantos medios bloques se ganan de un salto: dos. El apice del salto son 1,16
 * bloques, justo lo que hace falta para un bloque de 1. Tres ya es pared.
 *
 * Vive aqui, en el modulo sin dependencias, porque lo necesitan a la vez el
 * mundo (para no nacer en un pozo), el medidor de conectividad y quien mida el
 * relieve desde fuera.
 */
export const JUMP_HALVES = 2;

/**
 * Si se puede pasar de una columna a la vecina, saltando o no. Bajar siempre se
 * puede: caer es caer. Al agua no se pasa (regla 9).
 *
 * **Es un modelo, no la fisica.** La fisica de verdad esta en `movement.ts`;
 * esto compara alturas enteras para recorrer el mapa a saltos de columna, y se
 * queda del lado optimista —da por hecho que hay carrerilla para el salto—, asi
 * que lo que declare inconexo lo es de verdad.
 */
export function canClimbTo(from: number, to: number, jumping = true): boolean {
  if (to <= WATER_HEIGHT) return false;
  return to - from <= (jumping ? JUMP_HALVES : WALK_HALVES);
}

/**
 * Altura de una columna, en medios bloques, para una elevacion de tierra. No
 * baja de 0: lo que es agua lo decide el terreno de la casilla, no la columna
 * (`WorldGen.columnTopAt`).
 */
export function heightFrom(elevation: number): number {
  if (elevation < SEA_LEVEL) return 0;
  const h = Math.floor((elevation - SEA_LEVEL) / HALF_STEP);
  return h > MAX_HEIGHT ? MAX_HEIGHT : h;
}

/** La altura en el mundo del techo de una columna de `height` medios bloques. */
export function topOf(height: number): number {
  return height * VOXEL;
}

/** La columna (en coordenadas de voxel) que contiene la coordenada del mundo `w`. */
export function voxelOf(w: number): number {
  return Math.floor(w * VOXELS_PER_TILE);
}
