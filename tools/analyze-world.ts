/**
 * Analisis del mundo generado, sin dibujar nada.
 *
 * Sirve para calibrar los umbrales de bioma con datos en vez de a ojo. Los
 * umbrales de worldgen.ts solo tienen sentido dentro del rango real que
 * producen los campos de ruido; si se cambia una escala de ruido, hay que
 * volver a correr esto y recalibrar.
 *
 *   npx vite-node tools/analyze-world.ts
 */

import { createGame, World, WorldGen } from '@verdant/sim';
import { Terrain } from '@verdant/shared';

const SEEDS = [12345, 7, 999];
const NAMES = ['AguaProf', 'Agua', 'Arena', 'Pradera', 'Bosque', 'Roca', 'Nieve', 'Tundra'];

function percentile(sorted: number[], p: number): number {
  return sorted[Math.floor(p * (sorted.length - 1))];
}

function reportFields(seed: number): void {
  const gen = new WorldGen(seed);
  const elev: number[] = [];
  const temp: number[] = [];
  const moist: number[] = [];
  const R = 400;
  for (let y = -R; y < R; y += 3) {
    for (let x = -R; x < R; x += 3) {
      const e = gen.elevationAt(x, y);
      elev.push(e);
      temp.push(gen.temperatureAt(x, y, e));
      moist.push(gen.moistureAt(x, y));
    }
  }
  for (const [name, arr] of [
    ['elevacion', elev],
    ['temperatura', temp],
    ['humedad', moist],
  ] as const) {
    const s = [...arr].sort((a, b) => a - b);
    console.log(
      `  ${name.padEnd(12)} min=${percentile(s, 0).toFixed(3)} p05=${percentile(s, 0.05).toFixed(3)} ` +
        `p50=${percentile(s, 0.5).toFixed(3)} p95=${percentile(s, 0.95).toFixed(3)} max=${percentile(s, 1).toFixed(3)}`,
    );
  }
}

/** Fraccion de tiles libres alcanzables a pie desde el spawn. */
export function navigability(world: World, sx: number, sy: number, half = 100): number {
  let free = 0;
  for (let y = sy - half; y < sy + half; y++) {
    for (let x = sx - half; x < sx + half; x++) {
      if (!world.isSolidAt(x, y)) free++;
    }
  }
  const seen = new Set<string>();
  const stack: Array<[number, number]> = [[sx, sy]];
  let reached = 0;
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < sx - half || x >= sx + half || y < sy - half || y >= sy + half) continue;
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (world.isSolidAt(x, y)) continue;
    reached++;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return free === 0 ? 0 : reached / free;
}

for (const seed of SEEDS) {
  console.log(`\n=== semilla ${seed} ===`);
  reportFields(seed);

  const world = new World(seed);
  const counts = new Array(NAMES.length).fill(0);
  const feats = [0, 0, 0, 0];
  const R = 300;
  for (let y = -R; y < R; y += 2) {
    for (let x = -R; x < R; x += 2) {
      counts[world.terrainAt(x, y) as Terrain]++;
      feats[world.featureAt(x, y)]++;
    }
  }
  const total = counts.reduce((a, b) => a + b, 0);
  console.log(
    '  biomas: ' +
      counts.map((c, i) => `${NAMES[i]} ${((100 * c) / total).toFixed(1)}%`).join('  '),
  );
  console.log(
    `  features: arbol ${((100 * feats[1]) / total).toFixed(1)}%  ` +
      `roca ${((100 * feats[2]) / total).toFixed(1)}%  baya ${((100 * feats[3]) / total).toFixed(1)}%`,
  );

  const game = createGame(seed);
  const sx = Math.floor(game.entities.x[game.playerId]);
  const sy = Math.floor(game.entities.y[game.playerId]);
  console.log(`  navegable desde el spawn: ${(100 * navigability(world, sx, sy)).toFixed(1)}%`);
}
