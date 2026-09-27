/**
 * Mirada y area de efecto: un CONO que sale del jugador hacia donde mira.
 *
 * Puro y sin dependencias del resto del nucleo, para no crear ciclos: lo usan
 * tanto la recoleccion como el dibujo del reticulo.
 *
 * **El cono sustituyo a las cuatro casillas fijas** (2026-09-28, decision del
 * autor): la accion encajaba la mirada en ocho direcciones y afectaba siempre a
 * la apuntada, sus dos vecinas del anillo y la propia, y en primera persona eso
 * se sentia raro —se golpeaba a casillas que no estaban delante de los ojos—.
 * Ahora cuenta **la mirada real, sin redondear**. Sus numeros, del autor:
 *
 * - **alcance 1,5 bloques y 90 grados** (±45 alrededor de la mirada): una
 *   casilla entra si su CENTRO cae dentro;
 * - **dos alturas**: la propia y la de arriba, o la de abajo si se mira hacia
 *   abajo mas de 25 grados (ver `levelStep`).
 *
 * Con el jugador en el centro de su casilla y mirando en recto, el cono coge
 * justo lo que cogia el area vieja —la de enfrente y las dos diagonales, que
 * caen a 45 grados y a 1,41—, asi que el cambio se nota al girar, no al mirar de
 * frente. **La casilla que se pisa sigue entrando siempre**, porque la sumo el
 * autor al area vieja y el cono nace en ella; eso es deduccion mia.
 */

/** Desplazamiento en tiles, o una casilla. */
export interface Offset {
  readonly x: number;
  readonly y: number;
}

/** Hasta donde llega la accion desde el jugador, en bloques. Del autor. */
export const ACTION_RANGE = 1.5;
/** Medio angulo del cono: 90 grados en total. Del autor. */
export const ACTION_HALF_ANGLE = Math.PI / 4;
/**
 * Desde cuanta inclinacion hacia abajo se mira «hacia abajo», en radianes: 25
 * grados, del autor. Vale para las tres vistas: en primera persona se entra
 * mirando a -11 grados (alcanza la altura de arriba) y la orbital arranca a 35
 * (la de abajo), y bajandola casi a ras de suelo pasa a la de arriba.
 */
export const LOOK_DOWN_ANGLE = (25 * Math.PI) / 180;

/** Holgura para que los bordes del cono (45 grados, 1,5) cuenten como dentro. */
const EDGE = 1e-9;

/**
 * La altura que alcanza la accion ademas de la propia: `+1` la de arriba, `-1`
 * la de abajo. `lookZ` es la componente vertical de la mirada (el seno de su
 * inclinacion, negativo hacia abajo).
 */
export function levelStep(lookZ: number): 1 | -1 {
  return lookZ < -Math.sin(LOOK_DOWN_ANGLE) ? -1 : 1;
}

/**
 * Las casillas del cono desde la posicion CONTINUA del jugador `(px, py)`
 * mirando hacia `(fx, fy)`, sin mirar el relieve.
 *
 * El orden es fijo: primero las del cono, de la mas centrada en la mirada a la
 * mas ladeada (y a igual angulo, la mas cercana); **la que se pisa, la ultima**.
 * Se parte de la posicion continua y no de la casilla porque el cono es de la
 * mirada real: a medio paso de una casilla se alcanza lo que se tiene delante,
 * no lo que tendria delante el centro de la casilla.
 */
export function coneTiles(px: number, py: number, fx: number, fy: number): Offset[] {
  const len = Math.hypot(fx, fy);
  const ownX = Math.floor(px);
  const ownY = Math.floor(py);
  if (len === 0) return [{ x: ownX, y: ownY }];
  const ux = fx / len;
  const uy = fy / len;
  const cosEdge = Math.cos(ACTION_HALF_ANGLE);
  const found: Array<{ x: number; y: number; cos: number; d: number }> = [];
  const r = Math.ceil(ACTION_RANGE) + 1;
  for (let ty = ownY - r; ty <= ownY + r; ty++) {
    for (let tx = ownX - r; tx <= ownX + r; tx++) {
      if (tx === ownX && ty === ownY) continue;
      const dx = tx + 0.5 - px;
      const dy = ty + 0.5 - py;
      const d = Math.hypot(dx, dy);
      if (d === 0 || d > ACTION_RANGE + EDGE) continue;
      const cos = (dx * ux + dy * uy) / d;
      if (cos < cosEdge - EDGE) continue;
      found.push({ x: tx, y: ty, cos, d });
    }
  }
  found.sort((a, b) => b.cos - a.cos || a.d - b.d);
  return [...found.map(({ x, y }) => ({ x, y })), { x: ownX, y: ownY }];
}

/**
 * La casilla de enfrente: la primera que cruza el centro de la mirada saliendo
 * de la que se pisa. Es donde se siembra (decision del autor).
 *
 * Se recorre el rayo con el algoritmo de Amanatides y Woo, casilla a casilla:
 * con un paso fijo, un rayo que roza una esquina podia saltarse la casilla que
 * de verdad cruza.
 */
export function frontTile(px: number, py: number, fx: number, fy: number): Offset {
  const ownX = Math.floor(px);
  const ownY = Math.floor(py);
  // Sin mirada, al sur, que es hacia donde se nace mirando.
  if (fx === 0 && fy === 0) return { x: ownX, y: ownY + 1 };
  const tMaxX = fx > 0 ? (ownX + 1 - px) / fx : fx < 0 ? (ownX - px) / fx : Infinity;
  const tMaxY = fy > 0 ? (ownY + 1 - py) / fy : fy < 0 ? (ownY - py) / fy : Infinity;
  return tMaxX < tMaxY
    ? { x: ownX + Math.sign(fx), y: ownY }
    : { x: ownX, y: ownY + Math.sign(fy) };
}
