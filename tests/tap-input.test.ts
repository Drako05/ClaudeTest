/**
 * El orden del modo TAP: un toque usa y luego ataca, salvo que el usar haga
 * algo; mantener ataca en el acto y luego con la cadencia del boton.
 */

import { describe, expect, it } from 'vitest';
import { TapSequencer } from '../packages/client/src/tap-input.js';

const quiet = { tap: null, hold: null, strike: false, usedLast: false };

describe('El modo TAP, tick a tick', () => {
  it('un toque usa en su tick y ataca en el siguiente, con la misma mirada', () => {
    const s = new TapSequencer<string>(15);
    expect(s.step({ ...quiet, tap: 'alli' })).toEqual({ use: true, harvest: false, aim: 'alli' });
    expect(s.step({ ...quiet, usedLast: false })).toEqual({ use: false, harvest: true, aim: 'alli' });
    expect(s.step(quiet)).toEqual({ use: false, harvest: false, aim: null });
  });

  it('si el usar hizo algo (comer, abrir, sembrar, colocar), no ataca', () => {
    const s = new TapSequencer<string>(15);
    s.step({ ...quiet, tap: 'alli' });
    expect(s.step({ ...quiet, usedLast: true })).toEqual({ use: false, harvest: false, aim: null });
    expect(s.step(quiet).harvest).toBe(false);
  });

  it('mantener ataca en el acto y luego cada 15 ticks, hacia el dedo', () => {
    const s = new TapSequencer<number>(15);
    let at = 0;
    const hold = () => at;
    const golpes: number[] = [];
    for (let t = 0; t < 46; t++) {
      at = t;
      const out = s.step({ ...quiet, hold, strike: t === 0 });
      if (out.harvest) golpes.push(out.aim as number);
    }
    expect(golpes).toEqual([0, 15, 30, 45]);
  });

  it('al soltar, la cuenta empieza de cero', () => {
    const s = new TapSequencer<number>(15);
    const hold = () => 1;
    for (let t = 0; t < 10; t++) s.step({ ...quiet, hold, strike: t === 0 });
    s.step(quiet);
    let harvests = 0;
    for (let t = 0; t < 14; t++) if (s.step({ ...quiet, hold }).harvest) harvests++;
    expect(harvests).toBe(0);
  });

  it('con el inventario abierto se olvida el ataque pendiente', () => {
    const s = new TapSequencer<string>(15);
    s.step({ ...quiet, tap: 'alli' });
    s.clear();
    expect(s.step(quiet).harvest).toBe(false);
  });
});
