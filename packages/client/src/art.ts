/**
 * El arte del juego: colores del terreno y el dibujo de cada especie y del
 * personaje.
 *
 * No hay ni un solo asset externo: todo se dibuja por codigo sobre un canvas 2D,
 * y ese lienzo es la textura de las aspas y del sprite del jugador.
 *
 * El arte nacio para el cliente isometrico y sus coordenadas siguen midiendo en
 * sus pixeles: un tile de 32 de ancho por 16 de alto. Por eso esas dos cifras
 * viven aqui como constantes propias —ya no hay proyeccion de la que leerlas— y
 * con los mismos valores: cambiarlas no cambia ninguna camara, cambia el dibujo
 * de las sombras de cada especie. El tamano en el mundo lo decide
 * `billboards.ts` midiendo la tinta, no estas cifras.
 */

import { Feature, isSapling, maturesInto, Terrain } from '@verdant/shared';
import { hash2DFloat } from '@verdant/sim';
import { LOOKS, MINERAL_FACES, ROCK_FACES, type SpeciesLook as Look } from './palette.js';
import { treeShapeOf, type TreeShape } from './tree-shapes.js';

/** Ancho y alto, en pixeles del arte, del tile para el que se dibujo todo. */
export const TILE_W = 32;
export const TILE_H = 16;

/** El color base de cada terreno. Colorea los vertices de la malla. */
export const TERRAIN_RGB: Record<Terrain, [number, number, number]> = {
  [Terrain.DeepWater]: [22, 48, 82],
  [Terrain.Water]: [41, 96, 148],
  [Terrain.Sand]: [214, 197, 142],
  [Terrain.Grass]: [88, 140, 72],
  [Terrain.Forest]: [56, 100, 52],
  [Terrain.Rock]: [116, 116, 124],
  [Terrain.Snow]: [226, 234, 242],
  [Terrain.Tundra]: [150, 156, 130],
};

/**
 * Cuantas franjas de brillo distintas tiene el terreno.
 *
 * El moteado rompe el aspecto plastico del suelo. Ocho franjas siguen leyendose
 * como ruido.
 */
export const SHADE_STEPS = 8;

/** Franja de brillo de un tile, de 0 a `SHADE_STEPS - 1`. */
export function shadeStepAt(seed: number, wx: number, wy: number): number {
  const roll = hash2DFloat(seed ^ 0x1f2e3d4c, wx, wy);
  return Math.min(SHADE_STEPS - 1, Math.floor(roll * SHADE_STEPS));
}

/** Un lienzo dibujado y donde se apoya. */
export interface FeatureArt {
  canvas: HTMLCanvasElement;
  /** Punto de apoyo dentro del lienzo, en fraccion (0-1). */
  anchorX: number;
  anchorY: number;
}

/**
 * Un lienzo y su contexto, opcionalmente a mayor densidad de pixeles.
 *
 * `detail` multiplica los pixeles del lienzo y **escala el contexto en el mismo
 * factor**, asi que el dibujo sale identico pero con mas resolucion: ni una sola
 * coordenada de las que dibujan conifera, frondoso, arbusto, brote o roca hay
 * que tocar. Es lo que permite agrandar un sprite sin que el pixel crezca con
 * el, y lo que separa un 2D-HD de un pixelado.
 *
 * Con `detail` distinto de 1, `canvas.width` **deja de ser** la anchura logica:
 * quien calcule un ancla tiene que dividir por la logica.
 */
export function newCanvas(
  width: number,
  height: number,
  detail = 1,
): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * detail);
  canvas.height = Math.ceil(height * detail);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (detail !== 1) ctx.scale(detail, detail);
  return [canvas, ctx];
}

/**
 * La sombra pintada al pie de cada dibujo.
 *
 * En el 3D **se descarta**: el material recorta por alfa a 0.4 y esta sombra va
 * al 26 %, que es justo lo que obliga a que el umbral no sea menor (ver
 * `billboards.ts`). La sombra de verdad va tumbada en el suelo, en `shadows.ts`.
 * Se queda en el dibujo porque es parte de su silueta de apoyo y quitarla no
 * cambia nada de lo que se ve.
 */
function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.26)';
  ctx.beginPath();
  ctx.ellipse(x, y, (TILE_W / 2.6) * scale, (TILE_H / 2.6) * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Dibuja cada especie una sola vez a un lienzo propio, que luego se reutiliza
 * como textura en todas las aspas de ese tipo.
 *
 * Los objetos se dibujan hacia ARRIBA desde su punto de apoyo, que es el centro
 * del tile. La luz entra siempre por el noroeste, para que todas las especies se
 * lean como parte del mismo mundo.
 *
 * Los ARBOLES necesitan `tree`: su tronco desnudo y su grosor en el pie, en
 * pixeles de arte (salen de `treeTrunkAt` del nucleo, que es tambien su hitbox),
 * y cuantos pixeles de arte mide un bloque, porque su copa viene en bloques de
 * `tree-shapes.ts`. Sin `tree`, un arbol no se dibuja.
 */
export function makeFeatureArt(
  feature: Feature,
  detail = 1,
  tree?: { bare: number; width: number; pxPerBlock: number },
): FeatureArt | null {
  if (feature === Feature.RockNode) return makeRockArt(ROCK_FACES, detail);
  if (feature === Feature.Pebbles) return makePebblesArt(ROCK_FACES, detail);
  const mineral = MINERAL_FACES[feature];
  if (mineral) return makeRockArt(mineral, detail);
  if (isSapling(feature)) return makeSaplingArt(feature, detail);

  const look = LOOKS[feature];
  if (!look) return null;
  if (look.form !== 'bush') {
    const shape = treeShapeOf(feature);
    return shape && tree ? makeTreeArt(look, shape, tree.bare, tree.width, tree.pxPerBlock, detail) : null;
  }

  const grow = look.rare ? 1.15 : 1;
  const width = 44;
  const height = 58;
  const made = newCanvas(width, height, detail);
  if (!made) return null;
  const [canvas, ctx] = made;

  const footX = width / 2;
  const footY = height - 6;

  drawShadow(ctx, footX, footY, 0.8);

  {
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
  }

  return { canvas, anchorX: footX / width, anchorY: footY / height };
}

/**
 * Un arbol adulto con la forma de su especie (`tree-shapes.ts`) y `bare`
 * pixeles de tronco desnudo bajo la copa.
 *
 * La copa se dibuja **desde su borde bajo, que es exactamente `bare`**: el
 * tronco que se ve no depende de la forma. Y conserva el estilo de siempre: tres
 * tonos, con la luz entrando por el noroeste (lo iluminado, arriba a la
 * izquierda).
 */
function makeTreeArt(
  look: Look,
  shape: TreeShape,
  bare: number,
  tw: number,
  pxPerBlock: number,
  detail: number,
): FeatureArt | null {
  const w = shape.crownW * pxPerBlock;
  const h = shape.crownH * pxPerBlock;
  // Ancho minimo: la sombra pintada del pie (se descarta en el 3D, pero es la
  // silueta de apoyo) y, sobre todo, el ancho del lienzo decide el de la sombra
  // tumbada (`widthOf`), que no puede quedarse en un hilo bajo la picea negra.
  const width = Math.ceil(Math.max(w, 26) + 8);
  const height = Math.ceil(6 + bare + h + 4);
  const made = newCanvas(width, height, detail);
  if (!made) return null;
  const [canvas, ctx] = made;

  const footX = width / 2;
  const footY = height - 6;
  /** Borde bajo de la copa. */
  const yB = footY - bare;

  drawShadow(ctx, footX, footY, 1);

  const conifer = shape.silhouette === 'cone' || shape.silhouette === 'spire';
  // Donde acaba el tronco, ya dentro de la copa. En las coniferas, a media
  // altura DE UN PISO, para que la punta caiga tapada tambien en el alerce, que
  // entre piso y piso deja hueco; en los frondosos la cupula tapa el centro
  // entero y basta con un tercio.
  let tipRise = h * 0.3;
  if (conifer) {
    const { step, tierH } = tierLayout(shape, h);
    tipRise = Math.floor(shape.tiers / 2) * step + tierH * 0.6;
  }
  // El tronco estrecha del pie a la copa y **acaba en punta** dentro de ella.
  // Fue un rectangulo hasta que el autor vio asomar su canto de arriba por los
  // lados del cono, que ahi ya es mas estrecho que el; con punta no hay canto.
  ctx.fillStyle = look.trunk;
  ctx.beginPath();
  ctx.moveTo(footX - tw / 2, footY);
  ctx.lineTo(footX + tw / 2, footY);
  ctx.lineTo(footX + tw * 0.35, yB);
  ctx.lineTo(footX, yB - tipRise);
  ctx.lineTo(footX - tw * 0.35, yB);
  ctx.closePath();
  ctx.fill();

  if (conifer) drawTiers(ctx, look, shape, footX, yB, w, h);
  else drawClusters(ctx, look, shape.silhouette === 'dome' ? DOME : UMBRELLA, footX, yB, w, h);

  return { canvas, anchorX: footX / width, anchorY: footY / height };
}

/**
 * Como se reparten los pisos de una conifera: la aguja de la picea negra deja
 * arriba sitio para su punta engrosada, y lo abierta que sea la especie decide
 * cuanto se solapan (densa: cada piso tapa la mitad del siguiente).
 */
function tierLayout(shape: TreeShape, h: number): { bodyH: number; step: number; tierH: number } {
  const bodyH = shape.silhouette === 'spire' ? h * 0.72 : h;
  const step = bodyH / (shape.tiers + 1 - 2 * shape.open);
  return { bodyH, step, tierH: step * (2 - 2 * shape.open) };
}

/**
 * Pisos triangulares de conifera, de abajo arriba.
 *
 * Con `n` pisos de alto `tierH` separados `step`, la copa mide
 * `tierH + (n-1)·step`; el alto de piso sale de lo abierta que sea la especie
 * (densa: cada piso tapa la mitad del siguiente; el alerce deja hueco).
 * Los pisos van de base plana y no caida: con las puntas por debajo, la copa
 * bajaria de su borde bajo y ni el tronco desnudo ni el ancho medirian lo que
 * dice la especie.
 *
 * La aguja de la picea negra estrecha mas despacio y remata con su **punta
 * engrosada**: tres pisos cortos y apretados que acaban en punta. Fue una elipse
 * lisa un dia, y en el movil del autor se leia como una bola clavada en un palo.
 */
function drawTiers(
  ctx: CanvasRenderingContext2D,
  look: Look,
  shape: TreeShape,
  footX: number,
  yB: number,
  w: number,
  h: number,
): void {
  /** Un piso: todo en sombra y la cara del noroeste iluminada. */
  const tier = (base: number, tall: number, hw: number, lit: string): void => {
    ctx.fillStyle = look.dark;
    ctx.beginPath();
    ctx.moveTo(footX, base - tall);
    ctx.lineTo(footX + hw, base);
    ctx.lineTo(footX - hw, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lit;
    ctx.beginPath();
    ctx.moveTo(footX, base - tall);
    ctx.lineTo(footX - hw, base);
    ctx.lineTo(footX - hw * 0.15, base);
    ctx.closePath();
    ctx.fill();
  };

  const spire = shape.silhouette === 'spire';
  const { bodyH, step, tierH } = tierLayout(shape, h);
  const n = shape.tiers;
  for (let i = 0; i < n; i++) {
    const rise = i * step;
    const taper = spire ? 1 - 0.6 * (rise / bodyH) : 1 - rise / bodyH;
    // Los pisos altos reciben mas cielo.
    tier(yB - rise, tierH, (w / 2) * taper, i >= (n * 2) / 3 ? look.light : look.mid);
  }
  if (spire) {
    // Del 62 % de la copa a la punta, tres pisos que estrechan hasta cerrar.
    const clubStep = (h * 0.38) / 4;
    for (let k = 0; k < 3; k++) {
      tier(yB - h * 0.62 - k * clubStep, clubStep * 2, w * [0.26, 0.21, 0.14][k], look.light);
    }
  }
}

/**
 * Racimos de un frondoso en coordenadas de copa: `u` de -1 a 1 a lo ancho, `v`
 * de 0 (borde bajo) a 1 (cima); `a` es el semieje en unidades de medio ancho y
 * `b` en unidades de alto. Ninguno se sale de la caja, asi que la copa mide
 * exactamente lo que dice su especie.
 */
type Cluster = readonly [u: number, v: number, a: number, b: number];
interface ClusterSet {
  readonly dark: readonly Cluster[];
  readonly mid: readonly Cluster[];
  readonly light: readonly Cluster[];
}

/** Roble: cupula ancha y lobulada, con la luz en los lobulos de arriba a la izquierda. */
const DOME: ClusterSet = {
  dark: [[0, 0.5, 1, 0.5], [-0.5, 0.62, 0.5, 0.36], [0.5, 0.62, 0.5, 0.36], [0, 0.72, 0.6, 0.28]],
  mid: [[-0.25, 0.62, 0.6, 0.3], [0.3, 0.7, 0.4, 0.22]],
  light: [[-0.45, 0.75, 0.3, 0.15], [-0.1, 0.85, 0.25, 0.12]],
};

/** Cerezo: sombrilla aplanada, con el vientre recto y los hombros anchos. */
const UMBRELLA: ClusterSet = {
  dark: [[0, 0.42, 1, 0.42], [-0.55, 0.62, 0.45, 0.32], [0.55, 0.62, 0.45, 0.32], [0, 0.7, 0.55, 0.3]],
  mid: [[-0.3, 0.68, 0.55, 0.25], [0.35, 0.72, 0.4, 0.2]],
  light: [[-0.5, 0.78, 0.3, 0.14], [-0.05, 0.85, 0.3, 0.12]],
};

function drawClusters(
  ctx: CanvasRenderingContext2D,
  look: Look,
  set: ClusterSet,
  footX: number,
  yB: number,
  w: number,
  h: number,
): void {
  for (const [color, list] of [[look.dark, set.dark], [look.mid, set.mid], [look.light, set.light]] as const) {
    ctx.fillStyle = color;
    for (const [u, v, a, b] of list) {
      ctx.beginPath();
      ctx.ellipse(footX + (u * w) / 2, yB - v * h, (a * w) / 2, b * h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Brote recien sembrado: pequeno, sin fruto y sin estorbar el paso. */
function makeSaplingArt(feature: Feature, detail = 1): FeatureArt | null {
  const adult = maturesInto(feature);
  const look = LOOKS[adult];
  const made = newCanvas(28, 26, detail);
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

  return { canvas, anchorX: footX / 28, anchorY: footY / 26 };
}

/**
 * Roca y minerales comparten silueta y se distinguen por color: asi se leen como
 * vetas del mismo material y no como objetos ajenos entre si.
 */
function makeRockArt(faces: readonly string[], detail = 1): FeatureArt | null {
  const [base, face, highlight] = faces;
  const made = newCanvas(40, 40, detail);
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

  return { canvas, anchorX: footX / 40, anchorY: footY / 40 };
}

/**
 * Guijarros sueltos, vistos DESDE ARRIBA: van tumbados en el suelo
 * (`flatGeometry` en `billboards.ts`), no en aspa. Tres piedras con los colores
 * de la roca, de la que se desprenden; en aspa se leian como una helice.
 */
function makePebblesArt(faces: readonly string[], detail = 1): FeatureArt | null {
  const [base, face, highlight] = faces;
  const made = newCanvas(14, 14, detail);
  if (!made) return null;
  const [canvas, ctx] = made;
  for (const [x, y, r] of [
    [4.5, 5, 2.4],
    [9.5, 6.5, 2],
    [6.5, 10, 1.7],
  ]) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(x + 0.6, y + 0.7, r * 1.15, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.15, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.ellipse(x - r * 0.2, y - r * 0.2, r * 0.8, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.ellipse(x - r * 0.45, y - r * 0.45, r * 0.35, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return { canvas, anchorX: 0.5, anchorY: 0.5 };
}

/** El personaje, con el mismo criterio de apoyo y luz que las features. */
export function makePlayerArt(detail = 1): FeatureArt | null {
  const width = 32;
  const height = 44;
  const made = newCanvas(width, height, detail);
  if (!made) return null;
  const [canvas, ctx] = made;

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

  return { canvas, anchorX: footX / width, anchorY: footY / height };
}
