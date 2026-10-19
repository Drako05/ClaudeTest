/**
 * La hoja del pixelart del mundo, para que el autor lo revise (`?mundo=1`,
 * 2026-10-19), como la de los iconos (`icon-sheet.ts`). Tapa el juego y pone
 * cada dibujo a su tamano (24 pixeles por bloque) y ampliado, mas una escena
 * de prueba: un trozo de suelo con sus variantes mezcladas, un escalon de medio
 * bloque con su pared, y el roble y la mata encima. La roca de voxeles se
 * ensena en perspectiva, con la luz de cada cara. No toca el mundo: es solo
 * dibujo, en lienzos de pixeles enteros.
 */

import {
  GRASS_A,
  GRASS_B,
  GRASS_C,
  GRASS_D,
  MEADOW_BUSH,
  OAK,
  ROCK_GROUND_A,
  ROCK_GROUND_B,
  ROCK_SHAPE,
  STONE,
  WORLD_PALETTE,
  WORLD_PX,
  type WorldArt,
} from './world-art.js';

/** Lo oscuras que se ven las paredes del suelo frente a su tapa (el factor de hoy, `terrain-mesh.ts`). */
const WALL = 0.72;
/** La luz de cada cara de un bloque, como las estaciones (`stations-view.ts`). */
const FACE = { top: 1, lit: 0.95, shade: 0.74 };

/** Una rejilla en un lienzo, a un pixel por pixel de arte, con su luz. */
function paint(art: WorldArt, light = 1): HTMLCanvasElement {
  const h = art.rows.length;
  const w = art.rows[0]!.length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  art.rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const color = WORLD_PALETTE[row[x]!];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  if (light < 1) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0,0,0,${1 - light})`;
    ctx.fillRect(0, 0, w, h);
  }
  return canvas;
}

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

/** Un poco de suelo: `cols × rows` casillas con las variantes mezcladas, y un escalon de medio bloque abajo. */
function ground(variants: WorldArt[], cols: number, rows: number): HTMLCanvasElement {
  const tops = variants.map((v) => paint(v));
  const walls = variants.map((v) => paint(v, WALL));
  const half = WORLD_PX / 2;
  const canvas = document.createElement('canvas');
  canvas.width = cols * WORLD_PX;
  canvas.height = rows * WORLD_PX + half;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Como en el juego: la variante, por casilla y con la semilla (aqui, un hash fijo).
      const pick = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      ctx.drawImage(tops[pick % tops.length]!, x * WORLD_PX, y * WORLD_PX);
    }
  }
  // La pared del escalon: la misma tesela, mas oscura, alineada con el mundo.
  for (let x = 0; x < cols; x++) {
    const pick = ((x * 83492791) >>> 0) % walls.length;
    ctx.drawImage(walls[pick]!, 0, 0, WORLD_PX, half, x * WORLD_PX, rows * WORLD_PX, WORLD_PX, half);
  }
  return canvas;
}

/** La escena: suelo de hierba y, encima, el roble y la mata, de pie y a su escala. */
function scene(): HTMLCanvasElement {
  const base = ground([GRASS_A, GRASS_B, GRASS_C, GRASS_D], 8, 7);
  const ctx = base.getContext('2d')!;
  const oak = paint(OAK);
  const bush = paint(MEADOW_BUSH);
  ctx.drawImage(oak, 20, base.height - WORLD_PX * 1.5 - oak.height);
  ctx.drawImage(bush, 140, base.height - WORLD_PX * 2 - bush.height);
  ctx.drawImage(bush, 160, base.height - WORLD_PX * 1 - bush.height);
  return base;
}

/**
 * La roca de voxeles en perspectiva, vista desde el suroeste: arriba, la cara
 * oeste (con luz, el sol viene del noroeste) y la sur (en sombra). Cada voxel
 * toma su cuarto de la tesela de piedra, alineado con el mundo como el suelo.
 */
function voxelRock(k: number): HTMLCanvasElement {
  const tex = paint(STONE);
  const half = WORLD_PX / 2;
  // Vectores de pantalla de un bloque hacia el este, el sur y arriba.
  const A = WORLD_PX * k;
  const east = [A, -A / 2];
  const south = [A, A / 2];
  const up = [0, -A];
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(A * 2.4);
  canvas.height = Math.ceil(A * 2.3);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const ox = A * 0.2;
  const oy = A * 1.55;
  const at = (x: number, y: number, z: number) => [ox + x * east[0]! + y * south[0]!, oy + x * east[1]! + y * south[1]! + z * up[1]!];
  const has = (x: number, y: number, z: number) => ROCK_SHAPE.some(([a, b, c]) => a === x && b === y && c === z);
  const face = (origin: number[], u: number[], v: number[], sx: number, sy: number, light: number) => {
    // u y v: lo que avanza en pantalla un pixel de la tesela.
    ctx.setTransform(u[0]! / WORLD_PX, u[1]! / WORLD_PX, v[0]! / WORLD_PX, v[1]! / WORLD_PX, origin[0]!, origin[1]!);
    ctx.drawImage(tex, sx, sy, half, half, 0, 0, half, half);
    ctx.fillStyle = `rgba(0,0,0,${1 - light})`;
    ctx.fillRect(0, 0, half, half);
  };
  const down = [-up[0]!, -up[1]!];
  // De lejos (noreste) a cerca (suroeste), y de abajo arriba.
  const order = [...ROCK_SHAPE].sort((p, q) => (p[1] - p[0]) - (q[1] - q[0]) || p[2] - q[2]);
  for (const [x, y, z] of order) {
    const X = x * 0.5;
    const Y = y * 0.5;
    const Z = z * 0.5;
    const top = Z + 0.5;
    // El cuarto de la tesela de este voxel: alineado con el mundo.
    const su = (x % 2) * half;
    const sv = (y % 2) * half;
    const vz = ((1 - z) % 2 + 2) % 2 * half;
    if (!has(x, y, z + 1)) face(at(X, Y, top), east, south, su, sv, FACE.top);
    if (!has(x - 1, y, z)) face(at(X, Y, top), south, down, sv, vz, FACE.lit);
    if (!has(x, y + 1, z)) face(at(X, Y + 0.5, top), east, down, su, vz, FACE.shade);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

function figure(caption: string, ...canvases: HTMLCanvasElement[]): HTMLElement {
  const cell = document.createElement('figure');
  for (const c of canvases) {
    c.className = 'worldArt';
    cell.appendChild(c);
  }
  const label = document.createElement('figcaption');
  label.textContent = caption;
  cell.appendChild(label);
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

/** Pone la hoja encima de todo. Devuelve cuantos dibujos ensena. */
export function showWorldSheet(): number {
  const sheet = document.createElement('div');
  sheet.id = 'worldSheet';
  let count = 0;
  const swatches = Object.entries(WORLD_PALETTE).map(([key, color]) => {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return figure(`${key} ${color}`, zoom(c, 24));
  });
  group(sheet, 'Paleta', swatches);
  const tile = (name: string, art: WorldArt) => figure(name, paint(art), zoom(paint(art), 4), zoom(paint(art, WALL), 4));
  count += group(sheet, 'Suelo: tesela a su tamano, ×4 y su pared (×0,72)', [
    tile('Hierba 1', GRASS_A),
    tile('Hierba 2', GRASS_B),
    tile('Hierba 3', GRASS_C),
    tile('Hierba 4', GRASS_D),
    tile('Roca 1', ROCK_GROUND_A),
    tile('Roca 2', ROCK_GROUND_B),
  ]);
  count += group(sheet, 'Suelo mezclado, con un escalon de medio bloque (×2)', [
    figure('Hierba', zoom(ground([GRASS_A, GRASS_B, GRASS_C, GRASS_D], 8, 4), 2)),
    figure('Roca', zoom(ground([ROCK_GROUND_A, ROCK_GROUND_B], 8, 4), 2)),
  ]);
  count += group(sheet, 'Elementos: a su tamano y ×3', [
    figure('Roble (tronco medio, 2,4)', paint(OAK), zoom(paint(OAK), 3)),
    figure('Mata de la pradera', paint(MEADOW_BUSH), zoom(paint(MEADOW_BUSH), 4)),
    figure('Roca de voxeles: piedra ×4 y en perspectiva', zoom(paint(STONE), 4), voxelRock(4)),
  ]);
  count += group(sheet, 'Escena de prueba (×2)', [figure('Hierba, roble y matas', zoom(scene(), 2))]);
  document.body.appendChild(sheet);
  return count;
}
