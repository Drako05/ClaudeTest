import { describe, expect, it } from 'vitest';
import { groundHeight } from '@verdant/sim';
import { addShadowPatches, type PatchBuffers, type Surface } from '../packages/client/src/shadow-patches.js';

/**
 * La sombra cae al suelo de cada casilla que pisa, no a la altura del pie.
 * Antes, un arbol al borde de un desnivel dejaba media sombra en el aire.
 */
const LIFT = 0.03;

/** Un escalon: la casilla x < 5 esta a nivel 3 y el resto a 0. */
const cliff: Surface = (tx) => (tx < 5 ? 3 : 0);

function build(cx: number, cz: number, side: number, surface: Surface): PatchBuffers {
  const out: PatchBuffers = { positions: [], uvs: [], indices: [] };
  addShadowPatches(cx, cz, side, surface, LIFT, out);
  return out;
}

/** Cada vertice, con la altura del suelo de SU casilla debajo. */
function vertices(out: PatchBuffers, surface: Surface) {
  const list: Array<{ x: number; y: number; z: number; floor: number }> = [];
  for (let q = 0; q < out.positions.length / 12; q++) {
    // Los cuatro vertices de un trozo son de la misma casilla: se saca de su centro.
    const cxq = (out.positions[q * 12] + out.positions[q * 12 + 6]) / 2;
    const czq = (out.positions[q * 12 + 2] + out.positions[q * 12 + 8]) / 2;
    const tx = Math.floor(cxq);
    const tz = Math.floor(czq);
    for (let v = 0; v < 4; v++) {
      const i = q * 12 + v * 3;
      const [x, y, z] = [out.positions[i], out.positions[i + 1], out.positions[i + 2]];
      list.push({ x, y, z, floor: surface(tx, tz, x - tx, z - tz) });
    }
  }
  return list;
}

function area(out: PatchBuffers): number {
  let sum = 0;
  for (let q = 0; q < out.positions.length / 12; q++) {
    const p = out.positions.slice(q * 12, q * 12 + 12);
    sum += Math.abs(p[6] - p[0]) * Math.abs(p[8] - p[2]);
  }
  return sum;
}

describe('sombras pegadas al suelo', () => {
  it('al borde de un escalon, ningun trozo queda en el aire', () => {
    // Un arbol en la casilla 4 (nivel 3), con la sombra asomando a la 5 (nivel 0).
    const out = build(4.8, 10.5, 1.6, cliff);
    const verts = vertices(out, cliff);
    for (const v of verts) expect(v.y).toBeCloseTo(v.floor + LIFT, 6);
    // Y de verdad hay trozo abajo: la parte que asoma cae al nivel 0.
    expect(verts.some((v) => v.x > 5 && Math.abs(v.y - LIFT) < 1e-6)).toBe(true);
    expect(verts.some((v) => v.x < 5 && Math.abs(v.y - (3 + LIFT)) < 1e-6)).toBe(true);
  });

  it('muerde: un cuadrado plano a la altura del pie dejaria vertices flotando', () => {
    // La sombra de antes: todo a la altura del pie (nivel 3).
    const flat = build(4.8, 10.5, 1.6, () => 3);
    const floating = vertices(flat, cliff).filter((v) => v.y > v.floor + LIFT + 1e-6);
    expect(floating.length).toBeGreaterThan(0);
  });

  it('los trozos cubren el cuadrado entero, sin huecos ni solapes', () => {
    for (const [cx, cz, side] of [[4.8, 10.5, 1.6], [7.5, 7.5, 2.9], [0.1, -0.1, 0.9]]) {
      expect(area(build(cx, cz, side, cliff))).toBeCloseTo(side * side, 9);
    }
  });

  it('las UV recorren el cuadrado entero, no cada trozo', () => {
    const out = build(4.8, 10.5, 1.6, cliff);
    expect(Math.min(...out.uvs)).toBeCloseTo(0, 9);
    expect(Math.max(...out.uvs)).toBeCloseTo(1, 9);
  });

  it('sobre un talud, sigue la rampa', () => {
    // Nivel 2 con talud hacia +x (dir 1): sube de 2 a 3 a lo ancho.
    const ramp: Surface = (_tx, _tz, fx, fy) => groundHeight(2, 1, fx, fy);
    const verts = vertices(build(0.5, 0.5, 0.8, ramp), ramp);
    for (const v of verts) expect(v.y).toBeCloseTo(v.floor + LIFT, 6);
    const ys = verts.map((v) => v.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.8, 6);
  });

  it('una sombra dentro de su casilla sigue siendo un solo cuadrilatero', () => {
    const out = build(2.5, 2.5, 0.7, cliff);
    expect(out.positions.length / 12).toBe(1);
    expect(out.indices).toHaveLength(6);
  });
});
