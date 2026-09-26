import { describe, expect, it } from 'vitest';
import { DAY_TICKS } from '@verdant/shared';
import { AMBER, mixColor, NIGHT, NIGHT_ALPHA, skyTint } from '../packages/client/src/spike3d/sky.js';

/**
 * El dia y la noche del 3D: la misma vela que tenia el isometrico, con sus
 * mismos numeros, leida del reloj del nucleo.
 */

const at = (fraction: number): number => Math.round(DAY_TICKS * fraction);

describe('El tinte del cielo', () => {
  it('a mediodia no hay vela', () => {
    expect(skyTint(at(0.5)).alpha).toBe(0);
  });

  it('a medianoche la vela es azul de noche y a su opacidad maxima', () => {
    const t = skyTint(at(0));
    expect(t.alpha).toBeCloseTo(NIGHT_ALPHA, 5);
    expect(t.color).toBe(NIGHT);
  });

  it('el ocaso pasa por el ambar', () => {
    // A mitad de la transicion la luz vale 0.5 y el ambar pesa lo maximo.
    const t = skyTint(at(0.75));
    expect(t.alpha).toBeCloseTo(NIGHT_ALPHA / 2, 2);
    expect(t.color).toBe(mixColor(NIGHT, AMBER, 0.55));
  });

  it('el amanecer y el ocaso son simetricos', () => {
    expect(skyTint(at(0.25))).toEqual(skyTint(at(0.75)));
  });

  it('la vela solo crece al anochecer', () => {
    let prev = -1;
    for (let f = 0.7; f <= 0.8; f += 0.01) {
      const a = skyTint(at(f)).alpha;
      expect(a).toBeGreaterThanOrEqual(prev);
      prev = a;
    }
  });
});
