import { describe, expect, it } from 'vitest';
import { groundHeight, World } from '@verdant/sim';
import { biomeOfTerrain, CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { collectBiomeEdges } from '../packages/client/src/spike3d/biome-edges.js';

/**
 * El contorno de biomas del panel de desarrollo, en coordenadas del mundo.
 *
 * Heredero del test del isometrico. De aquel se conservan las reglas que son del
 * mundo —una arista por par vecino distinto, costuras entre chunks, no alterar
 * el mundo, nada dentro de un terreno uniforme— y se afirman sobre las
 * coordenadas del mundo, que es lo que ahora devuelve la geometria.
 */

/** Los segmentos como sextetos, para poder buscarlos. */
function sextets(segments: number[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < segments.length; i += 6) out.push(segments.slice(i, i + 6).join(','));
  return out;
}

/** Bioma de un tile del mundo, sin pasar por los chunks registrados. */
function biomeOf(world: World, wx: number, wy: number): number {
  return biomeOfTerrain(world.gen.terrainAt(wx, wy) as Terrain);
}

/** La esquina (fx, fy) del tile (wx, wy), a la altura de su suelo. */
function corner(world: World, wx: number, wy: number, fx: number, fy: number): number[] {
  return [wx + fx, groundHeight(world.levelAt(wx, wy), world.rampDirAt(wx, wy), fx, fy), wy + fy];
}

function chunkWithEdges(world: World): { cx: number; cy: number } {
  for (let cy = -3; cy <= 3; cy++) {
    for (let cx = -3; cx <= 3; cx++) {
      if (cx === 0 && cy === 0) continue;
      if (collectBiomeEdges(world, world.getChunk(cx, cy)).length > 0) return { cx, cy };
    }
  }
  throw new Error('no se encontro un chunk con frontera de biomas');
}

describe('Contorno de biomas (3D)', () => {
  it('cada arista este une las esquinas (1,0) y (1,1) del tile, en coordenadas del mundo', () => {
    // Lejos del origen: el fallo historico —el origen del chunk sumado dos
    // veces— valia cero en el chunk (0,0).
    const world = new World(31337);
    const { cx, cy } = chunkWithEdges(world);
    const found = new Set(sextets(collectBiomeEdges(world, world.getChunk(cx, cy))));

    let checked = 0;
    for (let ly = 0; ly < CHUNK_SIZE && checked < 8; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE && checked < 8; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wy = cy * CHUNK_SIZE + ly;
        if (biomeOf(world, wx + 1, wy) === biomeOf(world, wx, wy)) continue;
        const key = [...corner(world, wx, wy, 1, 0), ...corner(world, wx, wy, 1, 1)].join(',');
        expect(found, `falta la arista este de (${wx}, ${wy})`).toContain(key);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('la arista sur va de la esquina (1,1) a la (0,1)', () => {
    const world = new World(4242);
    const { cx, cy } = chunkWithEdges(world);
    const found = new Set(sextets(collectBiomeEdges(world, world.getChunk(cx, cy))));

    let checked = 0;
    for (let ly = 0; ly < CHUNK_SIZE && checked < 4; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE && checked < 4; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wy = cy * CHUNK_SIZE + ly;
        if (biomeOf(world, wx, wy + 1) === biomeOf(world, wx, wy)) continue;
        const key = [...corner(world, wx, wy, 1, 1), ...corner(world, wx, wy, 0, 1)].join(',');
        expect(found, `falta la arista sur de (${wx}, ${wy})`).toContain(key);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('todo segmento cae dentro de su chunk o en su costura este/sur', () => {
    const world = new World(31337);
    const { cx, cy } = chunkWithEdges(world);
    const s = collectBiomeEdges(world, world.getChunk(cx, cy));
    for (let i = 0; i < s.length; i += 3) {
      expect(s[i]).toBeGreaterThanOrEqual(cx * CHUNK_SIZE);
      expect(s[i]).toBeLessThanOrEqual((cx + 1) * CHUNK_SIZE);
      expect(s[i + 2]).toBeGreaterThanOrEqual(cy * CHUNK_SIZE);
      expect(s[i + 2]).toBeLessThanOrEqual((cy + 1) * CHUNK_SIZE);
    }
  });

  it('una arista por cada par vecino distinto, ni una mas', () => {
    const world = new World(31337);
    const { cx, cy } = chunkWithEdges(world);

    let expected = 0;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wy = cy * CHUNK_SIZE + ly;
        const mine = biomeOf(world, wx, wy);
        if (biomeOf(world, wx + 1, wy) !== mine) expected++;
        if (biomeOf(world, wx, wy + 1) !== mine) expected++;
      }
    }
    const segments = collectBiomeEdges(world, world.getChunk(cx, cy));
    expect(segments.length % 6).toBe(0);
    expect(segments.length / 6).toBe(expected);
  });

  it('las costuras entre chunks tambien se dibujan', () => {
    const world = new World(31337);
    let seams = 0;
    for (let cy = -3; cy <= 3 && seams === 0; cy++) {
      for (let cx = -3; cx <= 3 && seams === 0; cx++) {
        const found = new Set(sextets(collectBiomeEdges(world, world.getChunk(cx, cy))));
        const lx = CHUNK_SIZE - 1;
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          const wx = cx * CHUNK_SIZE + lx;
          const wy = cy * CHUNK_SIZE + ly;
          if (biomeOf(world, wx + 1, wy) === biomeOf(world, wx, wy)) continue;
          const key = [...corner(world, wx, wy, 1, 0), ...corner(world, wx, wy, 1, 1)].join(',');
          expect(found, `costura sin dibujar en (${wx}, ${wy})`).toContain(key);
          seams++;
        }
      }
    }
    expect(seams, 'no se encontro ninguna costura con cambio de bioma').toBeGreaterThan(0);
  });

  it('dibujar el contorno no altera el mundo', () => {
    const world = new World(31337);
    const { cx, cy } = chunkWithEdges(world);
    const chunk = world.getChunk(cx, cy);
    const tracked = world.trackedChunkCount;
    const loaded = world.loadedChunkCount;
    collectBiomeEdges(world, chunk);
    expect(world.trackedChunkCount).toBe(tracked);
    expect(world.loadedChunkCount).toBe(loaded);
  });

  it('dentro de un terreno uniforme no se dibuja ni una arista', () => {
    // Sin este caso, un contorno que trazara SIEMPRE las cuatro aristas de cada
    // tile pasaria los demas tests igual de bien.
    const world = new World(31337);
    const chunk = world.getChunk(0, 0);
    const uniform = { ...chunk, terrain: new Uint8Array(chunk.terrain.length) };
    const flat = biomeOfTerrain(0 as Terrain);

    let expected = 0;
    for (let i = 0; i < CHUNK_SIZE; i++) {
      if (biomeOf(world, CHUNK_SIZE, i) !== flat) expected++;
      if (biomeOf(world, i, CHUNK_SIZE) !== flat) expected++;
    }
    expect(collectBiomeEdges(world, uniform).length / 6).toBe(expected);
  });
});
