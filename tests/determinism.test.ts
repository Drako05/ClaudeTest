import { describe, expect, it } from 'vitest';
import { generateChunk, hashRegion, mulberry32, WorldGen } from '@verdant/sim';
import { CHUNK_SIZE } from '@verdant/shared';

describe('determinismo', () => {
  it('el PRNG da la misma secuencia para la misma semilla', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 64 }, () => a());
    const seqB = Array.from({ length: 64 }, () => b());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('semillas distintas dan secuencias distintas', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('la misma semilla reconstruye una region identica', () => {
    const h1 = hashRegion(new WorldGen(777), -2, -2, 2, 2);
    const h2 = hashRegion(new WorldGen(777), -2, -2, 2, 2);
    expect(h1).toBe(h2);
  });

  it('semillas distintas producen mundos distintos', () => {
    const h1 = hashRegion(new WorldGen(777), -2, -2, 2, 2);
    const h2 = hashRegion(new WorldGen(778), -2, -2, 2, 2);
    expect(h1).not.toBe(h2);
  });

  it('generar los chunks en otro orden da el mismo resultado', () => {
    // Prueba que generateChunk es pura: sin esto, un mundo infinito con
    // descarte y regeneracion de chunks seria incoherente.
    const gen = new WorldGen(4242);
    const coords: Array<[number, number]> = [];
    for (let cy = -1; cy <= 1; cy++) for (let cx = -1; cx <= 1; cx++) coords.push([cx, cy]);

    const forward = coords.map(([cx, cy]) => generateChunk(gen, cx, cy));
    const backward = [...coords].reverse().map(([cx, cy]) => generateChunk(gen, cx, cy));
    backward.reverse();

    for (let i = 0; i < forward.length; i++) {
      expect(Array.from(backward[i].terrain)).toEqual(Array.from(forward[i].terrain));
      expect(Array.from(backward[i].feature)).toEqual(Array.from(forward[i].feature));
    }
  });

  it('regenerar un chunk tras descartarlo devuelve lo mismo', () => {
    const gen = new WorldGen(99);
    const first = generateChunk(gen, 10, -7);
    const second = generateChunk(gen, 10, -7);
    expect(Array.from(second.terrain)).toEqual(Array.from(first.terrain));
    expect(first.terrain.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
  });

  it('las coordenadas negativas de chunk funcionan', () => {
    const gen = new WorldGen(5);
    const c = generateChunk(gen, -100, -100);
    expect(c.terrain.length).toBe(CHUNK_SIZE * CHUNK_SIZE);
    expect(Array.from(c.terrain).some((t) => t !== c.terrain[0])).toBe(true);
  });
});
