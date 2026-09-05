/**
 * Aristas entre biomas distintos, en coordenadas de pantalla.
 *
 * Vive aparte del renderizador y sin DOM ni PixiJS a proposito: asi la geometria
 * del contorno se puede verificar en Node, igual que `projection.ts`. El
 * renderizador solo la traza.
 *
 * Las coordenadas que devuelve son ABSOLUTAS, del mismo espacio que
 * `worldToScreen`. Ese detalle es el fallo que arreglo este modulo: antes el
 * trazo se hacia en absolutas y ademas se le asignaba la posicion del chunk, asi
 * que todo salia corrido exactamente un chunk en diagonal.
 */

import { biomeOfTerrain, CHUNK_SIZE, type Terrain } from '@verdant/shared';
import { groundHeight, type Chunk, type World } from '@verdant/sim';
import { heightOffset, worldToScreen } from './projection.js';

/**
 * Segmentos `[x0, y0, x1, y1, ...]` del contorno de biomas de un chunk.
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
 * moviendo las cuentas del bioma. `generateChunk` es un mapeo tile a tile de
 * `gen.terrainAt`, asi que los dos caminos dan lo mismo.
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
      const level = chunk.level[idx];
      const ramp = chunk.rampDir[idx];

      // Una esquina del tile, por sus coordenadas del MUNDO. Proyectar el punto
      // del mundo es exacto en las cuatro vistas; ir por la esquina de PANTALLA
      // no lo es, porque al girar cada esquina cambia de sitio y la altura que le
      // toca cambia con ella. El contorno se pega a la cima y no al plano cero:
      // sobre relieve, a ras de suelo quedaria flotando bajo los acantilados.
      const corner = (dx: number, dy: number): { x: number; y: number } => {
        const s = worldToScreen(wx + dx, wy + dy);
        return { x: s.x, y: s.y + heightOffset(groundHeight(level, ramp, dx, dy)) };
      };

      // La arista que se comparte con el vecino del este va de la esquina (1,0)
      // a la (1,1); la del sur, de la (1,1) a la (0,1).
      if (biomeAt(lx + 1, ly) !== mine) {
        const a = corner(1, 0);
        const b = corner(1, 1);
        segments.push(a.x, a.y, b.x, b.y);
      }
      if (biomeAt(lx, ly + 1) !== mine) {
        const a = corner(1, 1);
        const b = corner(0, 1);
        segments.push(a.x, a.y, b.x, b.y);
      }
    }
  }

  return segments;
}
