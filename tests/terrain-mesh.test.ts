import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { groundHeight, World } from '@verdant/sim';
import { chunkMesh, meshHeightAt } from '../packages/client/src/spike3d/terrain-mesh.js';

/**
 * La malla del spike de 3D.
 *
 * Es lo unico del spike que merece un test, y no es por rigor: el spike existe
 * para que el autor compare la vista nueva con la de hoy en su telefono, y esa
 * comparacion **no vale nada si la geometria no es el mismo mundo**. Aqui se
 * afirma que lo es.
 *
 * Lo demas del spike —camara, billboards, controles— se juzga mirando, que es
 * justo para lo que se construye.
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
      for (const level of chunk.level) {
        if (level < lo) lo = level;
        if (level > hi) hi = level;
      }
      if (hi - lo > bestRange) {
        bestRange = hi - lo;
        best = chunk;
      }
    }
  }
  if (!best || bestRange < 2) throw new Error('no se encontro un chunk con relieve');
  return best;
}

describe('La malla dice lo mismo que el mundo', () => {
  for (const seed of SEEDS) {
    it(`semilla ${seed}: la altura de cada esquina es la del mundo`, () => {
      const world = new World(seed);
      const chunk = chunkWithRelief(world);
      const mesh = chunkMesh(world, chunk, flat);
      const baseX = chunk.cx * CHUNK_SIZE;
      const baseY = chunk.cy * CHUNK_SIZE;

      // La esquina noroeste de cada casilla, que es un punto del mundo con una
      // altura conocida. Se pregunta a la GEOMETRIA, no al codigo que la genero.
      let checked = 0;
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const idx = ly * CHUNK_SIZE + lx;
          const wx = baseX + lx;
          const wy = baseY + ly;
          const esperada = groundHeight(chunk.level[idx], chunk.rampDir[idx], 0, 0);
          const dibujada = meshHeightAt(mesh, wx, wy);
          expect(dibujada, `sin vertice en (${wx}, ${wy})`).not.toBeNull();
          // La malla puede llegar mas ALTO en esa esquina porque ahi tambien
          // acaban las casillas vecinas; lo que no puede es quedarse corta.
          expect(dibujada!, `(${wx}, ${wy}) por debajo del mundo`).toBeGreaterThanOrEqual(
            esperada - 1e-6,
          );
          checked++;
        }
      }
      expect(checked).toBe(CHUNK_SIZE * CHUNK_SIZE);
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

  it('un talud sube de verdad: sus cuatro esquinas no estan a la misma altura', () => {
    const world = new World(12345);
    const chunk = chunkWithRelief(world);
    let taludes = 0;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const idx = ly * CHUNK_SIZE + lx;
        if (chunk.rampDir[idx] < 0) continue;
        const alturas = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([fx, fy]) =>
          groundHeight(chunk.level[idx], chunk.rampDir[idx], fx, fy),
        );
        expect(Math.max(...alturas) - Math.min(...alturas)).toBeCloseTo(1, 9);
        taludes++;
      }
    }
    expect(taludes, 'el chunk elegido no tiene ni un talud').toBeGreaterThan(0);
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
