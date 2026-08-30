/**
 * El relieve: alturas discretas, paredes y taludes.
 *
 * Modulo propio y sin dependencias cruzadas —solo `rng.ts`, que no importa a
 * nadie— por la misma razon que `aim.ts` y `coords.ts`: lo necesitan a la vez el
 * generador, el mundo y el cliente, y si viviera dentro de `worldgen.ts` o de
 * `world.ts` habria ciclo de importacion.
 *
 * La idea entera cabe en una frase: **el mundo es un campo de alturas**. Cada
 * tile tiene un nivel entero, y `groundHeight` devuelve la altura real de un
 * punto dentro de el —el nivel a secas si es plano, o interpolada si es un
 * talud—. Todo lo demas sale de ahi: no se puede entrar donde el suelo esta por
 * encima de los pies, se aterriza cuando la altura propia toca la del suelo, y
 * un talud se sube andando porque su suelo sube poco a poco.
 */

import { hash2DFloat } from './rng.js';

/**
 * Elevacion a la que empieza la tierra. Es el mismo umbral que ya separaba el
 * agua en `terrainAt`, no uno nuevo: el nivel de la tierra arranca en 0 y el
 * agua queda en negativo, asi que el mundo generado no cambia de forma.
 */
export const SEA_LEVEL = 0.42;

/** Cuanta elevacion vale un nivel. */
export const LEVEL_STEP = 0.06;

/**
 * Nivel mas alto posible.
 *
 * Cuarenta y uno contando el cero. Es numero del autor: queria montanas que
 * haya que rodear o escalar en serio, y con cubos de 16 px eso son 640 px de
 * cima, casi una pantalla entera. Fuera de las cordilleras el mundo sigue sin
 * pasar de seis o siete, que es lo que daba el campo de elevacion a secas.
 */
export const MAX_LEVEL = 40;

/** Nivel que se le asigna al agua. Uno solo: el fondo no se pisa. */
export const WATER_LEVEL = -1;

/**
 * Que fraccion de las fronteras entre niveles es transitable.
 *
 * El resto son paredes. Es lo que obliga a buscar por donde subir en vez de
 * poder trepar por cualquier lado, y con el 15 % una ladera larga tiene algun
 * paso pero no muchos.
 */
export const RAMP_SHARE = 0.15;

/**
 * Cuanto levanta un saliente.
 *
 * De aqui salen las paredes altas: el campo de elevacion es tan suave que sin
 * salientes casi todas las paredes del mundo serian de un bloque y se subirian
 * todas de un salto. Una cordillera tampoco las fabrica —amplifica la pendiente,
 * pero partiendo de 0.03 niveles por casilla haria falta un factor de sesenta
 * para llegar al escalon de dos—, asi que altura y muros son dos mecanismos
 * distintos y hacen falta los dos.
 */
export const OUTCROP_RISE = 3;

/** Direcciones ortogonales, en el orden en que se busca por donde sube un talud. */
export const RAMP_DIRS: ReadonlyArray<{ readonly x: number; readonly y: number }> = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/** Ningun talud. */
export const NO_RAMP = -1;

/** Nivel entero que corresponde a una elevacion. Negativo es agua. */
export function levelFrom(elevation: number): number {
  if (elevation < SEA_LEVEL) return WATER_LEVEL;
  const level = Math.floor((elevation - SEA_LEVEL) / LEVEL_STEP);
  return level > MAX_LEVEL ? MAX_LEVEL : level;
}

/**
 * Si la frontera entre dos tiles vecinos es talud o pared.
 *
 * La clave se canoniza al tile de coordenada menor mas el eje, de forma que la
 * respuesta sea **la misma mirada desde los dos lados**. Sin eso se podria subir
 * una pared por un lado y no por el otro, y peor: el dibujo y la colision
 * podrian discrepar sobre la misma arista.
 */
export function isRampEdge(seed: number, ax: number, ay: number, bx: number, by: number): boolean {
  const horizontal = ay === by;
  const x = ax < bx ? ax : bx;
  const y = ay < by ? ay : by;
  return hash2DFloat(seed ^ (horizontal ? 0x1b873593 : 0x7f4a7c15), x, y) < RAMP_SHARE;
}

/**
 * Por donde sube el talud de un tile, o `NO_RAMP` si es plano.
 *
 * `levelOf` da el nivel de un vecino. Solo se hace talud hacia un vecino que este
 * **exactamente un nivel** por encima: dos niveles son siempre pared, que es de
 * donde vienen los muros infranqueables que pidio el autor.
 *
 * Con dos vecinos candidatos gana el primero del orden de `RAMP_DIRS`. Es
 * arbitrario pero determinista, que es lo unico que importa: un tile no puede
 * inclinarse hacia dos sitios a la vez.
 */
export function rampDirOf(
  seed: number,
  wx: number,
  wy: number,
  level: number,
  levelOf: (x: number, y: number) => number,
): number {
  if (level < 0) return NO_RAMP;
  for (let dir = 0; dir < RAMP_DIRS.length; dir++) {
    const d = RAMP_DIRS[dir];
    const nx = wx + d.x;
    const ny = wy + d.y;
    if (levelOf(nx, ny) !== level + 1) continue;
    if (isRampEdge(seed, wx, wy, nx, ny)) return dir;
  }
  return NO_RAMP;
}

/**
 * Altura del suelo en un punto dentro de un tile.
 *
 * `fx` y `fy` son la posicion dentro de la casilla, en [0, 1). En un tile plano
 * la altura es su nivel y ya esta; en un talud sube linealmente de `level` a
 * `level + 1` en la direccion en la que se inclina.
 *
 * Que la rampa sea propiedad del **tile bajo** y no de la arista es lo que hace
 * continuo este campo. Con la rampa en la arista habria un escalon vertical en
 * el limite entre las dos casillas, que es justo lo que un talud no tiene.
 */
export function groundHeight(level: number, rampDir: number, fx: number, fy: number): number {
  switch (rampDir) {
    case 0:
      return level + (1 - fy);
    case 1:
      return level + fx;
    case 2:
      return level + fy;
    case 3:
      return level + (1 - fx);
    default:
      return level;
  }
}
