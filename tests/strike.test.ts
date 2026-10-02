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
  TREE_TRUNKS,
  trunkBucket,
  trunkRange,
  trunkWidthFor,
  bucketBlocks,
  type Ground,
  type Hitbox,
} from '@verdant/sim';

/**
 * El golpe (regla 12): un sector plano de 3 bloques y 90 grados en el plano de
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
  it('3 bloques y 90 grados', () => {
    expect(STRIKE_RANGE).toBe(3);
    expect(STRIKE_HALF_ANGLE).toBeCloseTo(Math.PI / 4, 12);
  });

  it('el giro del sector (modo TAP): con 0, los rayos de siempre; con 90 grados, vertical', () => {
    const lookZ = down(20);
    const plain = sectorRays(1, 0, lookZ);
    expect(sectorRays(1, 0, lookZ, 0)).toEqual(plain);
    // Mirando al este, el sector girado 90 grados queda en el plano vertical
    // de la mirada: ningun rayo se aparta al norte ni al sur, y los bordes
    // suben y bajan 45 grados respecto a la mirada.
    const rolled = sectorRays(1, 0, 0, Math.PI / 2);
    for (const r of rolled) expect(Math.abs(r.y)).toBeLessThan(1e-12);
    expect(rolled[0].z).toBeCloseTo(Math.sin(Math.PI / 4), 12);
    expect(rolled[STRIKE_RAYS - 1].z).toBeCloseTo(-Math.sin(Math.PI / 4), 12);
    // Y el rayo central sigue siendo la mirada.
    const mid = sectorRays(1, 0.3, lookZ, 0.7)[(STRIKE_RAYS - 1) / 2];
    const f = lookVector(1, 0.3, lookZ);
    expect(mid.x).toBeCloseTo(f.x, 12);
    expect(mid.y).toBeCloseTo(f.y, 12);
    expect(mid.z).toBeCloseTo(f.z, 12);
  });

  it('en la punta del alcance, entre dos rayos no cabe ni el tronco mas fino', () => {
    // La cuerda entre dos rayos vecinos a 3 bloques: 0,147 (con el alcance a 2,5
    // era 0,12). El tronco mas fino es el de la picea negra mas baja, 0,21: se
    // saca de las especies, no de un numero suelto, para que siga valiendo si
    // una cambia de grosor.
    const thinnest = Math.min(
      ...Object.values(TREE_TRUNKS).map((t) =>
        trunkWidthFor(t, bucketBlocks(trunkBucket(trunkRange(t)[0]))),
      ),
    );
    const gap = 2 * STRIKE_RANGE * Math.sin((2 * STRIKE_HALF_ANGLE) / (STRIKE_RAYS - 1) / 2);
    expect(gap).toBeLessThan(thinnest);
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

  it('a 2,9 bloques golpea; a 3,3, no', () => {
    expect(hits(0, flat, trunk(3.5, 0.5))).toBe(1); // cara cercana a 2,9
    expect(hits(0, flat, trunk(3.9, 0.5))).toBe(0); // cara cercana a 3,3
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
    const { rays } = strike(EYE, 1, 0, down(33), flat, boxes());
    const mid = rays[(STRIKE_RAYS - 1) / 2];
    // A 33 grados hacia abajo desde 1,75 el suelo queda a 1,75 / sen 33 = 3,21:
    // fuera del alcance; a 45, a 2,47, dentro.
    expect(mid.length).toBeCloseTo(STRIKE_RANGE, 6);
    const steep = strike(EYE, 1, 0, down(45), flat, boxes()).rays[(STRIKE_RAYS - 1) / 2];
    expect(steep.length).toBeCloseTo(EYE_HEIGHT / Math.sin((45 * Math.PI) / 180), 4);
  });
});

describe('donde se siembra', () => {
  it('donde la mirada toca la cara de arriba del suelo, a menos de 3 en horizontal', () => {
    // Mirando 50 grados abajo desde 1,75, el suelo queda a 1,47 en horizontal.
    expect(plantTile(EYE, 1, 0, down(50), flat)).toEqual({ x: 1, y: 0 });
    // A 33 grados queda a 2,69: llega, dos casillas mas alla.
    expect(plantTile(EYE, 1, 0, down(33), flat)).toEqual({ x: 3, y: 0 });
    // A 28 grados queda a 3,29: no llega.
    expect(plantTile(EYE, 1, 0, down(28), flat)).toBeNull();
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
