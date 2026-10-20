/**
 * Las menas: la roca de voxeles con vetas del mineral y cristales que brotan
 * de ella, en laminas cruzadas como los arboles (el autor, 2026-10-20, con una
 * referencia de amatista; el boceto, `docs/bocetos/minerales/`). Una distinta
 * por casilla: «me gustaria la opcion de maxima variedad», con todo sacado de
 * la casilla y la semilla (regla 2), para que al volver se vea igual.
 *
 * Las reglas, las que aprobo el autor en el boceto:
 * - **La corona** (`crown`), en cada tapa: una flor de 5 a 7 cristales.
 * - **Los costados** (`side`), en cada cara de lado: dos cristales hacia
 *   arriba.
 * - **Sin cristales donde se tocan dos voxeles de la mena**, «solo dentro de
 *   la formacion»: hacia fuera de la casilla salen siempre.
 *
 * Desde el 2026-10-20 la mena es **una formacion de voxeles del terreno** (el
 * autor: uno abajo, el 2 × 2 en medio y tres arriba; `ore-shape.ts`), que se
 * pican uno a uno. Se dibujan **los que quedan**, y una cara tapada por el
 * terreno (`covered`) no lleva ni piedra ni cristales: solo se ve lo que da al
 * aire, tambien por debajo si se cavo.
 *
 * La piedra es la de la roca del juego (`STONES[RockNode]`), con las vetas
 * pintadas encima. Cada mena lleva **su propia textura**: la tesela con sus
 * vetas y, al lado, los dibujos de sus cristales. Y una sola malla, piedra y
 * cristales juntos, para que siga siendo una llamada de dibujo por mena, como
 * la roca.
 *
 * **Puro**, como `rock-mesh.ts`: arrays planos y una rejilla de caracteres, sin
 * DOM ni three.js, para comprobarlo en Node.
 */

import { Feature } from '@verdant/shared';
import { hash2D, mulberry32 } from '@verdant/sim';
import { ORE_TONES } from './palette.js';
import { rockMesh, type RockMesh, type Voxel } from './rock-mesh.js';
import { STONES, WORLD_PX, type WorldArt } from './world-art.js';

/** Lo que mide un voxel, en bloques, y su cara en pixeles de arte. */
const V = 0.5;
const N = WORLD_PX * V;
/** El atlas de cada mena: la tesela de piedra arriba a la izquierda y los cristales en baldas. */
const ATLAS_W = 64;
/** Cada balda: el cristal mas alto (6) y un pixel de aire. */
const SHELF = 7;
/** Lo mas que se pisan dos bases de la corona: un 40 % de sus dos medias bases. */
export const CROWN_OVERLAP = 0.4;
const DEG = Math.PI / 180;

type Vec = [number, number, number];

/** Un cristal colocado, para dibujarlo y para comprobar sus reglas. */
export interface Crystal {
  readonly kind: 'corona' | 'lado';
  /** El voxel del que sale y hacia donde mira su cara. */
  readonly voxel: Voxel;
  readonly face: Voxel;
  /** El pie, en el centro de su base, sobre la cara (sin hundir). */
  readonly base: Vec;
  /** Hacia donde crece, unitario. */
  readonly dir: Vec;
  /** Ancho y alto, en pixeles de arte. */
  readonly w: number;
  readonly h: number;
  /** Cuanto giran sus laminas sobre su eje, en radianes. */
  readonly spin: number;
}

/** Una mena entera: su textura, su malla y lo que se puso. */
export interface OreModel {
  readonly art: WorldArt;
  readonly mesh: RockMesh;
  readonly crystals: readonly Crystal[];
  /** Cada corona: los cristales que pidio, los que puso y lo mas que se pisan. */
  readonly crowns: readonly { wanted: number; placed: number; overlap: number }[];
  /** Cristales de lado que no encontraron sitio sin tocar al otro de su cara. */
  readonly sideOverlaps: number;
}

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec): Vec => scale(a, 1 / Math.hypot(...a));
const UP: Vec = [0, 1, 0];
/** Un eje que se inclina `tilt` desde la vertical, hacia el rumbo `heading`. */
const leaning = (tilt: number, heading: number): Vec => [Math.sin(tilt) * Math.cos(heading), Math.cos(tilt), Math.sin(tilt) * Math.sin(heading)];

/** Las cuatro caras de lado: [direccion en voxeles (este, sur, arriba), normal en three.js]. */
const SIDES: readonly [Voxel, Vec][] = [
  [[1, 0, 0], [1, 0, 0]],
  [[-1, 0, 0], [-1, 0, 0]],
  [[0, 1, 0], [0, 0, 1]],
  [[0, -1, 0], [0, 0, -1]],
];

/**
 * La mena de esa casilla: los voxeles que le quedan, [este, sur, altura desde
 * su base] (`ore-shape.ts`), y `covered`, si hay terreno en un voxel de fuera
 * de la formacion (en las mismas coordenadas). Su pie, en el centro de la
 * casilla a la altura de la base.
 */
export function oreModel(
  feature: Feature,
  seed: number,
  tx: number,
  ty: number,
  voxels: readonly Voxel[],
  covered: (e: number, s: number, z: number) => boolean = () => false,
): OreModel {
  const ore = ORE_TONES[feature];
  if (!ore) throw new Error(`${Feature[feature]} no es un mineral`);
  const has = (x: number, y: number, z: number) => voxels.some(([a, b, c]) => a === x && b === y && c === z) || covered(x, y, z);
  /**
   * El azar de una cara de un voxel: de la semilla, el voxel en el mundo y la
   * cara, y de nada mas (el autor, 2026-10-20: los cristales, «ligados a su
   * posicion en el mundo»). Asi romper un voxel no cambia los de los demas.
   */
  const faceRng = ([e, s, z]: Voxel, face: number) =>
    mulberry32(hash2D(seed ^ 0x0e5ca1 ^ Math.imul((z + 64) * 8 + face, 0x9e3779b1), tx * 2 + e, ty * 2 + s));

  const crystals: Crystal[] = [];
  /** La semilla del dibujo de cada cristal, de su cara. */
  const paints: number[] = [];
  const crowns: { wanted: number; placed: number; overlap: number }[] = [];
  let sideOverlaps = 0;
  /** Lo que pone una cara, con su azar; y despues, el de los dibujos de lo que puso. */
  const onFace = (voxel: Voxel, face: number, put: (r: () => number) => void) => {
    const r = faceRng(voxel, face);
    const from = crystals.length;
    put(r);
    for (let i = from; i < crystals.length; i++) paints.push(r());
  };

  for (const voxel of voxels) {
    const [e, s, z] = voxel;
    // El centro de la cara de arriba, en three.js (x al este, y arriba, z al sur).
    const cx = (e + 0.5) * V - 0.5;
    const cz = (s + 0.5) * V - 0.5;
    if (!has(e, s, z + 1)) onFace(voxel, 0, (r) => crowns.push(crown(r, voxel, [cx, (z + 1) * V, cz], crystals)));
    // Y abajo, si se cavo debajo: «la misma flor colgando de la de abajo».
    if (!has(e, s, z - 1)) onFace(voxel, 1, (r) => crowns.push(crown(r, voxel, [cx, z * V, cz], crystals, true)));
    SIDES.forEach(([d, n], k) => {
      if (has(e + d[0], s + d[1], z + d[2])) return;
      // Un punto de la cara: `u` de lado a lado y `v` de abajo arriba, en
      // fracciones del voxel; +u va al este o al sur, segun la cara.
      const at = (u: number, v: number): Vec => [
        d[0] !== 0 ? cx + d[0] * V * 0.5 : cx + u * V,
        (z + v) * V,
        d[1] !== 0 ? cz + d[1] * V * 0.5 : cz + u * V,
      ];
      onFace(voxel, 2 + k, (r) => (sideOverlaps += side(r, voxel, d, n, at, crystals)));
    });
  }

  // La textura: la piedra con sus vetas y, al lado, un dibujo por cristal.
  const stone = STONES[Feature.RockNode]!;
  const grid = stone.rows.map((row) => [...row]);
  // Las vetas, de su propio azar por casilla: la textura no cambia al romper.
  const veinRng = mulberry32(hash2D(seed ^ 0x7e1a5, tx, ty));
  for (let q = 0; q < 4; q++) veins(veinRng, grid, (q % 2) * N, Math.floor(q / 2) * N, ore.accent !== null);
  const sprites = crystals.map((c, i) => paintCrystal(c.w, c.h, paints[i]!));
  const slots = pack(crystals);
  const height = Math.max(WORLD_PX, ...slots.map((p, i) => p[1] + crystals[i]!.h));
  const rows = Array.from({ length: height }, (_, y) => Array.from({ length: ATLAS_W }, (_, x) => (y < WORLD_PX && x < WORLD_PX ? grid[y]![x]! : '.')));
  sprites.forEach((sprite, i) => {
    const [x0, y0] = slots[i]!;
    sprite.forEach((row, y) => row.forEach((ch, x) => ch !== '.' && (rows[y0 + y]![x0 + x] = ch)));
  });
  const palette: Record<string, string> = { ...stone.palette, i: ore.tones[0], j: ore.tones[1], k: ore.tones[2], l: ore.tones[3], s: ore.shine };
  if (ore.accent) palette.v = ore.accent;
  const art: WorldArt = { rows: rows.map((row) => row.join('')), palette };

  return { art, mesh: geometry(voxels, covered, crystals, slots, height), crystals, crowns, sideOverlaps };
}

/**
 * **La regla de la corona** (aprobada por el autor el 2026-10-20: «guarda esa
 * regla para la corona»), en fracciones del lado del voxel:
 * 1. De 5 a 7 cristales.
 * 2. Uno en el centro, el mas alto y grueso (5 x 6), de 0 a 10 grados desde
 *    la vertical.
 * 3. Los demas, petalos en un anillo a 0,20-0,35, repartidos por igual con
 *    ±15 grados, de 3 a 5 de alto.
 * 4. Cada petalo, abierto hacia fuera de 15 a 40 grados.
 * 5. Y torcido de lado hasta ±10.
 * 6. El centro de la flor, hasta 0,12 fuera del de la cara.
 * 7. Cada cristal, un pixel menos de ancho que de alto y nunca menos de 3. Sus
 *    bases se pisan hasta un 40 % (`CROWN_OVERLAP`) de sus dos medias bases.
 * 8. De 0 a 2 brotes sueltos de 3 x 3, cerca del borde (0,36-0,44).
 */
function crown(r: () => number, voxel: Voxel, center: Vec, out: Crystal[], down = false) {
  const report = { wanted: 0, placed: 0, overlap: 0 };
  const placed: [number, number, number][] = []; // [x, z, media base]
  /** Lo que se pisa con el mas pisado (0 si no toca a ninguno), o null si pasa del tope. */
  const press = (x: number, z: number, half: number): number | null => {
    if (Math.abs(x) > 0.44 || Math.abs(z) > 0.44) return null;
    let worst = 0;
    for (const [px, pz, ph] of placed) {
      const o = 1 - Math.hypot(x - px, z - pz) / (ph + half);
      if (o > CROWN_OVERLAP) return null;
      worst = Math.max(worst, o);
    }
    return worst;
  };
  const put = (x: number, z: number, w: number, h: number, dir: Vec, o: number) => {
    report.placed++;
    report.overlap = Math.max(report.overlap, o);
    placed.push([x, z, w / 2 / N]);
    // Colgando de la cara de abajo, la misma flor del reves (la regla aprobada).
    const face: Voxel = down ? [0, 0, -1] : [0, 0, 1];
    const grow: Vec = down ? [dir[0], -dir[1], dir[2]] : dir;
    out.push({ kind: 'corona', voxel, face, base: [center[0] + x * V, center[1], center[2] + z * V], dir: grow, w, h, spin: r() * Math.PI });
  };
  const count = 5 + Math.floor(r() * 3);
  report.wanted = count;
  const off = r() * 0.12;
  const offAt = r() * 2 * Math.PI;
  const fx = Math.cos(offAt) * off;
  const fz = Math.sin(offAt) * off;
  put(fx, fz, 5, 6, leaning(r() * 10 * DEG, r() * 2 * Math.PI), 0);
  const petals = count - 1;
  const start = r() * 2 * Math.PI;
  for (let i = 0; i < petals; i++) {
    const h = 3 + Math.floor(r() * 3);
    const w = Math.max(3, h - 1);
    for (let t = 0; t < 60; t++) {
      const at = start + (i * 2 * Math.PI) / petals + (r() - 0.5) * 30 * DEG;
      const rho = 0.2 + r() * 0.15;
      const x = fx + Math.cos(at) * rho;
      const z = fz + Math.sin(at) * rho;
      const o = press(x, z, w / 2 / N);
      if (o === null) continue;
      const open = (15 + r() * 25) * DEG;
      const twist = (r() - 0.5) * 20 * DEG;
      put(x, z, w, h, leaning(open, at + twist), o);
      break;
    }
  }
  const buds = Math.floor(r() * 3);
  report.wanted += buds;
  for (let i = 0; i < buds; i++) {
    for (let t = 0; t < 40; t++) {
      const edge = Math.floor(r() * 4);
      const along = (r() - 0.5) * 0.8;
      const reach = 0.36 + r() * 0.08;
      const [x, z] = ([[reach, along], [-reach, along], [along, reach], [along, -reach]] as const)[edge]!;
      const o = press(x, z, 3 / 2 / N);
      if (o === null) continue;
      put(x, z, 3, 3, leaning((25 + r() * 25) * DEG, Math.atan2(z, x)), o);
      break;
    }
  }
  return report;
}

/**
 * **La regla de los costados** (aprobada por el autor el 2026-10-20: «guarda
 * esa regla para los costados»): dos cristales por cara, de 4 x 5 y 3 x 4. Van
 * de 30 a 56 grados sobre la horizontal. La punta, en un arco horizontal de 0 a
 * 20 grados, hacia el centro de la cara o hacia su borde. Y sus bases no se
 * tocan nunca: entre sus pies, sus dos medias bases y 0,08 de la cara. Si en 80
 * tiradas no hay sitio, el mas separado, y se cuenta. Devuelve cuantos se
 * pisaron.
 */
function side(r: () => number, voxel: Voxel, face: Voxel, n: Vec, at: (u: number, v: number) => Vec, out: Crystal[]): number {
  const placed: [number, number, number][] = []; // [u, v, media base]
  let overlaps = 0;
  const along = unit(add(at(1, 0.5), scale(at(0, 0.5), -1)));
  for (const [w, h] of [[4, 5], [3, 4]] as const) {
    const half = w / 2 / N;
    const room = (u: number, v: number) => Math.min(Infinity, ...placed.map(([pu, pv, ph]) => Math.hypot(u - pu, v - pv) - ph - half - 0.08));
    let best = { u: 0, v: 0.5, slack: -Infinity };
    for (let t = 0; t < 80; t++) {
      const u = -0.38 + r() * 0.76;
      const v = 0.18 + r() * 0.64;
      const slack = room(u, v);
      if (slack > best.slack) best = { u, v, slack };
      if (slack >= 0) break;
    }
    if (best.slack < 0) overlaps++;
    placed.push([best.u, best.v, half]);
    const toCenter = -Math.sign(best.u) || 1;
    const arc = (r() < 0.5 ? toCenter : -toCenter) * r() * 20 * DEG;
    const outward = add(scale(n, Math.cos(arc)), scale(along, Math.sin(arc)));
    const rise = (30 + r() * 26) * DEG;
    const dir = unit(add(scale(outward, Math.cos(rise)), scale(UP, Math.sin(rise))));
    out.push({ kind: 'lado', voxel, face, base: at(best.u, best.v), dir, w, h, spin: r() * Math.PI });
  }
  return overlaps;
}

/**
 * Las vetas de un cuarto de la tesela (una cara de voxel, 12 x 12): dos
 * caminos de 1-2 pixeles con su luz arriba y su sombra abajo, y un nodulo de
 * 3 x 3 al final del primero. Las del cobre llevan cardenillo (`v`) en la sombra.
 */
function veins(r: () => number, grid: string[][], ox: number, oy: number, accent: boolean) {
  const marks: [number, number, string][] = [];
  for (let k = 0; k < 2; k++) {
    let x = r() < 0.5 ? 0 : Math.floor(r() * N);
    let y = Math.floor(r() * N);
    let dy = r() < 0.5 ? 1 : -1;
    const len = 5 + Math.floor(r() * 6);
    const start = marks.length;
    for (let step = 0; step < len && x < N; step++) {
      marks.push([x, y, 'j']);
      if (r() < 0.35) marks.push([x, y + 1, 'k']);
      if (r() < 0.25) marks.push([x, y - 1, 'i']);
      x += r() < 0.75 ? 1 : 0;
      if (r() < 0.4) y += dy;
      if (r() < 0.15) dy = -dy;
      y = Math.max(1, Math.min(N - 2, y));
    }
    if (k > 0) continue;
    // Una de las cuatro ultimas pisadas (o la primera, si la veta salio corta).
    const [nx, ny] = marks[Math.max(start, marks.length - 1 - Math.floor(r() * 4))]!;
    for (const [dx, dy2, t] of [[0, 0, 'j'], [1, 0, 'k'], [0, 1, 'k'], [1, 1, 'l'], [-1, 0, 'i'], [0, -1, 'i']] as const) marks.push([nx + dx, ny + dy2, t]);
  }
  for (const [x, y, t] of marks) {
    if (x < 0 || y < 0 || x >= N || y >= N) continue;
    grid[oy + y]![ox + x] = accent && t === 'k' && r() < 0.4 ? 'v' : t;
  }
}

/**
 * Un cristal visto de lado, punta arriba: un prisma con su cara de luz a la
 * izquierda, la base y la sombra a la derecha, la arista de la punta, un brillo
 * largo y una franja honda, para que se lea como cristal y no como lapiz.
 */
function paintCrystal(w: number, h: number, seed: number): string[][] {
  const r = mulberry32(Math.floor(seed * 0x100000000));
  const g = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  const tip = Math.max(3, Math.round(w * 0.7));
  const cx = w / 2;
  const put = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < w && y >= 0 && y < h) g[y]![x] = ch;
  };
  for (let y = 0; y < h; y++) {
    const hw = y < tip ? Math.max(0.5, ((y + 1) / tip) * (w / 2)) : w / 2;
    for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) {
      const rel = (x + 0.5 - (cx - hw)) / (2 * hw);
      let ch = rel < 0.32 ? 'i' : rel < 0.62 ? 'j' : rel < 0.86 ? 'k' : 'l';
      // En la punta, la cara de la luz cae en diagonal: arista hasta el centro.
      if (y < tip && x + 0.5 > cx + (tip - y) * 0.15) ch = rel < 0.62 ? 'j' : rel < 0.86 ? 'k' : 'l';
      put(x, y, ch);
    }
  }
  for (let x = Math.round(cx); x < w; x++) put(x, tip, 'k');
  const sx = Math.max(0, Math.round(cx - w * 0.28));
  for (let y = tip + 1; y < h - 3; y++) if (r() < 0.8) put(sx, y, 's');
  put(Math.round(cx) - 1, Math.max(0, Math.round(tip * 0.35)), 's');
  const fx = Math.round(cx + w * 0.1);
  for (let y = tip + 2; y < h - 2; y++) if (r() < 0.5) put(fx, y, 'k');
  return g;
}

/**
 * Donde va cada cristal en el atlas: en baldas de 7, con un pixel de aire
 * entre uno y otro; las baldas que pasan junto a la piedra empiezan a su
 * derecha.
 */
function pack(crystals: readonly Crystal[]): [number, number][] {
  const out: [number, number][] = [];
  let y = 0;
  let x = WORLD_PX + 1;
  for (const c of crystals) {
    if (x + c.w > ATLAS_W) {
      y += SHELF;
      x = y < WORLD_PX + 1 ? WORLD_PX + 1 : 0;
    }
    out.push([x, y]);
    x += c.w + 1;
  }
  return out;
}

/**
 * La malla: la piedra de la roca (`rockMesh`, con sus coordenadas pasadas al
 * atlas) y cada cristal en dos laminas cruzadas, cada una por sus dos caras,
 * con el pie hundido un poco en la piedra. Los cristales no llevan la luz de
 * las caras: brillan igual por todos lados, como en el boceto.
 */
function geometry(
  voxels: readonly Voxel[],
  covered: (e: number, s: number, z: number) => boolean,
  crystals: readonly Crystal[],
  slots: readonly [number, number][],
  height: number,
): RockMesh {
  const rock = rockMesh(voxels, 0, covered);
  const positions = [...rock.positions];
  const colors = [...rock.colors];
  const indices = [...rock.indices];
  // La tesela de piedra ocupa la esquina de arriba a la izquierda del atlas.
  const uvs: number[] = [];
  for (let i = 0; i < rock.uvs.length; i += 2) {
    uvs.push((rock.uvs[i]! * WORLD_PX) / ATLAS_W, 1 - ((1 - rock.uvs[i + 1]!) * WORLD_PX) / height);
  }
  crystals.forEach((c, i) => {
    const [x0, y0] = slots[i]!;
    const W = c.w / WORLD_PX;
    const H = c.h / WORLD_PX;
    const foot = add(c.base, scale(c.dir, -0.03));
    const tip = add(foot, scale(c.dir, H));
    // Las dos laminas: una perpendicular al eje, girada lo que diga su
    // `spin`, y la que la cruza.
    const ref: Vec = Math.abs(c.dir[1]) < 0.9 ? UP : [1, 0, 0];
    const p = unit(cross(c.dir, ref));
    const a = add(scale(p, Math.cos(c.spin)), scale(cross(c.dir, p), Math.sin(c.spin)));
    const b = cross(c.dir, a);
    const u0 = x0 / ATLAS_W;
    const u1 = (x0 + c.w) / ATLAS_W;
    const vTop = 1 - y0 / height;
    const vFoot = 1 - (y0 + c.h) / height;
    for (const across of [a, b]) {
      const half = scale(across, W / 2);
      const corners = [add(tip, scale(half, -1)), add(tip, half), add(foot, half), add(foot, scale(half, -1))];
      const cornerUv = [[u0, vTop], [u1, vTop], [u1, vFoot], [u0, vFoot]];
      const first = positions.length / 3;
      corners.forEach((p, k) => {
        positions.push(...p);
        colors.push(1, 1, 1);
        uvs.push(...cornerUv[k]!);
      });
      // Por delante y por detras.
      indices.push(first, first + 3, first + 1, first + 1, first + 3, first + 2);
      indices.push(first, first + 1, first + 3, first + 1, first + 2, first + 3);
    }
  });
  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
  };
}
