import { describe, expect, it } from 'vitest';
import {
  EYE_HEIGHT,
  lookVector,
  plantTile,
  sectorRays,
  STRIKE_HALF_ANGLE,
  STRIKE_RANGE,
  STRIKE_RAYS,
  strike,
  type Ground,
  type Hitbox,
} from '@verdant/sim';

/**
 * El golpe (regla 12): un sector plano de 2,5 bloques y 90 grados en el plano de
 * la mirada, que cuenta solo si toca un hitbox y que el terreno corta. Numeros
 * del autor. Geometria pura: suelo y cajas de mentira.
 */
const EYE = { x: 0.5, y: 0.5, z: EYE_HEIGHT };
const flat: Ground = () => 0;
const down = (deg: number): number => Math.sin((-deg * Math.PI) / 180);
const up = (deg: number): number => Math.sin((deg * Math.PI) / 180);

/** Una caja vertical centrada en `(cx, cy)`, de medio ancho `half`, de `z0` a `z1`. */
function box(cx: number, cy: number, half: number, z0: number, z1: number): Hitbox {
  return { x0: cx - half, x1: cx + half, y0: cy - half, y1: cy + half, z0, z1 };
}

/** Un mundo de mentira con esas cajas, una por casilla. */
function boxes(...list: Hitbox[]) {
  return (tx: number, ty: number): Hitbox | null =>
    list.find((b) => Math.floor((b.x0 + b.x1) / 2) === tx && Math.floor((b.y0 + b.y1) / 2) === ty) ?? null;
}

/** Si el golpe mirando al este con esa inclinacion toca alguna caja. */
function hits(lookZ: number, ground: Ground, ...list: Hitbox[]): number {
  return strike(EYE, 1, 0, lookZ, ground, boxes(...list)).targets.length;
}

describe('el golpe: numeros del autor', () => {
  it('2,5 bloques y 90 grados', () => {
    expect(STRIKE_RANGE).toBe(2.5);
    expect(STRIKE_HALF_ANGLE).toBeCloseTo(Math.PI / 4, 12);
  });

  it('los rayos estan en el plano de la mirada, a ±45 grados, y el central ES la mirada', () => {
    const lookZ = down(30);
    const rays = sectorRays(1, 0, lookZ);
    expect(rays).toHaveLength(STRIKE_RAYS);
    const f = lookVector(1, 0, lookZ);
    const mid = rays[(STRIKE_RAYS - 1) / 2];
    expect(mid.x).toBeCloseTo(f.x, 12);
    expect(mid.z).toBeCloseTo(f.z, 12);
    // A 45 grados de la mirada los de los bordes, y todos en el plano de la
    // mirada y de la horizontal a su derecha: perpendiculares a su normal.
    const right = { x: 0, y: 1, z: 0 };
    const normal = { x: f.y * right.z - f.z * right.y, y: f.z * right.x - f.x * right.z, z: f.x * right.y - f.y * right.x };
    for (const r of rays) {
      expect(r.x * normal.x + r.y * normal.y + r.z * normal.z).toBeCloseTo(0, 12);
    }
    const edge = rays[0];
    expect(edge.x * f.x + edge.y * f.y + edge.z * f.z).toBeCloseTo(Math.cos(Math.PI / 4), 12);
  });
});

describe('el golpe toca hitboxes', () => {
  // Un tronco alto y fino: se toca a la altura de los ojos mirando al frente.
  const trunk = (cx: number, cy: number) => box(cx, cy, 0.1, 0, 3);

  it('a 2,4 bloques golpea; a 2,8, no', () => {
    expect(hits(0, flat, trunk(3.0, 0.5))).toBe(1); // cara cercana a 2,4
    expect(hits(0, flat, trunk(3.4, 0.5))).toBe(0); // cara cercana a 2,8
  });

  it('dentro de los ±45 grados golpea; fuera, no', () => {
    const at = (deg: number) => trunk(0.5 + 1.4 * Math.cos((deg * Math.PI) / 180), 0.5 + 1.4 * Math.sin((deg * Math.PI) / 180));
    expect(hits(0, flat, at(38))).toBe(1);
    expect(hits(0, flat, at(-38))).toBe(1);
    expect(hits(0, flat, at(58))).toBe(0);
  });

  it('es PLANO: mirando al frente pasa por encima de un arbusto; mirando abajo, lo toca', () => {
    const bush = box(2, 0.5, 0.45, 0, 1.1);
    expect(hits(0, flat, bush)).toBe(0);
    expect(hits(down(35), flat, bush)).toBe(1);
  });

  it('del arbol solo cuenta el tronco: apuntando por encima de el, a la copa, no tala', () => {
    const tree = box(1.5, 0.5, 0.1, 0, 2.5); // tramo desnudo de 2,5
    expect(hits(0, flat, tree)).toBe(1);
    expect(hits(up(50), flat, tree)).toBe(0);
  });

  it('el terreno lo corta: un arbol detras de una pared de 2 no cae; detras de un escalon de 1, si', () => {
    const tree = box(2.5, 0.5, 0.1, 0, 4);
    const wall = (h: number): Ground => (x) => (x >= 1.5 && x < 2 ? h : 0);
    expect(hits(0, wall(2), tree)).toBe(0);
    expect(hits(0, wall(1), tree)).toBe(1);
  });

  it('varios a la vez, del mas cercano al mas lejano', () => {
    const near = trunk(1.5, 0.5);
    const far = trunk(2.2, 1.3);
    const { targets } = strike(EYE, 1, 0, 0, flat, boxes(far, near));
    expect(targets.map((t) => [t.x, t.y])).toEqual([[1, 0], [2, 1]]);
  });

  it('los rayos que entran en el suelo se cortan donde entran', () => {
    const { rays } = strike(EYE, 1, 0, down(40), flat, boxes());
    const mid = rays[(STRIKE_RAYS - 1) / 2];
    // A 40 grados hacia abajo desde 1,75 el suelo queda a 1,75 / sen 40 = 2,72:
    // fuera del alcance; a 45, a 2,47, dentro.
    expect(mid.length).toBeCloseTo(STRIKE_RANGE, 6);
    const steep = strike(EYE, 1, 0, down(45), flat, boxes()).rays[(STRIKE_RAYS - 1) / 2];
    expect(steep.length).toBeCloseTo(EYE_HEIGHT / Math.sin((45 * Math.PI) / 180), 4);
  });
});

describe('donde se siembra', () => {
  it('donde la mirada toca la cara de arriba del suelo, a menos de 2,5 en horizontal', () => {
    // Mirando 50 grados abajo desde 1,75, el suelo queda a 1,47 en horizontal.
    expect(plantTile(EYE, 1, 0, down(50), flat)).toEqual({ x: 1, y: 0 });
    // A 38 grados queda a 2,24: llega, a la casilla siguiente.
    expect(plantTile(EYE, 1, 0, down(38), flat)).toEqual({ x: 2, y: 0 });
    // A 33 grados queda a 2,69: no llega.
    expect(plantTile(EYE, 1, 0, down(33), flat)).toBeNull();
  });

  it('mirando al cielo, no', () => {
    expect(plantTile(EYE, 1, 0, up(30), flat)).toBeNull();
  });

  it('en la cara de una pared, no; en la cima del escalon, si', () => {
    const step: Ground = (x) => (x >= 1 ? 1.6 : 0);
    // A 40 grados hacia abajo entra en el bloque de 1,6 por su costado, a 1,33
    // de altura: no se siembra en una pared.
    expect(plantTile(EYE, 1, 0, down(40), step)).toBeNull();
    // Muy hacia abajo, cae en el suelo propio antes de la pared.
    expect(plantTile(EYE, 1, 0, down(75), step)).toEqual({ x: 0, y: 0 });
    // Con un escalon bajo, la mirada cae en su cima.
    const low: Ground = (x) => (x >= 1 ? 0.5 : 0);
    expect(plantTile(EYE, 1, 0, down(45), low)).toEqual({ x: 1, y: 0 });
  });
});
