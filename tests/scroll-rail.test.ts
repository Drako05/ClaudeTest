/**
 * La barra deslizable del movil: sus cuentas. Que se vea y que el dedo la
 * mueva lo afirman el humo y los gestos.
 */

import { describe, expect, it } from 'vitest';
import { MIN_THUMB, scrollFor, thumbFor } from '../packages/client/src/scroll-rail.js';

describe('La barra deslizable', () => {
  const m = { visible: 300, total: 600, track: 300 };

  it('sin mas contenido del que cabe, no se ve', () => {
    expect(thumbFor({ visible: 300, total: 300, track: 300 }, 0).shown).toBe(false);
    // Medio pixel de redondeo tampoco la saca.
    expect(thumbFor({ visible: 300, total: 300.4, track: 300 }, 0).shown).toBe(false);
  });

  it('con mas, se ve, y el mando mide la parte que se ve', () => {
    const t = thumbFor(m, 0);
    expect(t.shown).toBe(true);
    expect(t.size).toBe(150);
    expect(t.offset).toBe(0);
  });

  it('abajo del todo, el mando toca el fondo de la pista', () => {
    const t = thumbFor(m, 300);
    expect(t.offset + t.size).toBe(m.track);
    // Y pasarse no lo saca de la pista.
    expect(thumbFor(m, 900).offset + t.size).toBe(m.track);
  });

  it('con muchisimo contenido, el mando no baja del minimo para el dedo', () => {
    const t = thumbFor({ visible: 300, total: 30_000, track: 300 }, 0);
    expect(t.size).toBe(MIN_THUMB);
  });

  it('ida y vuelta: del deslizado al mando y del mando al deslizado', () => {
    for (const big of [m, { visible: 300, total: 30_000, track: 300 }]) {
      for (const top of [0, 57, 150, big.total - big.visible]) {
        const t = thumbFor(big, top);
        expect(scrollFor(big, t.offset)).toBeCloseTo(top, 6);
      }
    }
  });

  it('arrastrar el mando fuera de la pista se queda en los extremos', () => {
    expect(scrollFor(m, -50)).toBe(0);
    expect(scrollFor(m, 10_000)).toBe(300);
  });
});
