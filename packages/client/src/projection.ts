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
 * enteros y no sabe cuanto miden en pantalla. Media altura de tile, que es lo
 * que hace que un bloque se lea como un bloque y no como un escalon perdido.
 */
export const LEVEL_PX = 8;

/** Desplazamiento vertical en pantalla de una altura dada. */
export function heightOffset(height: number): number {
  return -height * LEVEL_PX;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/** Coordenadas del mundo (en tiles, con decimales) a pixeles de pantalla. */
export function worldToScreen(wx: number, wy: number): ScreenPoint {
  return {
    x: (wx - wy) * (TILE_W / 2),
    y: (wx + wy) * (TILE_H / 2),
  };
}

/** Inversa exacta de worldToScreen. Hara falta para traducir un toque a un tile. */
export function screenToWorld(sx: number, sy: number): ScreenPoint {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return {
    x: (b + a) / 2,
    y: (b - a) / 2,
  };
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
  return wx + wy;
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
