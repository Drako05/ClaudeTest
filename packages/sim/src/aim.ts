/**
 * Direccion de mirada y area de efecto.
 *
 * Puro y sin dependencias del resto del nucleo, para no crear ciclos: lo usan
 * tanto la recoleccion como el dibujo del reticulo.
 *
 * La regla del area es una sola, aunque el autor la describiera en dos casos:
 * **la casilla apuntada mas sus dos vecinas en el anillo de 8 direcciones**.
 * Mirando al este salen E, NE y SE, con las dos flanqueantes en diagonal del
 * personaje; mirando al sureste salen SE, E y S, con las dos flanqueantes
 * ortogonales al personaje y pegadas a la apuntada. Es exactamente lo que pidio,
 * y de una sola regla.
 */

/** Desplazamiento en tiles de cada direccion. */
export interface Offset {
  readonly x: number;
  readonly y: number;
}

/**
 * Las 8 direcciones EN ORDEN alrededor del personaje, empezando por el norte y
 * girando en el sentido de las agujas del reloj.
 *
 * Que esten en orden circular no es cosmetico: es lo que hace que las dos
 * flanqueantes de una direccion sean sus vecinas en esta lista.
 */
export const DIRECTIONS: readonly Offset[] = [
  { x: 0, y: -1 }, // N
  { x: 1, y: -1 }, // NE
  { x: 1, y: 0 }, // E
  { x: 1, y: 1 }, // SE
  { x: 0, y: 1 }, // S
  { x: -1, y: 1 }, // SW
  { x: -1, y: 0 }, // W
  { x: -1, y: -1 }, // NW
];

/** Cuantas casillas afecta una accion. */
export const ACTION_TILES = 3;

/** True si la direccion es diagonal. */
export function isDiagonal(dir: number): boolean {
  const d = DIRECTIONS[wrap(dir)];
  return d.x !== 0 && d.y !== 0;
}

function wrap(dir: number): number {
  return ((dir % DIRECTIONS.length) + DIRECTIONS.length) % DIRECTIONS.length;
}

/**
 * Indice de la direccion mas parecida a un vector cualquiera.
 *
 * El cursor da una direccion continua y el area necesita una de las ocho, asi
 * que en algun punto hay que redondear. Se hace por angulo, que reparte las ocho
 * en sectores iguales de 45 grados.
 *
 * Con el vector nulo devuelve -1: no hay a donde mirar, y quien llame decide que
 * hacer (conservar la mirada anterior, normalmente).
 */
export function directionOf(dx: number, dy: number): number {
  if (dx === 0 && dy === 0) return -1;
  // El norte es el indice 0 y se gira en sentido horario, de ahi el atan2 con
  // los ejes cambiados y el signo de y invertido.
  const angle = Math.atan2(dx, -dy);
  const sector = Math.round((angle / (Math.PI * 2)) * DIRECTIONS.length);
  return wrap(sector);
}

/** Vector unitario de una direccion, para guardarlo como mirada. */
export function facingOf(dir: number): Offset {
  const d = DIRECTIONS[wrap(dir)];
  const length = Math.hypot(d.x, d.y);
  return { x: d.x / length, y: d.y / length };
}

/**
 * Las casillas que afecta una accion desde la casilla del personaje.
 *
 * La apuntada va SIEMPRE la primera: es la que el reticulo marca con mas fuerza
 * y la que usan las acciones de una sola casilla, como sembrar.
 *
 * Se parte de la casilla del personaje y no de su posicion continua a proposito.
 * Antes se apuntaba con `floor(pos + mirada * 1.1)`, y con el personaje pegado
 * al borde de su casilla eso podia saltarse a dos casillas de distancia, con lo
 * que «las dos vecinas» dejaba de tener sentido.
 */
export function actionTiles(tileX: number, tileY: number, dir: number): Offset[] {
  const index = wrap(dir);
  return [index, index - 1, index + 1].map((i) => {
    const d = DIRECTIONS[wrap(i)];
    return { x: tileX + d.x, y: tileY + d.y };
  });
}
