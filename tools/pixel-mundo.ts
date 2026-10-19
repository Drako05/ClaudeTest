/**
 * El generador del pixelart del mundo (el autor, 2026-10-19: «adaptemos el arte
 * del terreno y los elementos al pixelart HD», con caras de 24 × 24 por bloque
 * y voxeles de 12 × 12; guia de arte, directriz 7).
 *
 * Saca las rejillas de formas (manchas de ruido, bolas de hojas sombreadas,
 * vetas) y las escribe en `packages/client/src/world-art.ts`, que es lo que
 * usa el juego. **Despues se retocan a mano, pixel a pixel, en ese fichero**:
 * volver a correr esto pisa los retoques. Vive en el repo, y no en el
 * contenedor como el de los iconos, para que no muera con la sesion.
 *
 *   npx vite-node tools/pixel-mundo.ts
 *
 * Determinista: cada dibujo sale de su propia semilla.
 *
 * Ronda 1 (muestra de estilo, para que el autor apruebe el estilo antes de
 * dibujar todo): hierba y roca con dos variantes, el roble, la mata de la
 * pradera y la roca de voxeles.
 */

import { writeFileSync } from 'node:fs';
import { Feature, Terrain } from '@verdant/shared';
import { TREE_TRUNKS } from '@verdant/sim';
import { TERRAIN_RGB } from '../packages/client/src/art.js';
import { LOOKS, ROCK_FACES } from '../packages/client/src/palette.js';
import { treeShapeOf } from '../packages/client/src/tree-shapes.js';

/** Pixeles de arte por bloque (el autor). Un voxel de 0,5 son 12. */
const PX = 24;

// ------------------------------------------------------------------ colores

type RGB = [number, number, number];

const hexToRgb = (h: string): RGB => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as RGB;
const rgbToHex = (c: RGB): string =>
  `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
/** Hacia el blanco: las luces de un material. */
const lift = (c: RGB, k: number): RGB => [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k];

/**
 * El color que se VE de un objeto hoy. Sus texturas no llevan espacio de color,
 * asi que three.js las toma por lineales y las aclara al pintar: lo que el
 * autor ve no es el hexadecimal de `palette.ts` sino este. La hoja ensena lo
 * que se ve, y en el juego estas texturas iran ya en sRGB (ronda 3). El suelo,
 * medido en una captura, se ve casi con su hexadecimal: no pasa por aqui.
 */
function seen(hex: string): RGB {
  return hexToRgb(hex).map((v) => {
    const l = v / 255;
    return (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055) * 255;
  }) as RGB;
}

/** Cuatro tonos de un material: luz, base, sombra y hondo. */
function tones(base: RGB): [RGB, RGB, RGB, RGB] {
  return [lift(base, 0.22), base, scale(base, 0.78), scale(base, 0.6)];
}

/** Cuatro tonos desde los tres de una especie (oscuro, medio, claro). */
function speciesTones(dark: RGB, mid: RGB, light: RGB): [RGB, RGB, RGB, RGB] {
  return [light, mid, dark, scale(dark, 0.78)];
}

// ------------------------------------------------------------------ azar

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido de valor periodico: una tesela que casa consigo misma por los cuatro lados. */
function periodicNoise(rng: () => number, size: number, cell: number): (x: number, y: number) => number {
  const n = size / cell;
  const lattice = Array.from({ length: n * n }, () => rng());
  const at = (i: number, j: number) => lattice[((j % n) + n) % n * n + ((i % n) + n) % n]!;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = smooth(fx - i);
    const v = smooth(fy - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * v;
  };
}

// ------------------------------------------------------------------ rejillas

type Grid = string[][];

/**
 * El valor por debajo del cual queda la fraccion `q` de los valores: los tonos
 * se reparten por proporciones fijas y no por umbrales, que con cada ruido
 * daban una tesela casi toda de un tono.
 */
function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
}

const blank = (w: number, h: number, ch = '.'): Grid => Array.from({ length: h }, () => Array(w).fill(ch));
const rows = (g: Grid): string[] => g.map((r) => r.join(''));

/** Una tesela de suelo: base, manchas de ruido, y lo propio de cada material. */
function grassTile(seed: number): Grid {
  const rng = mulberry32(seed);
  const noise = periodicNoise(rng, PX, 4);
  const g = blank(PX, PX, 'B');
  const all: number[] = [];
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) all.push(noise(x, y));
  const low = quantile(all, 0.16);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) if (noise(x, y) < low) g[y]![x] = 'C';
  // Briznas: dos pixeles de luz con su sombra debajo, a la derecha (luz del noroeste).
  const w = (x: number) => ((x % PX) + PX) % PX;
  for (let k = 0; k < 34; k++) {
    const x = Math.floor(rng() * PX);
    const y = Math.floor(rng() * PX);
    g[w(y)]![x] = 'A';
    g[w(y + 1)]![x] = 'A';
    if (rng() < 0.6) g[w(y + 2)]![w(x + 1)] = 'C';
  }
  for (let k = 0; k < 7; k++) {
    const x = Math.floor(rng() * PX);
    const y = Math.floor(rng() * PX);
    if (g[y]![x] === 'C') g[y]![x] = 'D';
  }
  return g;
}

function rockTile(seed: number, [light, base, shadow, deep]: string): Grid {
  const rng = mulberry32(seed);
  const noise = periodicNoise(rng, PX, 6);
  const fine = periodicNoise(rng, PX, 3);
  const g = blank(PX, PX, base);
  const v = (x: number, y: number) => noise(x, y) * 0.75 + fine(x, y) * 0.25;
  const all: number[] = [];
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) all.push(v(x, y));
  const hi = quantile(all, 0.78);
  const lo = quantile(all, 0.24);
  for (let y = 0; y < PX; y++) {
    for (let x = 0; x < PX; x++) {
      if (v(x, y) >= hi) g[y]![x] = light;
      else if (v(x, y) < lo) g[y]![x] = shadow;
    }
  }
  // Grietas: un paseo corto de hondo, con un pixel de luz encima a la izquierda.
  const w = (v: number) => ((v % PX) + PX) % PX;
  for (let k = 0; k < 3; k++) {
    let x = Math.floor(rng() * PX);
    let y = Math.floor(rng() * PX);
    g[w(y - 1)]![w(x - 1)] = light;
    const len = 4 + Math.floor(rng() * 5);
    for (let s = 0; s < len; s++) {
      g[w(y)]![w(x)] = deep;
      x += rng() < 0.6 ? 1 : 0;
      y += rng() < 0.5 ? 1 : rng() < 0.5 ? -1 : 0;
    }
  }
  return g;
}

/**
 * Una masa de hojas: bolas sombreadas como esferas con la luz arriba a la
 * izquierda, el borde mordido para que se lea como hojas y no como globos, y
 * cuatro tonos (`light`, `base`, `shadow`, `deep`).
 */
function leafMass(
  g: Grid,
  rng: () => number,
  blobs: { x: number; y: number; r: number }[],
  [light, base, shadow, deep]: string,
): void {
  const L = [-0.55, -0.65, 0.52];
  const ln = Math.hypot(L[0]!, L[1]!, L[2]!);
  const h = g.length;
  const w = g[0]!.length;
  const lit: { x: number; y: number; s: number }[] = [];
  const clumps = new Map<string, number>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best: { b: (typeof blobs)[number]; z: number; d: number } | null = null;
      for (const b of blobs) {
        const d = Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y);
        if (d > b.r) continue;
        // Las bolas de abajo estan delante: las tapan a las de arriba.
        const z = Math.sqrt(b.r * b.r - d * d) + b.y * 0.35;
        if (!best || z > best.z) best = { b, z, d };
      }
      if (!best) continue;
      const { b, d } = best;
      // El mordisco, solo en el borde de fuera de la masa: dentro, otra bola
      // cubre el pixel y morderlo dejaba agujeros oscuros.
      const inner = blobs.some((o) => Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y) < o.r - 2.5);
      if (!inner && d > b.r - 2.2 && rng() < 0.4) continue;
      const nx = (x + 0.5 - b.x) / b.r;
      const ny = (y + 0.5 - b.y) / b.r;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      // Racimos de 2 x 2 con su propio tono: hojas, no un degradado liso.
      const clump = clumps.get(`${x >> 1},${y >> 1}`) ?? clumps.set(`${x >> 1},${y >> 1}`, rng() - 0.5).get(`${x >> 1},${y >> 1}`)!;
      const s = 0.5 + 0.5 * ((nx * L[0]! + ny * L[1]! + nz * L[2]!) / ln) + clump * 0.34 + (rng() - 0.5) * 0.08;
      lit.push({ x, y, s });
    }
  }
  // Por proporciones: una cuarta parte de luz, algo mas de base, y lo de
  // abajo a la derecha en sombra y hondo.
  const values = lit.map((p) => p.s);
  const q1 = quantile(values, 0.14);
  const q2 = quantile(values, 0.42);
  const q3 = quantile(values, 0.76);
  for (const { x, y, s } of lit) g[y]![x] = s >= q3 ? light : s >= q2 ? base : s >= q1 ? shadow : deep;
  // Sin pixeles sueltos en el borde: el mordisco hace hojas, pero un pixel
  // con menos de dos vecinos se lee como ruido.
  const mass = new Set(`${light}${base}${shadow}${deep}`);
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mass.has(g[y]![x]!);
  for (let pass = 0; pass < 2; pass++) {
    for (const { x, y } of lit) {
      if (!filled(x, y)) continue;
      const n = +filled(x - 1, y) + +filled(x + 1, y) + +filled(x, y - 1) + +filled(x, y + 1);
      if (n < 2) g[y]![x] = '.';
    }
  }
}

/** Un tronco de corteza: luz a la izquierda, vetas verticales, de `wBase` a `wTop` pixeles. */
function trunk(g: Grid, rng: () => number, cx: number, yBase: number, yTop: number, wBase: number, wTop: number, [light, base, shadow, deep]: string): void {
  const streaks = new Map<number, number>();
  for (let y = yBase; y >= yTop; y--) {
    const t = (yBase - y) / Math.max(1, yBase - yTop);
    const wy = Math.max(2, Math.round(wBase + (wTop - wBase) * t) + (yBase - y < 2 ? 2 : 0));
    const left = Math.round(cx - wy / 2);
    for (let i = 0; i < wy; i++) {
      const rel = (i + 0.5) / wy;
      let c = rel < 0.25 ? light : rel < 0.62 ? base : rel < 0.86 ? shadow : deep;
      const key = i;
      if ((streaks.get(key) ?? 0) > 0) {
        streaks.set(key, streaks.get(key)! - 1);
        c = rel < 0.5 ? shadow : deep;
      } else if (rng() < 0.05 && rel > 0.15) streaks.set(key, 2 + Math.floor(rng() * 4));
      g[y]![left + i] = c;
    }
  }
}

/** El roble: copa de bolas en cupula, del tamano de su especie, sobre su tronco medio. */
function oak(): Grid {
  const shape = treeShapeOf(Feature.MeadowTree)!;
  const law = TREE_TRUNKS[Feature.MeadowTree]!;
  const W = Math.round(shape.crownW * PX);
  const crownH = Math.round(shape.crownH * PX);
  const bare = Math.round(law.bareMean * PX);
  const H = crownH + bare;
  const g = blank(W, H);
  const rng = mulberry32(0x0a4);
  trunk(g, rng, W / 2, H - 1, Math.round(crownH * 0.45), Math.round(law.trunkW * PX), 6, 'MNOP');
  // La cupula: una fila ancha abajo, otra encima y la corona.
  const blobs: { x: number; y: number; r: number }[] = [];
  const row = (n: number, y: number, spread: number, r: number) => {
    for (let i = 0; i < n; i++) {
      const x = W / 2 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread) + (rng() - 0.5) * 4;
      blobs.push({ x, y: y + (rng() - 0.5) * 4, r: r + (rng() - 0.5) * 3 });
    }
  };
  row(6, crownH * 0.74, W - 26, 12);
  row(5, crownH * 0.53, W - 30, 13);
  row(4, crownH * 0.33, W - 44, 12);
  row(2, crownH * 0.16, W - 70, 11);
  leafMass(g, rng, blobs, 'IJKL');
  return g;
}

/** La mata de la pradera: tres bolas bajas, un tallo y sus bayas. */
function meadowBush(): Grid {
  const W = 24;
  const H = 27;
  const g = blank(W, H);
  const rng = mulberry32(0xb05);
  for (let y = H - 3; y < H; y++) g[y]![11] = g[y]![12] = 'W';
  leafMass(g, rng, [
    { x: 8, y: 17, r: 8.5 },
    { x: 16, y: 16, r: 8.5 },
    { x: 12, y: 10, r: 8.5 },
  ], 'QRST');
  // Bayas de 2 x 2, con su brillo arriba a la izquierda, sobre hojas.
  const spots = [[6, 13], [15, 9], [17, 18], [10, 19], [12, 5]];
  for (const [x, y] of spots) {
    if (g[y]![x] === '.' || g[y + 1]![x + 1] === '.') continue;
    g[y]![x] = 'V';
    g[y]![x + 1] = g[y + 1]![x] = g[y + 1]![x + 1] = 'U';
  }
  return g;
}

/**
 * La roca de voxeles (el autor: «bloque de voxeles», 2026-10-19): voxeles de
 * 0,5 con la textura de la piedra, alineada con el mundo como la del suelo.
 * Abajo, los cuatro; arriba, tres: le falta la esquina de delante a la derecha,
 * para que no sea un cubo. Cada voxel es [este, sur, arriba] en medios bloques.
 */
const ROCK_SHAPE: [number, number, number][] = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1],
];

// ------------------------------------------------------------------ paleta y salida

const grass = tones(TERRAIN_RGB[Terrain.Grass].map((v) => v) as RGB);
const rock = tones(TERRAIN_RGB[Terrain.Rock].map((v) => v) as RGB);
const oakLook = LOOKS[Feature.MeadowTree]!;
const bushLook = LOOKS[Feature.MeadowPlant]!;
const leaf = speciesTones(seen(oakLook.dark), seen(oakLook.mid), seen(oakLook.light));
const bark = tones(seen(oakLook.trunk));
const bush = speciesTones(seen(bushLook.dark), seen(bushLook.mid), seen(bushLook.light));
const fruit = seen(bushLook.fruit!);
const stone = [seen(ROCK_FACES[2]!), seen(ROCK_FACES[1]!), seen(ROCK_FACES[0]!), scale(seen(ROCK_FACES[0]!), 0.8)] as const;

const PALETTE: [string, RGB, string][] = [
  ['A', grass[0], 'hierba: luz'], ['B', grass[1], 'hierba: base'], ['C', grass[2], 'hierba: sombra'], ['D', grass[3], 'hierba: hondo'],
  ['E', rock[0], 'roca del suelo: luz'], ['F', rock[1], 'roca del suelo: base'], ['G', rock[2], 'roca del suelo: sombra'], ['H', rock[3], 'roca del suelo: hondo'],
  ['I', leaf[0], 'hoja del roble: luz'], ['J', leaf[1], 'hoja del roble: base'], ['K', leaf[2], 'hoja del roble: sombra'], ['L', leaf[3], 'hoja del roble: hondo'],
  ['M', bark[0], 'corteza del roble: luz'], ['N', bark[1], 'corteza del roble: base'], ['O', bark[2], 'corteza del roble: sombra'], ['P', bark[3], 'corteza del roble: hondo'],
  ['Q', bush[0], 'hoja de la mata: luz'], ['R', bush[1], 'hoja de la mata: base'], ['S', bush[2], 'hoja de la mata: sombra'], ['T', bush[3], 'hoja de la mata: hondo'],
  ['U', fruit, 'baya: base'], ['V', lift(fruit, 0.45), 'baya: brillo'], ['W', seen(bushLook.trunk), 'tallo de la mata'],
  ['a', stone[0], 'piedra: luz'], ['b', stone[1], 'piedra: base'], ['c', stone[2], 'piedra: sombra'], ['d', stone[3], 'piedra: hondo'],
];

const art = (name: string, doc: string, g: Grid) =>
  `/** ${doc} */\nexport const ${name}: WorldArt = {\n  rows: [\n${rows(g).map((r) => `    '${r}',`).join('\n')}\n  ],\n};\n`;

const out = `/**
 * El pixelart del mundo (el autor, 2026-10-19; guia de arte, directriz 7): a
 * 24 pixeles por cara de bloque y 12 por voxel, sin contorno, la luz del
 * noroeste, cuatro tonos por material (luz, base, sombra, hondo).
 *
 * **Lo genero \`tools/pixel-mundo.ts\` y se retoca aqui a mano**, pixel a pixel.
 * Volver a correr el generador pisa los retoques.
 *
 * Ronda 1, la muestra de estilo: hierba y roca con dos variantes, el roble, la
 * mata de la pradera y la roca de voxeles. Los colores son los que se VEN hoy
 * en el juego (*deduccion*): el suelo, su hexadecimal; los objetos, el de
 * \`palette.ts\` aclarado como lo aclara three.js al pintar.
 */

/** Una rejilla: filas de caracteres, \`.\` transparente, cada letra un color de \`WORLD_PALETTE\`. */
export interface WorldArt {
  readonly rows: readonly string[];
}

/** Pixeles de arte por cara de bloque (el autor). */
export const WORLD_PX = ${PX};

/** La paleta del mundo, por material, de luz a hondo. */
export const WORLD_PALETTE: Readonly<Record<string, string>> = {
${PALETTE.map(([k, c, doc]) => `  ${k}: '${rgbToHex(c)}', // ${doc}`).join('\n')}
};

${art('GRASS_A', 'Hierba, variante 1.', grassTile(0x6a1))}
${art('GRASS_B', 'Hierba, variante 2.', grassTile(0x6a2))}
${art('GRASS_C', 'Hierba, variante 3.', grassTile(0x6a3))}
${art('GRASS_D', 'Hierba, variante 4.', grassTile(0x6a4))}
${art('ROCK_GROUND_A', 'Roca del suelo, variante 1.', rockTile(0x7c1, 'EFGH'))}
${art('ROCK_GROUND_B', 'Roca del suelo, variante 2.', rockTile(0x7c2, 'EFGH'))}
${art('OAK', 'El roble: copa en cupula de su especie sobre su tronco medio.', oak())}
${art('MEADOW_BUSH', 'La mata de la pradera, con sus bayas.', meadowBush())}
${art('STONE', 'La piedra de la roca de voxeles: una tesela que casa consigo misma.', rockTile(0x5a1, 'abcd'))}
/**
 * La forma de la roca de voxeles: [este, sur, arriba], en medios bloques. Abajo,
 * los cuatro; arriba, tres: le falta la esquina de delante a la derecha
 * (*deduccion*: el autor pidio «forma irregular, no un cubo perfecto»).
 */
export const ROCK_SHAPE: readonly (readonly [number, number, number])[] = ${JSON.stringify(ROCK_SHAPE)};
`;

writeFileSync(new URL('../packages/client/src/world-art.ts', import.meta.url), out);
console.log('world-art.ts escrito');
