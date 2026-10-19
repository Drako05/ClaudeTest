/**
 * El pincel del pixelart del mundo (el autor, 2026-10-19; guia de arte,
 * directriz 7): lo que pinta rejillas de caracteres —follaje, ramas, troncos,
 * ruido— sin tocar el DOM.
 *
 * Lo usan dos: el generador (`tools/pixel-mundo.ts`), que saca de aqui los
 * dibujos fijos del mundo, que luego se retocan a mano, y el juego
 * (`world-sprites.ts`), que pinta con `barkTrunk` el tronco desnudo de cada
 * arbol, porque tiene trece largos y no se puede guardar dibujado.
 *
 * Una rejilla es una fila de caracteres por fila de pixeles: `.` transparente,
 * cada letra un color de la paleta de su dibujo. Los tonos se pasan como
 * cadenas de cuatro letras: luz, base, sombra y hondo. La luz viene de arriba a
 * la izquierda, como en el resto del juego.
 */

/** Una rejilla en curso, editable pixel a pixel. */
export type Grid = string[][];

export const blank = (w: number, h: number, ch = '.'): Grid => Array.from({ length: h }, () => Array<string>(w).fill(ch));
export const toRows = (g: Grid): string[] => g.map((r) => r.join(''));

/**
 * El valor por debajo del cual queda la fraccion `q` de los valores: los tonos
 * se reparten por proporciones fijas y no por umbrales, que con cada ruido
 * daban un dibujo casi todo de un tono.
 */
export function quantile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
}

/** Un azar fijo por pixel, para la textura: el mismo en cada pasada. */
export function hash2(a: number, b: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruido de valor periodico: una tesela que casa consigo misma por los cuatro lados. */
export function periodicNoise(rng: () => number, size: number, cell: number): (x: number, y: number) => number {
  const n = size / cell;
  const lattice = Array.from({ length: n * n }, () => rng());
  const at = (i: number, j: number) => lattice[(((j % n) + n) % n) * n + (((i % n) + n) % n)]!;
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

// ------------------------------------------------------------------ corteza

/**
 * Un trazo de corteza de `(x0, y0)` a `(x1, y1)`, de `w0` a `w1` pixeles de
 * grueso: el lado que mira arriba a la izquierda, con luz, y con su veta
 * —grietas a lo largo, cortadas cada pocos pixeles, y algun nudo— para que no
 * se lea como un tubo (el autor, 2026-10-19: las ramas «aparecen no tener
 * textura»).
 */
export function limb(g: Grid, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, tones: string): void {
  const [light, base, shadow, deep] = tones;
  const h = g.length;
  const w = g[0]!.length;
  const vx = x1 - x0;
  const vy = y1 - y0;
  const l2 = vx * vx + vy * vy || 1;
  // La normal que mira a la luz.
  let nx = -vy;
  let ny = vx;
  if (nx * -0.6 + ny * -0.8 < 0) {
    nx = -nx;
    ny = -ny;
  }
  const nl = Math.hypot(nx, ny) || 1;
  const reach = Math.max(w0, w1);
  for (let y = Math.floor(Math.min(y0, y1) - reach); y <= Math.ceil(Math.max(y0, y1) + reach); y++) {
    for (let x = Math.floor(Math.min(x0, x1) - reach); x <= Math.ceil(Math.max(x0, x1) + reach); x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const px = x + 0.5 - x0;
      const py = y + 0.5 - y0;
      const t = Math.max(0, Math.min(1, (px * vx + py * vy) / l2));
      const half = (w0 + (w1 - w0) * t) / 2;
      if (Math.hypot(px - t * vx, py - t * vy) > half) continue;
      const s = ((px - t * vx) * nx + (py - t * vy) * ny) / nl; // + hacia la luz
      const rel = 0.5 - s / (2 * half); // 0 en el lado de la luz
      let c = rel < 0.28 ? light : rel < 0.66 ? base : rel < 0.88 ? shadow : deep;
      if (half >= 1.5) {
        const along = Math.floor(t * Math.sqrt(l2));
        const lanes = Math.max(2, half);
        const lane = Math.floor(rel * lanes);
        const cut = hash2(lane * 7 + 3, Math.floor((along + lane * 3) / 4));
        if (rel > 0.18 && rel < 0.9 && cut < 0.42 && Math.abs(rel * lanes - lane - 0.5) < 0.3) c = deep;
        else if (hash2(x, y) < 0.08 && rel > 0.2) c = shadow;
        else if (hash2(y, x) < 0.06 && rel < 0.6) c = light;
      }
      g[y]![x] = c!;
    }
  }
}

/**
 * Un tronco: del pie (`yBase`), con sus raices abiertas, a `yTop`, estrechando
 * de `wBase` a `wTop` pixeles, en placas de corteza separadas por grietas
 * (hondo) con su canto de luz. Lo usa el juego para el tronco desnudo de cada
 * arbol: `wTop` es el grosor con que lo recibe la copa.
 */
export function barkTrunk(
  g: Grid,
  rng: () => number,
  cx: number,
  yBase: number,
  yTop: number,
  wBase: number,
  wTop: number,
  tones: string,
): void {
  const [light, , , deep] = tones;
  const w = g[0]!.length;
  const tall = yBase - yTop;
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && x < w && y >= 0 && y < g.length) g[y]![x] = c;
  };
  const flare = (y: number) => {
    const up = yBase - y;
    return up < 6 ? (6 - up) ** 1.6 * 0.55 : 0;
  };
  const halfAt = (y: number) => (wBase + (wTop - wBase) * ((yBase - y) / Math.max(1, tall))) / 2 + flare(y);
  for (let y = yBase; y >= yTop; y--) {
    const half = halfAt(y);
    for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) {
      const rel = (x + 0.5 - (cx - half)) / (2 * half);
      set(x, y, tones[rel < 0.24 ? 0 : rel < 0.6 ? 1 : rel < 0.85 ? 2 : 3]!);
    }
  }
  // Las placas: grietas verticales que se tuercen, y alguna horizontal.
  const cracks = Math.max(2, Math.round(wBase / 5));
  for (let k = 0; k < cracks; k++) {
    let rel = (k + 0.5 + (rng() - 0.5) * 0.5) / cracks;
    let run = 0;
    for (let y = yBase - 1; y > yTop + 1; y--) {
      const half = halfAt(y);
      const x = Math.round(cx - half + rel * 2 * half);
      if (x > cx - half + 1 && x < cx + half - 1) {
        set(x, y, deep!);
        if (rel > 0.2 && g[y]![x - 1] === tones[0]) set(x - 1, y, tones[1]!);
        if (g[y]![x + 1] !== deep && rng() < 0.5) set(x + 1, y, light!);
      }
      if (++run > 4 + rng() * 6) {
        run = 0;
        rel = Math.max(0.12, Math.min(0.88, rel + (rng() < 0.5 ? -1 : 1) / (2 * half)));
        if (rng() < 0.35) {
          const len = 2 + Math.floor(rng() * 3);
          for (let i = 0; i < len; i++) if (x + i < cx + half - 1) set(x + i, y, deep!);
        }
      }
    }
  }
  // Las puntas de las raices, en el suelo.
  for (const side of [-1, 1]) {
    const x = Math.round(cx + side * (wBase / 2 + flare(yBase) + 1));
    if (g[yBase]?.[x] === '.') set(x, yBase, tones[side < 0 ? 1 : 2]!);
  }
}

// ------------------------------------------------------------------ follaje

/** Una elipse, en pixeles. */
export interface Ellipse {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/**
 * Una masa de follaje. Una cupula (elipse) o, con `tier`, un piso de conifera:
 * un triangulo de punta arriba, de `rx` de medio ancho en su base, cuyas
 * puntas de los lados caen un poco. `z` es lo que asoma hacia delante: las que
 * cuelgan abajo, delante de la principal; los pisos altos, sobre los bajos.
 */
export interface Mass extends Ellipse {
  z: number;
  tier?: boolean;
  /** Cuanto mas oscura que las demas: la que queda en sombra. */
  shade?: number;
}

/** Una mata de hojas dentro de una masa: un bulto de su relieve. */
export interface Clump {
  x: number;
  y: number;
  r: number;
  mass: number;
}

/** Si un punto cae dentro de una masa. Los pisos, con su borde de abajo dentado. */
function inMass(m: Mass, x: number, y: number): boolean {
  if (!m.tier) return ((x - m.x) / m.rx) ** 2 + ((y - m.y) / m.ry) ** 2 <= 1;
  const top = m.y - m.ry;
  const bottom = m.y + m.ry;
  const dx = Math.abs(x - m.x);
  if (y < top || dx > m.rx) return false;
  const half = m.rx * Math.min(1, (y - top) / (2 * m.ry));
  if (dx > half) return false;
  // Las puntas de los lados caen, y el borde va dentado: ramillas, no una regla.
  const droop = (dx / m.rx) ** 1.5 * m.ry * 0.55 - hash2(Math.floor(x), 17) * 2.2;
  return y <= bottom + droop;
}

/** Lo que asoma hacia delante la cupula de una masa en un punto. */
function domeZ(m: Mass, x: number, y: number): number {
  if (!m.tier) return Math.sqrt(Math.max(0, 1 - ((x - m.x) / m.rx) ** 2 - ((y - m.y) / m.ry) ** 2)) * m.ry;
  const half = Math.max(1, m.rx * Math.min(1, (y - (m.y - m.ry)) / (2 * m.ry)));
  return Math.max(0, 1 - Math.abs(x - m.x) / half) * Math.min(m.rx, m.ry) * 0.8;
}

/**
 * Siembra matas dentro de cada masa, separadas entre si, de mayor a menor: las
 * grandes hacen el cuerpo y las pequenas rellenan y festonean el borde; lo que
 * no cubrio ninguna, con una pequena, para que no queden huecos dentro.
 */
export function scatterClumps(rng: () => number, masses: readonly Mass[], rMin: number, rMax: number): Clump[] {
  const clumps: Clump[] = [];
  masses.forEach((m, mass) => {
    const top = Math.min(rMax, Math.min(m.rx, m.ry) * 0.75);
    const low = Math.min(rMin, top);
    for (const r of [top, (low + top) / 2, low]) {
      for (let tries = 0; tries < 900; tries++) {
        const rr = r * (0.85 + rng() * 0.3);
        const x = m.x + (rng() * 2 - 1) * m.rx;
        const y = m.y + (rng() * 2 - 1) * m.ry;
        if (m.tier ? !inMass(m, x, y) : ((x - m.x) / Math.max(1, m.rx - rr)) ** 2 + ((y - m.y) / Math.max(1, m.ry - rr)) ** 2 > 1) continue;
        if (clumps.some((c) => c.mass === mass && Math.hypot(c.x - x, c.y - y) < (c.r + rr) * 0.62)) continue;
        clumps.push({ x, y, r: rr, mass });
      }
    }
    for (let y = m.y - m.ry; y <= m.y + m.ry * 1.6; y += 2) {
      for (let x = m.x - m.rx; x <= m.x + m.rx; x += 2) {
        const inside = m.tier
          ? inMass(m, x, y)
          : ((x - m.x) / Math.max(1, m.rx - low)) ** 2 + ((y - m.y) / Math.max(1, m.ry - low)) ** 2 <= 1;
        if (!inside) continue;
        if (clumps.some((c) => c.mass === mass && Math.hypot(c.x - x, c.y - y) < c.r - 1)) continue;
        clumps.push({ x, y, r: low, mass });
      }
    }
  });
  return clumps;
}

/**
 * Las hojas sueltas del follaje, de arriba (su punta) a abajo (su pie): `l` el
 * canto que da a la luz, `m` el cuerpo, `d` la sombra que echan (el autor,
 * 2026-10-19: las hojas «tienen cierta forma, no son solo líneas de color»).
 */
export const LEAVES: Readonly<Record<'up' | 'left' | 'right', readonly string[]>> = {
  up: ['.l.', 'lm.', 'lmd', '.md'],
  left: ['l...', 'lm..', '.lmd', '..md'],
  right: ['...l', '..lm', '.lmd', 'lmd.'],
};

/**
 * El follaje, como **una masa de hojas** (el autor, 2026-10-19: «más unido y
 * entrelazado, no como si fueran varias bolas de hojas una al lado de la
 * otra», y el detalle de las hojas «más HD y profesional»), con sus
 * referencias.
 *
 * Dos pasos:
 * 1. **El volumen.** Un relieve: la cupula de cada masa y encima un bulto por
 *    mata. La luz sale de la pendiente de ese relieve, cada mata echa sombra
 *    sobre lo que tiene debajo a la derecha (las grietas que las entrelazan),
 *    y la parte de abajo de cada masa recibe menos cielo. Los cuatro tonos se
 *    reparten por proporciones fijas.
 * 2. **Las hojas.** Encima, hojas sueltas con forma (`LEAVES`), en abanicos de
 *    dos o tres, con su canto de luz y su sombra: en el borde, sus puntas
 *    hacen la silueta.
 */
export function foliage(
  g: Grid,
  rng: () => number,
  opts: {
    masses: readonly Mass[];
    clumps: readonly Clump[];
    tones: string;
    /** Lo que pesa el bulto de cada mata frente a la cupula de su masa. */
    bump: number;
    /** Abanicos de hojas por pixel de follaje. */
    leaves: number;
  },
): void {
  const { tones } = opts;
  const h = g.length;
  const w = g[0]!.length;
  // El relieve, y de que masa es cada pixel: NaN y -1 fuera del follaje.
  const z = new Float64Array(w * h).fill(Number.NaN);
  const owner = new Int32Array(w * h).fill(-1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      for (const c of opts.clumps) {
        const d = Math.hypot(px - c.x, py - c.y);
        if (d >= c.r) continue;
        const m = opts.masses[c.mass]!;
        if (m.tier && !inMass(m, px, py)) continue;
        const v = m.z + domeZ(m, px, py) + Math.sqrt(c.r * c.r - d * d) * opts.bump;
        if (!(v <= z[y * w + x]!)) {
          z[y * w + x] = v;
          owner[y * w + x] = c.mass;
        }
      }
    }
  }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? Number.NaN : z[y * w + x]!);
  // La luz: de arriba a la izquierda y algo de frente.
  const L = [-0.5, -0.62, 0.6];
  const ln = Math.hypot(L[0]!, L[1]!, L[2]!);
  const lit: { x: number; y: number; v: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const z0 = at(x, y);
      if (Number.isNaN(z0)) continue;
      const side = (a: number, b: number) =>
        Number.isNaN(a) ? (Number.isNaN(b) ? 0 : z0 - b) : Number.isNaN(b) ? a - z0 : (a - b) / 2;
      const dx = side(at(x + 1, y), at(x - 1, y));
      const dy = side(at(x, y + 1), at(x, y - 1));
      let v = (-dx * L[0]! - dy * L[1]! + L[2]!) / Math.hypot(dx, dy, 1) / ln;
      for (let t = 1; t <= 8; t++) {
        const o = at(Math.round(x - t * 0.8), Math.round(y - t));
        if (!Number.isNaN(o) && o > z0 + t * 0.45) {
          v -= 0.7;
          break;
        }
      }
      const m = opts.masses[owner[y * w + x]!]!;
      v -= Math.max(0, (y + 0.5 - m.y) / m.ry) * 0.55 + (m.shade ?? 0);
      v += (rng() - 0.5) * 0.1;
      lit.push({ x, y, v });
    }
  }
  const values = lit.map((p) => p.v);
  // Mas oscuro de lo que se quiere: las hojas lo aclaran despues.
  const q1 = quantile(values, 0.3);
  const q2 = quantile(values, 0.57);
  const q3 = quantile(values, 0.85);
  for (const { x, y, v } of lit) g[y]![x] = tones[v >= q3 ? 0 : v >= q2 ? 1 : v >= q1 ? 2 : 3]!;

  // Las hojas, en abanicos que se abren hacia fuera de su masa.
  const level = (c: string | undefined) => (c === undefined ? -1 : tones.indexOf(c));
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  const fans = Math.round(lit.length * opts.leaves);
  for (let k = 0; k < fans && lit.length > 0; k++) {
    const p = lit[Math.floor(rng() * lit.length)]!;
    const here = level(g[p.y]![p.x]);
    if (here < 0) continue;
    const m = opts.masses[owner[p.y * w + p.x]!]!;
    const lean = Math.sign(p.x + 0.5 - m.x);
    const kinds = lean < 0 ? (['left', 'up', 'left'] as const) : (['right', 'up', 'right'] as const);
    const n = 2 + Math.floor(rng() * 2);
    const tone = { l: tones[Math.max(0, here - 1)]!, m: tones[here]!, d: tones[Math.min(3, here + 1)]! };
    for (let i = 0; i < n; i++) {
      const stamp = LEAVES[kinds[(i + Math.floor(rng() * 2)) % 3]!];
      const ox = p.x - 1 + (i - 1) * 2;
      const oy = p.y - stamp.length + 1 + Math.floor(rng() * 2);
      stamp.forEach((row, sy) => {
        for (let sx = 0; sx < row.length; sx++) {
          const c = row[sx]!;
          if (c === '.') continue;
          const x = ox + sx;
          const y = oy + sy;
          if (!inside(x, y)) continue;
          // Fuera de la masa solo la punta (las dos filas de arriba), y solo
          // si toca lo pintado: el borde se hace de puntas de hoja.
          if (g[y]![x] === '.') {
            if (sy > 1 || c === 'd' || level(g[y + 1]?.[x]) < 0) continue;
          } else if (level(g[y]![x]) < 0) continue;
          g[y]![x] = tone[c as 'l' | 'm' | 'd'];
        }
      });
    }
  }
  // Sin pixeles sueltos.
  const filled = (x: number, y: number) => inside(x, y) && level(g[y]![x]) >= 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (filled(x, y) && !filled(x - 1, y) && !filled(x + 1, y) && !filled(x, y - 1) && !filled(x, y + 1)) g[y]![x] = '.';
    }
  }
}
