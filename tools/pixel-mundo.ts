/**
 * El generador del pixelart del mundo (el autor, 2026-10-19: «adaptemos el arte
 * del terreno y los elementos al pixelart HD», con caras de 24 × 24 por bloque
 * y voxeles de 12 × 12; guia de arte, directriz 7).
 *
 * Saca las rejillas de formas con el pincel de `packages/client/src/pixel-paint.ts`
 * y las escribe en `packages/client/src/world-art.ts`, que es lo que usa el
 * juego. **Despues se retocan a mano, pixel a pixel, en ese fichero**: volver a
 * correr esto pisa los retoques. Vive en el repo, y no en el contenedor como el
 * de los iconos, para que no muera con la sesion.
 *
 *   npx vite-node tools/pixel-mundo.ts
 *
 * Para comprobar que sigue funcionando sin pisar nada (la auditoria, lente C),
 * a otro fichero: `PIXEL_MUNDO_SALIDA=/tmp/world-art.ts npx vite-node tools/pixel-mundo.ts`.
 *
 * Determinista: cada dibujo sale de su propia semilla.
 */

import { writeFileSync } from 'node:fs';
import { Feature, Terrain } from '@verdant/shared';
import { mulberry32, TREE_TRUNKS } from '@verdant/sim';
import { LOOKS, ROCK_BASE, STATION_BASE, TERRAIN_RGB } from '../packages/client/src/palette.js';
import {
  blank,
  foliage,
  limb,
  periodicNoise,
  quantile,
  scatterClumps,
  toRows,
  type Grid,
  type Mass,
} from '../packages/client/src/pixel-paint.js';
import { treeShapeOf } from '../packages/client/src/tree-shapes.js';

/** Pixeles de arte por bloque (el autor). Un voxel de 0,5 son 12. */
const PX = 24;

// ------------------------------------------------------------------ colores

type RGB = [number, number, number];

const hexToRgb = (h: string): RGB => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as RGB;
const hex = (c: RGB): string =>
  `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
/** Hacia el blanco: las luces de un material. */
const lift = (c: RGB, k: number): RGB => [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k];

/** Cuatro tonos de un suelo: luz, base, sombra y hondo. Su base es el color que se ve hoy. */
function groundTones(base: RGB): string[] {
  return [lift(base, 0.22), base, scale(base, 0.78), scale(base, 0.6)].map(hex);
}

function toHsl([r, g, b]: RGB): [number, number, number] {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** Gira un tono hacia otro por el camino corto, `deg` grados como mucho. */
function towards(h: number, target: number, deg: number): number {
  const d = ((target - h + 540) % 360) - 180;
  return (h + Math.sign(d) * Math.min(Math.abs(d), deg) + 360) % 360;
}

/**
 * Cuatro tonos de un material vivo desde su color de `palette.ts`, como en las
 * referencias del autor: algo mas saturado, la luz hacia el amarillo y las
 * sombras hacia el azul (*deduccion*, la regla habitual del pixelart).
 */
function ramp(color: string): string[] {
  const [h, s0, l] = toHsl(hexToRgb(color));
  const s = Math.min(1, s0 * 1.25);
  return [
    fromHsl(towards(h, 60, 12), s, Math.min(0.85, l + 0.13)),
    fromHsl(h, s, l),
    fromHsl(towards(h, 230, 10), s * 0.95, Math.max(0.06, l - 0.1)),
    fromHsl(towards(h, 230, 20), s * 0.9, Math.max(0.04, l - 0.19)),
  ].map(hex);
}

/** Tres tonos de un fruto: brillo, base y sombra. */
const fruitTones = (color: string): string[] => [hex(lift(hexToRgb(color), 0.45)), color, hex(scale(hexToRgb(color), 0.6))];

// ------------------------------------------------------------------ salida

interface Art {
  grid: Grid;
  /** Cada letra del dibujo, su color. */
  palette: Record<string, string>;
}

/** Junta tonos en una paleta: la letra `i` de cada par es el color `i`. */
function pal(...pairs: [string, readonly string[]][]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [letters, colors] of pairs) [...letters].forEach((ch, i) => (out[ch] = colors[i]!));
  return out;
}

/**
 * El dibujo como literal, con solo los colores que usa: una paleta sin
 * sobrantes. `keep`, letras que se quedan aunque el dibujo no las use: la
 * corteza de una copa, con la que el juego pinta el tronco desnudo debajo.
 */
function lit(a: Art, extra = '', keep = ''): string {
  const seen = new Set([...a.grid.flat(), ...keep]);
  const palette = Object.fromEntries(Object.entries(a.palette).filter(([k]) => seen.has(k)));
  return `{\n    rows: [\n${toRows(a.grid).map((r) => `      '${r}',`).join('\n')}\n    ],\n    palette: ${JSON.stringify(palette)},${extra}\n  }`;
}

// ------------------------------------------------------------------ suelo

/** El modulo de una tesela de lado `S`: las teselas casan consigo mismas. */
const wrapIn = (S: number) => (n: number) => ((n % S) + S) % S;
/** `k` cosas por tesela de 24, repartidas por area en una de lado `S` (al menos una). */
const per = (k: number, S: number) => (S === PX ? k : Math.max(1, Math.round((k * S * S) / (PX * PX))));
/** Un largo de 24, a escala en una de lado `S` (al menos 2). */
const span = (k: number, S: number) => (S === PX ? k : Math.max(2, Math.round((k * S) / PX)));

/** Hierba: base, manchas de ruido, y briznas de luz con su sombra. */
function grassTile(seed: number, tones: string[], S = PX): Art {
  const wrap = wrapIn(S);
  const rng = mulberry32(seed);
  const noise = periodicNoise(rng, S, 4);
  const g = blank(S, S, 'b');
  const all: number[] = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) all.push(noise(x, y));
  const low = quantile(all, 0.16);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (noise(x, y) < low) g[y]![x] = 'c';
  for (let k = 0; k < per(34, S); k++) {
    const x = Math.floor(rng() * S);
    const y = Math.floor(rng() * S);
    g[wrap(y)]![x] = 'a';
    g[wrap(y + 1)]![x] = 'a';
    if (rng() < 0.6) g[wrap(y + 2)]![wrap(x + 1)] = 'c';
  }
  for (let k = 0; k < per(7, S); k++) {
    const x = Math.floor(rng() * S);
    const y = Math.floor(rng() * S);
    if (g[y]![x] === 'c') g[y]![x] = 'd';
  }
  return { grid: g, palette: pal(['abcd', tones]) };
}

/** Piedra: manchas de dos ruidos y grietas cortas con su canto de luz. */
function stoneGrid(seed: number, S = PX): Grid {
  const wrap = wrapIn(S);
  const rng = mulberry32(seed);
  const noise = periodicNoise(rng, S, 6);
  const fine = periodicNoise(rng, S, 3);
  const g = blank(S, S, 'b');
  const v = (x: number, y: number) => noise(x, y) * 0.75 + fine(x, y) * 0.25;
  const all: number[] = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) all.push(v(x, y));
  const hi = quantile(all, 0.78);
  const lo = quantile(all, 0.24);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (v(x, y) >= hi) g[y]![x] = 'a';
      else if (v(x, y) < lo) g[y]![x] = 'c';
    }
  }
  for (let k = 0; k < per(3, S); k++) {
    let x = Math.floor(rng() * S);
    let y = Math.floor(rng() * S);
    g[wrap(y - 1)]![wrap(x - 1)] = 'a';
    const len = span(4 + Math.floor(rng() * 5), S);
    for (let s = 0; s < len; s++) {
      g[wrap(y)]![wrap(x)] = 'd';
      x += rng() < 0.6 ? 1 : 0;
      y += rng() < 0.5 ? 1 : rng() < 0.5 ? -1 : 0;
    }
  }
  return g;
}

/**
 * Un suelo de grano: base, manchas suaves de sombra y de luz, granos sueltos
 * y ondas (la arena, la nieve, el fondo del agua).
 */
function grainTile(seed: number, tones: string[], opts: { ripples: number; grains: number; patch: number }, S = PX): Art {
  const wrap = wrapIn(S);
  const rng = mulberry32(seed);
  const noise = periodicNoise(rng, S, 6);
  const g = blank(S, S, 'b');
  const all: number[] = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) all.push(noise(x, y));
  const lo = quantile(all, opts.patch);
  const hi = quantile(all, 1 - opts.patch * 0.6);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (noise(x, y) < lo) g[y]![x] = 'c';
      else if (noise(x, y) >= hi) g[y]![x] = 'a';
    }
  }
  for (let k = 0; k < (S === PX ? opts.ripples : Math.ceil(opts.ripples / 2)); k++) {
    const y0 = Math.floor(rng() * S);
    const x0 = Math.floor(rng() * S);
    const len = span(6 + Math.floor(rng() * 6), S);
    for (let i = 0; i < len; i++) {
      const y = wrap(y0 + Math.round(Math.sin(i / 2.2) * 0.8));
      g[y]![wrap(x0 + i)] = 'a';
      g[wrap(y + 1)]![wrap(x0 + i)] = 'c';
    }
  }
  for (let k = 0; k < per(opts.grains, S); k++) {
    const x = Math.floor(rng() * S);
    const y = Math.floor(rng() * S);
    g[y]![x] = rng() < 0.5 ? 'a' : 'd';
  }
  return { grid: g, palette: pal(['abcd', tones]) };
}

/** El suelo del bosque: verde oscuro con musgo, y pinocha caida. */
function forestFloor(seed: number, tones: string[], litter: string[], S = PX): Art {
  const wrap = wrapIn(S);
  const art = grassTile(seed, tones, S);
  const rng = mulberry32(seed ^ 0x51);
  for (let k = 0; k < per(9, S); k++) {
    const x = Math.floor(rng() * S);
    const y = Math.floor(rng() * S);
    const dir = rng() < 0.5 ? 1 : -1;
    art.grid[y]![x] = 'e';
    art.grid[wrap(y + 1)]![wrap(x + dir)] = 'f';
  }
  art.palette = { ...art.palette, ...pal(['ef', litter]) };
  return art;
}

/** La tundra: pardo verdoso, con manchas de musgo y matas de hierba rala. */
function tundraTile(seed: number, tones: string[], moss: string[], S = PX): Art {
  const wrap = wrapIn(S);
  const art = grainTile(seed, tones, { ripples: 0, grains: 10, patch: 0.18 }, S);
  const rng = mulberry32(seed ^ 0x77);
  const noise = periodicNoise(rng, S, S % 8 ? 6 : 8);
  const all: number[] = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) all.push(noise(x, y));
  const hi = quantile(all, 0.9);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (noise(x, y) >= hi) art.grid[y]![x] = rng() < 0.7 ? 'e' : 'f';
  for (let k = 0; k < per(6, S); k++) {
    const x = Math.floor(rng() * S);
    const y = Math.floor(rng() * S);
    art.grid[y]![x] = 'a';
    art.grid[wrap(y - 1)]![x] = 'a';
    art.grid[wrap(y + 1)]![wrap(x + 1)] = 'd';
  }
  art.palette = { ...art.palette, ...pal(['ef', moss]) };
  return art;
}

/** La superficie del agua: crestas de ola de luz con su sombra debajo. */
function waterSurface(tones: string[]): Art {
  const wrap = wrapIn(PX);
  const rng = mulberry32(0xa9a);
  const noise = periodicNoise(rng, PX, 8);
  const g = blank(PX, PX, 'b');
  const all: number[] = [];
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) all.push(noise(x, y));
  const lo = quantile(all, 0.3);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) if (noise(x, y) < lo) g[y]![x] = 'c';
  for (let k = 0; k < 9; k++) {
    const x0 = Math.floor(rng() * PX);
    const y0 = Math.floor(rng() * PX);
    const len = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < len; i++) {
      g[y0]![wrap(x0 + i)] = i === 0 || i === len - 1 ? 'b' : 'a';
      if (i > 0 && i < len - 1) g[wrap(y0 + 1)]![wrap(x0 + i)] = 'd';
    }
  }
  return { grid: g, palette: pal(['abcd', tones]) };
}

// ------------------------------------------------------------------ arboles

interface TreeArt extends Art {
  /** Donde el tronco sale de la copa por abajo: su centro y su grosor, en pixeles. */
  trunkX: number;
  trunkW: number;
}

/**
 * Una copa de frondoso (el roble, el cerezo), como en la referencia del autor:
 * la masa principal arriba y dos que cuelgan a los lados; el tronco se abre
 * **por debajo** de la principal y las ramas suben entre las masas; dentro del
 * follaje solo asoman donde la sombra es honda. `flat` aplana y ensancha (la
 * sombrilla del cerezo).
 */
function broadleaf(feature: Feature, seed: number, leaf: string[], bark: string[], flat: boolean): TreeArt {
  const shape = treeShapeOf(feature)!;
  const law = TREE_TRUNKS[feature]!;
  const W = Math.round(shape.crownW * PX);
  const H = Math.round(shape.crownH * PX);
  const g = blank(W, H);
  const rng = mulberry32(seed);
  const tw = Math.round(law.trunkW * PX);
  const cx = W / 2;
  const masses: Mass[] = flat
    ? [
        { x: cx, y: H * 0.5, rx: W * 0.44, ry: H * 0.5, z: 0 },
        { x: cx - W * 0.3, y: H * 0.64, rx: W * 0.2, ry: H * 0.3, z: 10 },
        { x: cx + W * 0.3, y: H * 0.62, rx: W * 0.2, ry: H * 0.3, z: 10 },
      ]
    : [
        { x: cx, y: H * 0.49, rx: W * 0.4, ry: H * 0.49, z: 0 },
        { x: cx - W * 0.29, y: H * 0.72, rx: W * 0.21, ry: H * 0.22, z: 10 },
        { x: cx + W * 0.29, y: H * 0.7, rx: W * 0.21, ry: H * 0.23, z: 10 },
      ];
  // La horquilla, bajo la sombra de la masa principal.
  const fork = H * 0.94;
  // El tronco sigue por debajo de la copa: aqui, sin raices (las pone el juego al pintarlo).
  limb(g, cx, H, cx, fork, tw, tw * 0.75, 'efgh');
  const branches: [number, number, number, number, number, number][] = [
    [cx - 2, fork, masses[1]!.x + 4, masses[1]!.y - 2, tw * 0.5, 3],
    [cx + 2, fork, masses[2]!.x - 4, masses[2]!.y - 2, tw * 0.5, 3],
    [cx, fork, cx + 2, H * 0.4, tw * 0.55, 3],
    [cx - W * 0.17, H * 0.85, cx - W * 0.14, H * 0.6, 4, 2],
    [cx + W * 0.17, H * 0.84, cx + W * 0.17, H * 0.6, 4, 2],
  ];
  for (const [x0, y0, x1, y1, w0, w1] of branches) limb(g, x0, y0, x1, y1, w0, w1, 'efgh');
  const wood = g.map((r) => [...r]);
  foliage(g, rng, { masses, clumps: scatterClumps(rng, masses, 6, 13), tones: 'abcd', bump: 0.85, leaves: 0.018 });
  // Lo que asoma de las ramas dentro de la copa: solo en la sombra honda, y en
  // la sombra de la corteza. El tallo del centro no: es el tronco que sigue
  // dentro de la copa, y asomando alargaria el tronco desnudo que se ve (y que
  // el humo mide).
  for (let y = 0; y < fork; y++) {
    for (let x = 0; x < W; x++) {
      if (Math.abs(x + 0.5 - cx) <= tw / 2 + 1) continue;
      if (g[y]![x] === 'd' && 'efgh'.includes(wood[y]![x]!)) g[y]![x] = wood[y]![x] === 'h' ? 'h' : 'g';
    }
  }
  return { grid: g, palette: pal(['abcd', leaf], ['efgh', bark]), trunkX: cx, trunkW: tw };
}

/**
 * Una copa de conifera: sus pisos, de abajo arriba, cada uno sobre el de
 * debajo, con el tronco por dentro hasta media altura de un piso (como el
 * dibujo de antes, para que la punta quede tapada tambien en el alerce, que
 * deja hueco entre pisos). La picea negra estrecha mas despacio y remata con
 * su punta engrosada: tres pisos cortos que cierran en punta.
 */
function conifer(feature: Feature, seed: number, leaf: string[], bark: string[]): TreeArt {
  const shape = treeShapeOf(feature)!;
  const law = TREE_TRUNKS[feature]!;
  const W = Math.round(shape.crownW * PX);
  const H = Math.round(shape.crownH * PX);
  const g = blank(W, H);
  const rng = mulberry32(seed);
  const tw = Math.max(3, Math.round(law.trunkW * PX));
  const cx = W / 2;
  const spire = shape.silhouette === 'spire';
  const bodyH = spire ? H * 0.72 : H;
  const step = bodyH / (shape.tiers + 1 - 2 * shape.open);
  const tierH = step * (2 - 2 * shape.open);
  const tipRise = Math.floor(shape.tiers / 2) * step + tierH * 0.6;
  // Recto hasta la base del piso donde acaba, y dentro de ese piso, estrecha
  // hasta la punta: estrechando en los huecos del alerce, cada escalon dejaria
  // un pixel de corteza con aire encima (el canto que el humo no deja asomar),
  // y recto hasta arriba, el piso de la punta, mas estrecho que el, lo dejaria
  // ver por los lados.
  const tipBase = Math.floor(shape.tiers / 2) * step;
  limb(g, cx, H, cx, H - tipBase, tw, tw, 'efgh');
  limb(g, cx, H - tipBase, cx, H - tipRise, tw, 2, 'efgh');
  const masses: Mass[] = [];
  for (let i = 0; i < shape.tiers; i++) {
    const rise = i * step;
    const taper = spire ? 1 - 0.6 * (rise / bodyH) : 1 - rise / bodyH;
    masses.push({ x: cx, y: H - rise - tierH / 2, rx: (W / 2) * taper, ry: tierH / 2, z: i * 3, tier: true });
  }
  if (spire) {
    const club = (H * 0.38) / 4;
    for (let k = 0; k < 3; k++) {
      masses.push({ x: cx, y: H - H * 0.62 - k * club - club, rx: W * [0.26, 0.21, 0.14][k]!, ry: club, z: (shape.tiers + k) * 3, tier: true });
    }
  }
  foliage(g, rng, { masses, clumps: scatterClumps(rng, masses, 3, 6), tones: 'abcd', bump: 0.6, leaves: 0.02 });
  return { grid: g, palette: pal(['abcd', leaf], ['efgh', bark]), trunkX: cx, trunkW: tw };
}

// ------------------------------------------------------------------ matas y brotes

/**
 * Una mata: compacta, de hojas sueltas que asoman en punta por el borde, con
 * sus frutos de 2 × 2 y tres tallos de corteza en el pie.
 */
function bush(seed: number, leaf: string[], fruit: string[] | null, bark: string[]): Art {
  const W = 26;
  const H = 26;
  const g = blank(W, H);
  const rng = mulberry32(seed);
  limb(g, 13, H, 13, H - 7, 2.4, 2, 'efgh');
  limb(g, 12, H - 1, 6, H - 6, 1.8, 1.4, 'efgh');
  limb(g, 14, H - 1, 20, H - 6, 1.8, 1.4, 'efgh');
  // Del alto de su caja de choque (1,1): de la fila de arriba al pie.
  const masses: Mass[] = [{ x: 13, y: 12, rx: 11.5, ry: 11.5, z: 0 }];
  foliage(g, rng, { masses, clumps: scatterClumps(rng, masses, 3, 5), tones: 'abcd', bump: 0.7, leaves: 0.04 });
  if (fruit) {
    let placed = 0;
    for (let tries = 0; tries < 400 && placed < 8; tries++) {
      const x = 4 + Math.floor(rng() * (W - 9));
      const y = 3 + Math.floor(rng() * (H - 11));
      const cells = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
      if (!cells.every(([a, b]) => 'abcd'.includes(g[b!]![a!]!))) continue;
      // Separados: ninguno a menos de 3 pixeles de otro.
      if ([-2, -1, 0, 1, 2, 3].some((d) => [-2, -1, 0, 1, 2, 3].some((e) => 'ijk'.includes(g[y + e]?.[x + d] ?? '.')))) continue;
      g[y]![x] = 'i';
      g[y]![x + 1] = g[y + 1]![x] = 'j';
      g[y + 1]![x + 1] = 'k';
      placed++;
    }
  }
  return { grid: g, palette: pal(['abcd', leaf], ['efgh', bark], ['ijk', fruit ?? []]) };
}

/**
 * Un brote: un tallo fino y unas pocas hojas de su especie adulta. El de
 * conifera, tres pisitos; el de frondoso, una matita en la punta; el de mata,
 * una matita baja.
 */
function sapling(seed: number, leaf: string[], bark: string[], kind: 'conifer' | 'broadleaf' | 'bush'): Art {
  const rng = mulberry32(seed);
  if (kind === 'bush') {
    const g = blank(14, 14);
    limb(g, 7, 14, 7, 9, 1.6, 1.4, 'efgh');
    const masses: Mass[] = [{ x: 7, y: 7, rx: 6, ry: 5, z: 0 }];
    foliage(g, rng, { masses, clumps: scatterClumps(rng, masses, 2, 3), tones: 'abcd', bump: 0.7, leaves: 0.05 });
    return { grid: g, palette: pal(['abcd', leaf], ['efgh', bark]) };
  }
  const g = blank(12, 21);
  limb(g, 6, 21, 6, 6, 2, 1.4, 'efgh');
  const masses: Mass[] =
    kind === 'conifer'
      ? [0, 1, 2].map((i) => ({ x: 6, y: 14 - i * 5, rx: 5.5 - i * 1.5, ry: 4, z: i * 3, tier: true }))
      : [{ x: 6, y: 5.5, rx: 5.5, ry: 5.5, z: 0 }];
  foliage(g, rng, { masses, clumps: scatterClumps(rng, masses, 2, 3), tones: 'abcd', bump: 0.7, leaves: 0.05 });
  return { grid: g, palette: pal(['abcd', leaf], ['efgh', bark]) };
}

// ------------------------------------------------------------------ piedra

/**
 * La piedra de la roca de voxeles. Los minerales la usan tambien, con sus vetas
 * y sus cristales encima, pero esos se pintan en el juego, una mena distinta por
 * casilla (`ore-mesh.ts`).
 */
function stone(seed: number, tones: string[]): Art {
  return { grid: stoneGrid(seed), palette: pal(['abcd', tones]) };
}

/** Los guijarros, vistos desde arriba: tres piedras redondeadas, con la luz arriba a la izquierda. */
function pebbles(tones: string[]): Art {
  const g = blank(14, 14);
  const stones = [
    [4.5, 5, 2.8, 2.4],
    [9.8, 6.5, 2.4, 2],
    [6.5, 10.2, 2, 1.8],
  ];
  for (const [cx, cy, rx, ry] of stones) {
    for (let y = 0; y < 14; y++) {
      for (let x = 0; x < 14; x++) {
        const ex = (x + 0.5 - cx!) / rx!;
        const ey = (y + 0.5 - cy!) / ry!;
        const d = ex * ex + ey * ey;
        if (d > 1) continue;
        const v = -ex * 0.55 - ey * 0.6 + Math.sqrt(1 - d) * 0.6;
        g[y]![x] = v > 0.55 ? 'a' : v > 0.15 ? 'b' : v > -0.25 ? 'c' : 'd';
      }
    }
  }
  return { grid: g, palette: pal(['abcd', tones]) };
}

/**
 * La roca de voxeles (el autor: «bloque de voxeles», 2026-10-19): voxeles de
 * 0,5 con la textura de su piedra. Abajo, los cuatro; arriba, tres: le falta
 * una esquina, para que no sea un cubo. Cada voxel es [este, sur, arriba] en
 * medios bloques.
 */
const ROCK_SHAPE: [number, number, number][] = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1],
];

// ------------------------------------------------------------------ el jugador

/** Un rectangulo con su luz de izquierda a derecha, de los cuatro tonos `t`. */
function shadedRect(g: Grid, x0: number, y0: number, x1: number, y1: number, t: string): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const rel = (x - x0 + 0.5) / (x1 - x0 + 1) + (y === y0 ? -0.15 : 0);
      g[y]![x] = t[rel < 0.3 ? 0 : rel < 0.65 ? 1 : rel < 0.88 ? 2 : 3]!;
    }
  }
}

/**
 * El jugador, de frente: 1,93 bloques de alto (46 pixeles), un aventurero con
 * los colores de siempre: tunica azul, calzas pardas, botas de cuero y el pelo
 * castano. Es un sprite, no un aspa (decision del autor).
 */
function player(): Art {
  const g = blank(18, 46);
  // Calzas y botas.
  shadedRect(g, 4, 31, 8, 40, 'ijkl');
  shadedRect(g, 10, 31, 14, 40, 'ijkl');
  shadedRect(g, 3, 41, 8, 45, 'mnop');
  shadedRect(g, 10, 41, 15, 45, 'mnop');
  // La tunica, con su cinturon y la hebilla.
  shadedRect(g, 3, 14, 14, 31, 'efgh');
  for (let x = 3; x <= 14; x++) g[25]![x] = 'p';
  g[25]![8] = g[25]![9] = 'w';
  // Las mangas y las manos.
  shadedRect(g, 1, 15, 2, 27, 'efgh');
  shadedRect(g, 15, 15, 16, 27, 'efgh');
  shadedRect(g, 1, 28, 2, 29, 'qrst');
  shadedRect(g, 15, 28, 16, 29, 'qrst');
  // El cuello, la cabeza y el pelo.
  shadedRect(g, 7, 12, 10, 13, 'qrst');
  for (let y = 1; y <= 12; y++) {
    for (let x = 3; x <= 14; x++) {
      const ex = (x + 0.5 - 9) / 6;
      const ey = (y + 0.5 - 7) / 6;
      if (ex * ex + ey * ey > 1) continue;
      const rel = (x - 3) / 12;
      const hair = y <= 4 || ((x <= 4 || x >= 13) && y <= 9);
      g[y]![x] = hair ? (y <= 2 ? 'u' : rel < 0.6 ? 'v' : 'y') : 'qrst'[rel < 0.3 ? 0 : rel < 0.65 ? 1 : rel < 0.88 ? 2 : 3]!;
    }
  }
  // Los ojos.
  g[8]![7] = g[8]![11] = 'z';
  return {
    grid: g,
    palette: pal(
      ['efgh', ramp('#3a5480')],
      ['ijkl', ramp('#6b5038')],
      ['mnop', ramp('#4a3424')],
      ['qrst', ['#ffe6c4', '#f2d0a4', '#d4a87c', '#a87c58']],
      ['uvy', ramp('#8c5a3c').slice(0, 3)],
      ['w', ['#e8c060']],
      ['z', ['#2a1d14']],
    ),
  };
}

// ------------------------------------------------------------------ estaciones

const fill = (g: Grid, c: string, x: number, y: number, w: number, h: number) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j]?.[i] !== undefined) g[j]![i] = c;
};

/** Tablas de madera: vetas horizontales cada 6 pixeles, con su luz arriba y su sombra abajo. */
function planks(g: Grid): void {
  const w = g[0]!.length;
  fill(g, 'b', 0, 0, w, g.length);
  for (let y = 0; y < g.length; y += 6) {
    fill(g, 'a', 0, y, w, 1);
    fill(g, 'c', 0, y + 5, w, 1);
    fill(g, 'd', ((y / 6) % 2) * 12 + 5, y + 1, 1, 4);
  }
}

/** La mesa de trabajo, a 24 pixeles por bloque: el tablero, el costado y el frente con sus herramientas. */
function workbench(): { top: Art; side: Art; front: Art } {
  const palette = pal(['abcd', ramp(STATION_BASE[Feature.Workbench]!)], ['e', ['#24170c']], ['mno', ['#e4e8ec', '#b8bec6', '#7e858e']]);
  const top = blank(PX, PX);
  planks(top);
  fill(top, 'd', 0, 0, PX, 1);
  fill(top, 'd', 0, PX - 1, PX, 1);
  fill(top, 'd', 0, 0, 1, PX);
  fill(top, 'd', PX - 1, 0, 1, PX);
  for (const v of [5, 10, 14, 19]) {
    fill(top, 'c', v, 5, 1, 15);
    fill(top, 'c', 5, v, 15, 1);
  }
  fill(top, 'a', 6, 6, 4, 4);
  const side = blank(PX, PX, 'e');
  fill(side, 'b', 0, 0, PX, 5);
  fill(side, 'a', 0, 0, PX, 1);
  fill(side, 'd', 0, 4, PX, 1);
  for (const x of [2, 18]) {
    fill(side, 'b', x, 5, 4, PX - 5);
    fill(side, 'a', x, 5, 1, PX - 5);
    fill(side, 'c', x + 3, 5, 1, PX - 5);
  }
  fill(side, 'c', 6, 17, 12, 2);
  fill(side, 'd', 6, 19, 12, 1);
  const front = side.map((r) => [...r]);
  // La sierra: hoja con dientes y mango; el martillo: cabeza y mango.
  fill(front, 'n', 7, 7, 7, 3);
  fill(front, 'm', 7, 7, 7, 1);
  for (let x = 7; x < 14; x += 2) fill(front, 'o', x, 10, 1, 1);
  fill(front, 'c', 14, 6, 2, 5);
  fill(front, 'b', 17, 8, 2, 7);
  fill(front, 'n', 15, 6, 5, 2);
  fill(front, 'm', 15, 6, 5, 1);
  return { top: { grid: top, palette }, side: { grid: side, palette }, front: { grid: front, palette } };
}

/** Piedra en hiladas de ladrillos de 6 de alto, desplazados cada fila, con su llaga honda. */
function bricks(g: Grid): void {
  const w = g[0]!.length;
  fill(g, 'd', 0, 0, w, g.length);
  for (let row = 0, y = 0; y < g.length; row++, y += 6) {
    for (let x = row % 2 ? -6 : 0; x < w; x += 12) {
      fill(g, 'b', x + 1, y + 1, 11, 4);
      fill(g, 'a', x + 1, y + 1, 11, 1);
      fill(g, 'c', x + 1, y + 4, 11, 1);
    }
  }
}

/** El horno, a 24 pixeles por bloque y 1,25 de alto: arriba el tiro; delante, la boca con la brasa. */
function furnace(): { top: Art; side: Art; front: Art } {
  const palette = pal(['abcd', ramp(STATION_BASE[Feature.Furnace]!)], ['e', ['#16161a']], ['ijk', ['#ffd36a', '#ff8a2a', '#b84a14']]);
  const tall = Math.round(PX * 1.25);
  const top = blank(PX, PX);
  bricks(top);
  fill(top, 'e', 8, 8, 8, 8);
  fill(top, 'j', 10, 10, 4, 4);
  fill(top, 'i', 11, 11, 2, 2);
  const side = blank(PX, tall);
  bricks(side);
  const front = blank(PX, tall);
  bricks(front);
  const mouth = tall - 19;
  fill(front, 'a', 5, mouth - 2, 14, 1);
  fill(front, 'e', 6, mouth, 12, 15);
  fill(front, 'd', 6, mouth, 12, 2);
  fill(front, 'k', 7, mouth + 10, 10, 4);
  fill(front, 'j', 8, mouth + 10, 8, 3);
  fill(front, 'i', 10, mouth + 11, 4, 2);
  return { top: { grid: top, palette }, side: { grid: side, palette }, front: { grid: front, palette } };
}

// ------------------------------------------------------------------ todo

const T = (t: Terrain) => groundTones(TERRAIN_RGB[t] as RGB);
const snow = TERRAIN_RGB[Terrain.Snow] as RGB;
const SNOW = [lift(snow, 0.5), snow, scale(snow, 0.92), scale(snow, 0.84)].map(hex);
const terrain: [Terrain, string, Art[]][] = [
  [Terrain.Grass, 'Hierba', [0x6a1, 0x6a2, 0x6a3, 0x6a4].map((s) => grassTile(s, T(Terrain.Grass)))],
  [Terrain.Forest, 'Bosque', [0xf01, 0xf02, 0xf03].map((s) => forestFloor(s, T(Terrain.Forest), ['#5e4a2c', '#3e301c']))],
  [Terrain.Sand, 'Arena', [0x5a1, 0x5a2, 0x5a3].map((s) => grainTile(s, T(Terrain.Sand), { ripples: 2, grains: 14, patch: 0.15 }))],
  [Terrain.Rock, 'Roca', [0x7c1, 0x7c2, 0x7c3].map((s) => ({ grid: stoneGrid(s), palette: pal(['abcd', T(Terrain.Rock)]) }))],
  // La nieve, con sombras suaves: con las del resto del suelo se leia gris.
  [Terrain.Snow, 'Nieve', [0x5e1, 0x5e2, 0x5e3].map((s) => grainTile(s, SNOW, { ripples: 1, grains: 8, patch: 0.2 }))],
  [Terrain.Tundra, 'Tundra', [0x7d1, 0x7d2, 0x7d3].map((s) => tundraTile(s, T(Terrain.Tundra), ['#6f7448', '#585c38']))],
  [Terrain.Water, 'Fondo del agua', [0xb01, 0xb02, 0xb03].map((s) => grainTile(s, T(Terrain.Water), { ripples: 2, grains: 8, patch: 0.2 }))],
  [Terrain.DeepWater, 'Fondo del agua honda', [0xd01, 0xd02, 0xd03].map((s) => grainTile(s, T(Terrain.DeepWater), { ripples: 1, grains: 6, patch: 0.25 }))],
];

/**
 * Los suelos a la medida del voxel (el autor, 2026-10-20: el voxel de 0,5 es la
 * unidad del terreno, y cada cara lleva su tesela entera de 12 × 12): los
 * mismos pinceles y colores, a la misma densidad, con las cosas repartidas por
 * area (*deduccion*). Semillas propias: no son un cuarto de las de 24.
 */
const VOXEL_PX = PX / 2;
const voxelTerrain: [Terrain, string, Art[]][] = [
  [Terrain.Grass, 'Hierba', [0x6b1, 0x6b2, 0x6b3, 0x6b4].map((s) => grassTile(s, T(Terrain.Grass), VOXEL_PX))],
  [Terrain.Forest, 'Bosque', [0xf11, 0xf12, 0xf13].map((s) => forestFloor(s, T(Terrain.Forest), ['#5e4a2c', '#3e301c'], VOXEL_PX))],
  [Terrain.Sand, 'Arena', [0x5b1, 0x5b2, 0x5b3].map((s) => grainTile(s, T(Terrain.Sand), { ripples: 2, grains: 14, patch: 0.15 }, VOXEL_PX))],
  [Terrain.Rock, 'Roca', [0x7e1, 0x7e2, 0x7e3].map((s) => ({ grid: stoneGrid(s, VOXEL_PX), palette: pal(['abcd', T(Terrain.Rock)]) }))],
  [Terrain.Snow, 'Nieve', [0x5f1, 0x5f2, 0x5f3].map((s) => grainTile(s, SNOW, { ripples: 1, grains: 8, patch: 0.2 }, VOXEL_PX))],
  [Terrain.Tundra, 'Tundra', [0x7f1, 0x7f2, 0x7f3].map((s) => tundraTile(s, T(Terrain.Tundra), ['#6f7448', '#585c38'], VOXEL_PX))],
  [Terrain.Water, 'Fondo del agua', [0xb11, 0xb12, 0xb13].map((s) => grainTile(s, T(Terrain.Water), { ripples: 2, grains: 8, patch: 0.2 }, VOXEL_PX))],
  [Terrain.DeepWater, 'Fondo del agua honda', [0xd11, 0xd12, 0xd13].map((s) => grainTile(s, T(Terrain.DeepWater), { ripples: 1, grains: 6, patch: 0.25 }, VOXEL_PX))],
];

const look = (f: Feature) => LOOKS[f]!;
// El roble y la mata de la pradera, con los colores de las referencias del
// autor (2026-10-19); lo demas vivo, con `ramp` desde el suyo.
const OAK_LEAF = ['#86b94a', '#4f8f38', '#2f6630', '#1c4026'];
const OAK_BARK = ['#b5793f', '#8b552c', '#5f3820', '#3b2216'];
const MEADOW_BUSH_LEAF = ['#9bd25a', '#58a63c', '#2f7a33', '#1d4a27'];
const leafOf = (f: Feature) => (f === Feature.MeadowTree ? OAK_LEAF : f === Feature.MeadowPlant ? MEADOW_BUSH_LEAF : ramp(look(f).mid));
const barkOf = (f: Feature) => (f === Feature.MeadowTree ? OAK_BARK : ramp(look(f).trunk));

const trees: [Feature, string, TreeArt][] = [
  [Feature.MeadowTree, 'Roble', broadleaf(Feature.MeadowTree, 0x0a7, leafOf(Feature.MeadowTree), barkOf(Feature.MeadowTree), false)],
  [Feature.MeadowTreeRare, 'Cerezo', broadleaf(Feature.MeadowTreeRare, 0xc3e, leafOf(Feature.MeadowTreeRare), barkOf(Feature.MeadowTreeRare), true)],
  [Feature.ForestTree, 'Picea comun', conifer(Feature.ForestTree, 0x91c, leafOf(Feature.ForestTree), barkOf(Feature.ForestTree))],
  [Feature.ForestTreeRare, 'Alerce', conifer(Feature.ForestTreeRare, 0xa1e, leafOf(Feature.ForestTreeRare), barkOf(Feature.ForestTreeRare))],
  [Feature.TundraTree, 'Picea negra', conifer(Feature.TundraTree, 0xb1a, leafOf(Feature.TundraTree), barkOf(Feature.TundraTree))],
  [Feature.TundraTreeRare, 'Picea azul', conifer(Feature.TundraTreeRare, 0xb1e, leafOf(Feature.TundraTreeRare), barkOf(Feature.TundraTreeRare))],
];

const bushes: [Feature, string, Art][] = (
  [
    [Feature.MeadowPlant, 'Mata de la pradera', 0xb08],
    [Feature.MeadowPlantRare, 'Mata de la pradera, rara', 0xb09],
    [Feature.ForestPlant, 'Mata del bosque', 0xb0a],
    [Feature.ForestPlantRare, 'Mata del bosque, rara', 0xb0b],
    [Feature.TundraPlant, 'Mata de la tundra', 0xb0c],
    [Feature.TundraPlantRare, 'Mata de la tundra, rara', 0xb0d],
  ] as const
).map(([f, name, seed]) => {
  const fruit = look(f).fruit;
  return [f, name, bush(seed, leafOf(f), fruit ? fruitTones(fruit) : null, OAK_BARK)];
});

const saplings: [Feature, string, Art][] = (
  [
    [Feature.MeadowTreeSapling, 'Brote de roble', Feature.MeadowTree, 'broadleaf'],
    [Feature.ForestTreeSapling, 'Brote de picea', Feature.ForestTree, 'conifer'],
    [Feature.TundraTreeSapling, 'Brote de picea negra', Feature.TundraTree, 'conifer'],
    [Feature.MeadowPlantSapling, 'Brote de mata (pradera)', Feature.MeadowPlant, 'bush'],
    [Feature.ForestPlantSapling, 'Brote de mata (bosque)', Feature.ForestPlant, 'bush'],
    [Feature.TundraPlantSapling, 'Brote de mata (tundra)', Feature.TundraPlant, 'bush'],
  ] as const
).map(([f, name, adult, kind], i) => [f, name, sapling(0x5b0 + i, leafOf(adult), kind === 'conifer' ? barkOf(adult) : OAK_BARK, kind)]);

/** La piedra de la roca, y la de los minerales: la del suelo de roca, que se ve en el mundo. */
const STONE_TONES = groundTones(hexToRgb(ROCK_BASE));
const stones: [Feature, string, Art][] = [[Feature.RockNode, 'Roca', stone(0x5a1, STONE_TONES)]];

const bench = workbench();
const oven = furnace();

const byFeature = (list: [Feature, string, Art][], extra?: (a: Art) => string, keep = '') =>
  list.map(([f, name, a]) => `  // ${name}\n  [Feature.${Feature[f]}]: ${lit(a, extra ? extra(a) : '', keep)},`).join('\n');

const out = `/**
 * El pixelart del mundo (el autor, 2026-10-19; guia de arte, directriz 7): a
 * 24 pixeles por cara de bloque y 12 por voxel, sin contorno, la luz del
 * noroeste, cuatro tonos por material (luz, base, sombra, hondo).
 *
 * **Lo genero \`tools/pixel-mundo.ts\` y se retoca aqui a mano**, pixel a pixel.
 * Volver a correr el generador pisa los retoques.
 *
 * Cada dibujo lleva su paleta: una fila de caracteres por fila de pixeles, \`.\`
 * transparente y cada letra un color. Los colores: el suelo, los que se ven
 * hoy; el roble y la mata de la pradera, los de las referencias del autor; lo
 * demas vivo, desde \`palette.ts\` con algo mas de saturacion, la luz hacia el
 * amarillo y la sombra hacia el azul (*deduccion*).
 */

import { Feature, Terrain } from '@verdant/shared';

/** Un dibujo: sus filas y su paleta. */
export interface WorldArt {
  readonly rows: readonly string[];
  readonly palette: Readonly<Record<string, string>>;
}

/**
 * Una copa de arbol. El tronco desnudo se pinta debajo en el juego, porque
 * tiene trece largos: sale de la copa por abajo en \`trunkX\`, con \`trunkW\`
 * pixeles de grueso, y su corteza son las letras \`efgh\` de la paleta.
 */
export interface CrownArt extends WorldArt {
  readonly trunkX: number;
  readonly trunkW: number;
}

/** Pixeles de arte por cara de bloque (el autor). */
export const WORLD_PX = ${PX};

/** Las variantes de cada suelo: el juego elige una por casilla, con la semilla. */
export const TERRAIN_TILES: Readonly<Record<Terrain, readonly WorldArt[]>> = {
${terrain.map(([t, name, arts]) => `  // ${name}\n  [Terrain.${Terrain[t]}]: [\n${arts.map((a) => `  ${lit(a)},`).join('\n')}\n  ],`).join('\n')}
};

/** La superficie del agua. */
export const WATER_ART: WorldArt = ${lit(waterSurface(groundTones([47, 110, 168])))};

/** Las copas de los seis arboles. */
export const CROWNS: Readonly<Partial<Record<Feature, CrownArt>>> = {
${byFeature(trees, (a) => `\n    trunkX: ${(a as TreeArt).trunkX},\n    trunkW: ${(a as TreeArt).trunkW},`, 'efgh')}
};

/** Las seis matas, con sus frutos. */
export const BUSHES: Readonly<Partial<Record<Feature, WorldArt>>> = {
${byFeature(bushes)}
};

/** Los seis brotes. */
export const SAPLINGS: Readonly<Partial<Record<Feature, WorldArt>>> = {
${byFeature(saplings)}
};

/**
 * La piedra de la roca: una tesela que casa consigo misma. Los minerales la
 * llevan debajo de sus vetas y sus cristales (\`ore-mesh.ts\`).
 */
export const STONES: Readonly<Partial<Record<Feature, WorldArt>>> = {
${byFeature(stones)}
};

/**
 * La forma de la roca de voxeles: [este, sur, arriba], en medios bloques. Abajo,
 * los cuatro; arriba, tres: le falta una esquina (*deduccion*: el autor pidio
 * «forma irregular, no un cubo perfecto»).
 */
export const ROCK_SHAPE: readonly (readonly [number, number, number])[] = ${JSON.stringify(ROCK_SHAPE)};

/** Los guijarros, vistos desde arriba. */
export const PEBBLES: WorldArt = ${lit(pebbles(STONE_TONES))};

/** El jugador, de frente. */
export const PLAYER: WorldArt = ${lit(player())};

/** Las caras de las estaciones, a 24 pixeles por bloque. */
export const STATION_ART: Readonly<Partial<Record<Feature, { top: WorldArt; side: WorldArt; front: WorldArt }>>> = {
  [Feature.Workbench]: {
    top: ${lit(bench.top)},
    side: ${lit(bench.side)},
    front: ${lit(bench.front)},
  },
  [Feature.Furnace]: {
    top: ${lit(oven.top)},
    side: ${lit(oven.side)},
    front: ${lit(oven.front)},
  },
};
`;

const target = process.env.PIXEL_MUNDO_SALIDA ?? new URL('../packages/client/src/world-art.ts', import.meta.url);
writeFileSync(target, out);
console.log(`escrito: ${target}`);

const voxelOut = `/**
 * Los suelos del terreno, una tesela de 12 × 12 por cara de voxel de 0,5 (el
 * autor, 2026-10-20: el voxel es la unidad del terreno, no un cuarto de bloque).
 * La misma densidad que el resto del mundo, 24 pixeles por bloque.
 *
 * **Lo genero \`tools/pixel-mundo.ts\`** y se puede retocar aqui a mano; volver
 * a correr el generador pisa los retoques.
 */

import { Terrain } from '@verdant/shared';
import type { WorldArt } from './world-art.js';

/** Pixeles de arte por cara de voxel. */
export const VOXEL_PX = ${VOXEL_PX};

/** Las variantes de cada suelo: el juego elige una por voxel y cara, con la semilla. */
export const VOXEL_TILES: Readonly<Record<Terrain, readonly WorldArt[]>> = {
${voxelTerrain.map(([t, name, arts]) => `  // ${name}\n  [Terrain.${Terrain[t]}]: [\n${arts.map((a) => `  ${lit(a)},`).join('\n')}\n  ],`).join('\n')}
};
`;
const voxelTarget = process.env.PIXEL_MUNDO_VOXELES ?? new URL('../packages/client/src/voxel-art.ts', import.meta.url);
writeFileSync(voxelTarget, voxelOut);
console.log(`escrito: ${voxelTarget}`);
