/**
 * Con que mundo y donde se empieza: la URL manda, y si no dice nada, el azar.
 *
 * - `?seed=` fija el mundo, para poder compartir uno concreto.
 * - `?t=` abre el mundo a una hora concreta (en ticks).
 * - `?x=&y=` aparece en un sitio concreto. Nacio de necesitarlo en la prueba de
 *   humo —llegar andando a la montana esquiva arboles y es un via crucis— y
 *   sirve igual para volver a mano a un punto que se quiere mirar dos veces.
 * - `?view=perspectiva|orto|primera` arranca en esa vista. Las pruebas que
 *   dependen de la vista la fijan asi, en vez de dar por hecha la de arranque.
 * - `?fauna=0` no dibuja los animales. Solo el dibujo: la simulacion los sigue
 *   moviendo igual. Lo usa `tools/slash.mjs`, que mide pixeles del barrido y
 *   no puede dejar que un animal que pasea se cruce por delante.
 * - `?efectos=barrido` dibuja, de los efectos del golpe, solo el barrido: ni
 *   impacto, ni esquirlas, ni escombros. Tambien para `tools/slash.mjs`: el
 *   impacto es un destello blanco sin prueba de profundidad, y con el barrido
 *   sin ancho la vista normal contaba 25.506 pixeles suyos en un pinar.
 *
 * Todo envuelto en try/catch: en un iframe con sandbox restrictivo el acceso a
 * `location` puede lanzar, y entonces se juega un mundo al azar.
 */

import { createGame, type GameState } from '@verdant/sim';
import { PROJECTIONS, type Projection } from './camera.js';

function param(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

/** Una semilla al azar. */
export function randomSeed(): number {
  // Math.random aqui es legitimo: es el cliente eligiendo que mundo abrir, no la
  // simulacion. Dentro de packages/sim estaria prohibido.
  return (Math.random() * 0xffffffff) >>> 0;
}

/** La vista de `?view=`, o `null` si no dice ninguna valida. */
export function viewFromLocation(): Projection | null {
  const raw = param('view');
  return (PROJECTIONS as readonly string[]).includes(raw ?? '') ? (raw as Projection) : null;
}

/** Si se dibujan los animales: si, salvo con `?fauna=0`. */
export function faunaShownFromLocation(): boolean {
  return param('fauna') !== '0';
}

/** Si de los efectos del golpe solo se dibuja el barrido: con `?efectos=barrido`. */
export function onlySlashFromLocation(): boolean {
  return param('efectos') === 'barrido';
}

export function seedFromLocation(): number {
  const raw = param('seed');
  if (raw !== null) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) return parsed >>> 0;
  }
  return randomSeed();
}

function startTickFromLocation(): number | undefined {
  const raw = param('t');
  if (raw === null) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function startPlaceFromLocation(): { x: number; y: number } | undefined {
  const x = Number.parseFloat(param('x') ?? '');
  const y = Number.parseFloat(param('y') ?? '');
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
}

/**
 * Crea la partida. La primera vez lee la hora y el sitio de la URL; al
 * reiniciar no, porque es otro mundo y ese sitio ya no significa nada.
 */
export function startGame(seed: number, fromUrl: boolean, radius: number): GameState {
  const state = createGame(seed, fromUrl ? startTickFromLocation() : undefined);
  const id = state.playerId;
  // `createGame` ya deja al jugador en su nacimiento y con los pies en el suelo.
  const place = fromUrl ? startPlaceFromLocation() : undefined;
  if (place) {
    state.entities.x[id] = place.x;
    state.entities.y[id] = place.y;
    // Y los pies en el suelo del sitio nuevo: llegar a una cima de nivel 27 con
    // la altura de la costa seria una caida de 27 bloques nada mas abrir.
    state.entities.z[id] = state.world.groundHeightAt(place.x, place.y);
    state.entities.vz[id] = 0;
    state.entities.grounded[id] = 1;
  }
  state.world.ensureAround(state.entities.x[id], state.entities.y[id], radius);
  return state;
}

/** Deja la semilla en la URL. Comodidad: si el entorno no lo permite, se sigue. */
export function writeSeedToLocation(seed: number): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('seed', String(seed));
    window.history.replaceState({}, '', url);
  } catch {
    // Ignorado a proposito.
  }
}
