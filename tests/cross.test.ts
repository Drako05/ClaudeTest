import { describe, expect, it } from 'vitest';
import { crossGeometry } from '../packages/client/src/spike3d/billboards.js';

/**
 * El aspa de dos laminas.
 *
 * Lo que se afirma aqui es **la razon de ser del cambio**, y es un numero: una
 * lamina fija desaparece vista de canto, y por eso el autor pidio dos. Con dos
 * cruzadas a 90 grados la silueta nunca se adelgaza mas alla de `cos 45º`,
 * mire la camara desde donde mire.
 *
 * El contraste con una sola lamina es lo que hace que esto signifique algo: la
 * misma medida sobre media aspa da **cero** en dos rumbos. Sin esa comparacion
 * seria una comprobacion que no puede fallar.
 *
 * Se mide sobre la GEOMETRIA de verdad y no sobre la formula en papel, que
 * seria comprobar que una cuenta es igual a si misma.
 */

const W = 3;
const ABOVE = 2.5;
const BELOW = 0.4;

/** Los vertices, en pares (x, z) del plano del suelo, y sus alturas. */
function verticesOf(geometry: ReturnType<typeof crossGeometry>): {
  ground: Array<[number, number]>;
  ys: number[];
} {
  const p = geometry.getAttribute('position');
  const ground: Array<[number, number]> = [];
  const ys: number[] = [];
  for (let i = 0; i < p.count; i++) {
    ground.push([p.getX(i), p.getZ(i)]);
    ys.push(p.getY(i));
  }
  return { ground, ys };
}

/**
 * Lo ancho que se ve desde ese rumbo.
 *
 * Es la extension de los vertices proyectados sobre el eje horizontal de la
 * pantalla, que es perpendicular a la direccion de vista.
 */
function silhouette(ground: ReadonlyArray<readonly [number, number]>, yaw: number): number {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  let lo = Infinity;
  let hi = -Infinity;
  for (const [x, z] of ground) {
    const u = x * cos - z * sin;
    if (u < lo) lo = u;
    if (u > hi) hi = u;
  }
  return hi - lo;
}

describe('el aspa de dos laminas', () => {
  it('nunca se adelgaza mas alla de cos 45 grados, mire la camara desde donde mire', () => {
    const { ground } = verticesOf(crossGeometry(W, ABOVE, BELOW));
    let worst = Infinity;
    // La vuelta entera en pasos de un grado: el minimo cae en las diagonales.
    for (let deg = 0; deg < 360; deg++) {
      worst = Math.min(worst, silhouette(ground, (deg * Math.PI) / 180));
    }
    expect(worst).toBeGreaterThan(W * Math.SQRT1_2 - 1e-6);
    // Y no mas que eso: si saliera el ancho entero es que las dos laminas son
    // la misma y el aspa no existe.
    expect(worst).toBeLessThan(W * 0.75);
  });

  it('una sola lamina SI desaparece, que es el defecto que esto arregla', () => {
    // Media aspa: los cuatro primeros vertices son la lamina del plano XY.
    const { ground } = verticesOf(crossGeometry(W, ABOVE, BELOW));
    const una = ground.slice(0, 4);
    let worst = Infinity;
    for (let deg = 0; deg < 360; deg++) {
      worst = Math.min(worst, silhouette(una, (deg * Math.PI) / 180));
    }
    expect(worst).toBeLessThan(1e-6);
  });

  it('se apoya con el pie en el origen', () => {
    // Es lo que deja colocar un elemento con `position.set(wx, sueloY, wy)` sin
    // la aritmetica de centrado que pedia un sprite.
    const { ys } = verticesOf(crossGeometry(W, ABOVE, BELOW));
    expect(Math.max(...ys)).toBeCloseTo(ABOVE, 6);
    expect(Math.min(...ys)).toBeCloseTo(-BELOW, 6);
  });

  it('cruza las dos laminas a noventa grados', () => {
    const { ground } = verticesOf(crossGeometry(W, ABOVE, BELOW));
    // Una vive en z = 0 y la otra en x = 0; si no, no estan cruzadas.
    for (const [, z] of ground.slice(0, 4)) expect(z).toBeCloseTo(0, 6);
    for (const [x] of ground.slice(4, 8)) expect(x).toBeCloseTo(0, 6);
  });
});
