import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '@verdant/shared';
import { groundHeight, World } from '@verdant/sim';
import { collectFaces } from '../packages/client/src/relief-faces.js';

/**
 * Las caras verticales del relieve.
 *
 * Es geometria pura, asi que se comprueba en Node igual que el contorno de
 * biomas. Lo que se defiende aqui es que cada pared que se ve corresponde a un
 * desnivel real del mundo, y sobre todo lo contrario: que **donde hay un talud
 * no aparece una pared**, porque un talud que ademas dibujara su escalon seria
 * un paso que se ve cerrado y esta abierto.
 */

const SEEDS = [12345, 7, 999];

/** Un chunk cualquiera del mundo de prueba que tenga caras que dibujar. */
function chunkWithFaces(world: World): ReturnType<World['getChunk']> {
  for (let cy = -2; cy <= 2; cy++) {
    for (let cx = -2; cx <= 2; cx++) {
      const chunk = world.getChunk(cx, cy);
      if (collectFaces(world, chunk).length > 0) return chunk;
    }
  }
  throw new Error('no se encontro un chunk con relieve');
}

describe('Cada cara corresponde a un desnivel real', () => {
  for (const seed of SEEDS) {
    it(`semilla ${seed}: la cima esta por encima del vecino`, () => {
      const world = new World(seed);
      const chunk = chunkWithFaces(world);
      const faces = collectFaces(world, chunk);
      expect(faces.length).toBeGreaterThan(0);

      for (const face of faces) {
        // Alguno de los dos extremos tiene que sobresalir; si no, no hay pared.
        expect(
          face.top0 > face.bottom0 || face.top1 > face.bottom1,
          `cara plana en (${face.wx}, ${face.wy}) ${face.side}`,
        ).toBe(true);
        // Y en ninguno de los dos el suelo puede quedar por encima de la cima:
        // eso dibujaria un cuadrilatero cruzado sobre si mismo.
        expect(face.bottom0).toBeLessThanOrEqual(face.top0);
        expect(face.bottom1).toBeLessThanOrEqual(face.top1);
      }
    });
  }

  it('la cima de la cara es la altura real de esa esquina del tile', () => {
    const world = new World(12345);
    const chunk = chunkWithFaces(world);
    for (const face of collectFaces(world, chunk)) {
      const level = world.levelAt(face.wx, face.wy);
      const ramp = world.rampDirAt(face.wx, face.wy);
      // La cara este cuelga del borde E-S; la sur, del borde O-S.
      const [fx0, fy0] = face.side === 'east' ? [1, 0] : [0, 1];
      expect(face.top0).toBe(groundHeight(level, ramp, fx0, fy0));
      expect(face.top1).toBe(groundHeight(level, ramp, 1, 1));
    }
  });

  it('solo se dibujan las dos caras que se ven', () => {
    // En isometrica el propio tile tapa sus costados norte y oeste: dibujarlos
    // seria pagar el doble por pixeles que nadie ve.
    const world = new World(7);
    const chunk = chunkWithFaces(world);
    for (const face of collectFaces(world, chunk)) {
      expect(['east', 'south']).toContain(face.side);
    }
  });
});

describe('Un talud inclina tambien sus costados', () => {
  it('el costado de un talud sube con el, no de golpe', () => {
    // Es la razon de que las caras se calculen con las alturas de los DOS
    // extremos del borde y no con el nivel entero del tile. Un talud que sube
    // hacia el sur queda, en su lado este, al ras del vecino por un extremo y un
    // nivel por encima por el otro: comparando niveles enteros esa cuna no
    // existiria y el terreno tendria un agujero por donde se veria el fondo.
    const world = new World(12345);
    let wedges = 0;

    for (let cy = -2; cy <= 2; cy++) {
      for (let cx = -2; cx <= 2; cx++) {
        const chunk = world.getChunk(cx, cy);
        const faces = collectFaces(world, chunk);
        for (const face of faces) {
          if (face.top0 === face.top1) continue;
          // Solo un talud puede tener sus dos esquinas a distinta altura.
          expect(
            world.rampDirAt(face.wx, face.wy),
            `cara torcida sobre un tile plano en (${face.wx}, ${face.wy})`,
          ).toBeGreaterThanOrEqual(0);
          expect(Math.abs(face.top0 - face.top1)).toBe(1);
          wedges++;
        }
      }
    }
    expect(wedges, 'no se encontro ni un costado de talud').toBeGreaterThan(0);
  });

  it('por donde sube el talud no hay pared', () => {
    // Y al reves: hacia su vecino alto, el talud llega justo a su altura, asi
    // que ahi no hay nada que dibujar. Un talud con su escalon pintado seria un
    // paso que se ve cerrado y esta abierto.
    const world = new World(12345);
    let checked = 0;
    for (let cy = -2; cy <= 2; cy++) {
      for (let cx = -2; cx <= 2; cx++) {
        const chunk = world.getChunk(cx, cy);
        const drawn = new Set(collectFaces(world, chunk).map((f) => `${f.wx},${f.wy},${f.side}`));
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            const wx = cx * CHUNK_SIZE + lx;
            const wy = cy * CHUNK_SIZE + ly;
            const dir = world.rampDirAt(wx, wy);
            // Solo los dos lados que este modulo dibuja pueden comprobarse aqui.
            const side = dir === 1 ? 'east' : dir === 2 ? 'south' : null;
            if (!side) continue;
            expect(drawn.has(`${wx},${wy},${side}`), `talud tapiado en (${wx}, ${wy})`).toBe(false);
            checked++;
          }
        }
      }
    }
    expect(checked, 'no se encontro ni un talud hacia el este o el sur').toBeGreaterThan(0);
  });
});

describe('Mirar el relieve no altera el mundo', () => {
  it('recorrer las caras de un chunk no registra los vecinos', () => {
    // El mismo cuidado que ya tiene el contorno de biomas: `world.levelAt`
    // llamaria a `getChunk` y generaria y REGISTRARIA el chunk de al lado, con
    // lo que dibujar moveria las cuentas del bioma.
    const world = new World(31337);
    const chunk = chunkWithFaces(world);
    const tracked = world.trackedChunkCount;
    const loaded = world.loadedChunkCount;

    collectFaces(world, chunk);

    expect(world.trackedChunkCount).toBe(tracked);
    expect(world.loadedChunkCount).toBe(loaded);
  });

  it('las caras de la costura salen igual que las de dentro', () => {
    // El vecino de fuera se consulta al generador y el de dentro al chunk. Si
    // los dos caminos discreparan, el relieve tendria una grieta en cada borde
    // de chunk. Se compara la ultima columna con lo que dice el generador.
    const world = new World(999);
    // Se busca un chunk cuya ULTIMA columna tenga caras: no todos los bordes de
    // chunk caen sobre un desnivel, y fijar uno a mano seria atarse a la
    // semilla.
    let seam: ReturnType<typeof collectFaces> = [];
    for (let cy = -2; cy <= 2 && seam.length === 0; cy++) {
      for (let cx = -2; cx <= 2 && seam.length === 0; cx++) {
        const chunk = world.getChunk(cx, cy);
        const edge = (cx + 1) * CHUNK_SIZE - 1;
        seam = collectFaces(world, chunk).filter((f) => f.wx === edge && f.side === 'east');
      }
    }
    for (const face of seam) {
      const neighbour = world.gen.levelAt(face.wx + 1, face.wy);
      const ramp = world.gen.rampDirAt(face.wx + 1, face.wy);
      expect(face.bottom0).toBe(
        Math.min(groundHeight(neighbour, ramp, 0, 0), face.top0),
      );
      expect(face.bottom1).toBe(
        Math.min(groundHeight(neighbour, ramp, 0, 1), face.top1),
      );
    }
    expect(seam.length, 'la costura no tenia ninguna cara').toBeGreaterThan(0);
  });
});
