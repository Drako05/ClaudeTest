/**
 * Pintado procedural en vista isometrica.
 *
 * No hay ni un solo asset externo: cada bioma y cada feature se dibuja por
 * codigo sobre un canvas 2D.
 *
 * El terreno de un chunk entero se pinta en un unico canvas que sube a la GPU
 * como una sola textura, asi que dibujar el suelo cuesta un sprite por chunk
 * visible en vez de mil por tile. Las features, en cambio, NO se hornean ahi:
 * necesitan ordenarse por profundidad junto al personaje para que este pueda
 * pasar por detras de un arbol, y algo horneado en el suelo no puede hacer eso.
 */

import { CHUNK_SIZE, Feature, isSapling, maturesInto, Terrain } from '@verdant/shared';
import { groundHeight, hash2DFloat, MAX_LEVEL, WATER_LEVEL } from '@verdant/sim';
import type { Chunk } from '@verdant/sim';
import { LOOKS, MINERAL_FACES, ROCK_FACES } from './palette.js';
import { LEVEL_PX, TILE_H, TILE_W, worldToScreen } from './projection.js';

/** Caja que ocupa el rombo de un chunk completo, en pixeles. */
export const CHUNK_TEX_W = CHUNK_SIZE * TILE_W;
/**
 * Margen que hay que dejar arriba y abajo por el relieve.
 *
 * Las cimas suben hasta `MAX_LEVEL` niveles sobre el rombo plano, y el agua se
 * hunde uno por debajo. Sin este margen, una meseta en el borde norte del chunk
 * se recortaria contra el limite de su textura.
 */
export const CHUNK_TEX_TOP = MAX_LEVEL * LEVEL_PX;
const CHUNK_TEX_BOTTOM = -WATER_LEVEL * LEVEL_PX;
export const CHUNK_TEX_H = CHUNK_SIZE * TILE_H + CHUNK_TEX_TOP + CHUNK_TEX_BOTTOM;
/** El rombo se extiende a izquierda y derecha del origen: hay que recentrarlo. */
export const CHUNK_TEX_OFFSET_X = CHUNK_TEX_W / 2;

const TERRAIN_RGB: Record<Terrain, [number, number, number]> = {
  [Terrain.DeepWater]: [22, 48, 82],
  [Terrain.Water]: [41, 96, 148],
  [Terrain.Sand]: [214, 197, 142],
  [Terrain.Grass]: [88, 140, 72],
  [Terrain.Forest]: [56, 100, 52],
  [Terrain.Rock]: [116, 116, 124],
  [Terrain.Snow]: [226, 234, 242],
  [Terrain.Tundra]: [150, 156, 130],
};

/** Cuanto varia el brillo tile a tile. Sin esto el terreno parece plastico. */
const SPECKLE = 14;

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function shade(rgb: [number, number, number], delta: number): string {
  return `rgb(${clampByte(rgb[0] + delta)},${clampByte(rgb[1] + delta)},${clampByte(rgb[2] + delta)})`;
}

/**
 * Traza la cara superior de un tile cuya esquina norte esta en (px, py).
 *
 * Las cuatro esquinas llevan altura propia: en un tile plano valen todas lo
 * mismo y sale el rombo de siempre, y en un talud dos de ellas van un nivel mas
 * arriba, lo que inclina el rombo y **es** el talud. No hace falta ninguna forma
 * especial: un talud es un rombo torcido.
 *
 * Se agranda medio pixel: dos rombos exactamente adyacentes dejan costuras
 * visibles por el antialiasing del canvas, y solaparlos un poco las elimina.
 */
function traceTop(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  north: number,
  east: number,
  south: number,
  west: number,
): void {
  const hw = TILE_W / 2 + 0.5;
  const hh = TILE_H / 2 + 0.5;
  ctx.beginPath();
  ctx.moveTo(px, py - 0.5 - north * LEVEL_PX);
  ctx.lineTo(px + hw, py + hh - east * LEVEL_PX);
  ctx.lineTo(px, py + TILE_H + 0.5 - south * LEVEL_PX);
  ctx.lineTo(px - hw, py + hh - west * LEVEL_PX);
  ctx.closePath();
}

/**
 * Altura de las cuatro esquinas de un tile, en el orden N, E, S, O.
 *
 * Las esquinas del rombo son las cuatro combinaciones de (0,1) dentro de la
 * casilla, asi que salen de `groundHeight` sin ninguna regla nueva: el dibujo lee
 * el mismo campo de alturas con el que chocara el jugador.
 */
export function cornerHeights(level: number, rampDir: number): [number, number, number, number] {
  return [
    groundHeight(level, rampDir, 0, 0),
    groundHeight(level, rampDir, 1, 0),
    groundHeight(level, rampDir, 1, 1),
    groundHeight(level, rampDir, 0, 1),
  ];
}

/** Pinta el terreno de un chunk. Las features van aparte, como sprites. */
export function paintChunkTerrain(
  chunk: Chunk,
  ctx: CanvasRenderingContext2D,
  seed: number,
): void {
  const baseX = chunk.cx * CHUNK_SIZE;
  const baseY = chunk.cy * CHUNK_SIZE;
  ctx.clearRect(0, 0, CHUNK_TEX_W, CHUNK_TEX_H);

  // De atras hacia delante en profundidad. Con relieve el orden importa: una
  // cima levantada invade el rombo de su vecino del norte, y pintando en orden
  // de aparicion se dibujaria por debajo de el.
  for (let sum = 0; sum <= (CHUNK_SIZE - 1) * 2; sum++) {
    for (let lx = Math.max(0, sum - CHUNK_SIZE + 1); lx < CHUNK_SIZE && lx <= sum; lx++) {
      const ly = sum - lx;
      const idx = ly * CHUNK_SIZE + lx;
      const terrain = chunk.terrain[idx] as Terrain;
      const rgb = TERRAIN_RGB[terrain] ?? TERRAIN_RGB[Terrain.Grass];
      const jitter = (hash2DFloat(seed ^ 0x1f2e3d4c, baseX + lx, baseY + ly) - 0.5) * 2 * SPECKLE;
      const [north, east, south, west] = cornerHeights(chunk.level[idx], chunk.rampDir[idx]);

      const p = worldToScreen(lx, ly);
      ctx.fillStyle = shade(rgb, jitter);
      traceTop(ctx, p.x + CHUNK_TEX_OFFSET_X, p.y + CHUNK_TEX_TOP, north, east, south, west);
      ctx.fill();
    }
  }
}

/** De que lado de un tile cuelga una cara. */
export type FaceSide = 'east' | 'south';

/**
 * Una cara vertical: la pared o el costado de un talud.
 *
 * Es lo unico del relieve que **no** se hornea en la textura del chunk. Una cara
 * tiene altura, y lo que tiene altura va en la capa ordenada por profundidad
 * (regla 7 de CLAUDE.md): horneada en el suelo, un acantilado se dibujaria por
 * debajo del arbol que tiene detras.
 *
 * `top0`/`top1` son las alturas del borde de arriba y `bottom0`/`bottom1` las
 * del vecino de abajo; los dos extremos pueden ir a distinta altura porque un
 * talud inclina tambien sus costados.
 */
export function makeFaceArt(
  terrain: Terrain,
  side: FaceSide,
  top0: number,
  top1: number,
  bottom0: number,
  bottom1: number,
): FeatureArt | null {
  const highest = Math.max(top0, top1);
  const lowest = Math.min(bottom0, bottom1);
  const width = TILE_W / 2;
  const height = TILE_H / 2 + (highest - lowest) * LEVEL_PX;
  const made = newCanvas(Math.ceil(width) + 1, Math.ceil(height) + 1);
  if (!made) return null;
  const [canvas, ctx] = made;

  // El origen del lienzo es la esquina alta del borde, ya bajada hasta la altura
  // mas alta de la cara: asi el mismo dibujo sirve para cualquier desnivel.
  const y = (h: number): number => (highest - h) * LEVEL_PX;
  // La cara este baja hacia la izquierda y la sur hacia la derecha, que es como
  // se ven las dos caras delanteras de un cubo en isometrica.
  const xNear = side === 'east' ? width : 0;
  const xFar = side === 'east' ? 0 : width;

  const rgb = TERRAIN_RGB[terrain] ?? TERRAIN_RGB[Terrain.Grass];
  // La luz entra por el noroeste, igual que en las features: el costado sur
  // queda algo iluminado y el este en sombra.
  ctx.fillStyle = shade(rgb, side === 'south' ? -34 : -62);
  ctx.beginPath();
  ctx.moveTo(xNear, y(top0));
  ctx.lineTo(xFar, y(top1) + TILE_H / 2);
  ctx.lineTo(xFar, y(bottom1) + TILE_H / 2);
  ctx.lineTo(xNear, y(bottom0));
  ctx.closePath();
  ctx.fill();

  // Una linea por nivel: es lo que permite contar de un vistazo si una pared es
  // de uno o de dos bloques, que es exactamente la diferencia entre poder
  // subirla de un salto y tener que buscar otro sitio.
  ctx.strokeStyle = 'rgba(0,0,0,0.30)';
  ctx.lineWidth = 1;
  for (let h = Math.ceil(lowest); h < highest; h++) {
    ctx.beginPath();
    ctx.moveTo(xNear, y(h));
    ctx.lineTo(xFar, y(h) + TILE_H / 2);
    ctx.stroke();
  }

  // Filo superior claro: separa la cima de la pared y hace legible el canto.
  ctx.strokeStyle = shade(rgb, 18);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(xNear, y(top0));
  ctx.lineTo(xFar, y(top1) + TILE_H / 2);
  ctx.stroke();

  return {
    canvas,
    anchorX: xNear / canvas.width,
    anchorY: y(top0) / canvas.height,
    riseAbove: 0,
  };
}

/** Tamano del lienzo de una feature y donde se apoya sobre el tile. */
export interface FeatureArt {
  canvas: HTMLCanvasElement;
  /** Punto de apoyo dentro del lienzo, en fraccion (0-1). */
  anchorX: number;
  anchorY: number;
  /** Pixeles que el dibujo se eleva sobre su punto de apoyo. */
  riseAbove: number;
}

function newCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  return ctx ? [canvas, ctx] : null;
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.26)';
  ctx.beginPath();
  ctx.ellipse(x, y, (TILE_W / 2.6) * scale, (TILE_H / 2.6) * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Dibuja cada especie una sola vez a un lienzo propio, que luego se reutiliza
 * como textura en todos los sprites de ese tipo.
 *
 * En isometrica los objetos tienen altura: se dibujan hacia ARRIBA desde su
 * punto de apoyo, que es el centro del tile. De ahi viene la sensacion de
 * volumen sin necesidad de 3D real. La luz entra siempre por el noroeste, para
 * que todas las especies se lean como parte del mismo mundo.
 */
export function makeFeatureArt(feature: Feature): FeatureArt | null {
  if (feature === Feature.RockNode) return makeRockArt(ROCK_FACES);
  const mineral = MINERAL_FACES[feature];
  if (mineral) return makeRockArt(mineral);
  if (isSapling(feature)) return makeSaplingArt(feature);

  const look = LOOKS[feature];
  if (!look) return null;

  const width = 44;
  const height = 58;
  const made = newCanvas(width, height);
  if (!made) return null;
  const [canvas, ctx] = made;

  const footX = width / 2;
  const footY = height - 6;
  const grow = look.rare ? 1.15 : 1;

  drawShadow(ctx, footX, footY, look.form === 'bush' ? 0.8 : 1);

  if (look.form === 'bush') {
    ctx.fillStyle = look.dark;
    ctx.beginPath();
    ctx.ellipse(footX, footY - 7 * grow, 11 * grow, 9 * grow, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.mid;
    ctx.beginPath();
    ctx.ellipse(footX - 2, footY - 10 * grow, 7.5 * grow, 6 * grow, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.light;
    ctx.beginPath();
    ctx.ellipse(footX - 3.5, footY - 12 * grow, 4 * grow, 3 * grow, 0, 0, Math.PI * 2);
    ctx.fill();
    if (look.fruit) {
      ctx.fillStyle = look.fruit;
      for (const [dx, dy] of [[-5, -6], [4, -9], [1, -3], [7, -5]]) {
        ctx.beginPath();
        ctx.arc(footX + dx, footY + dy * grow, 2.1 * grow, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (look.form === 'conifer') {
    ctx.fillStyle = look.trunk;
    ctx.fillRect(footX - 2.5, footY - 14 * grow, 5, 14 * grow);
    // Tres pisos que estrechan hacia arriba: silueta alta y puntiaguda.
    const tiers: Array<[number, number, string]> = [
      [14 * grow, 13 * grow, look.dark],
      [21 * grow, 10 * grow, look.mid],
      [28 * grow, 6.5 * grow, look.light],
    ];
    for (const [rise, halfWidth, color] of tiers) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(footX, footY - rise - 11 * grow);
      ctx.lineTo(footX + halfWidth, footY - rise + 2);
      ctx.lineTo(footX - halfWidth, footY - rise + 2);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = look.trunk;
    ctx.fillRect(footX - 3, footY - 17 * grow, 6, 17 * grow);
    ctx.fillStyle = look.dark;
    ctx.beginPath();
    ctx.arc(footX, footY - 25 * grow, 15 * grow, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.mid;
    ctx.beginPath();
    ctx.arc(footX - 2, footY - 29 * grow, 11 * grow, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.light;
    ctx.beginPath();
    ctx.arc(footX - 5, footY - 32 * grow, 6.5 * grow, 0, Math.PI * 2);
    ctx.fill();
  }

  return { canvas, anchorX: footX / width, anchorY: footY / height, riseAbove: footY };
}

/** Brote recien sembrado: pequeno, sin fruto y sin estorbar el paso. */
function makeSaplingArt(feature: Feature): FeatureArt | null {
  const adult = maturesInto(feature);
  const look = LOOKS[adult];
  const made = newCanvas(28, 26);
  if (!made) return null;
  const [canvas, ctx] = made;

  const footX = 14;
  const footY = 21;
  drawShadow(ctx, footX, footY, 0.5);

  ctx.strokeStyle = look?.trunk ?? '#4a6b2c';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(footX, footY);
  ctx.lineTo(footX, footY - 7);
  ctx.stroke();

  ctx.fillStyle = look?.mid ?? '#3f7534';
  ctx.beginPath();
  ctx.ellipse(footX - 3.5, footY - 8, 3.6, 2.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(footX + 3.5, footY - 9.5, 3.6, 2.2, 0.5, 0, Math.PI * 2);
  ctx.fill();

  return { canvas, anchorX: footX / 28, anchorY: footY / 26, riseAbove: footY };
}

/**
 * Roca y minerales comparten silueta y se distinguen por color: asi se leen como
 * vetas del mismo material y no como objetos ajenos entre si.
 */
function makeRockArt(faces: readonly string[]): FeatureArt | null {
  const [base, face, highlight] = faces;
  const made = newCanvas(40, 40);
  if (!made) return null;
  const [canvas, ctx] = made;
  const footX = 20;
  const footY = 34;

  drawShadow(ctx, footX, footY, 0.9);
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(footX - 11, footY);
  ctx.lineTo(footX - 5, footY - 15);
  ctx.lineTo(footX + 4, footY - 12);
  ctx.lineTo(footX + 11, footY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.moveTo(footX - 5, footY - 15);
  ctx.lineTo(footX + 4, footY - 12);
  ctx.lineTo(footX - 1, footY);
  ctx.lineTo(footX - 11, footY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.moveTo(footX - 5, footY - 15);
  ctx.lineTo(footX - 1, footY - 6);
  ctx.lineTo(footX - 8, footY - 4);
  ctx.closePath();
  ctx.fill();

  return { canvas, anchorX: footX / 40, anchorY: footY / 40, riseAbove: footY };
}

/** El personaje, con el mismo criterio de apoyo y luz que las features. */
export function makePlayerArt(): FeatureArt | null {
  const width = 32;
  const height = 44;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const footX = width / 2;
  const footY = height - 5;

  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.ellipse(footX, footY, TILE_W / 3, TILE_H / 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2b3d5e';
  ctx.fillRect(footX - 5, footY - 13, 10, 13);
  ctx.fillStyle = '#3a5480';
  ctx.fillRect(footX - 5, footY - 13, 5, 13);

  ctx.fillStyle = '#f2d7b0';
  ctx.beginPath();
  ctx.arc(footX, footY - 18, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8c5a3c';
  ctx.beginPath();
  ctx.arc(footX, footY - 20.5, 6, Math.PI, 0);
  ctx.fill();

  return { canvas, anchorX: footX / width, anchorY: footY / height, riseAbove: footY };
}
