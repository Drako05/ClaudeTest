/**
 * Proyeccion isometrica.
 *
 * Toda la transformacion entre coordenadas del mundo y coordenadas de pantalla
 * vive aqui, en un unico sitio. Es matematica pura, sin DOM, para poder
 * verificarla en Node sin navegador.
 *
 * El mundo sigue siendo una rejilla cuadrada: la simulacion no sabe ni tiene que
 * saber que se dibuja en rombos. Cambiar la proyeccion no toca una sola regla
 * del juego.
 */

/** Ancho y alto de un tile en pantalla. Relacion 2:1, el rombo isometrico clasico. */
export const TILE_W = 32;
export const TILE_H = 16;

/**
 * Pixeles que sube un nivel de altura.
 *
 * Es una constante de la VISTA, no de la simulacion: el nucleo cuenta niveles
 * enteros y no sabe cuanto miden en pantalla.
 *
 * Es `TILE_W / 2`, y no es una eleccion estetica: en una isometrica 2:1 esa es
 * exactamente la arista vertical de un **cubo**. Con la mitad —que es lo que
 * habia— un bloque se ve como una baldosa, que fue lo primero que noto el autor.
 */
export const LEVEL_PX = 16;

/** Desplazamiento vertical en pantalla de una altura dada. */
export function heightOffset(height: number): number {
  return -height * LEVEL_PX;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Desde que esquina se mira el mundo: 0, 1, 2 o 3, en cuartos de vuelta.
 *
 * Con la camara fija, la cara oculta de una montana era inexplorable: lo que hay
 * al otro lado lo tapa la montana misma, y eso no tiene arreglo desde un solo
 * angulo. Cuatro vistas lo resuelven, que es como lo hacen las isometricas con
 * altura de verdad.
 *
 * Es estado de MODULO y no un parametro: la camara es una sola, y asi los
 * veintitantos sitios que ya llaman a estas funciones no se enteran de que
 * existe. Los tests que dependan de la vista tienen que fijarla ellos.
 *
 * Girar de forma continua, siguiendo al cursor, no es posible con este dibujo:
 * el arte lleva la proyeccion horneada dentro, asi que a un angulo libre habria
 * que rehacer la geometria del terreno en cada frame en vez de reutilizar
 * sprites cacheados, y el orden de dibujado dejaria de agruparse en
 * antidiagonales. Seria pasar a 3D de verdad.
 */
export const VIEW_COUNT = 4;

let view = 0;

export function currentView(): number {
  return view;
}

export function setView(next: number): void {
  view = ((next % VIEW_COUNT) + VIEW_COUNT) % VIEW_COUNT;
}

/** Gira una direccion o posicion del mundo al espacio de la vista actual. */
export function toViewSpace(wx: number, wy: number): ScreenPoint {
  switch (view) {
    case 1:
      return { x: wy, y: -wx };
    case 2:
      return { x: -wx, y: -wy };
    case 3:
      return { x: -wy, y: wx };
    default:
      return { x: wx, y: wy };
  }
}

/** La inversa de `toViewSpace`: del espacio de la vista al mundo. */
export function toWorldSpace(vx: number, vy: number): ScreenPoint {
  switch (view) {
    case 1:
      return { x: -vy, y: vx };
    case 2:
      return { x: -vx, y: -vy };
    case 3:
      return { x: vy, y: -vx };
    default:
      return { x: vx, y: vy };
  }
}

/** Coordenadas del mundo (en tiles, con decimales) a pixeles de pantalla. */
export function worldToScreen(wx: number, wy: number): ScreenPoint {
  const v = toViewSpace(wx, wy);
  return {
    x: (v.x - v.y) * (TILE_W / 2),
    y: (v.x + v.y) * (TILE_H / 2),
  };
}

/** Inversa exacta de worldToScreen. Hara falta para traducir un toque a un tile. */
export function screenToWorld(sx: number, sy: number): ScreenPoint {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return toWorldSpace((b + a) / 2, (b - a) / 2);
}

/**
 * Clave de ordenacion por profundidad.
 *
 * En isometrica el orden de dibujado ES la sensacion de volumen: lo que esta al
 * sur o al este tapa a lo que esta al norte o al oeste. Sin esto el jugador
 * apareceria por delante de un arbol que tiene detras, que es justo lo que rompe
 * la ilusion.
 */
export function depthOf(wx: number, wy: number): number {
  const v = toViewSpace(wx, wy);
  return v.x + v.y;
}

/**
 * Antidiagonal a la que pertenece una entidad que esta EN una casilla.
 *
 * Se redondea la casilla, no la posicion. Con la posicion continua, un personaje
 * en (10.5, 10.5) caia en la fila 21 mientras su casilla era la 20: una fila por
 * delante de si mismo, dibujandose encima del arbol y del bloque que tenia justo
 * delante. Y como dependia de los decimales, aparecia y desaparecia al caminar.
 */
export function depthRowOf(wx: number, wy: number): number {
  return depthOf(Math.floor(wx), Math.floor(wy));
}

/**
 * Esquinas del rombo de un tile, relativas a su origen en pantalla.
 * Orden: norte, este, sur, oeste.
 */
export const TILE_DIAMOND: readonly ScreenPoint[] = [
  { x: 0, y: 0 },
  { x: TILE_W / 2, y: TILE_H / 2 },
  { x: 0, y: TILE_H },
  { x: -TILE_W / 2, y: TILE_H / 2 },
];
