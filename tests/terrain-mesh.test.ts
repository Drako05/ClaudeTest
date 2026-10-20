import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, Terrain } from '@verdant/shared';
import { CHUNK_COLUMNS, VOXEL, VOXELS_PER_TILE, World } from '@verdant/sim';
import { chunkMesh, Face, meshHeightAt, terrainVariant, UNDER_LIGHT, WALL_LIGHT } from '../packages/client/src/terrain-mesh.js';

/**
 * La malla del terreno.
 *
 * El mundo que se ve **tiene que ser el mismo** que simula el nucleo: si la
 * malla se separara de `groundHeightAt`, el personaje andaria por encima o por
 * debajo de lo que pisa. Aqui se afirma que la geometria es la del mundo,
 * voxel de 0,5 a voxel, tambien con lo roto.
 */

const SEEDS = [12345, 7, 999];

/** Tesela de mentira: al test le da igual, lo que mide es la geometria. */
const TILE = { u0: 0, v0: 1, u1: 1, v1: 0 };
const flat = () => TILE;

/** Un chunk con relieve de verdad, que es donde hay algo que comprobar. */
function chunkWithRelief(world: World): ReturnType<World['getChunk']> {
  let best: ReturnType<World['getChunk']> | null = null;
  let bestRange = -1;
  for (let cy = -2; cy <= 2; cy++) {
    for (let cx = -2; cx <= 2; cx++) {
      const chunk = world.getChunk(cx, cy);
      let lo = 99;
      let hi = -99;
      for (const h of chunk.height) {
        if (h < lo) lo = h;
        if (h > hi) hi = h;
      }
      if (hi - lo > bestRange) {
        bestRange = hi - lo;
        best = chunk;
      }
    }
  }
  if (!best || bestRange < 4) throw new Error('no se encontro un chunk con relieve');
  return best;
}

describe('La malla dice lo mismo que el mundo', () => {
  for (const seed of SEEDS) {
    it(`semilla ${seed}: la tapa de cada columna esta a la altura del mundo`, () => {
      const world = new World(seed);
      const chunk = chunkWithRelief(world);
      const mesh = chunkMesh(world, chunk, flat);

      // El centro de cada columna de 0,5. Se pregunta a la GEOMETRIA, no al
      // codigo que la genero.
      let checked = 0;
      for (let ly = 0; ly < CHUNK_COLUMNS; ly += 3) {
        for (let lx = 0; lx < CHUNK_COLUMNS; lx += 3) {
          const x = (chunk.cx * CHUNK_COLUMNS + lx + 0.5) * VOXEL;
          const y = (chunk.cy * CHUNK_COLUMNS + ly + 0.5) * VOXEL;
          expect(meshHeightAt(mesh, x, y), `columna en (${x}, ${y})`).toBe(world.groundHeightAt(x, y));
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(400);
    });
  }

  it('cada columna de 0,5 lleva su tapa, tambien las de agua y las de una casilla llana', () => {
    // El voxel es la unidad del terreno (el autor, 2026-10-20): una casilla
    // llana ya no sale como un bloque de 1, sino como sus cuatro voxeles.
    const world = new World(12345);
    const chunk = chunkWithRelief(world);
    expect(lidsOf(chunkMesh(world, chunk, flat))).toBe(CHUNK_COLUMNS * CHUNK_COLUMNS);
  });

  it('el terreno de la malla es el que dice el mundo', () => {
    // La malla pinta la tesela de cada terreno, asi que basta con que el terreno
    // que lee sea el efectivo del chunk y no el potencial del generador.
    const world = new World(999);
    const chunk = chunkWithRelief(world);
    const vistos = new Set<Terrain>();
    chunkMesh(world, chunk, (terrain, vx, vy) => {
      expect(world.terrainAt(Math.floor(vx / VOXELS_PER_TILE), Math.floor(vy / VOXELS_PER_TILE))).toBe(terrain);
      vistos.add(terrain);
      return TILE;
    });
    expect(vistos.size, 'un chunk de un solo terreno no prueba gran cosa').toBeGreaterThan(1);
  });

  it('dibujar la malla no altera las cuentas del mundo', () => {
    // Igual que el contorno de biomas: preguntar por los vecinos de fuera del
    // chunk no puede registrar chunks nuevos, o una vista movería la ecologia.
    const world = new World(7);
    const chunk = chunkWithRelief(world);
    const antes = world.trackedChunkCount;
    chunkMesh(world, chunk, flat);
    expect(world.trackedChunkCount).toBe(antes);
  });
});

/** Las tapas de una malla: los cuadrilateros con sus cuatro vertices a la misma altura y a plena luz. */
function lidsOf(mesh: ReturnType<typeof chunkMesh>): number {
  let lids = 0;
  for (let t = 0; t < mesh.indices.length; t += 6) {
    const ids = [0, 1, 2, 5].map((k) => mesh.indices[t + k]);
    const ys = ids.map((i) => mesh.positions[i * 3 + 1]);
    if (ys.every((y) => y === ys[0]) && mesh.colors[ids[0] * 3] === 1) lids++;
  }
  return lids;
}

/** Cuantos cuadrilateros llevan esa luz. */
function litBy(mesh: ReturnType<typeof chunkMesh>, light: readonly number[]): number {
  let n = 0;
  for (let t = 0; t < mesh.indices.length; t += 6) if (mesh.colors[mesh.indices[t] * 3] === Math.fround(light[0]!)) n++;
  return n;
}

/** Una columna de tierra en medio del chunk, con sus cuatro vecinas a su altura. */
function flatColumn(world: World, chunk: ReturnType<World['getChunk']>): { vx: number; vy: number; h: number } {
  for (let ly = 2; ly < CHUNK_COLUMNS - 2; ly++) {
    for (let lx = 2; lx < CHUNK_COLUMNS - 2; lx++) {
      const vx = chunk.cx * CHUNK_COLUMNS + lx;
      const vy = chunk.cy * CHUNK_COLUMNS + ly;
      const h = world.columnTop(vx, vy);
      if (h < 4 || world.terrainAt(Math.floor(vx / 2), Math.floor(vy / 2)) === Terrain.Water) continue;
      const around = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0]].every(([dx, dy]) => world.columnTop(vx + dx!, vy + dy!) === h);
      if (around) return { vx, vy, h };
    }
  }
  throw new Error('sin columna llana');
}

describe('Lo roto se ve (el autor, 2026-10-20)', () => {
  it('un hoyo: su tapa baja y sus cuatro vecinas le dan pared; la malla sigue diciendo lo del mundo', () => {
    const world = new World(12345);
    const chunk = chunkWithRelief(world);
    const { vx, vy, h } = flatColumn(world, chunk);
    const before = chunkMesh(world, chunk, flat);
    world.breakVoxel(vx, vy, h - 1);
    const after = chunkMesh(world, chunk, flat);
    expect(lidsOf(after)).toBe(lidsOf(before));
    expect(litBy(after, WALL_LIGHT) - litBy(before, WALL_LIGHT)).toBe(4);
    const x = (vx + 0.5) * VOXEL;
    const y = (vy + 0.5) * VOXEL;
    expect(meshHeightAt(after, x, y)).toBe(world.groundHeightAt(x, y));
    expect(world.groundHeightAt(x, y)).toBe((h - 1) * VOXEL);
  });

  it('lo que queda en el aire da su cara de abajo', () => {
    const world = new World(12345);
    const chunk = chunkWithRelief(world);
    const { vx, vy, h } = flatColumn(world, chunk);
    expect(litBy(chunkMesh(world, chunk, flat), UNDER_LIGHT)).toBe(0);
    // Un pozo de dos en la columna de al lado, y por el, el de debajo del
    // techo de esta: su voxel de arriba queda en el aire.
    world.breakVoxel(vx + 1, vy, h - 1);
    world.breakVoxel(vx + 1, vy, h - 2);
    world.breakVoxel(vx, vy, h - 2);
    const mesh = chunkMesh(world, chunk, flat);
    expect(world.isSolidVoxel(vx, vy, h - 1)).toBe(true);
    expect(litBy(mesh, UNDER_LIGHT)).toBe(1);
  });

  it('en el borde de un chunk, la vecina dibuja la pared del hoyo', () => {
    const world = new World(12345);
    const chunk = chunkWithRelief(world);
    const east = world.getChunk(chunk.cx + 1, chunk.cy);
    // La columna del borde este del chunk, y la de la vecina, a su altura.
    for (let ly = 0; ly < CHUNK_COLUMNS; ly++) {
      const vx = (chunk.cx + 1) * CHUNK_COLUMNS - 1;
      const vy = chunk.cy * CHUNK_COLUMNS + ly;
      const h = world.columnTop(vx, vy);
      if (h < 2 || world.columnTop(vx + 1, vy) !== h || world.terrainAt(Math.floor(vx / 2), Math.floor(vy / 2)) === Terrain.Water) continue;
      const before = litBy(chunkMesh(world, east, flat), WALL_LIGHT);
      world.breakVoxel(vx, vy, h - 1);
      expect(litBy(chunkMesh(world, east, flat), WALL_LIGHT)).toBe(before + 1);
      return;
    }
    throw new Error('sin borde a la misma altura');
  });
});

describe('La textura del suelo (pixelart, 24 pixeles por bloque)', () => {
  /** Cuanto abarca cada cuadrilatero en la tesela y en el mundo. */
  function quads(mesh: ReturnType<typeof chunkMesh>) {
    const out: { lid: boolean; du: number; dv: number; size: number; height: number; light: number[] }[] = [];
    for (let t = 0; t < mesh.indices.length; t += 6) {
      const ids = [0, 1, 2, 5].map((k) => mesh.indices[t + k]);
      const us = ids.map((i) => mesh.uvs[i * 2]);
      const vs = ids.map((i) => mesh.uvs[i * 2 + 1]);
      const xs = ids.map((i) => mesh.positions[i * 3]);
      const ys = ids.map((i) => mesh.positions[i * 3 + 1]);
      const zs = ids.map((i) => mesh.positions[i * 3 + 2]);
      const span = (a: number[]) => Math.max(...a) - Math.min(...a);
      out.push({
        lid: ys.every((y) => y === ys[0]),
        du: span(us),
        dv: span(vs),
        size: Math.max(span(xs), span(zs)),
        height: span(ys),
        light: [0, 1, 2].map((c) => mesh.colors[ids[0] * 3 + c]),
      });
    }
    return out;
  }

  it('cada cara es la de un voxel y lleva su tesela entera de 12 × 12 (el autor, 2026-10-20)', () => {
    const world = new World(12345);
    const mesh = chunkMesh(world, chunkWithRelief(world), flat);
    let walls = 0;
    for (const q of quads(mesh)) {
      expect(q.du).toBeCloseTo(1, 6);
      expect(q.dv).toBeCloseTo(1, 6);
      if (q.lid) {
        expect(q.size).toBeCloseTo(VOXEL, 6);
      } else {
        // Una pared, en caras de un voxel: nunca estirada por la altura.
        expect(q.height).toBeCloseTo(VOXEL, 6);
        expect(q.size).toBeCloseTo(VOXEL, 6);
        walls++;
      }
    }
    expect(walls, 'el chunk elegido no tiene paredes').toBeGreaterThan(0);
  });

  it('las paredes, del mismo material y mas oscuras (el autor): la tapa a plena luz, la pared a 0,72', () => {
    const world = new World(12345);
    const all = quads(chunkMesh(world, chunkWithRelief(world), flat));
    for (const q of all) expect(q.light).toEqual(q.lid ? [1, 1, 1] : [...WALL_LIGHT].map((v) => Math.fround(v)));
    expect(WALL_LIGHT[0]).toBe(0.72);
  });

  it('la variante de cada cara de voxel es fija, usa todas y no es la misma en todas partes', () => {
    const vistas = new Map<number, number>();
    let distintasDeSuVecina = 0;
    let distintasDeArriba = 0;
    let distintasDeLado = 0;
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        const v = terrainVariant(12345, x, y, 5, Face.Top, 4);
        expect(terrainVariant(12345, x, y, 5, Face.Top, 4)).toBe(v);
        vistas.set(v, (vistas.get(v) ?? 0) + 1);
        if (v !== terrainVariant(12345, x + 1, y, 5, Face.Top, 4)) distintasDeSuVecina++;
        if (v !== terrainVariant(12345, x, y, 6, Face.Top, 4)) distintasDeArriba++;
        if (v !== terrainVariant(12345, x, y, 5, Face.East, 4)) distintasDeLado++;
      }
    }
    expect([...vistas.keys()].sort()).toEqual([0, 1, 2, 3]);
    // Con cuatro al azar, tres de cada cuatro vecinas cambian: de al lado, de
    // encima y de otra cara del mismo voxel.
    expect(distintasDeSuVecina).toBeGreaterThan(1600 * 0.6);
    expect(distintasDeArriba).toBeGreaterThan(1600 * 0.6);
    expect(distintasDeLado).toBeGreaterThan(1600 * 0.6);
  });
});
