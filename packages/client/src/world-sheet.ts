/**
 * La hoja del pixelart del mundo, para que el autor lo revise (`?mundo=1`,
 * 2026-10-19), como la de los iconos (`icon-sheet.ts`). Tapa el juego y pone
 * cada dibujo ampliado por un entero, sin suavizar: el suelo con sus variantes
 * y su pared, y mezclado con un escalon; el agua sobre su fondo; los arboles
 * con su tronco medio; matas, brotes, rocas, guijarros, el jugador y las
 * estaciones; y una escena de prueba. Las cajas (rocas y estaciones), en
 * perspectiva con la luz de cada cara. No toca el mundo: es solo dibujo.
 */

import { Feature, Terrain, TERRAIN_NAMES } from '@verdant/shared';
import { TREE_TRUNKS } from '@verdant/sim';
import {
  BUSHES,
  CROWNS,
  PEBBLES,
  PLAYER,
  ROCK_SHAPE,
  SAPLINGS,
  STATION_ART,
  STONES,
  TERRAIN_TILES,
  WATER_ART,
  WORLD_PX,
  type WorldArt,
} from './world-art.js';
import { oreModel } from './ore-mesh.js';
import { VOXEL_PX, VOXEL_TILES } from './voxel-art.js';
import { artCanvas, treeArt } from './world-sprites.js';

/** Lo oscuras que se ven las paredes del suelo frente a su tapa (el factor de hoy, `terrain-mesh.ts`, `WALL_LIGHT`). */
const WALL = 0.72;
/** La luz de cada cara de un bloque, como las estaciones (`stations-view.ts`). */
const FACE = { top: 1, lit: 0.95, shade: 0.74 };
/** Lo que deja ver el agua de su fondo (su opacidad en el juego). */
const WATER_OPACITY = 0.72;

/** Un lienzo ampliado `k` veces sin suavizar: cada pixel de arte, un cuadrado. */
function zoom(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = src.width * k;
  canvas.height = src.height * k;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Elige variante por casilla, como el juego (aqui, con un hash fijo). */
const pick = (x: number, y: number, n: number) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % n;

/**
 * Un poco de suelo: `cols × rows` teselas de `px` con las variantes mezcladas,
 * y un escalon de medio bloque abajo (`px` 12, el voxel: una fila de paredes
 * enteras; 24, el bloque: media tesela de pared).
 */
function ground(variants: readonly WorldArt[], cols: number, rows: number, px = WORLD_PX): HTMLCanvasElement {
  const tops = variants.map((v) => artCanvas(v));
  const walls = variants.map((v) => artCanvas(v, WALL));
  const half = WORLD_PX / 2;
  const canvas = document.createElement('canvas');
  canvas.width = cols * px;
  canvas.height = rows * px + half;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) ctx.drawImage(tops[pick(x, y, tops.length)]!, x * px, y * px);
  // La pared del escalon: la misma tesela, mas oscura, alineada con el mundo.
  for (let x = 0; x < cols; x++) {
    ctx.drawImage(walls[pick(x, 99, walls.length)]!, 0, 0, px, half, x * px, rows * px, px, half);
  }
  return canvas;
}

/** El agua: su fondo, y encima la superficie con la opacidad del juego. */
function water(cols: number, rows: number): HTMLCanvasElement {
  const canvas = ground(TERRAIN_TILES[Terrain.Water], cols, rows);
  const ctx = canvas.getContext('2d')!;
  ctx.globalAlpha = WATER_OPACITY;
  const surface = artCanvas(WATER_ART);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) ctx.drawImage(surface, x * WORLD_PX, y * WORLD_PX);
  return canvas;
}

/** Un arbol entero, con el tronco desnudo medio de su especie. */
function tree(feature: Feature): HTMLCanvasElement | null {
  const law = TREE_TRUNKS[feature];
  const art = law && treeArt(feature, law.bareMean, law.trunkW);
  return art ? artCanvas(art) : null;
}

/**
 * Una caja de voxeles de 0,5 en perspectiva, vista desde el suroeste: arriba,
 * la cara oeste (con luz, el sol viene del noroeste) y la sur (en sombra).
 * Cada cara toma su trozo de la textura, alineado con el mundo como el suelo.
 * `voxels` son [este, sur, arriba] en medios bloques; `faces`, la textura de
 * arriba, la del oeste y la del sur.
 */
function voxelBox(voxels: readonly (readonly [number, number, number])[], faces: { top: WorldArt; west: WorldArt; south: WorldArt }, k: number): HTMLCanvasElement {
  const tex = { top: artCanvas(faces.top), west: artCanvas(faces.west), south: artCanvas(faces.south) };
  const half = WORLD_PX / 2;
  const A = WORLD_PX * k;
  const east = [A, -A / 2];
  const south = [A, A / 2];
  const up = [0, -A];
  const down = [0, A];
  const zMax = Math.max(...voxels.map((v) => v[2])) + 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(A * 2.2);
  canvas.height = Math.ceil(A * (1.2 + zMax * 0.5));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const ox = A * 0.1;
  const oy = A * (0.6 + zMax * 0.5);
  const at = (x: number, y: number, z: number) => [ox + x * east[0]! + y * south[0]!, oy + x * east[1]! + y * south[1]! + z * up[1]!];
  const has = (x: number, y: number, z: number) => voxels.some(([a, b, c]) => a === x && b === y && c === z);
  const face = (img: HTMLCanvasElement, origin: number[], u: number[], v: number[], sx: number, sy: number, light: number) => {
    ctx.setTransform(u[0]! / WORLD_PX, u[1]! / WORLD_PX, v[0]! / WORLD_PX, v[1]! / WORLD_PX, origin[0]!, origin[1]!);
    ctx.drawImage(img, sx, sy, half, half, 0, 0, half, half);
    ctx.fillStyle = `rgba(0,0,0,${1 - light})`;
    ctx.fillRect(0, 0, half, half);
  };
  // De lejos (noreste) a cerca (suroeste), y de abajo arriba.
  const order = [...voxels].sort((p, q) => p[1] - p[0] - (q[1] - q[0]) || p[2] - q[2]);
  for (const [x, y, z] of order) {
    const X = x * 0.5;
    const Y = y * 0.5;
    const top = z * 0.5 + 0.5;
    const tall = tex.west.height / half;
    // El trozo de la textura de este voxel, alineado con el mundo.
    const su = (x % 2) * half;
    const sv = (y % 2) * half;
    const vz = (tall - 1 - z) * half;
    if (!has(x, y, z + 1)) face(tex.top, at(X, Y, top), east, south, su, sv, FACE.top);
    if (!has(x - 1, y, z)) face(tex.west, at(X, Y, top), south, down, sv, vz, FACE.lit);
    if (!has(x, y + 1, z)) face(tex.south, at(X, Y + 0.5, top), east, down, su, vz, FACE.shade);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

/**
 * Una estacion en perspectiva: una caja de 1 × 1 × su alto, vista como las
 * rocas, con sus tres caras enteras (arriba, el costado al oeste y el frente
 * al sur).
 */
function stationBox(art: { top: WorldArt; side: WorldArt; front: WorldArt }, k: number): HTMLCanvasElement {
  const top = artCanvas(art.top);
  const side = artCanvas(art.side);
  const front = artCanvas(art.front);
  const tall = side.height / WORLD_PX;
  const A = WORLD_PX * k;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(A * 2.2);
  canvas.height = Math.ceil(A * (1.2 + tall));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const ox = A * 0.1;
  const oy = A * (0.6 + tall);
  const face = (img: HTMLCanvasElement, x: number, y: number, u: number[], v: number[], light: number) => {
    ctx.setTransform(u[0]! / img.width, u[1]! / img.width, v[0]! / img.height, v[1]! / img.height, x, y);
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${1 - light})`;
    ctx.fillRect(0, 0, img.width, img.height);
  };
  const h = A * tall;
  face(top, ox, oy - h, [A, -A / 2], [A, A / 2], FACE.top);
  face(side, ox, oy - h, [A, A / 2], [0, h], FACE.lit);
  face(front, ox + A, oy - h + A / 2, [A, -A / 2], [0, h], FACE.shade);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

/** La escena de prueba: suelo de hierba con el roble, matas, una roca y el jugador, de pie y a su escala. */
function scene(): HTMLCanvasElement {
  const base = ground(TERRAIN_TILES[Terrain.Grass], 10, 8);
  const ctx = base.getContext('2d')!;
  const put = (img: HTMLCanvasElement | null, x: number, footY: number) => img && ctx.drawImage(img, Math.round(x - img.width / 2), footY - img.height);
  put(tree(Feature.MeadowTree), 60, base.height - WORLD_PX * 2);
  put(artCanvas(BUSHES[Feature.MeadowPlant]!), 150, base.height - WORLD_PX * 3);
  put(artCanvas(BUSHES[Feature.MeadowPlant]!), 175, base.height - WORLD_PX * 1.5);
  put(artCanvas(PLAYER), 120, base.height - WORLD_PX * 1.2);
  put(artCanvas(SAPLINGS[Feature.MeadowTreeSapling]!), 205, base.height - WORLD_PX * 2.5);
  return base;
}

function figure(caption: string, ...canvases: (HTMLCanvasElement | null)[]): HTMLElement {
  const cell = document.createElement('figure');
  const row = document.createElement('div');
  for (const c of canvases) {
    if (!c) continue;
    c.className = 'worldArt';
    // A su tamano exacto: la hoja no estira ni encoge un pixel de arte.
    c.style.width = `${c.width}px`;
    c.style.height = `${c.height}px`;
    row.appendChild(c);
  }
  const label = document.createElement('figcaption');
  label.textContent = caption;
  cell.append(row, label);
  return cell;
}

function group(sheet: HTMLElement, title: string, cells: HTMLElement[]): number {
  const h = document.createElement('h2');
  h.textContent = title;
  const grid = document.createElement('div');
  grid.className = 'worldGrid';
  grid.append(...cells);
  sheet.append(h, grid);
  return cells.length;
}

const NAMES: Partial<Record<Feature, string>> = {
  [Feature.MeadowTree]: 'Roble',
  [Feature.MeadowTreeRare]: 'Cerezo',
  [Feature.ForestTree]: 'Picea comun',
  [Feature.ForestTreeRare]: 'Alerce',
  [Feature.TundraTree]: 'Picea negra',
  [Feature.TundraTreeRare]: 'Picea azul',
  [Feature.MeadowPlant]: 'Mata de la pradera',
  [Feature.MeadowPlantRare]: 'Mata de la pradera, rara',
  [Feature.ForestPlant]: 'Mata del bosque',
  [Feature.ForestPlantRare]: 'Mata del bosque, rara',
  [Feature.TundraPlant]: 'Mata de la tundra',
  [Feature.TundraPlantRare]: 'Mata de la tundra, rara',
  [Feature.MeadowTreeSapling]: 'Brote de roble',
  [Feature.ForestTreeSapling]: 'Brote de picea',
  [Feature.TundraTreeSapling]: 'Brote de picea negra',
  [Feature.MeadowPlantSapling]: 'Brote de mata (pradera)',
  [Feature.ForestPlantSapling]: 'Brote de mata (bosque)',
  [Feature.TundraPlantSapling]: 'Brote de mata (tundra)',
  [Feature.RockNode]: 'Roca',
  [Feature.CoalNode]: 'Carbon',
  [Feature.IronNode]: 'Hierro',
  [Feature.CopperNode]: 'Cobre',
  [Feature.Workbench]: 'Mesa de trabajo',
  [Feature.Furnace]: 'Horno',
};

/** Pone la hoja encima de todo. Devuelve cuantos dibujos ensena. */
export function showWorldSheet(): number {
  const sheet = document.createElement('div');
  sheet.id = 'worldSheet';
  let count = 0;
  const terrains = (Object.keys(TERRAIN_TILES).map(Number) as Terrain[]).filter((t) => t !== Terrain.Water && t !== Terrain.DeepWater);
  // Lo que pinta el juego desde el 2026-10-20: una tesela de 12 × 12 por cara
  // de voxel. Las de 24 siguen debajo, hasta que el autor de por buenas estas.
  count += group(
    sheet,
    'Suelo del voxel (12 × 12, en el juego): cada variante ×6, y su pared (×0,72)',
    terrains.map((t) =>
      figure(
        TERRAIN_NAMES[t]!,
        ...VOXEL_TILES[t].map((v) => zoom(artCanvas(v), 6)),
        zoom(artCanvas(VOXEL_TILES[t][0]!, WALL), 6),
      ),
    ),
  );
  count += group(
    sheet,
    'Suelo del voxel mezclado, con un escalon de medio bloque (×4)',
    terrains.map((t) => figure(TERRAIN_NAMES[t]!, zoom(ground(VOXEL_TILES[t], 12, 6, VOXEL_PX), 4))),
  );
  count += group(sheet, 'Fondos del agua, del voxel (×6)', [
    figure('Agua, agua honda', ...[Terrain.Water, Terrain.DeepWater].flatMap((t) => VOXEL_TILES[t].map((v) => zoom(artCanvas(v), 6)))),
  ]);
  count += group(
    sheet,
    'Suelo: cada variante ×3, y su pared (×0,72)',
    terrains.map((t) =>
      figure(
        TERRAIN_NAMES[t]!,
        ...TERRAIN_TILES[t].map((v) => zoom(artCanvas(v), 3)),
        zoom(artCanvas(TERRAIN_TILES[t][0]!, WALL), 3),
      ),
    ),
  );
  count += group(
    sheet,
    'Suelo mezclado, con un escalon de medio bloque (×2)',
    terrains.map((t) => figure(TERRAIN_NAMES[t]!, zoom(ground(TERRAIN_TILES[t], 6, 3), 2))),
  );
  count += group(sheet, 'Agua: la superficie ×3, los fondos ×3, y el agua sobre su fondo (×2)', [
    figure('Superficie', zoom(artCanvas(WATER_ART), 3)),
    figure('Fondos (agua, agua honda)', ...[Terrain.Water, Terrain.DeepWater].flatMap((t) => TERRAIN_TILES[t].map((v) => zoom(artCanvas(v), 3)))),
    figure('El agua', zoom(water(6, 3), 2)),
  ]);
  count += group(
    sheet,
    'Arboles, con su tronco desnudo medio (×2)',
    (Object.keys(CROWNS).map(Number) as Feature[]).map((f) => figure(NAMES[f] ?? '', tree(f) && zoom(tree(f)!, 2))),
  );
  count += group(
    sheet,
    'Matas (×3)',
    (Object.keys(BUSHES).map(Number) as Feature[]).map((f) => figure(NAMES[f] ?? '', zoom(artCanvas(BUSHES[f]!), 3))),
  );
  count += group(
    sheet,
    'Brotes (×3)',
    (Object.keys(SAPLINGS).map(Number) as Feature[]).map((f) => figure(NAMES[f] ?? '', zoom(artCanvas(SAPLINGS[f]!), 3))),
  );
  count += group(sheet, 'Rocas de voxeles: su piedra ×3 y en perspectiva', [
    ...(Object.keys(STONES).map(Number) as Feature[]).map((f) =>
      figure(NAMES[f] ?? '', zoom(artCanvas(STONES[f]!), 3), voxelBox(ROCK_SHAPE, { top: STONES[f]!, west: STONES[f]!, south: STONES[f]! }, 3)),
    ),
    figure('Guijarros (×4)', zoom(artCanvas(PEBBLES), 4)),
  ]);
  // Una mena de cada mineral, de una casilla cualquiera: cada casilla tiene la
  // suya (`ore-mesh.ts`). Su textura: la piedra con sus vetas y sus cristales.
  count += group(
    sheet,
    'Menas: la textura de una (×3); cada casilla tiene la suya',
    ([Feature.CoalNode, Feature.IronNode, Feature.CopperNode] as const).map((f) => figure(NAMES[f] ?? '', zoom(artCanvas(oreModel(f, 1, 0, 0, 0).art), 3))),
  );
  count += group(sheet, 'El jugador (×3) y las estaciones: sus caras ×3 y en perspectiva', [
    figure('Jugador', zoom(artCanvas(PLAYER), 3)),
    ...([Feature.Workbench, Feature.Furnace] as const).map((f) => {
      const art = STATION_ART[f]!;
      return figure(
        NAMES[f] ?? '',
        zoom(artCanvas(art.top), 3),
        zoom(artCanvas(art.side), 3),
        zoom(artCanvas(art.front), 3),
        stationBox(art, 3),
      );
    }),
  ]);
  count += group(sheet, 'Escena de prueba (×2)', [figure('Hierba, roble, matas, brote y jugador', zoom(scene(), 2))]);
  document.body.appendChild(sheet);
  return count;
}
