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

// ---------------------------------------------------------------- relieve

/**
 * Reparto de alturas y explorabilidad.
 *
 * El umbral de salientes de `worldgen.ts` sale de aqui, no de la intuicion: con
 * salientes abundantes la mayor componente conexa del mundo se parte. Se mide
 * contra la LINEA BASE que ya impone el agua, porque el mundo plano tampoco es
 * completamente conexo y confundir las dos cosas lleva a leer como sano un
 * relieve que no lo es.
 */
function reportRelief(seed: number): void {
  const gen = new WorldGen(seed);
  const R = 180;
  const side = R * 2;
  const level = new Int8Array(side * side);
  const at = (x: number, y: number) => level[(y + R) * side + (x + R)];

  let land = 0;
  let raised = 0;
  const histogram = new Array(9).fill(0);
  for (let y = -R; y < R; y++) {
    for (let x = -R; x < R; x++) {
      const lvl = gen.levelAt(x, y);
      level[(y + R) * side + (x + R)] = lvl;
      if (lvl < 0) continue;
      land++;
      histogram[lvl]++;
      if (gen.isOutcrop(x, y)) raised++;
    }
  }

  /** Mayor componente conexa bajo «se sube como mucho `climb` niveles». */
  function largestComponent(climb: number): number {
    const seen = new Uint8Array(side * side);
    let best = 0;
    const stack: number[] = [];
    for (let start = 0; start < seen.length; start++) {
      if (seen[start] || level[start] < 0) continue;
      let size = 0;
      stack.push(start);
      seen[start] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        size++;
        const x = (i % side) - R;
        const y = Math.floor(i / side) - R;
        const here = level[i];
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < -R || nx >= R || ny < -R || ny >= R) continue;
          const j = (ny + R) * side + (nx + R);
          if (seen[j]) continue;
          const there = at(nx, ny);
          if (there < 0) continue;
          if (there - here > climb) continue;
          seen[j] = 1;
          stack.push(j);
        }
      }
      if (size > best) best = size;
    }
    return best;
  }

  // Paredes de dos o mas bloques: son las que obligan a buscar otro punto por
  // donde subir, y sin ellas el encargo del autor no esta cumplido.
  let tallWalls = 0;
  for (let y = -R + 1; y < R - 1; y++) {
    for (let x = -R + 1; x < R - 1; x++) {
      const here = at(x, y);
      if (here < 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (at(x + dx, y + dy) - here >= 2) {
          tallWalls++;
          break;
        }
      }
    }
  }

  const base = largestComponent(99); // solo el agua separa
  const real = largestComponent(1); // se sube un bloque de un salto
  console.log(
    `  alturas: ${histogram
      .map((c, i) => (c ? `n${i} ${((100 * c) / land).toFixed(1)}%` : ''))
      .filter(Boolean)
      .join('  ')}`,
  );
  console.log(
    `  salientes: ${((100 * raised) / land).toFixed(1)}% de la tierra | ` +
      `conexo base ${((100 * base) / land).toFixed(1)}% -> con relieve ${((100 * real) / land).toFixed(1)}% ` +
      `(pierde ${((100 * (base - real)) / land).toFixed(2)} pt)`,
  );
  console.log(`  al pie de una pared de 2+ bloques: ${tallWalls} tiles`);
}

console.log('\n===== relieve =====');
for (const seed of SEEDS) {
  console.log(`--- semilla ${seed} ---`);
  reportRelief(seed);
}
