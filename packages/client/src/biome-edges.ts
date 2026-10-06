/**
 * Aristas entre biomas distintos, en coordenadas del MUNDO.
 *
 * Es la vista «bordes de bioma» del panel de desarrollo: la comprobacion visual
 * de que el bioma que anuncia el panel es el del suelo que se pisa. Si el
 * contorno no coincide con lo que se ve, algo falla.
 *
 * Vive aparte y sin three.js a proposito, para verificar la geometria en Node.
 * El dibujo solo la traza.
 *
 * Se heredo del isometrico, donde calculaba coordenadas de PANTALLA y ahi
 * tuvo sus dos fallos: el origen del chunk sumado dos veces —todo el contorno un
 * chunk en diagonal— y las esquinas pedidas por su sitio en pantalla, que al
 * girar la camara dejaban de ser las del mundo. En 3D las dos cosas desaparecen
 * por construccion: las coordenadas son las del mundo y la camara se las
 * aplica la GPU. Lo que se conserva son las dos reglas que siguen valiendo:
 * cubrir las costuras entre chunks y no registrar chunks por mirar.
 */

import { biomeOfTerrain, CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { CHUNK_COLUMNS, topOf, VOXEL, VOXELS_PER_TILE, type Chunk, type World } from '@verdant/sim';

/**
 * Segmentos `[x0, h0, z0, x1, h1, z1, ...]` del contorno de biomas de un chunk.
 *
 * `x`/`z` son las coordenadas del mundo (`wx`/`wy`) y `h` la altura del suelo en
 * esa esquina, en el mismo orden que usa la escena: el contorno se pega a la
 * cima y no al plano cero, porque sobre relieve quedaria enterrado.
 *
 * Se traza la arista compartida entre dos tiles vecinos de biomas distintos, y
 * solo esa: el contorno sigue la forma real del terreno y no la rejilla.
 *
 * Cada chunk dibuja sus aristas este y sur, incluidas las de sus dos costuras.
 * Como la arista este de un chunk es la oeste del siguiente, cubrir solo dos
 * direcciones basta para que ningun borde quede sin dibujar ni se dibuje dos
 * veces.
 *
 * El vecino de la costura se mira con `world.gen.terrainAt`, que es puro y por
 * tile. `world.biomeAt` no vale aqui: llama a `getChunk` y generaria y
 * registraria el chunk de al lado, con lo que una vista de depuracion acabaria
 * moviendo las cuentas del bioma.
 */
export function collectBiomeEdges(world: World, chunk: Chunk): number[] {
  const segments: number[] = [];
  const baseX = chunk.cx * CHUNK_SIZE;
  const baseY = chunk.cy * CHUNK_SIZE;

  const biomeAt = (lx: number, ly: number): number => {
    if (lx < CHUNK_SIZE && ly < CHUNK_SIZE) {
      return biomeOfTerrain(chunk.terrain[ly * CHUNK_SIZE + lx] as Terrain);
    }
    return biomeOfTerrain(world.gen.terrainAt(baseX + lx, baseY + ly));
  };

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const idx = ly * CHUNK_SIZE + lx;
      const mine = biomeAt(lx, ly);
      const wx = baseX + lx;
      const wy = baseY + ly;
      /** El techo de la columna (`sx`, `sy`) ∈ {0, 1}² de esta casilla. */
      const top = (sx: number, sy: number): number =>
        topOf(chunk.height[(ly * VOXELS_PER_TILE + sy) * CHUNK_COLUMNS + lx * VOXELS_PER_TILE + sx]);

      // La arista que se comparte con el vecino del este va de la esquina (1,0)
      // a la (1,1); la del sur, de la (1,1) a la (0,1). Cada una, en dos tramos
      // de medio bloque, cada tramo a la altura de su columna.
      if (biomeAt(lx + 1, ly) !== mine) {
        for (let s = 0; s < VOXELS_PER_TILE; s++) {
          const h = top(VOXELS_PER_TILE - 1, s);
          segments.push(wx + 1, h, wy + s * VOXEL, wx + 1, h, wy + (s + 1) * VOXEL);
        }
      }
      if (biomeAt(lx, ly + 1) !== mine) {
        for (let s = 0; s < VOXELS_PER_TILE; s++) {
          const h = top(s, VOXELS_PER_TILE - 1);
          segments.push(wx + (s + 1) * VOXEL, h, wy + 1, wx + s * VOXEL, h, wy + 1);
        }
      }
    }
  }

  return segments;
}
