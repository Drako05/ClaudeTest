/**
 * La mirada y el golpe: un SECTOR PLANO que sale de los ojos del jugador.
 *
 * Geometria pura: el suelo y los hitboxes entran como funciones, asi que se
 * mide en Node sin mundo. `systems/gathering.ts` le pone el mundo.
 *
 * **Regla 12, del autor (2026-09-28).** El golpe es un sector de **2,5 bloques**
 * y **90 grados** (±45 alrededor de la mirada) **en el plano de la mirada**: el
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
 * de ese corte. Con 33 rayos, a 2,5 bloques queda un hueco de 0,12 entre dos
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
 * Alcance del golpe, en bloques, y el de sembrar (en horizontal). Del autor:
 * 2 el 2026-09-28, 2,5 el 2026-09-29, los dos.
 */
export const STRIKE_RANGE = 2.5;
/** Medio angulo del sector: 90 grados en total. Del autor. */
export const STRIKE_HALF_ANGLE = Math.PI / 4;
/** Rayos con los que se recorre el sector, de su borde derecho al izquierdo. */
export const STRIKE_RAYS = 33;

/** Paso con el que se busca el suelo a lo largo de un rayo. */
const GROUND_STEP = 0.05;

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
 * izquierda. Estan en el plano de la mirada y de la horizontal a su derecha.
 */
export function sectorRays(fx: number, fy: number, lookZ: number): Vec3[] {
  const f = lookVector(fx, fy, lookZ);
  const len = Math.hypot(fx, fy) || 1;
  // A la derecha de la mirada, en horizontal (con `y` hacia el sur, es (-fy, fx)).
  const rx = -(fy / len);
  const ry = fx / len;
  const out: Vec3[] = [];
  for (let i = 0; i < STRIKE_RAYS; i++) {
    const theta = STRIKE_HALF_ANGLE * (1 - (2 * i) / (STRIKE_RAYS - 1));
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    out.push({ x: f.x * c + rx * s, y: f.y * c + ry * s, z: f.z * c });
  }
  return out;
}

/** La altura del suelo en un punto del plano. */
export type Ground = (x: number, y: number) => number;

/**
 * Donde entra el rayo en el terreno, como distancia desde el origen, o `null` si
 * no entra antes de `maxT`. Y si entra por la CARA DE ARRIBA de la casilla —la
 * que se pisa— o por un costado, que es lo que distingue sembrar en el suelo de
 * sembrar en la pared de un bloque.
 */
export function groundHit(
  origin: Vec3,
  dir: Vec3,
  maxT: number,
  ground: Ground,
): { t: number; top: boolean } | null {
  const below = (t: number): boolean =>
    origin.z + dir.z * t < ground(origin.x + dir.x * t, origin.y + dir.y * t);
  if (below(0)) return { t: 0, top: false };
  let prev = 0;
  for (let t = GROUND_STEP; ; t += GROUND_STEP) {
    const at = Math.min(t, maxT);
    if (below(at)) {
      // Afinar entre la ultima muestra al aire y la primera bajo tierra.
      let lo = prev;
      let hi = at;
      for (let k = 0; k < 20; k++) {
        const mid = (lo + hi) / 2;
        if (below(mid)) hi = mid;
        else lo = mid;
      }
      const x = origin.x + dir.x * hi;
      const y = origin.y + dir.y * hi;
      // Por la cara de arriba, el punto de entrada queda a ras de su suelo; por
      // un costado, muy por debajo de la cima del bloque en que entra.
      const top = ground(x, y) - (origin.z + dir.z * hi) < 0.05;
      return { t: hi, top };
    }
    if (at >= maxT) return null;
    prev = at;
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

/** Lo que alcanza un golpe: sus rayos ya cortados y los objetos que toca. */
export interface Strike {
  /** Cada rayo del sector, de derecha a izquierda, y hasta donde llega. */
  readonly rays: ReadonlyArray<{ dir: Vec3; length: number }>;
  /** Las casillas de los objetos tocados, del mas cercano al mas lejano. */
  readonly targets: ReadonlyArray<Offset & { t: number }>;
}

/**
 * El golpe desde `origin` —los ojos— mirando hacia `(fx, fy)` con inclinacion
 * `lookZ`. `boxAt` da el hitbox del objeto de una casilla, o `null`.
 */
export function strike(
  origin: Vec3,
  fx: number,
  fy: number,
  lookZ: number,
  ground: Ground,
  boxAt: (tx: number, ty: number) => Hitbox | null,
): Strike {
  const rays = sectorRays(fx, fy, lookZ).map((dir) => {
    const hit = groundHit(origin, dir, STRIKE_RANGE, ground);
    return { dir, length: hit ? hit.t : STRIKE_RANGE };
  });

  // Solo pueden caer las casillas a menos del alcance mas media diagonal.
  const reach = Math.ceil(STRIKE_RANGE) + 1;
  const cx = Math.floor(origin.x);
  const cy = Math.floor(origin.y);
  const targets: Array<Offset & { t: number }> = [];
  for (let ty = cy - reach; ty <= cy + reach; ty++) {
    for (let tx = cx - reach; tx <= cx + reach; tx++) {
      const box = boxAt(tx, ty);
      if (!box) continue;
      let best = Infinity;
      for (const ray of rays) {
        const t = rayBox(origin, ray.dir, box, ray.length);
        if (t !== null && t < best) best = t;
      }
      if (best < Infinity) targets.push({ x: tx, y: ty, t: best });
    }
  }
  targets.sort((a, b) => a.t - b.t || a.y - b.y || a.x - b.x);
  return { rays, targets };
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
  ground: Ground,
  boxAt: (tx: number, ty: number) => Hitbox | null,
): (Offset & { t: number }) | null {
  const dir = lookVector(fx, fy, lookZ);
  const hit = groundHit(origin, dir, STRIKE_RANGE, ground);
  const length = hit ? hit.t : STRIKE_RANGE;
  const reach = Math.ceil(STRIKE_RANGE) + 1;
  const cx = Math.floor(origin.x);
  const cy = Math.floor(origin.y);
  let best: (Offset & { t: number }) | null = null;
  for (let ty = cy - reach; ty <= cy + reach; ty++) {
    for (let tx = cx - reach; tx <= cx + reach; tx++) {
      const box = boxAt(tx, ty);
      if (!box) continue;
      const t = rayBox(origin, dir, box, length);
      if (t !== null && (best === null || t < best.t)) best = { x: tx, y: ty, t };
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
}

export function aimSurface(origin: Vec3, fx: number, fy: number, lookZ: number, ground: Ground): Surface | null {
  const dir = lookVector(fx, fy, lookZ);
  const flat = Math.hypot(dir.x, dir.y);
  const hit = groundHit(origin, dir, Math.min(STRIKE_RANGE / Math.max(flat, 1e-3), 8), ground);
  if (!hit) return null;
  // Un pelo mas alla de la entrada cae dentro de lo tocado; un pelo antes, en la
  // casilla de este lado.
  const at = (t: number): Offset => ({
    x: Math.floor(origin.x + dir.x * t),
    y: Math.floor(origin.y + dir.y * t),
  });
  const point = { x: origin.x + dir.x * hit.t, y: origin.y + dir.y * hit.t, z: origin.z + dir.z * hit.t };
  const tile = at(hit.t + 1e-6);
  if (hit.top) return { tile, front: tile, point, top: true };
  return { tile, front: at(Math.max(0, hit.t - 1e-6)), point, top: false };
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
export function plantTile(origin: Vec3, fx: number, fy: number, lookZ: number, ground: Ground): Offset | null {
  const dir = lookVector(fx, fy, lookZ);
  const flat = Math.hypot(dir.x, dir.y);
  const hit = groundHit(origin, dir, Math.min(STRIKE_RANGE / Math.max(flat, 1e-3), 8), ground);
  if (!hit || !hit.top) return null;
  // Un pelo mas alla de la entrada, para caer dentro de la casilla y no en su borde.
  const t = hit.t + 1e-6;
  return { x: Math.floor(origin.x + dir.x * t), y: Math.floor(origin.y + dir.y * t) };
}
