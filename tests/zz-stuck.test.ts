import { it } from 'vitest';
import { emptyIntent, Species } from '@verdant/shared';
import { createGame, step } from '@verdant/sim';
it('clavados', () => {
  const out: string[] = [];
  for (const seed of [1, 2, 3, 4, 5]) {
    const state = createGame(seed);
    const window = 3 * 60;
    const trail = new Map<string, number[][]>();
    const by = new Map<number, { all: number; stuck: number }>();
    let all = 0, stuck = 0;
    for (let t = 0; t < 120 * 60; t++) {
      step(state, emptyIntent());
      const e = state.entities;
      for (const [key, id] of state.fauna) {
        const far = Math.hypot(e.wanderX[id] - e.x[id], e.wanderY[id] - e.y[id]);
        const h = trail.get(key) ?? [];
        h.push([e.x[id], e.y[id], far]);
        if (h.length > window) h.shift();
        trail.set(key, h);
        if (h.length < window) continue;
        const s = h.every((p) => p[2] > 0.6) && Math.hypot(h[0][0] - e.x[id], h[0][1] - e.y[id]) < 0.05;
        const sp = e.animal[id]!.species;
        const c = by.get(sp) ?? { all: 0, stuck: 0 };
        c.all++; if (s) c.stuck++; by.set(sp, c);
        all++; if (s) stuck++;
      }
    }
    out.push(`semilla ${seed}: ${(100 * stuck / all).toFixed(1)} % | ` + [...by].sort((a, b) => a[0] - b[0]).map(([sp, c]) => `${Species[sp]} ${(100 * c.stuck / c.all).toFixed(0)}`).join(' '));
  }
  console.log('CLAVADOS\n' + out.join('\n'));
}, 600000);
