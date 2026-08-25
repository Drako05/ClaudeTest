/**
 * El tiempo del mundo.
 *
 * El libro: «Existen el pasar del tiempo y las leyes fisicas fundamentales».
 *
 * El tiempo se deriva siempre del contador de ticks, nunca del reloj del
 * sistema: es lo que mantiene el mundo determinista y reproducible.
 */

import { DAY_TICKS } from '@verdant/shared';

export enum DayPhase {
  Night = 0,
  Dawn = 1,
  Day = 2,
  Dusk = 3,
}

/** Posicion dentro del dia, en [0, 1). 0 es medianoche. */
export function dayFraction(tick: number): number {
  const f = (tick % DAY_TICKS) / DAY_TICKS;
  return f < 0 ? f + 1 : f;
}

const DAWN_START = 0.2;
const DAWN_END = 0.3;
const DUSK_START = 0.7;
const DUSK_END = 0.8;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Cuanta luz natural hay, en [0, 1]. 0 es noche cerrada, 1 mediodia.
 * Transiciona de forma suave para que amanecer y ocaso no sean un salto.
 */
export function daylight(tick: number): number {
  const f = dayFraction(tick);
  return smoothstep(DAWN_START, DAWN_END, f) - smoothstep(DUSK_START, DUSK_END, f);
}

export function phaseOf(tick: number): DayPhase {
  const f = dayFraction(tick);
  if (f < DAWN_START || f >= DUSK_END) return DayPhase.Night;
  if (f < DAWN_END) return DayPhase.Dawn;
  if (f < DUSK_START) return DayPhase.Day;
  return DayPhase.Dusk;
}

/** Hora del mundo como "HH:MM", para mostrarla al jugador. */
export function clockLabel(tick: number): string {
  const minutes = Math.floor(dayFraction(tick) * 24 * 60);
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Numero de dia transcurrido desde la creacion del mundo, empezando en 1. */
export function dayNumber(tick: number): number {
  return Math.floor(tick / DAY_TICKS) + 1;
}
