import { afterEach, describe, expect, it } from 'vitest';
import { groundHeight, World } from '@verdant/sim';
import { biomeOfTerrain, CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { collectBiomeEdges } from '../packages/client/src/biome-edges.js';
import {
  heightOffset,
  setView,
  TILE_DIAMOND,
  VIEW_COUNT,
  worldToScreen,
} from '../packages/client/src/projection.js';

/**
 * El contorno de biomas de las herramientas de desarrollo.
 *
 * Nace de un fallo que reporto el autor: el contorno se posicionaba mal y
 * aparecia o desaparecia al cambiar de chunk o al hacer zoom. Eran dos causas —
 * el origen del chunk sumado dos veces, y las costuras entre chunks sin dibujar—
 * y las dos se ven aqui, sin navegador, porque la geometria es matematica pura.
 */

const [, EAST, SOUTH, WEST] = TILE_DIAMOND;

afterEach(() => setView(0));

/** Los segmentos como cuartetos, para poder buscarlos. */
function quads(segments: number[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < segments.length; i += 4) {
    out.push(segments.slice(i, i + 4).join(','));
  }
  return out;
}

/**
 * Cuanto sube en pantalla una esquina de un tile por su relieve.
 *
 * El contorno se pega a la cima, asi que las coordenadas esperadas tienen que
 * llevar la altura: con el mundo plano esto valia siempre cero y por eso no
 * hacia falta.
 */
function lift(world: World, wx: number, wy: number, fx: number, fy: number): number {
  return heightOffset(groundHeight(world.levelAt(wx, wy), world.rampDirAt(wx, wy), fx, fy));
}

/** Bioma de un tile del mundo, sin pasar por los chunks registrados. */
function biomeOf(world: World, wx: number, wy: number): number {
  return biomeOfTerrain(world.gen.terrainAt(wx, wy) as Terrain);
}

/** Primer chunk del mundo de prueba que tenga contorno que dibujar. */
function chunkWithEdges(world: World): { cx: number; cy: number } {
  for (let cy = -3; cy <= 3; cy++) {
    for (let cx = -3; cx <= 3; cx++) {
      if (collectBiomeEdges(world, world.getChunk(cx, cy)).length > 0) return { cx, cy };
    }
  }
  throw new Error('no se encontro un chunk con frontera de biomas');
}

describe('Contorno de biomas', () => {
  it('los segmentos van en coordenadas absolutas, sin desplazar', () => {
    // Es el fallo del desplazamiento convertido en regresion: el trazo se hacia
    // en absolutas y ademas se le asignaba la posicion del chunk, asi que todo
    // salia corrido un chunk en diagonal. Se comprueba lejos del origen, que es
    // donde aquello se notaba: en el chunk (0,0) el error valia cero.
    const world = new World(31337);
    const { cx, cy } = chunkWithEdges(world);
    expect(cx !== 0 || cy !== 0).toBe(true);

    const chunk = world.getChunk(cx, cy);
    const found = new Set(quads(collectBiomeEdges(world, chunk)));

    // Se busca a mano el primer par este que difiera y se exige su arista, con
    // las coordenadas que da `worldToScreen` del tile en el MUNDO.
    let checked = 0;
    for (let ly = 0; ly < CHUNK_SIZE && checked < 8; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE && checked < 8; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wy = cy * CHUNK_SIZE + ly;
        if (biomeOf(world, wx + 1, wy) === biomeOf(world, wx, wy)) continue;
        const p = worldToScreen(wx, wy);
        const quad = [
          p.x + EAST.x,
          p.y + EAST.y + lift(world, wx, wy, 1, 0),
          p.x + SOUTH.x,
          p.y + SOUTH.y + lift(world, wx, wy, 1, 1),
        ].join(',');
        expect(found, `falta la arista este de (${wx}, ${wy})`).toContain(quad);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('una arista por cada par vecino distinto, ni una mas', () => {
    const world = new World(31337);
    const { cx, cy } = chunkWithEdges(world);
    const chunk = world.getChunk(cx, cy);

    // El recuento esperado se cuenta aparte, sobre el mundo y no sobre el chunk.
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

    const segments = collectBiomeEdges(world, chunk);
    expect(segments.length % 4).toBe(0);
    expect(segments.length / 4).toBe(expected);
  });

  it('las costuras entre chunks tambien se dibujan', () => {
    // El segundo fallo: el bucle fingia que el vecino de fuera del chunk era
    // igual, asi que el contorno quedaba cortado en cada borde de chunk.
    const world = new World(31337);

    let seams = 0;
    for (let cy = -3; cy <= 3 && seams === 0; cy++) {
      for (let cx = -3; cx <= 3 && seams === 0; cx++) {
        const chunk = world.getChunk(cx, cy);
        const found = new Set(quads(collectBiomeEdges(world, chunk)));

        // Ultima columna del chunk: su vecino este ya pertenece al de al lado.
        const lx = CHUNK_SIZE - 1;
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          const wx = cx * CHUNK_SIZE + lx;
          const wy = cy * CHUNK_SIZE + ly;
          if (biomeOf(world, wx + 1, wy) === biomeOf(world, wx, wy)) continue;
          const p = worldToScreen(wx, wy);
          const quad = [
            p.x + EAST.x,
            p.y + EAST.y + lift(world, wx, wy, 1, 0),
            p.x + SOUTH.x,
            p.y + SOUTH.y + lift(world, wx, wy, 1, 1),
          ].join(',');
          expect(found, `costura sin dibujar en (${wx}, ${wy})`).toContain(quad);
          seams++;
        }
      }
    }
    expect(seams, 'no se encontro ninguna costura con cambio de bioma').toBeGreaterThan(0);
  });

  it('la arista sur va de la esquina sur a la oeste', () => {
    const world = new World(4242);
    const { cx, cy } = chunkWithEdges(world);
    const chunk = world.getChunk(cx, cy);
    const found = new Set(quads(collectBiomeEdges(world, chunk)));

    let checked = 0;
    for (let ly = 0; ly < CHUNK_SIZE && checked < 4; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE && checked < 4; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wy = cy * CHUNK_SIZE + ly;
        if (biomeOf(world, wx, wy + 1) === biomeOf(world, wx, wy)) continue;
        const p = worldToScreen(wx, wy);
        const quad = [
          p.x + SOUTH.x,
          p.y + SOUTH.y + lift(world, wx, wy, 1, 1),
          p.x + WEST.x,
          p.y + WEST.y + lift(world, wx, wy, 0, 1),
        ].join(',');
        expect(found, `falta la arista sur de (${wx}, ${wy})`).toContain(quad);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('dibujar el contorno no altera el mundo', () => {
    // Mirar el vecino de la costura con `world.biomeAt` habria generado y
    // REGISTRADO el chunk de al lado, con lo que una vista de depuracion movia
    // las cuentas del bioma. Por eso se usa `world.gen.terrainAt`, que es puro.
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
    // Todo el chunk del mismo terreno; sus vecinos siguen siendo los reales.
    const uniform = { ...chunk, terrain: new Uint8Array(chunk.terrain.length) };
    const flat = biomeOfTerrain(0 as Terrain);

    // Lo unico que puede quedar son las dos costuras, y solo donde el vecino
    // real difiera de ese terreno plano. Se cuenta aparte.
    let expected = 0;
    for (let i = 0; i < CHUNK_SIZE; i++) {
      if (biomeOf(world, CHUNK_SIZE, i) !== flat) expected++;
      if (biomeOf(world, i, CHUNK_SIZE) !== flat) expected++;
    }

    expect(collectBiomeEdges(world, uniform).length / 4).toBe(expected);
  });
});

/**
 * El contorno con la camara girada.
 *
 * El resto del fichero mide en la vista 0, y ahi el fallo era invisible: el
 * contorno se trazaba por las esquinas de PANTALLA —este, sur, oeste— desde
 * `worldToScreen(wx, wy)`, y ese punto solo es la esquina norte sin girar. Al
 * girar pasa a ser otra esquina, y ademas la altura que le tocaba a cada una
 * cambiaba con ella: dos errores en el mismo trazo.
 *
 * Ahora la arista se define por sus dos esquinas del MUNDO y se proyecta el
 * punto, que es exacto en las cuatro vistas.
 */
describe('El contorno de biomas gira con la camara', () => {
  it('cada arista une las dos esquinas del mundo que comparten los vecinos', () => {
    for (let v = 0; v < VIEW_COUNT; v++) {
      setView(v);
      const world = new World(31337);
      const { cx, cy } = chunkWithEdges(world);
      const chunk = world.getChunk(cx, cy);
      const found = new Set(quads(collectBiomeEdges(world, chunk)));

      /** Esquina `(dx, dy)` del tile, proyectada desde el mundo y a su altura. */
      const corner = (wx: number, wy: number, dx: number, dy: number): [number, number] => {
        const s = worldToScreen(wx + dx, wy + dy);
        return [s.x, s.y + lift(world, wx, wy, dx, dy)];
      };

      let checked = 0;
      for (let ly = 0; ly < CHUNK_SIZE && checked < 12; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE && checked < 12; lx++) {
          const wx = cx * CHUNK_SIZE + lx;
          const wy = cy * CHUNK_SIZE + ly;
          const mine = biomeOf(world, wx, wy);

          if (biomeOf(world, wx + 1, wy) !== mine) {
            const quad = [...corner(wx, wy, 1, 0), ...corner(wx, wy, 1, 1)].join(',');
            expect(found, `vista ${v}: falta la arista este de (${wx}, ${wy})`).toContain(quad);
            checked++;
          }
          if (biomeOf(world, wx, wy + 1) !== mine) {
            const quad = [...corner(wx, wy, 1, 1), ...corner(wx, wy, 0, 1)].join(',');
            expect(found, `vista ${v}: falta la arista sur de (${wx}, ${wy})`).toContain(quad);
            checked++;
          }
        }
      }
      expect(checked, `vista ${v}: ni una arista comprobada`).toBeGreaterThan(0);
    }
  });
});
