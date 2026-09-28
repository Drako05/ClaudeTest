import { describe, expect, it } from 'vitest';
import { isPaused } from '../packages/client/src/pointer-lock.js';

describe('La pausa del raton de PC', () => {
  it('sin cursor capturado se para, salvo con el panel de desarrollo', () => {
    for (const mouseMode of [false, true]) {
      for (const locked of [false, true]) {
        for (const devOpen of [false, true]) {
          const want = mouseMode && !locked && !devOpen;
          expect(isPaused({ mouseMode, locked, devOpen }), JSON.stringify({ mouseMode, locked, devOpen })).toBe(want);
        }
      }
    }
  });

  it('en el movil no hay pausa por el cursor', () => {
    expect(isPaused({ mouseMode: false, locked: false, devOpen: false })).toBe(false);
  });
});
