import { describe, expect, it } from 'vitest';
import { Resource } from '@verdant/shared';
import {
  deltaText,
  FEED_FAST_SECONDS,
  FEED_LINE,
  FEED_MAX,
  FEED_RISE,
  FEED_SECONDS,
  inventoryDelta,
  opacityOf,
  PickupFeed,
  riseOf,
} from '../packages/client/src/pickup-feed.js';

/** Totales por objeto con esas cantidades. */
function totals(entries: Partial<Record<Resource, number>>): number[] {
  const out = new Array(12).fill(0);
  for (const [k, v] of Object.entries(entries)) out[Number(k)] = v;
  return out;
}

describe('El registro de objetos: que cambio', () => {
  it('ganancias y perdidas, con el texto del autor', () => {
    const before = totals({ [Resource.Wood]: 2, [Resource.Berries]: 3 });
    const after = totals({ [Resource.Wood]: 7, [Resource.Berries]: 2 });
    expect(inventoryDelta(before, after).map(deltaText)).toEqual(['+5 Madera', '-1 Bayas']);
  });

  it('mover un objeto de casilla no cambia ningun total: no escribe nada', () => {
    const same = totals({ [Resource.Stone]: 4 });
    expect(inventoryDelta(same, [...same])).toEqual([]);
  });
});

describe('El registro de objetos: las lineas', () => {
  it('una linea vive su tiempo, sube y se desvanece al final', () => {
    const feed = new PickupFeed();
    feed.push('+1 Rama', true);
    const line = feed.lines[0];
    feed.advance(0.1);
    expect(opacityOf(line)).toBe(1);
    feed.advance(FEED_SECONDS * 0.8);
    expect(opacityOf(line)).toBeLessThan(0.5);
    expect(riseOf(line)).toBeGreaterThan(FEED_RISE * 0.8);
    feed.advance(FEED_SECONDS);
    expect(feed.lines).toHaveLength(0);
  });

  it('las nuevas van debajo de las anteriores', () => {
    const feed = new PickupFeed();
    feed.push('+1 Rama', true);
    feed.push('+1 Fibra', true);
    for (let i = 0; i < 60; i++) feed.advance(1 / 60);
    const [a, b] = feed.lines;
    expect(b.fromTop - a.fromTop).toBeCloseTo(FEED_LINE, 1);
    expect(a.fromBottom - b.fromBottom).toBeCloseTo(FEED_LINE, 1);
  });

  it('al llegar la quinta, la mas vieja se apaga deprisa', () => {
    const feed = new PickupFeed();
    for (let i = 0; i < 4; i++) feed.push(`+${i + 1} Piedra`, true);
    expect(feed.lines.some((l) => l.fast)).toBe(false);
    feed.push('+5 Piedra', true);
    const oldest = feed.lines[0];
    expect(oldest.fast).not.toBeNull();
    expect(feed.lines.filter((l) => l.fast)).toHaveLength(1);
    feed.advance(FEED_FAST_SECONDS + 0.01);
    expect(feed.lines).not.toContain(oldest);
    expect(feed.lines).toHaveLength(FEED_MAX - 1);
  });

  it('nunca mas de cinco, aunque lleguen ocho de golpe', () => {
    const feed = new PickupFeed();
    for (let i = 0; i < 8; i++) {
      feed.push(`-${i + 1} Bayas`, false);
      expect(feed.lines.length).toBeLessThanOrEqual(FEED_MAX);
    }
    // Se quedan las ultimas.
    expect(feed.lines.at(-1)?.text).toBe('-8 Bayas');
  });
});
