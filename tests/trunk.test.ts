import { describe, expect, it } from 'vitest';
import {
  TRUNK_BUCKETS,
  TRUNK_MAX,
  TRUNK_MEAN,
  TRUNK_MIN,
  TRUNK_SD,
  bucketBlocks,
  trunkBlocks,
  trunkBucket,
} from '../packages/client/src/trunk.js';

/**
 * El tronco desnudo de los arboles adultos: de 2 a 5 bloques, repartido segun
 * una normal (encargo del autor). Ver `trunk.ts`.
 */
describe('tronco de los arboles', () => {
  const values: number[] = [];
  for (let y = 0; y < 150; y++) {
    for (let x = 0; x < 150; x++) values.push(trunkBlocks(12345, x - 75, y - 75));
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);

  it('siempre entre 2 y 5 bloques', () => {
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(TRUNK_MIN);
      expect(v).toBeLessThanOrEqual(TRUNK_MAX);
    }
  });

  it('es de la casilla: la misma casilla da siempre lo mismo', () => {
    expect(trunkBlocks(7, 10, -3)).toBe(trunkBlocks(7, 10, -3));
    // Y no es una constante disfrazada: otra semilla o casilla cambia.
    expect(trunkBlocks(8, 10, -3)).not.toBe(trunkBlocks(7, 10, -3));
    expect(trunkBlocks(7, 11, -3)).not.toBe(trunkBlocks(7, 10, -3));
  });

  it('es una normal centrada en 3,5', () => {
    expect(mean).toBeCloseTo(TRUNK_MEAN, 1);
    // Truncar en ±2σ estrecha la desviacion a un 88 % de la original: 0,66.
    expect(sd).toBeGreaterThan(0.62);
    expect(sd).toBeLessThan(0.7);
    // Dentro de ±1σ cae el 68,3 % de la normal, 71,5 % una vez truncada.
    const inside = values.filter((v) => Math.abs(v - TRUNK_MEAN) <= TRUNK_SD).length;
    expect(inside / values.length).toBeGreaterThan(0.69);
    expect(inside / values.length).toBeLessThan(0.74);
  });

  it('tiene forma de campana: mas arboles en el centro que en los extremos', () => {
    const counts = new Array<number>(TRUNK_BUCKETS).fill(0);
    for (const v of values) counts[trunkBucket(v)]++;
    const center = trunkBucket(TRUNK_MEAN);
    for (let b = 1; b <= center; b++) expect(counts[b]).toBeGreaterThan(counts[b - 1]);
    for (let b = center; b < TRUNK_BUCKETS - 1; b++) expect(counts[b]).toBeGreaterThan(counts[b + 1]);
  });

  it('se trunca, no se recorta: no se amontonan arboles en los topes', () => {
    // Recortar dejaria un 2,3 % de los arboles clavados en 2 y otro tanto en 5.
    expect(values.filter((v) => v === TRUNK_MIN || v === TRUNK_MAX)).toHaveLength(0);
    const counts = new Array<number>(TRUNK_BUCKETS).fill(0);
    for (const v of values) counts[trunkBucket(v)]++;
    // El escalon de cada tope abarca medio paso y la campana ahi ya cae: tiene
    // que quedarse muy por debajo de su vecino. Recortando, lo superaria.
    expect(counts[0]).toBeLessThan(counts[1] * 0.6);
    expect(counts[TRUNK_BUCKETS - 1]).toBeLessThan(counts[TRUNK_BUCKETS - 2] * 0.6);
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
