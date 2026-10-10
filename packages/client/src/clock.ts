/**
 * El reloj del cliente: el de verdad o, con `?reloj=manual`, uno que solo
 * avanza cuando se le pide.
 *
 * Lo pide la prueba de humo (2026-10-10). Sin GPU el navegador de las pruebas
 * dibuja a ~5 FPS, y una prueba que espera en tiempo real tarda lo que tarde y
 * da lo que de la maquina: el paseo acababa donde lo dejaba su velocidad. Con
 * el reloj manual la prueba avanza el juego frame a frame sin dibujar
 * (`window.__reloj`, en `main.ts`) y el resultado es el mismo en cualquier
 * maquina.
 *
 * Lo leen las cosas del cliente que miden tiempo DENTRO del frame —la caida de
 * una estacion, la receta mantenida, el catalejo de la rueda—, que con el reloj
 * de verdad seguirian corriendo entre dos avances. Lo que va por eventos y
 * temporizadores del navegador (gestos, destellos, la pausa) sigue con el de
 * verdad: es interfaz, y lo miden los gestos en tiempo real.
 */

let manual: number | null = null;

/** Milisegundos, como `performance.now()`. */
export function now(): number {
  return manual ?? performance.now();
}

/** Pasa al reloj manual, parado donde iba el de verdad. */
export function startManualClock(): void {
  manual = performance.now();
}

/** Adelanta el reloj manual. */
export function advanceManualClock(ms: number): void {
  if (manual === null) throw new Error('el reloj no es manual');
  manual += ms;
}
