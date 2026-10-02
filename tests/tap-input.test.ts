/**
 * El orden del modo TAP: un toque usa y luego ataca, salvo que el usar haga
 * algo; mantener ataca en el acto y luego con la cadencia del boton.
 */

import { describe, expect, it } from 'vitest';
import { sectorRays } from '@verdant/sim';
import { flattestRoll, rollFor, TapSequencer, tiltOf } from '../packages/client/src/tap-input.js';

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

describe('El giro del barrido del modo TAP', () => {
  it('el plano girado contiene la derecha de la camara', () => {
    // Mirada hacia un lado y hacia abajo respecto a una camara que mira al norte.
    const camRight = { x: 1, y: 0, z: 0 };
    for (const [yaw, pitch] of [[0.9, -0.4], [-1.2, -0.6], [0.3, 0.2], [2.0, -0.9]]) {
      const dir = { x: Math.cos(pitch) * Math.sin(yaw), y: -Math.cos(pitch) * Math.cos(yaw), z: Math.sin(pitch) };
      const len = Math.hypot(dir.x, dir.y);
      const rays = sectorRays(dir.x / len, dir.y / len, dir.z, rollFor(dir, camRight));
      const a = rays[0];
      const b = rays[rays.length - 1];
      const n = { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
      expect(Math.abs(n.x * camRight.x + n.y * camRight.y + n.z * camRight.z) / Math.hypot(n.x, n.y, n.z)).toBeLessThan(1e-9);
    }
  });

  it('mirando hacia donde mira la camara, no gira', () => {
    expect(rollFor({ x: 0, y: -Math.cos(0.3), z: -Math.sin(0.3) }, { x: 1, y: 0, z: 0 })).toBeCloseTo(0, 12);
  });
});

describe('El giro que se VE mas horizontal (tercera persona)', () => {
  /** Un trazo recto de 100 px que se ve tumbado con el giro `flat`. */
  const segment = (flat: number) => (roll: number) => {
    const a = roll - flat;
    return [{ x: 0, y: 0 }, { x: 100 * Math.cos(a), y: 100 * Math.sin(a) }];
  };

  it('el alto entre el ancho de un trazo', () => {
    expect(tiltOf([{ x: 0, y: 0 }, { x: 100, y: 0 }])).toBe(0);
    expect(tiltOf([{ x: 0, y: 0 }, { x: 50, y: 20 }, { x: 100, y: 0 }])).toBeCloseTo(0.2, 12);
  });

  it('si el de rollFor ya se ve horizontal, se queda con el', () => {
    expect(flattestRoll(0.4, segment(0.4))).toBe(0.4);
  });

  it('si no, busca en la media vuelta alrededor el que se ve tumbado', () => {
    for (const flat of [1.1, -0.9, 0.25]) {
      const roll = flattestRoll(0, segment(flat));
      expect(tiltOf(segment(flat)(roll))).toBeLessThan(0.06);
      expect(Math.abs(roll)).toBeLessThan(Math.PI / 2);
    }
  });
});
