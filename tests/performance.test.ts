import { describe, expect, it } from 'vitest';
import { createGame, step } from '@verdant/sim';
import { emptyIntent, TICK_HZ } from '@verdant/shared';

/**
 * Este test no busca un numero bonito: establece la linea base que decide, mas
 * adelante, si hay que portar el nucleo a Rust/WASM. El criterio acordado es
 * portar si el tick supera ~8 ms con la carga objetivo.
 */
describe('rendimiento del nucleo', () => {
  it('el coste medio de un tick queda muy por debajo del presupuesto', () => {
    const state = createGame(2024);
    const i = emptyIntent();
    i.moveX = 1;
    i.moveY = 0.35;

    for (let k = 0; k < 200; k++) step(state, i); // calentamiento

    const ticks = TICK_HZ * 30;
    const t0 = performance.now();
    for (let k = 0; k < ticks; k++) step(state, i);
    const elapsed = performance.now() - t0;
    const perTick = elapsed / ticks;

    console.log(`tick medio: ${perTick.toFixed(4)} ms (${ticks} ticks en ${elapsed.toFixed(1)} ms)`);
    expect(perTick).toBeLessThan(8);
  });
});
