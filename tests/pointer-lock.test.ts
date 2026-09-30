import { describe, expect, it } from 'vitest';
import { isPaused } from '../packages/client/src/pointer-lock.js';

describe('La pausa del raton de PC', () => {
  it('sin cursor capturado se para, salvo con un panel abierto o si lo solto el juego', () => {
    for (const mouseMode of [false, true]) {
      for (const locked of [false, true]) {
        for (const devOpen of [false, true]) {
          for (const free of [false, true]) {
            const want = mouseMode && !locked && !devOpen && !free;
            const inputs = { mouseMode, locked, devOpen, free };
            expect(isPaused(inputs), JSON.stringify(inputs)).toBe(want);
          }
        }
      }
    }
  });

  it('cerrar el inventario sin poder recapturar no pausa: el cursor lo solto el juego', () => {
    // Lo que vio el autor: Esc cerraba el inventario y el juego se pausaba,
    // porque Chrome no recaptura sin gesto y Esc no cuenta como gesto.
    expect(isPaused({ mouseMode: true, locked: false, devOpen: false, free: true })).toBe(false);
    // El Esc del jugador en pleno juego, en cambio, si pausa.
    expect(isPaused({ mouseMode: true, locked: false, devOpen: false, free: false })).toBe(true);
  });

  it('en el movil no hay pausa por el cursor', () => {
    expect(isPaused({ mouseMode: false, locked: false, devOpen: false, free: false })).toBe(false);
  });
});
