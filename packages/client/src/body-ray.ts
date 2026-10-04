/**
 * La caja del cuerpo de un sprite y la cuenta de un rayo contra ella.
 *
 * El jugador se dibuja en una lamina, pero ocupa un cuerpo: una caja con su
 * largo a lo largo de hacia donde mira, su ancho de lado y su alto. (Los
 * animales tambien fueron laminas hasta el 2026-10-03; hoy son de bloques.)
 * `sprite-depth.ts` hace en el shader, pixel a pixel, la misma cuenta que hay
 * aqui: el rayo de la camara por ese pixel, cortado contra la caja, da la
 * profundidad que tendria el cuerpo de verdad. Esta version en JS es la que usa
 * la sonda (`sprite-depth-probe.ts`) como verdad, y la que fijan los tests.
 *
 * Coordenadas de three.js: `y` arriba, el suelo en `x`/`z`.
 */

export type V3 = readonly [number, number, number];

export interface BodyBox {
  /** El centro de la caja. */
  center: V3;
  /** Hacia donde mira, en el suelo (`x`, `z`); unitario. */
  facingX: number;
  facingZ: number;
  /** Medio largo (a lo largo de la mirada), medio alto y medio ancho. */
  halfLength: number;
  halfHeight: number;
  halfWidth: number;
}

/** Los ejes de la caja: largo, alto y ancho, en el mundo. */
function axesOf(box: BodyBox): [V3, V3, V3] {
  return [
    [box.facingX, 0, box.facingZ],
    [0, 1, 0],
    [-box.facingZ, 0, box.facingX],
  ];
}

const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Donde entra el rayo `o + t·d` en la caja (`t >= 0`), o `null` si no la
 * toca. Con el origen dentro, `0`. Es el slab test en los ejes de la caja.
 */
export function rayBodyBox(o: V3, d: V3, box: BodyBox): number | null {
  const axes = axesOf(box);
  const half = [box.halfLength, box.halfHeight, box.halfWidth];
  const p: V3 = [o[0] - box.center[0], o[1] - box.center[1], o[2] - box.center[2]];
  let near = 0;
  let far = Infinity;
  for (let i = 0; i < 3; i++) {
    const po = dot(p, axes[i]);
    const pd = dot(d, axes[i]);
    if (Math.abs(pd) < 1e-12) {
      if (Math.abs(po) > half[i]) return null;
      continue;
    }
    let t0 = (-half[i] - po) / pd;
    let t1 = (half[i] - po) / pd;
    if (t0 > t1) [t0, t1] = [t1, t0];
    if (t0 > near) near = t0;
    if (t1 < far) far = t1;
    if (near > far) return null;
  }
  return near;
}

/**
 * El punto de la caja mas cercano a un rayo que no la toca: el del rayo mas
 * cercano al centro, metido dentro de la caja. No es el optimo exacto, pero
 * siempre es un punto del cuerpo, y eso es lo que importa: la profundidad que
 * se le da a la tinta que asoma de la silueta es la del cuerpo, nunca la de la
 * lamina.
 */
export function nearestOnBox(o: V3, d: V3, box: BodyBox): V3 {
  const axes = axesOf(box);
  const half = [box.halfLength, box.halfHeight, box.halfWidth];
  const toCenter: V3 = [box.center[0] - o[0], box.center[1] - o[1], box.center[2] - o[2]];
  const t = Math.max(0, dot(toCenter, d) / dot(d, d));
  const q: V3 = [o[0] + d[0] * t - box.center[0], o[1] + d[1] * t - box.center[1], o[2] + d[2] * t - box.center[2]];
  const out: [number, number, number] = [box.center[0], box.center[1], box.center[2]];
  for (let i = 0; i < 3; i++) {
    const k = Math.max(-half[i], Math.min(half[i], dot(q, axes[i])));
    out[0] += axes[i][0] * k;
    out[1] += axes[i][1] * k;
    out[2] += axes[i][2] * k;
  }
  return out;
}

/** Donde entra el rayo en una caja alineada con los ejes, o `null`. */
export function rayAabb(o: V3, d: V3, min: V3, max: V3): number | null {
  let near = 0;
  let far = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      if (o[i] < min[i] || o[i] > max[i]) return null;
      continue;
    }
    let t0 = (min[i] - o[i]) / d[i];
    let t1 = (max[i] - o[i]) / d[i];
    if (t0 > t1) [t0, t1] = [t1, t0];
    if (t0 > near) near = t0;
    if (t1 < far) far = t1;
    if (near > far) return null;
  }
  return near;
}
