/**
 * La mirada y el golpe: un SECTOR PLANO que sale de los ojos del jugador.
 *
 * Geometria pura: el suelo y los hitboxes entran como funciones, asi que se
 * mide en Node sin mundo. `systems/gathering.ts` le pone el mundo.
 *
 * **Regla 12, del autor (2026-09-28).** El golpe es un sector de **3 bloques**
 * (`STRIKE_RANGE`) y **90 grados** (±45 alrededor de la mirada) **en el plano de la mirada**: el
 * que forman la direccion en que se mira —con su inclinacion— y la horizontal a
 * su derecha. Cuenta **solo si toca un hitbox**, y **el terreno lo corta**: no se
 * golpea a traves de una pared ni del suelo.
 *
 * Sustituyo a un cono sobre casillas (y este, a cuatro casillas fijas): con la
 * mirada libre arriba y abajo, lo que decide que se golpea es lo que hay delante
 * de los ojos, no en que casilla esta. Por eso ya no hay «dos alturas» ni casilla
 * propia: lo decide la geometria.
 *
 * El sector se recorre con **`STRIKE_RAYS` rayos** a lo ancho: cada uno se corta
 * donde entra en el terreno, y un objeto cae si algun rayo cruza su hitbox antes
 * de ese corte. Con 33 rayos, a 3 bloques queda un hueco de 0,147 entre dos
 * vecinos, menos que el tronco mas fino (0,21 el de la picea negra mas baja):
 * nada que el sector toque se cuela entre rayos.
 *
 * Coordenadas del NUCLEO: `x`, `y` en el plano y `z` la altura.
 */

/** Desplazamiento en tiles, o una casilla. */
export interface Offset {
  readonly x: number;
  readonly y: number;
}

/** Un punto o una direccion, con `z` la altura. */
import type { OrientedBox } from './boxes.js';
import { VOXEL } from './relief.js';

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Una caja vertical alineada con los ejes: `[x0, x1] × [y0, y1] × [z0, z1]`.
 * Es el hitbox de un objeto (`hitboxAt` en `systems/gathering.ts`).
 */
export interface Hitbox {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly z0: number;
  readonly z1: number;
}

/**
 * Altura de los ojos sobre los pies: el origen del golpe y el pivote de las tres
 * camaras. El personaje mide 1,93 y en Minecraft los ojos van al 90 %.
 * **Deduccion mia** (la primera persona ya la usaba; la orbital, 1,6).
 */
export const EYE_HEIGHT = 1.75;
/**
 * Alcance del golpe, en bloques, el de sembrar (en horizontal), el de abrir
 * una estacion mirandola y el de usarla (`stationNear`). Del autor: 2 el
 * 2026-09-28, 2,5 el 2026-09-29 y 3 el 2026-10-01.
 */
export const STRIKE_RANGE = 3;
/** Medio angulo del sector: 90 grados en total. Del autor. */
export const STRIKE_HALF_ANGLE = Math.PI / 4;
/** Rayos con los que se recorre el sector, de su borde derecho al izquierdo. */
export const STRIKE_RAYS = 33;

/**
 * La direccion en que se mira, unitaria: el rumbo `(fx, fy)` en el plano y la
 * inclinacion como `lookZ`, su seno (positivo hacia arriba), que es lo que viaja
 * en la Intent.
 */
export function lookVector(fx: number, fy: number, lookZ: number): Vec3 {
  const len = Math.hypot(fx, fy) || 1;
  const z = Math.max(-1, Math.min(1, lookZ));
  const flat = Math.sqrt(1 - z * z);
  // Sin rumbo, al sur: es hacia donde se nace mirando.
  const ux = len ? fx / len : 0;
  const uy = len ? fy / len : 1;
  return { x: ux * flat, y: uy * flat, z };
}

/**
 * Las direcciones de los rayos del sector, unitarias, de la derecha a la
 * izquierda. Estan en el plano de la mirada y de la horizontal a su derecha,
 * **girado `roll` alrededor de la mirada** (positivo: la derecha sube). Sin
 * giro, el de siempre. El giro lo pide el modo TAP (decision del autor,
 * 2026-10-01): tocando a un lado de la pantalla la mirada va de lado respecto
 * a la camara, y el plano de siempre se veia de canto, como un trazo casi
 * vertical; girado para contener la derecha de la camara, se ve horizontal y
 * centrado en el toque, con el origen en los ojos igual.
 */
export function sectorRays(fx: number, fy: number, lookZ: number, roll = 0): Vec3[] {
  const f = lookVector(fx, fy, lookZ);
  const len = Math.hypot(fx, fy) || 1;
  // A la derecha de la mirada, en horizontal (con `y` hacia el sur, es (-fy, fx)).
  const hx = -(fy / len);
  const hy = fx / len;
  // Girada alrededor de la mirada: r = h·cos + (f × h)·sen, porque h ⟂ f.
  const c0 = Math.cos(roll);
  const s0 = Math.sin(roll);
  const rx = hx * c0 + -f.z * hy * s0;
  const ry = hy * c0 + f.z * hx * s0;
  const rz = (f.x * hy - f.y * hx) * s0;
  const out: Vec3[] = [];
  for (let i = 0; i < STRIKE_RAYS; i++) {
    const theta = STRIKE_HALF_ANGLE * (1 - (2 * i) / (STRIKE_RAYS - 1));
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    out.push({ x: f.x * c + rx * s, y: f.y * c + ry * s, z: f.z * c + rz * s });
  }
  return out;
}

/**
 * Si el voxel de 0,5 (`vx`, `vy`, `vz`) es terreno solido (`World.isSolidVoxel`).
 * El terreno entra asi, voxel a voxel, y no como una altura por punto: lo que
 * queda en el aire tambien corta (el autor, 2026-10-20: el voxel es la unidad
 * del terreno).
 */
export type Solid = (vx: number, vy: number, vz: number) => boolean;

/** Un voxel de 0,5, en coordenadas de voxel. */
export interface Voxel {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Donde entra el rayo en el terreno: la distancia desde el origen, **el voxel
 * en que entra** y si entra por su **cara de arriba** —la que se pisa— o por
 * otra, que es lo que distingue sembrar en el suelo de sembrar en la pared de
 * un bloque. Un origen dentro del terreno da 0, ese voxel y no por arriba.
 */
export interface GroundHit {
  readonly t: number;
  readonly top: boolean;
  readonly voxel: Voxel;
  /** Hacia donde mira la cara por la que entra: un eje, hacia el origen. Dentro, todo 0. */
  readonly normal: Voxel;
}

/**
 * Donde entra el rayo en el terreno, o `null` si no entra antes de `maxT`. Se
 * recorre voxel a voxel por las caras que cruza (Amanatides y Woo), asi que es
 * exacto: ni se salta una esquina ni depende de un paso.
 */
export function groundHit(origin: Vec3, dir: Vec3, maxT: number, solid: Solid): GroundHit | null {
  const cell = [Math.floor(origin.x / VOXEL), Math.floor(origin.y / VOXEL), Math.floor(origin.z / VOXEL)];
  if (solid(cell[0]!, cell[1]!, cell[2]!)) {
    return { t: 0, top: false, voxel: { x: cell[0]!, y: cell[1]!, z: cell[2]! }, normal: { x: 0, y: 0, z: 0 } };
  }
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];
  const step = [0, 0, 0];
  const next = [Infinity, Infinity, Infinity];
  const delta = [Infinity, Infinity, Infinity];
  for (let a = 0; a < 3; a++) {
    if (d[a]! > 0) step[a] = 1;
    else if (d[a]! < 0) step[a] = -1;
    else continue;
    const edge = (cell[a]! + (step[a]! > 0 ? 1 : 0)) * VOXEL;
    next[a] = (edge - o[a]!) / d[a]!;
    delta[a] = VOXEL / Math.abs(d[a]!);
  }
  for (;;) {
    const a = next[0]! <= next[1]! && next[0]! <= next[2]! ? 0 : next[1]! <= next[2]! ? 1 : 2;
    const t = next[a]!;
    if (t > maxT) return null;
    cell[a]! += step[a]!;
    next[a]! += delta[a]!;
    if (solid(cell[0]!, cell[1]!, cell[2]!)) {
      const n = [0, 0, 0];
      n[a] = -step[a]!;
      return { t, top: a === 2 && step[2]! < 0, voxel: { x: cell[0]!, y: cell[1]!, z: cell[2]! }, normal: { x: n[0]!, y: n[1]!, z: n[2]! } };
    }
  }
}

/**
 * Donde entra el rayo en la caja (metodo de las placas), o `null` si no la
 * cruza entre `0` y `maxT`. Un origen dentro de la caja da `0`.
 */
export function rayBox(origin: Vec3, dir: Vec3, box: Hitbox, maxT: number): number | null {
  let tmin = 0;
  let tmax = maxT;
  const axes: Array<[number, number, number, number]> = [
    [origin.x, dir.x, box.x0, box.x1],
    [origin.y, dir.y, box.y0, box.y1],
    [origin.z, dir.z, box.z0, box.z1],
  ];
  for (const [o, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-12) {
      if (o < lo || o > hi) return null;
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  return tmin;
}

/**
 * Donde entra el rayo en una caja girada en el suelo (`boxes.ts`): el metodo
 * de las placas en los ejes de la caja, o `null` si no la cruza entre `0` y
 * `maxT`. Es como se golpea a las partes de un animal.
 */
export function rayOrientedBox(origin: Vec3, dir: Vec3, box: OrientedBox, maxT: number): number | null {
  const px = origin.x - box.cx;
  const py = origin.y - box.cy;
  const axes: Array<[number, number, number]> = [
    [px * box.ux + py * box.uy, dir.x * box.ux + dir.y * box.uy, box.hl],
    [-px * box.uy + py * box.ux, -dir.x * box.uy + dir.y * box.ux, box.hw],
    [origin.z - box.cz, dir.z, box.hh],
  ];
  let tmin = 0;
  let tmax = maxT;
  for (const [o, d, half] of axes) {
    if (Math.abs(d) < 1e-12) {
      if (Math.abs(o) > half) return null;
      continue;
    }
    let t1 = (-half - o) / d;
    let t2 = (half - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  return tmin;
}

/**
 * Un rayo del golpe: hasta donde llega y que lo paro, una cosa como mucho: el
 * voxel del terreno en que entra, la caja de la casilla `tile` o el cuerpo
 * `body`. Nada, si llega al alcance.
 */
export interface StrikeRay {
  readonly dir: Vec3;
  readonly length: number;
  readonly voxel: Voxel | null;
  readonly tile: Offset | null;
  readonly body: number | null;
}

/** Lo que alcanza un golpe: sus rayos ya cortados y los objetos que toca. */
export interface Strike {
  /** Cada rayo del sector, de derecha a izquierda, y lo primero que toca. */
  readonly rays: ReadonlyArray<StrikeRay>;
  /** Los cuerpos (`bodies` de `strike`) que son lo primero de algun rayo, del mas cercano al mas lejano. */
  readonly bodies: ReadonlyArray<{ id: number; t: number; at: Vec3 }>;
  /**
   * **Los voxeles del terreno que toca** (el autor, 2026-10-20): cada uno en
   * que entra algun rayo sin nada antes, una vez aunque entren varios, del mas
   * cercano al mas lejano.
   */
  readonly voxels: ReadonlyArray<Voxel & { t: number }>;
  /**
   * Las casillas de los objetos que son lo primero de algun rayo, del mas
   * cercano al mas lejano, con la distancia y el punto donde los toca su rayo
   * mas corto: ahi va el impacto.
   */
  readonly targets: ReadonlyArray<Offset & { t: number; at: Vec3 }>;
}

/** El punto a `t` de `origin` a lo largo de `dir`. */
export function pointAlong(origin: Vec3, dir: Vec3, t: number): Vec3 {
  return { x: origin.x + dir.x * t, y: origin.y + dir.y * t, z: origin.z + dir.z * t };
}

/**
 * El golpe desde `origin` —los ojos— mirando hacia `(fx, fy)` con inclinacion
 * `lookZ`, y el plano del sector girado `roll` alrededor de la mirada.
 * `boxAt` da el hitbox del objeto de una casilla, o `null`; `bodies`, las
 * cajas de los cuerpos que tambien paran el golpe (los animales).
 */
export function strike(
  origin: Vec3,
  fx: number,
  fy: number,
  lookZ: number,
  solid: Solid,
  boxAt: (tx: number, ty: number) => Hitbox | null,
  roll = 0,
  bodies: ReadonlyArray<{ id: number; boxes: readonly OrientedBox[] }> = [],
): Strike {
  // Solo pueden caer las casillas a menos del alcance mas media diagonal.
  const reach = Math.ceil(STRIKE_RANGE) + 1;
  const cx = Math.floor(origin.x);
  const cy = Math.floor(origin.y);
  const boxes: Array<{ x: number; y: number; box: Hitbox }> = [];
  for (let ty = cy - reach; ty <= cy + reach; ty++) {
    for (let tx = cx - reach; tx <= cx + reach; tx++) {
      const box = boxAt(tx, ty);
      if (box) boxes.push({ x: tx, y: ty, box });
    }
  }

  // Cada rayo da a lo primero que toca (el autor, 2026-10-20: «el
  // comportamiento debe ser lógico y coherente con lo que se ve»): el
  // terreno, una caja o un cuerpo. Lo de detras no se golpea.
  const rays = sectorRays(fx, fy, lookZ, roll).map((dir): StrikeRay => {
    const hit = groundHit(origin, dir, STRIKE_RANGE, solid);
    let ray: StrikeRay = { dir, length: hit ? hit.t : STRIKE_RANGE, voxel: hit ? hit.voxel : null, tile: null, body: null };
    for (const { x, y, box } of boxes) {
      const t = rayBox(origin, dir, box, ray.length);
      if (t !== null && t < ray.length) ray = { dir, length: t, voxel: null, tile: { x, y }, body: null };
    }
    for (const { id, boxes: parts } of bodies) {
      for (const part of parts) {
        const t = rayOrientedBox(origin, dir, part, ray.length);
        if (t !== null && t < ray.length) ray = { dir, length: t, voxel: null, tile: null, body: id };
      }
    }
    return ray;
  });

  const seen = new Map<string, Voxel & { t: number }>();
  const hitTiles = new Map<string, Offset & { t: number; at: Vec3 }>();
  const hitBodies = new Map<number, { id: number; t: number; at: Vec3 }>();
  for (const ray of rays) {
    const at = pointAlong(origin, ray.dir, ray.length);
    if (ray.voxel) {
      const key = `${ray.voxel.x},${ray.voxel.y},${ray.voxel.z}`;
      const was = seen.get(key);
      if (!was || ray.length < was.t) seen.set(key, { ...ray.voxel, t: ray.length });
    } else if (ray.tile) {
      const key = `${ray.tile.x},${ray.tile.y}`;
      const was = hitTiles.get(key);
      if (!was || ray.length < was.t) hitTiles.set(key, { ...ray.tile, t: ray.length, at });
    } else if (ray.body !== null) {
      const was = hitBodies.get(ray.body);
      if (!was || ray.length < was.t) hitBodies.set(ray.body, { id: ray.body, t: ray.length, at });
    }
  }
  const voxels = [...seen.values()].sort((a, b) => a.t - b.t || a.z - b.z || a.y - b.y || a.x - b.x);
  const targets = [...hitTiles.values()].sort((a, b) => a.t - b.t || a.y - b.y || a.x - b.x);
  const struck = [...hitBodies.values()].sort((a, b) => a.t - b.t || a.id - b.id);
  return { rays, targets, voxels, bodies: struck };
}

/**
 * Lo que mira el centro de la mirada: la casilla del primer hitbox que cruza el
 * rayo central, cortado por el terreno y a menos del alcance, o `null`. Es con
 * lo que USAR abre una estacion (decision del autor: mirarla basta, lleves lo
 * que lleves en la mano). Lo que quede detras del primer hitbox no se mira.
 */
export function gazeTarget(
  origin: Vec3,
  fx: number,
  fy: number,
  lookZ: number,
  solid: Solid,
  boxAt: (tx: number, ty: number) => Hitbox | null,
): (Offset & { t: number; at: Vec3 }) | null {
  const dir = lookVector(fx, fy, lookZ);
  const hit = groundHit(origin, dir, STRIKE_RANGE, solid);
  const length = hit ? hit.t : STRIKE_RANGE;
  const reach = Math.ceil(STRIKE_RANGE) + 1;
  const cx = Math.floor(origin.x);
  const cy = Math.floor(origin.y);
  let best: (Offset & { t: number; at: Vec3 }) | null = null;
  for (let ty = cy - reach; ty <= cy + reach; ty++) {
    for (let tx = cx - reach; tx <= cx + reach; tx++) {
      const box = boxAt(tx, ty);
      if (!box) continue;
      const t = rayBox(origin, dir, box, length);
      if (t !== null && (best === null || t < best.t)) best = { x: tx, y: ty, t, at: pointAlong(origin, dir, t) };
    }
  }
  return best;
}

/**
 * Donde toca la mirada el terreno, a menos del alcance en horizontal (el de
 * sembrar): la casilla, el punto, y si es la **cara de arriba** o un
 * **costado**. En un costado, `front` es la casilla de este lado de la pared,
 * donde se pone lo que se coloca mirandola (decision del autor, 2026-09-30:
 * aparece junto a la pared y cae al suelo). `null` si no llega o mira al cielo.
 */
export interface Surface {
  /** La casilla del terreno tocado: la de arriba, o la de la pared. */
  tile: Offset;
  /** La casilla de delante de la pared; en la cara de arriba, la misma. */
  front: Offset;
  /** El punto tocado. */
  point: Vec3;
  top: boolean;
  /** El voxel tocado y hacia donde mira la cara tocada (`GroundHit`). */
  voxel: Voxel;
  normal: Voxel;
}

export function aimSurface(origin: Vec3, fx: number, fy: number, lookZ: number, solid: Solid): Surface | null {
  const dir = lookVector(fx, fy, lookZ);
  const flat = Math.hypot(dir.x, dir.y);
  const hit = groundHit(origin, dir, Math.min(STRIKE_RANGE / Math.max(flat, 1e-3), 8), solid);
  if (!hit) return null;
  // Un pelo mas alla de la entrada cae dentro de lo tocado; un pelo antes, en la
  // casilla de este lado.
  const at = (t: number): Offset => ({
    x: Math.floor(origin.x + dir.x * t),
    y: Math.floor(origin.y + dir.y * t),
  });
  const point = { x: origin.x + dir.x * hit.t, y: origin.y + dir.y * hit.t, z: origin.z + dir.z * hit.t };
  const tile = at(hit.t + 1e-6);
  const { voxel, normal } = hit;
  if (hit.top) return { tile, front: tile, point, top: true, voxel, normal };
  return { tile, front: at(Math.max(0, hit.t - 1e-6)), point, top: false, voxel, normal };
}

/**
 * Donde se siembra: la casilla en la que el centro de la mirada toca la cara de
 * arriba del suelo, a menos del alcance. `null` si no llega, si mira al cielo o
 * si da en la cara de una pared. Decision del autor.
 *
 * El alcance se mide **en horizontal** desde el jugador, no a lo largo de la
 * mirada (deduccion mia): con los ojos a 1,75, medido a lo largo de la mirada
 * habria que mirar mas de 61 grados hacia abajo para sembrar en llano; asi
 * basta con unos 41.
 */
export function plantTile(origin: Vec3, fx: number, fy: number, lookZ: number, solid: Solid): Offset | null {
  const dir = lookVector(fx, fy, lookZ);
  const flat = Math.hypot(dir.x, dir.y);
  const hit = groundHit(origin, dir, Math.min(STRIKE_RANGE / Math.max(flat, 1e-3), 8), solid);
  if (!hit || !hit.top) return null;
  // Un pelo mas alla de la entrada, para caer dentro de la casilla y no en su borde.
  const t = hit.t + 1e-6;
  return { x: Math.floor(origin.x + dir.x * t), y: Math.floor(origin.y + dir.y * t) };
}
