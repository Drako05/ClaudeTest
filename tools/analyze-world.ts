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

import { createGame, JUMP_HALVES, MAX_HEIGHT, reachableArea, VOXELS_PER_TILE, WALK_HALVES, World, WorldGen } from '@verdant/sim';
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
  // El relieve, SOLO sobre tierra: es el campo contra el que hay que calibrar
  // los umbrales de altitud, y mezclarle el mar hundiria los percentiles.
  const relief: number[] = [];
  for (let y = -R; y < R; y += 3) {
    for (let x = -R; x < R; x += 3) {
      const r = gen.reliefAt(x, y);
      if (r >= 0.42) relief.push(r);
    }
  }
  for (const [name, arr] of [
    ['elevacion', elev],
    ['relieve/tierra', relief],
    ['temperatura', temp],
    ['humedad', moist],
  ] as const) {
    const s = [...arr].sort((a, b) => a - b);
    console.log(
      `  ${name.padEnd(15)} min=${percentile(s, 0).toFixed(3)} p50=${percentile(s, 0.5).toFixed(3)} ` +
        `p80=${percentile(s, 0.8).toFixed(3)} p90=${percentile(s, 0.9).toFixed(3)} ` +
        `p95=${percentile(s, 0.95).toFixed(3)} p99=${percentile(s, 0.99).toFixed(3)} max=${percentile(s, 1).toFixed(3)}`,
    );
  }
}

/**
 * Fraccion de tiles libres alcanzables desde el spawn, con la misma regla de
 * transito que el juego (`reachableArea`: por columnas de 0,5, medio bloque
 * andando y uno entero de un salto).
 */
export function navigability(world: World, sx: number, sy: number, half = 100): number {
  let free = 0;
  for (let y = sy - half; y < sy + half; y++) {
    for (let x = sx - half; x < sx + half; x++) {
      if (!world.isSolidAt(x, y)) free++;
    }
  }
  return free === 0 ? 0 : reachableArea(world, sx, sy, half) / free;
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
  // Por columnas de 0,5, leidas de los chunks (generar por chunk reparte el
  // ruido entre sus columnas; pedir cada columna suelta lo repetiria).
  const world = new World(seed);
  const gen: WorldGen = world.gen;
  const R = 180 * VOXELS_PER_TILE;
  const side = R * 2;
  const height = new Int16Array(side * side);
  const at = (x: number, y: number) => height[(y + R) * side + (x + R)];

  let land = 0;
  let raised = 0;
  const histogram = new Array(MAX_HEIGHT + 1).fill(0);
  for (let y = -R; y < R; y++) {
    for (let x = -R; x < R; x++) {
      const h = world.columnTop(x, y);
      height[(y + R) * side + (x + R)] = h;
      if (h < 0) continue;
      land++;
      histogram[h]++;
      if (gen.isOutcrop(Math.floor(x / VOXELS_PER_TILE), Math.floor(y / VOXELS_PER_TILE))) raised++;
    }
  }

  /** Mayor componente conexa bajo «se sube como mucho `climb` medios bloques». */
  function largestComponent(climb: number): number {
    const seen = new Uint8Array(side * side);
    let best = 0;
    const stack: number[] = [];
    for (let start = 0; start < seen.length; start++) {
      if (seen[start] || height[start] < 0) continue;
      let size = 0;
      stack.push(start);
      seen[start] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        size++;
        const x = (i % side) - R;
        const y = Math.floor(i / side) - R;
        const here = height[i];
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

  // Paredes de dos o mas bloques de 1 (cuatro medios): son las que obligan a
  // buscar otro punto por donde subir. Y las de uno, que piden saltar.
  let tallWalls = 0;
  let jumpWalls = 0;
  for (let y = -R + 1; y < R - 1; y++) {
    for (let x = -R + 1; x < R - 1; x++) {
      const here = at(x, y);
      if (here < 0) continue;
      let rise = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) rise = Math.max(rise, at(x + dx, y + dy) - here);
      if (rise >= 2 * VOXELS_PER_TILE) tallWalls++;
      else if (rise > WALK_HALVES) jumpWalls++;
    }
  }

  const base = largestComponent(9999); // solo el agua separa
  const walk = largestComponent(WALK_HALVES); // andando: medio bloque
  const real = largestComponent(JUMP_HALVES); // se sube un bloque de un salto
  let peak = 0;
  for (let i = 0; i < histogram.length; i++) if (histogram[i]) peak = i;
  // Reparto por franjas, en bloques de 1.
  const bands = [0, 1, 3, 6, 10, 16, 24, MAX_HEIGHT / VOXELS_PER_TILE + 1];
  const spread: string[] = [];
  for (let b = 0; b + 1 < bands.length; b++) {
    let sum = 0;
    for (let i = bands[b] * VOXELS_PER_TILE; i < bands[b + 1] * VOXELS_PER_TILE && i < histogram.length; i++) sum += histogram[i];
    if (sum) spread.push(`n${bands[b]}-${bands[b + 1] - 1} ${((100 * sum) / land).toFixed(1)}%`);
  }
  console.log(`  alturas: pico ${peak / VOXELS_PER_TILE} | ${spread.join('  ')}`);
  console.log(
    `  salientes: ${((100 * raised) / land).toFixed(1)}% de la tierra | ` +
      `conexo base ${((100 * base) / land).toFixed(1)}% -> andando ${((100 * walk) / land).toFixed(1)}% ` +
      `-> con salto ${((100 * real) / land).toFixed(1)}% (pierde ${((100 * (base - real)) / land).toFixed(2)} pt)`,
  );
  console.log(`  columnas al pie de una pared de 2+ bloques: ${tallWalls}; de 1 (salto): ${jumpWalls}`);
}

console.log('\n===== relieve =====');
for (const seed of SEEDS) {
  console.log(`--- semilla ${seed} ---`);
  reportRelief(seed);
}
