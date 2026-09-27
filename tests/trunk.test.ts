import { describe, expect, it } from 'vitest';
import { Feature } from '@verdant/shared';
import {
  TRUNK_BUCKETS,
  TRUNK_MIN,
  bucketBlocks,
  trunkBlocks,
  trunkBucket,
  trunkRange,
  type TrunkLaw,
} from '../packages/client/src/trunk.js';
import { TREE_SHAPES, treeShapeOf } from '../packages/client/src/tree-shapes.js';

/**
 * El tronco desnudo de los arboles adultos: cada especie con su normal truncada
 * (`tree-shapes.ts`) y una sola regla comun, del autor: nunca menos de 2 bloques.
 */
function sample(law: TrunkLaw, seed = 12345): number[] {
  const values: number[] = [];
  for (let y = 0; y < 120; y++) {
    for (let x = 0; x < 120; x++) values.push(trunkBlocks(seed, x - 60, y - 60, law));
  }
  return values;
}

const mean = (v: number[]): number => v.reduce((a, b) => a + b, 0) / v.length;

describe('tronco de los arboles, por especie', () => {
  const species = Object.keys(TREE_SHAPES).map(Number) as Feature[];

  it('ninguno baja de 2 bloques, y cada especie se queda en su rango', () => {
    for (const f of species) {
      const shape = treeShapeOf(f)!;
      const [lo, hi] = trunkRange(shape);
      expect(lo).toBeGreaterThanOrEqual(TRUNK_MIN);
      for (const v of sample(shape)) {
        expect(v).toBeGreaterThanOrEqual(lo);
        expect(v).toBeLessThanOrEqual(hi);
      }
    }
  });

  it('la media de cada especie queda cerca de la suya', () => {
    for (const f of species) {
      const shape = treeShapeOf(f)!;
      // Truncar por abajo en 2 empuja la media hacia arriba en las especies que
      // rozan el minimo; nunca mas de media desviacion.
      const m = mean(sample(shape));
      expect(m).toBeGreaterThan(shape.bareMean - 0.05);
      expect(m).toBeLessThan(shape.bareMean + shape.bareSd * 0.5);
    }
  });

  it('la picea negra lleva el tronco mas corto y el alerce el mas largo', () => {
    const means = species.map((f) => [f, mean(sample(treeShapeOf(f)!))] as const);
    means.sort((a, b) => a[1] - b[1]);
    expect(means[0][0]).toBe(Feature.TundraTree);
    expect(means[means.length - 1][0]).toBe(Feature.ForestTreeRare);
  });

  it('es de la casilla: la misma casilla da siempre lo mismo', () => {
    const law = treeShapeOf(Feature.ForestTreeRare)!;
    expect(trunkBlocks(7, 10, -3, law)).toBe(trunkBlocks(7, 10, -3, law));
    expect(trunkBlocks(8, 10, -3, law)).not.toBe(trunkBlocks(7, 10, -3, law));
    expect(trunkBlocks(7, 11, -3, law)).not.toBe(trunkBlocks(7, 10, -3, law));
  });

  it('es una normal: con un rango holgado, media y desviacion salen las suyas', () => {
    // Una ley de prueba que no roza el minimo, para ver la forma sin el corte de 2.
    const law = { bareMean: 3.5, bareSd: 0.75 };
    const v = sample(law);
    const m = mean(v);
    const sd = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length);
    expect(m).toBeCloseTo(3.5, 1);
    // Truncar en ±2σ estrecha la desviacion a un 88 % de la original: 0,66.
    expect(sd).toBeGreaterThan(0.62);
    expect(sd).toBeLessThan(0.7);
    const inside = v.filter((x) => Math.abs(x - 3.5) <= 0.75).length / v.length;
    expect(inside).toBeGreaterThan(0.69);
    expect(inside).toBeLessThan(0.74);
  });

  it('se trunca, no se recorta: no se amontonan arboles en los topes', () => {
    for (const f of species) {
      const shape = treeShapeOf(f)!;
      const [lo, hi] = trunkRange(shape);
      // Recortando, un 2,3 % (o mas, donde el minimo corta dentro de la
      // campana) quedaria clavado exactamente en el tope.
      expect(sample(shape).filter((v) => v === lo || v === hi)).toHaveLength(0);
    }
  });

  it('trece escalones de cuarto de bloque, de 2 a 5', () => {
    expect(TRUNK_BUCKETS).toBe(13);
    expect(bucketBlocks(0)).toBe(2);
    expect(bucketBlocks(TRUNK_BUCKETS - 1)).toBe(5);
    expect(trunkBucket(3.5)).toBe(6);
    expect(trunkBucket(1)).toBe(0);
    expect(trunkBucket(9)).toBe(TRUNK_BUCKETS - 1);
  });
});
