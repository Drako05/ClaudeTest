import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { CHUNK_COLUMNS, topOf, VOXEL, VOXELS_PER_TILE, World } from '@verdant/sim';
import { chunkMesh, meshHeightAt } from '../packages/client/src/terrain-mesh.js';

/**
 * La malla del terreno.
 *
 * El mundo que se ve **tiene que ser el mismo** que simula el nucleo: si la
 * malla se separara de `groundHeightAt`, el personaje andaria por encima o por
 * debajo de lo que pisa. Aqui se afirma que la geometria es la del mundo,
 * columna de 0,5 a columna.
 */

const SEEDS = [12345, 7, 999];

/** Color de mentira: al test le da igual, lo que mide es la geometria. */
const flat = (): readonly [number, number, number] => [1, 1, 1];

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

  it('cada casilla aporta su tapa, tambien las de agua', () => {
    const world = new World(12345);
    const chunk = chunkWithRelief(world);
    const mesh = chunkMesh(world, chunk, flat);
    // Una tapa son dos triangulos; las paredes suman por encima, nunca por
    // debajo. Si faltaran tapas, el mundo tendria agujeros por los que se veria
    // el vacio, que es exactamente lo que el isometrico no podia permitirse.
    expect(mesh.triangles).toBeGreaterThanOrEqual(CHUNK_SIZE * CHUNK_SIZE * 2);
  });

  it('una casilla llana sale con una tapa; una con escalon dentro, con una por columna', () => {
    // Es lo que mantiene el terreno llano, que es casi todo, al coste de antes.
    const world = new World(12345);
    const chunk = chunkWithRelief(world);
    const mesh = chunkMesh(world, chunk, flat);
    let expected = 0;
    let stepped = 0;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const tops = [0, 1, 2, 3].map((s) =>
          topOf(chunk.height[(ly * VOXELS_PER_TILE + Math.floor(s / 2)) * CHUNK_COLUMNS + lx * VOXELS_PER_TILE + (s % 2)]),
        );
        const llana = tops.every((t) => t === tops[0]);
        expected += llana ? 1 : VOXELS_PER_TILE * VOXELS_PER_TILE;
        if (!llana) stepped++;
      }
    }
    // Una tapa es un cuadrilatero con sus cuatro vertices a la misma altura.
    let lids = 0;
    for (let t = 0; t < mesh.indices.length; t += 6) {
      const ys = [0, 1, 2, 5].map((k) => mesh.positions[mesh.indices[t + k] * 3 + 1]);
      if (ys.every((y) => y === ys[0])) lids++;
    }
    expect(stepped, 'el chunk elegido no tiene ni un escalon dentro de una casilla').toBeGreaterThan(0);
    expect(lids).toBe(expected);
  });

  it('el terreno de la malla es el que dice el mundo', () => {
    // La malla colorea por terreno, asi que basta con que el terreno que lee sea
    // el efectivo del chunk y no el potencial del generador.
    const world = new World(999);
    const chunk = chunkWithRelief(world);
    const vistos = new Set<Terrain>();
    chunkMesh(world, chunk, (terrain, wx, wy) => {
      expect(world.terrainAt(wx, wy)).toBe(terrain);
      vistos.add(terrain);
      return [1, 1, 1];
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
