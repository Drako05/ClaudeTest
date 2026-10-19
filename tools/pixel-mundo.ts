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
import { ROCK_FACES } from '../packages/client/src/palette.js';
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

/** Una mata de hojas: un bulto de la copa. */
interface Clump {
  x: number;
  y: number;
  r: number;
}

/** Una elipse, en pixeles: la copa entera o un hueco. */
interface Ellipse {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/**
 * Siembra matas dentro de una elipse, separadas entre si, de mayor a menor:
 * las grandes hacen el cuerpo y las pequenas rellenan y festonean el borde.
 * Cada mata cabe entera en la elipse, asi que la silueta son los lobulos de
 * las matas del borde y no la elipse.
 */
function scatterClumps(rng: () => number, shape: Ellipse, rMin: number, rMax: number): Clump[] {
  const clumps: Clump[] = [];
  for (const r of [rMax, (rMin + rMax) / 2, rMin]) {
    for (let tries = 0; tries < 900; tries++) {
      const rr = r * (0.85 + rng() * 0.3);
      const x = shape.x + (rng() * 2 - 1) * shape.rx;
      const y = shape.y + (rng() * 2 - 1) * shape.ry;
      const ex = (x - shape.x) / Math.max(1, shape.rx - rr);
      const ey = (y - shape.y) / Math.max(1, shape.ry - rr);
      if (ex * ex + ey * ey > 1) continue;
      if (clumps.some((c) => Math.hypot(c.x - x, c.y - y) < (c.r + rr) * 0.62)) continue;
      clumps.push({ x, y, r: rr });
    }
  }
  return clumps;
}

/**
 * Una copa de hojas como **una sola masa** (el autor, 2026-10-19: «el follaje
 * debería ser más unido y entrelazado, no como si fueran varias bolas de hojas
 * una al lado de la otra»), con sus dos referencias.
 *
 * Es un relieve: la cupula de la copa entera, y encima un bulto por mata.
 * La luz de cada pixel sale de la pendiente de ese relieve —arriba a la
 * izquierda, la de la copa; dentro, la de cada mata—, y cada mata **echa
 * sombra** sobre lo que tiene debajo a la derecha: son las grietas oscuras
 * que entrelazan las matas. Los tonos se reparten por proporciones fijas,
 * con un poco de ruido para que el borde entre tonos se lea como hojas.
 */
function foliage(
  g: Grid,
  rng: () => number,
  opts: {
    clumps: Clump[];
    dome: Ellipse;
    tones: string;
    /** Huecos sin hojas por los que se ven las ramas. */
    holes?: Ellipse[];
    /** Cuantas hojas en punta asoman del borde, por pixel de borde. */
    spikes: number;
    /** Lo que pesa el bulto de cada mata frente a la cupula entera. */
    bump: number;
  },
): void {
  const [light, base, shadow, deep] = opts.tones;
  const h = g.length;
  const w = g[0]!.length;
  const { dome } = opts;
  const inHole = (x: number, y: number) =>
    (opts.holes ?? []).some((o) => ((x - o.x) / o.rx) ** 2 + ((y - o.y) / o.ry) ** 2 < 1);
  // El relieve: NaN fuera de la copa.
  const z = new Float64Array(w * h).fill(Number.NaN);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      if (inHole(px, py)) continue;
      let top = Number.NaN;
      for (const c of opts.clumps) {
        const d = Math.hypot(px - c.x, py - c.y);
        if (d >= c.r) continue;
        const ex = (px - dome.x) / dome.rx;
        const ey = (py - dome.y) / dome.ry;
        const domeZ = Math.sqrt(Math.max(0, 1 - ex * ex - ey * ey)) * dome.ry;
        const v = domeZ + Math.sqrt(c.r * c.r - d * d) * opts.bump;
        if (!(v <= top)) top = v;
      }
      z[y * w + x] = top;
    }
  }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? Number.NaN : z[y * w + x]!);
  // La luz: de arriba a la izquierda y algo de frente.
  const L = [-0.5, -0.62, 0.6];
  const ln = Math.hypot(L[0]!, L[1]!, L[2]!);
  const lit: { x: number; y: number; v: number }[] = [];
  const clusters = new Map<string, number>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const z0 = at(x, y);
      if (Number.isNaN(z0)) continue;
      const side = (a: number, b: number) => (Number.isNaN(a) ? (Number.isNaN(b) ? 0 : z0 - b) : Number.isNaN(b) ? a - z0 : (a - b) / 2);
      const dx = side(at(x + 1, y), at(x - 1, y));
      const dy = side(at(x, y + 1), at(x, y - 1));
      const nl = Math.hypot(dx, dy, 1);
      let v = ((-dx * L[0]! - dy * L[1]! + L[2]!) / nl) / ln;
      // La sombra que echa lo que tiene arriba a la izquierda.
      for (let t = 1; t <= 7; t++) {
        const o = at(Math.round(x - t * 0.8), Math.round(y - t));
        if (!Number.isNaN(o) && o > z0 + t * 0.45) {
          v -= 0.7;
          break;
        }
      }
      // Lo de abajo de la copa recibe menos cielo.
      v -= Math.max(0, (y + 0.5 - dome.y) / dome.ry) * 0.25;
      // Racimos de 2 x 2 con su tono, y algo de ruido por pixel: hojas.
      const key = `${x >> 1},${y >> 1}`;
      if (!clusters.has(key)) clusters.set(key, rng() - 0.5);
      v += clusters.get(key)! * 0.2 + (rng() - 0.5) * 0.08;
      lit.push({ x, y, v });
    }
  }
  const values = lit.map((p) => p.v);
  const q1 = quantile(values, 0.2);
  const q2 = quantile(values, 0.46);
  const q3 = quantile(values, 0.77);
  for (const { x, y, v } of lit) g[y]![x] = v >= q3 ? light : v >= q2 ? base : v >= q1 ? shadow : deep;

  const leaf = new Set(opts.tones);
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && leaf.has(g[y]![x]!);
  const neighbours = (x: number, y: number) => +filled(x - 1, y) + +filled(x + 1, y) + +filled(x, y - 1) + +filled(x, y + 1);
  // El borde, mordido: hojas, no un circulo liso. Y sin pixeles sueltos.
  for (const { x, y } of lit) if (neighbours(x, y) < 4 && rng() < 0.22) g[y]![x] = '.';
  for (let pass = 0; pass < 2; pass++) for (const { x, y } of lit) if (filled(x, y) && neighbours(x, y) < 2) g[y]![x] = '.';
  // Hojas en punta que asoman del borde, hacia fuera de la copa.
  const edge = lit.filter(({ x, y }) => filled(x, y) && neighbours(x, y) < 4);
  for (const { x, y } of edge) {
    if (rng() >= opts.spikes) continue;
    const ax = x + 0.5 - dome.x;
    const ay = y + 0.5 - dome.y;
    const len = Math.hypot(ax, ay) || 1;
    // En recto, por el eje que mas se aleja: en diagonal, la punta solo toca
    // por una esquina y se lee como un damero.
    const sx = Math.abs(ax) >= Math.abs(ay) ? Math.sign(ax) : 0;
    const sy = Math.abs(ax) >= Math.abs(ay) ? 0 : Math.sign(ay);
    if (sy > 0 && rng() < 0.7) continue; // abajo, pocas: la copa cuelga
    const tone = sy < 0 || sx < 0 ? (rng() < 0.5 ? light : base) : shadow;
    for (let k = 1; k <= 2; k++) {
      const nx = x + sx * k;
      const ny = y + sy * k;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || g[ny]![nx] !== '.') break;
      g[ny]![nx] = tone;
      if (rng() < 0.5) break;
    }
  }
}

/**
 * Un trazo de corteza de `(x0, y0)` a `(x1, y1)`, de `w0` a `w1` pixeles de
 * grueso: el lado que mira arriba a la izquierda, con luz.
 */
function limb(g: Grid, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, tones: string): void {
  const [light, base, shadow, deep] = tones;
  const h = g.length;
  const w = g[0]!.length;
  const vx = x1 - x0;
  const vy = y1 - y0;
  const l2 = vx * vx + vy * vy;
  // La normal que mira a la luz.
  let nx = -vy;
  let ny = vx;
  if (nx * -0.6 + ny * -0.8 < 0) {
    nx = -nx;
    ny = -ny;
  }
  const nl = Math.hypot(nx, ny);
  for (let y = Math.floor(Math.min(y0, y1) - w0); y <= Math.ceil(Math.max(y0, y1) + w0); y++) {
    for (let x = Math.floor(Math.min(x0, x1) - w0); x <= Math.ceil(Math.max(x0, x1) + w0); x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const px = x + 0.5 - x0;
      const py = y + 0.5 - y0;
      const t = Math.max(0, Math.min(1, (px * vx + py * vy) / l2));
      const half = (w0 + (w1 - w0) * t) / 2;
      const s = ((px - t * vx) * nx + (py - t * vy) * ny) / nl; // + hacia la luz
      if (Math.hypot(px - t * vx, py - t * vy) > half) continue;
      const rel = 0.5 - s / (2 * half); // 0 en el lado de la luz
      g[y]![x] = rel < 0.28 ? light : rel < 0.66 ? base : rel < 0.88 ? shadow : deep;
    }
  }
}

/**
 * El tronco: del pie, con sus raices abiertas, a `yTop`, estrechando de `wBase`
 * a `wTop`, en placas de corteza separadas por grietas (hondo), con su canto
 * de luz arriba a la izquierda.
 */
function barkTrunk(g: Grid, rng: () => number, cx: number, yBase: number, yTop: number, wBase: number, wTop: number, tones: string): void {
  const [light, , , deep] = tones;
  const tall = yBase - yTop;
  const flare = (y: number) => {
    const up = yBase - y;
    return up < 6 ? (6 - up) ** 1.6 * 0.55 : 0;
  };
  for (let y = yBase; y >= yTop; y--) {
    const t = (yBase - y) / Math.max(1, tall);
    const half = (wBase + (wTop - wBase) * t) / 2 + flare(y);
    const left = Math.round(cx - half);
    const right = Math.round(cx + half);
    for (let x = left; x < right; x++) {
      const rel = (x + 0.5 - (cx - half)) / (2 * half);
      g[y]![x] = rel < 0.24 ? tones[0]! : rel < 0.6 ? tones[1]! : rel < 0.85 ? tones[2]! : tones[3]!;
    }
  }
  // Las placas: grietas verticales que se tuercen, y alguna horizontal.
  const cracks = Math.max(2, Math.round(wBase / 5));
  for (let k = 0; k < cracks; k++) {
    let rel = (k + 0.5 + (rng() - 0.5) * 0.5) / cracks;
    let run = 0;
    for (let y = yBase - 1; y > yTop + 1; y--) {
      const t = (yBase - y) / Math.max(1, tall);
      const half = (wBase + (wTop - wBase) * t) / 2 + flare(y);
      const x = Math.round(cx - half + rel * 2 * half);
      if (x > cx - half + 1 && x < cx + half - 1) {
        g[y]![x] = deep;
        if (rel > 0.2) g[y]![x - 1] = g[y]![x - 1] === tones[0] ? tones[1]! : g[y]![x - 1]!;
        if (g[y]![x + 1] !== deep && rng() < 0.5) g[y]![x + 1] = light;
      }
      if (++run > 4 + rng() * 6) {
        run = 0;
        rel = Math.max(0.12, Math.min(0.88, rel + (rng() < 0.5 ? -1 : 1) / (2 * half)));
        if (rng() < 0.35) {
          const len = 2 + Math.floor(rng() * 3);
          for (let i = 0; i < len; i++) {
            const xx = x + i;
            if (xx < cx + half - 1) g[y]![xx] = deep;
          }
        }
      }
    }
  }
  // Las puntas de las raices, en el suelo.
  for (const side of [-1, 1]) {
    const half = wBase / 2 + flare(yBase);
    const x = Math.round(cx + side * (half + 1));
    if (g[yBase]![x] === '.') g[yBase]![x] = side < 0 ? tones[1]! : tones[2]!;
  }
}

/**
 * El roble: una copa en cupula, una sola masa de hojas del tamano de su
 * especie, con dos huecos abajo por los que se ven las ramas, sobre su tronco
 * medio de placas y con las raices abiertas.
 */
function oak(): Grid {
  const shape = treeShapeOf(Feature.MeadowTree)!;
  const law = TREE_TRUNKS[Feature.MeadowTree]!;
  const W = Math.round(shape.crownW * PX);
  const crownH = Math.round(shape.crownH * PX);
  const bare = Math.round(law.bareMean * PX);
  const H = crownH + bare;
  const g = blank(W, H);
  const rng = mulberry32(0x0a5);
  const tw = Math.round(law.trunkW * PX);
  const cx = W / 2;
  const fork = Math.round(crownH * 0.8);
  barkTrunk(g, rng, cx, H - 1, fork, tw, tw * 0.7, 'MNOP');
  // Las ramas: dos grandes que se abren desde la horquilla, y una al centro.
  const branches: [number, number, number, number, number, number][] = [
    [cx - 2, fork + 2, cx - W * 0.3, crownH * 0.45, tw * 0.55, 3],
    [cx + 2, fork + 2, cx + W * 0.28, crownH * 0.42, tw * 0.5, 3],
    [cx, fork, cx + 1, crownH * 0.35, tw * 0.45, 3],
  ];
  for (const [x0, y0, x1, y1, w0, w1] of branches) limb(g, x0, y0, x1, y1, w0, w1, 'MNOP');
  const dome = { x: cx, y: crownH * 0.5, rx: W / 2 - 0.5, ry: crownH / 2 - 0.5 };
  // Los huecos, encima de las ramas grandes: por ahi se ven, como en la
  // referencia del autor.
  const along = (b: (typeof branches)[number], t: number) => ({ x: b[0] + (b[2] - b[0]) * t, y: b[1] + (b[3] - b[1]) * t });
  const holes = [
    { ...along(branches[0]!, 0.45), rx: 9, ry: 5 },
    { ...along(branches[1]!, 0.5), rx: 8, ry: 4.5 },
    { x: cx, y: crownH * 0.95, rx: tw * 0.8, ry: 4 },
  ];
  foliage(g, rng, {
    clumps: scatterClumps(rng, dome, 7, 15),
    dome,
    tones: 'IJKL',
    holes,
    spikes: 0.18,
    bump: 0.85,
  });
  // Las ramas, otra vez donde no quedaron hojas: el hueco las ensena.
  const under = blank(W, H);
  for (const [x0, y0, x1, y1, w0, w1] of branches) limb(under, x0, y0, x1, y1, w0, w1, 'MNOP');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y]![x] === '.' && under[y]![x] !== '.') g[y]![x] = under[y]![x]!;
  return g;
}

/**
 * La mata de la pradera: compacta, de hojas pequenas que asoman en punta por
 * el borde, con sus bayas y tres tallos en el pie.
 */
function meadowBush(): Grid {
  const W = 26;
  const H = 26;
  const g = blank(W, H);
  const rng = mulberry32(0xb07);
  limb(g, 13, H, 13, H - 6, 2.5, 2, 'WWWW');
  limb(g, 12.5, H - 1, 8, H - 6, 1.6, 1.2, 'WWWW');
  limb(g, 13.5, H - 1, 18, H - 6, 1.6, 1.2, 'WWWW');
  const dome = { x: 13, y: 12.5, rx: 11.5, ry: 10.5 };
  foliage(g, rng, { clumps: scatterClumps(rng, dome, 3, 5), dome, tones: 'QRST', spikes: 0.5, bump: 0.7 });
  // Bayas de 2 x 2: brillo arriba a la izquierda y sombra abajo a la derecha.
  const leaf = new Set('QRST');
  let placed = 0;
  for (let tries = 0; tries < 400 && placed < 8; tries++) {
    const x = 4 + Math.floor(rng() * (W - 9));
    const y = 3 + Math.floor(rng() * (H - 11));
    const cells = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
    if (!cells.every(([a, b]) => leaf.has(g[b!]![a!]!))) continue;
    // Separadas: ninguna baya a menos de 3 pixeles.
    if ([-2, -1, 0, 1, 2, 3].some((d) => [-2, -1, 0, 1, 2, 3].some((e) => 'UVX'.includes(g[y + e]?.[x + d] ?? '.')))) continue;
    g[y]![x] = 'V';
    g[y]![x + 1] = g[y + 1]![x] = 'U';
    g[y + 1]![x + 1] = 'X';
    placed++;
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
// El roble y la mata, con los colores de las referencias del autor
// (2026-10-19): verdes mas hondos y saturados que los que se ven hoy, corteza
// rojiza y bayas rojas (*deduccion*, de sus dos imagenes).
const leaf = ['#86b94a', '#4f8f38', '#2f6630', '#1c4026'].map(hexToRgb);
const bark = ['#b5793f', '#8b552c', '#5f3820', '#3b2216'].map(hexToRgb);
const bush = ['#9bd25a', '#58a63c', '#2f7a33', '#1d4a27'].map(hexToRgb);
const stone = [seen(ROCK_FACES[2]!), seen(ROCK_FACES[1]!), seen(ROCK_FACES[0]!), scale(seen(ROCK_FACES[0]!), 0.8)] as const;

const PALETTE: [string, RGB, string][] = [
  ['A', grass[0], 'hierba: luz'], ['B', grass[1], 'hierba: base'], ['C', grass[2], 'hierba: sombra'], ['D', grass[3], 'hierba: hondo'],
  ['E', rock[0], 'roca del suelo: luz'], ['F', rock[1], 'roca del suelo: base'], ['G', rock[2], 'roca del suelo: sombra'], ['H', rock[3], 'roca del suelo: hondo'],
  ['I', leaf[0], 'hoja del roble: luz'], ['J', leaf[1], 'hoja del roble: base'], ['K', leaf[2], 'hoja del roble: sombra'], ['L', leaf[3], 'hoja del roble: hondo'],
  ['M', bark[0], 'corteza del roble: luz'], ['N', bark[1], 'corteza del roble: base'], ['O', bark[2], 'corteza del roble: sombra'], ['P', bark[3], 'corteza del roble: hondo'],
  ['Q', bush[0], 'hoja de la mata: luz'], ['R', bush[1], 'hoja de la mata: base'], ['S', bush[2], 'hoja de la mata: sombra'], ['T', bush[3], 'hoja de la mata: hondo'],
  ['U', hexToRgb('#c8203a'), 'baya: base'], ['V', hexToRgb('#ff6b6b'), 'baya: brillo'], ['X', hexToRgb('#7d1028'), 'baya: sombra'],
  ['W', hexToRgb('#6b4024'), 'tallo de la mata'],
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
${art('OAK', 'El roble: una sola masa de hojas en cupula, del tamano de su especie, sobre su tronco medio.', oak())}
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
