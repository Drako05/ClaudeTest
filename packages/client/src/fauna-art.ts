/**
 * El dibujo de la fauna: cada especie en sus tres etapas, de perfil y mirando
 * a la derecha (el cliente lo voltea segun hacia donde anda).
 *
 * Procedural, como el resto del arte (`art.ts`): un cuadrupedo con los rasgos
 * de cada especie como parametros —patas, lomo, cabeza, orejas, cola, cuernos,
 * librea—, y el ave y el cangrejo aparte. Los dibujos son mios; la librea de
 * cada cria es la real: el cervato moteado, el rayon con rayas, el zorrito
 * pardo, el bisonte rojizo, el pollo de gaviota pardo y moteado.
 *
 * El lienzo se dibuja a una altura logica que depende de lo que mide el animal
 * (`figurePx`), y el cliente lo escala para que **lo dibujado mida
 * `animalHeight`**, la misma altura que la caja de golpe del nucleo: el animal
 * que se ve es el que se golpea.
 */

import { animalHeight, Species, Stage } from '@verdant/shared';
import { newCanvas, type FeatureArt } from './art.js';

type Ears = 'long' | 'pointy' | 'round' | 'none';
type Tail = 'puff' | 'bushy' | 'short' | 'thin';
type Horns = 'none' | 'bison' | 'antlers' | 'ibex' | 'tusks';
type Pattern = 'none' | 'spots' | 'stripes';

interface Quad {
  /** Largo total / alto total del dibujo. */
  aspect: number;
  /** Alto de las patas, del lomo, y radio de la cabeza, en fraccion del alto. */
  leg: number;
  body: number;
  head: number;
  /** Altura del centro de la cabeza (desde el suelo) y su posicion a lo largo. */
  headUp: number;
  headAt: number;
  /** Largo del hocico respecto de la cabeza. */
  snout: number;
  coat: string;
  dark: string;
  belly: string;
  ears: Ears;
  tail: Tail;
  horns: Horns;
  hump?: boolean;
  beard?: boolean;
  rump?: string;
  mane?: string;
  pattern?: Pattern;
  patternColor?: string;
}

/** El adulto de cada cuadrupedo. **Dibujo mio**, con los colores de la especie real. */
const ADULT: Partial<Record<Species, Quad>> = {
  [Species.Hare]: {
    aspect: 1.35, leg: 0.24, body: 0.42, head: 0.17, headUp: 0.56, headAt: 0.8, snout: 0.6,
    coat: '#9c7650', dark: '#5a4028', belly: '#d8c8a8', ears: 'long', tail: 'puff', horns: 'none',
  },
  [Species.Bison]: {
    aspect: 1.45, leg: 0.32, body: 0.48, head: 0.16, headUp: 0.42, headAt: 0.86, snout: 0.5,
    coat: '#5b3a22', dark: '#2a1a0e', belly: '#4a3020', ears: 'none', tail: 'thin', horns: 'bison',
    hump: true, beard: true, mane: '#3d2615',
  },
  [Species.RedDeer]: {
    aspect: 1.2, leg: 0.5, body: 0.28, head: 0.11, headUp: 0.86, headAt: 0.84, snout: 0.9,
    coat: '#9a5a32', dark: '#5a3018', belly: '#c8a07a', ears: 'pointy', tail: 'short', horns: 'none',
    rump: '#e8dcc0',
  },
  [Species.Boar]: {
    aspect: 1.6, leg: 0.3, body: 0.52, head: 0.19, headUp: 0.44, headAt: 0.82, snout: 1.0,
    coat: '#4a3a30', dark: '#241a14', belly: '#5a4a3e', ears: 'pointy', tail: 'thin', horns: 'tusks',
    mane: '#2e241c',
  },
  [Species.Reindeer]: {
    aspect: 1.0, leg: 0.32, body: 0.21, head: 0.075, headUp: 0.56, headAt: 0.82, snout: 0.9,
    coat: '#8a7a68', dark: '#4a3e32', belly: '#d8d0c0', ears: 'pointy', tail: 'short', horns: 'antlers',
    mane: '#ece4d4', rump: '#e4dccc',
  },
  [Species.ArcticFox]: {
    aspect: 1.9, leg: 0.34, body: 0.34, head: 0.17, headUp: 0.7, headAt: 0.72, snout: 0.8,
    coat: '#f0f0ec', dark: '#9aa0a8', belly: '#ffffff', ears: 'pointy', tail: 'bushy', horns: 'none',
  },
  [Species.Ibex]: {
    aspect: 1.15, leg: 0.36, body: 0.29, head: 0.1, headUp: 0.64, headAt: 0.82, snout: 0.7,
    coat: '#8a7258', dark: '#4a3a2a', belly: '#c8b498', ears: 'pointy', tail: 'short', horns: 'ibex',
    beard: true,
  },
  [Species.Marmot]: {
    aspect: 1.3, leg: 0.14, body: 0.6, head: 0.21, headUp: 0.6, headAt: 0.76, snout: 0.45,
    coat: '#8a6a48', dark: '#4a3420', belly: '#b89870', ears: 'round', tail: 'bushy', horns: 'none',
  },
};

/** Lo que cambia en la cria y en el joven de cada uno. */
function staged(species: Species, stage: Stage, adult: Quad): Quad {
  if (stage === Stage.Adult) return adult;
  const young = stage === Stage.Juvenile;
  // Cabeza mas grande y cuerpo mas corto cuanto mas joven: las proporciones
  // de cria.
  const q: Quad = {
    ...adult,
    head: adult.head * (young ? 1.1 : 1.3),
    aspect: adult.aspect * (young ? 0.97 : 0.88),
    hump: young ? adult.hump : false,
    beard: false,
    horns: adult.horns === 'none' ? 'none' : young && adult.horns !== 'tusks' ? adult.horns : 'none',
  };
  switch (species) {
    case Species.RedDeer:
      if (!young) return { ...q, coat: '#a8683a', pattern: 'spots', patternColor: '#f0e4c8' };
      return q;
    case Species.Boar:
      if (!young) return { ...q, coat: '#8a6040', pattern: 'stripes', patternColor: '#d8b888', mane: undefined };
      return { ...q, coat: '#7a5034', mane: undefined };
    case Species.Bison:
      return young ? { ...q, coat: '#7a4a28' } : { ...q, coat: '#b0602a', mane: undefined, belly: '#a05a28' };
    case Species.Reindeer:
      return young ? q : { ...q, coat: '#7a5a3a', mane: undefined, belly: '#9a7a5a' };
    case Species.ArcticFox:
      return young ? { ...q, coat: '#b4b0a8' } : { ...q, coat: '#6a5444', dark: '#3a2e24', belly: '#8a7462' };
    case Species.Ibex:
      return young ? q : { ...q, coat: '#a08a70' };
    default:
      return q;
  }
}

/** Cuantos pixeles logicos mide de alto el dibujo de un animal. */
export function figurePx(species: Species, stage: Stage): number {
  return Math.max(16, Math.min(40, Math.round(animalHeight(species, stage) * 18)));
}

const MARGIN = 2;

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

function bar(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function drawQuad(ctx: CanvasRenderingContext2D, q: Quad, h: number, x0: number, ground: number): void {
  const L = h * q.aspect;
  const legH = q.leg * h;
  const bodyH = q.body * h;
  const bodyY = ground - legH - bodyH / 2;
  // El cuerpo deja sitio por delante para la cabeza y por detras para la cola.
  const bodyX = x0 + L * 0.46;
  const bodyRx = L * 0.3;
  const legW = Math.max(1.4, Math.min(L * 0.07, h * 0.08));

  // Patas: las del lado lejano, mas oscuras y un pelo detras.
  const legs = [bodyX - bodyRx * 0.62, bodyX + bodyRx * 0.55];
  for (const lx of legs) bar(ctx, lx + legW * 0.6, bodyY, lx + legW * 0.6, ground - 0.5, legW, q.dark);
  for (const lx of legs) {
    bar(ctx, lx, bodyY, lx, ground - 0.5, legW, q.coat);
    bar(ctx, lx, ground - 1.2, lx, ground - 0.4, legW, q.dark);
  }

  // Cola.
  const tailX = bodyX - bodyRx;
  const tailY = bodyY - bodyH * 0.25;
  if (q.tail === 'bushy') {
    blob(ctx, tailX - bodyRx * 0.45, tailY + bodyH * 0.1, bodyRx * 0.55, bodyH * 0.3, q.coat);
    blob(ctx, tailX - bodyRx * 0.85, tailY + bodyH * 0.1, bodyRx * 0.18, bodyH * 0.22, q.belly);
  } else if (q.tail === 'puff') {
    blob(ctx, tailX, tailY, bodyH * 0.22, bodyH * 0.2, '#f4f0e8');
    blob(ctx, tailX + 0.4, tailY - bodyH * 0.12, bodyH * 0.14, bodyH * 0.08, q.dark);
  } else if (q.tail === 'short') {
    blob(ctx, tailX + 0.5, tailY, bodyH * 0.14, bodyH * 0.18, q.dark);
  } else {
    bar(ctx, tailX + 0.5, tailY, tailX - bodyRx * 0.18, tailY + bodyH * 0.55, Math.max(1, legW * 0.6), q.dark);
  }

  // Cuerpo, con la barriga clara y la grupa.
  blob(ctx, bodyX, bodyY, bodyRx, bodyH / 2, q.coat);
  blob(ctx, bodyX, bodyY + bodyH * 0.25, bodyRx * 0.75, bodyH * 0.22, q.belly);
  if (q.rump) blob(ctx, bodyX - bodyRx * 0.82, bodyY - bodyH * 0.05, bodyRx * 0.2, bodyH * 0.32, q.rump);
  if (q.hump) {
    blob(ctx, bodyX + bodyRx * 0.35, bodyY - bodyH * 0.28, bodyRx * 0.62, bodyH * 0.5, q.mane ?? q.coat);
  }
  if (q.pattern === 'spots' && q.patternColor) {
    for (const [fx, fy] of [[-0.5, -0.2], [-0.15, -0.3], [0.2, -0.22], [0.45, -0.1], [-0.3, 0.05], [0.05, 0]]) {
      blob(ctx, bodyX + bodyRx * fx, bodyY + bodyH * fy, Math.max(0.6, h * 0.025), Math.max(0.6, h * 0.025), q.patternColor);
    }
  }
  if (q.pattern === 'stripes' && q.patternColor) {
    for (const fy of [-0.28, -0.08, 0.12]) {
      bar(ctx, bodyX - bodyRx * 0.75, bodyY + bodyH * fy, bodyX + bodyRx * 0.7, bodyY + bodyH * fy, Math.max(0.8, h * 0.03), q.patternColor);
    }
  }
  // Cuello y cabeza.
  const headR = q.head * h;
  const hx = x0 + L * q.headAt;
  const hy = ground - q.headUp * h;
  const neckFromX = bodyX + bodyRx * 0.7;
  const neckFromY = bodyY - bodyH * 0.15;
  bar(ctx, neckFromX, neckFromY, hx - headR * 0.3, hy + headR * 0.2, Math.max(headR * 1.4, bodyH * 0.45), q.coat);
  if (q.mane && !q.hump && q.horns === 'antlers') {
    blob(ctx, (neckFromX + hx) / 2, (neckFromY + hy) / 2 + headR, headR * 1.2, headR * 1.4, q.mane);
  }
  if (q.mane && q.horns === 'tusks') {
    bar(ctx, bodyX - bodyRx * 0.5, bodyY - bodyH * 0.48, hx - headR, hy - headR * 0.6, Math.max(1, h * 0.05), q.mane);
  }

  // Orejas, detras de la cabeza.
  if (q.ears === 'long') {
    bar(ctx, hx - headR * 0.2, hy - headR * 0.5, hx - headR * 0.9, ground - h + 1, Math.max(1.4, headR * 0.6), q.coat);
    bar(ctx, hx - headR * 0.75, ground - h + 2.2, hx - headR * 0.9, ground - h + 1, Math.max(1.4, headR * 0.6), q.dark);
  } else if (q.ears === 'pointy') {
    bar(ctx, hx - headR * 0.3, hy - headR * 0.6, hx - headR * 0.75, hy - headR * 1.7, Math.max(1.2, headR * 0.55), q.coat);
  } else if (q.ears === 'round') {
    blob(ctx, hx - headR * 0.35, hy - headR * 0.85, headR * 0.3, headR * 0.3, q.dark);
  }

  // Cuernos, detras de la cabeza, salvo los colmillos.
  const hornW = Math.max(1.1, h * 0.035);
  if (q.horns === 'bison') {
    bar(ctx, hx - headR * 0.2, hy - headR * 0.7, hx + headR * 0.3, hy - headR * 1.3, hornW, '#1a1410');
  } else if (q.horns === 'ibex') {
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = hornW * 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - headR * 0.1, hy - headR * 0.8);
    ctx.quadraticCurveTo(hx - headR * 0.5, ground - h + 1, hx - headR * 3.2, ground - h + h * 0.18);
    ctx.stroke();
  } else if (q.horns === 'antlers') {
    ctx.strokeStyle = '#d8ccb0';
    ctx.lineWidth = hornW;
    ctx.lineCap = 'round';
    const top = ground - h + 1;
    const bx = hx - headR * 0.2;
    const by = hy - headR * 0.8;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - h * 0.22, by - h * 0.15, bx - h * 0.12, top);
    ctx.moveTo(bx - h * 0.1, by - h * 0.12);
    ctx.lineTo(bx + h * 0.06, by - h * 0.2);
    ctx.moveTo(bx - h * 0.16, by - h * 0.25);
    ctx.lineTo(bx - h * 0.02, top + h * 0.06);
    ctx.moveTo(bx, by - h * 0.02);
    ctx.lineTo(bx + h * 0.08, by - h * 0.06);
    ctx.stroke();
  }

  // Cabeza y hocico.
  blob(ctx, hx, hy, headR * 1.05, headR * 0.85, q.coat);
  const sx = hx + headR * (0.6 + q.snout * 0.5);
  const sy = hy + headR * 0.25;
  blob(ctx, sx, sy, headR * (0.35 + q.snout * 0.35), headR * 0.45, q.coat);
  blob(ctx, sx + headR * (0.3 + q.snout * 0.3), sy, Math.max(0.6, headR * 0.18), Math.max(0.6, headR * 0.18), q.dark);
  if (q.beard) blob(ctx, hx + headR * 0.4, hy + headR * 1.0, headR * 0.35, headR * 0.5, q.mane ?? q.dark);
  if (q.horns === 'tusks') bar(ctx, sx, sy + headR * 0.3, sx + headR * 0.3, sy - headR * 0.1, Math.max(0.8, h * 0.025), '#f0ead8');
  // El ojo.
  blob(ctx, hx + headR * 0.25, hy - headR * 0.2, Math.max(0.55, headR * 0.16), Math.max(0.55, headR * 0.16), '#14100c');
}

function drawGull(ctx: CanvasRenderingContext2D, stage: Stage, h: number, x0: number, ground: number): void {
  const L = h * 1.3;
  const chick = stage === Stage.Infant;
  const young = stage === Stage.Juvenile;
  const body = chick ? '#b8a890' : young ? '#8a7a68' : '#f6f6f2';
  const wing = chick ? '#a09078' : young ? '#6e604e' : '#9aa4ac';
  const legH = h * (chick ? 0.2 : 0.26);
  const bodyY = ground - legH - h * 0.22;
  const bodyX = x0 + L * 0.48;
  // Patas.
  for (const dx of [-0.06, 0.06]) bar(ctx, bodyX + L * dx, bodyY, bodyX + L * dx, ground - 0.5, Math.max(1, h * 0.05), chick ? '#5a5048' : '#e0c040');
  // Cola y cuerpo.
  if (!chick) {
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(bodyX - L * 0.2, bodyY - h * 0.05);
    ctx.lineTo(x0 + L * 0.04, bodyY - h * 0.02);
    ctx.lineTo(bodyX - L * 0.2, bodyY + h * 0.12);
    ctx.fill();
  }
  blob(ctx, bodyX, bodyY, L * (chick ? 0.3 : 0.32), h * (chick ? 0.3 : 0.22), body);
  if (!chick) {
    // El ala plegada, con la punta negra y su lunar blanco en el adulto.
    blob(ctx, bodyX - L * 0.05, bodyY - h * 0.05, L * 0.26, h * 0.13, wing);
    blob(ctx, x0 + L * 0.14, bodyY - h * 0.02, L * 0.08, h * 0.06, young ? '#3a3028' : '#18181a');
    if (!young) blob(ctx, x0 + L * 0.12, bodyY - h * 0.03, Math.max(0.5, h * 0.025), Math.max(0.5, h * 0.025), '#ffffff');
  }
  if (chick || young) {
    for (const [fx, fy] of [[-0.15, -0.1], [0.05, -0.15], [0.15, 0.05], [-0.05, 0.08]]) {
      blob(ctx, bodyX + L * fx, bodyY + h * fy, Math.max(0.6, h * 0.035), Math.max(0.6, h * 0.035), chick ? '#6a5a48' : '#c8bca8');
    }
  }
  // Cabeza, pico y ojo.
  const hx = bodyX + L * (chick ? 0.24 : 0.3);
  const hy = bodyY - h * (chick ? 0.2 : 0.28);
  const hr = h * (chick ? 0.2 : 0.14);
  blob(ctx, hx, hy, hr, hr * 0.92, chick ? body : young ? '#9a8a78' : '#ffffff');
  const beak = chick ? '#3a3430' : young ? '#2a2420' : '#e8c030';
  bar(ctx, hx + hr * 0.8, hy + hr * 0.15, hx + hr * 2.0, hy + hr * 0.3, Math.max(1, hr * 0.45), beak);
  if (!chick && !young) blob(ctx, hx + hr * 1.7, hy + hr * 0.45, Math.max(0.5, hr * 0.15), Math.max(0.5, hr * 0.15), '#d03020');
  blob(ctx, hx + hr * 0.3, hy - hr * 0.2, Math.max(0.55, hr * 0.17), Math.max(0.55, hr * 0.17), '#14100c');
}

function drawCrab(ctx: CanvasRenderingContext2D, stage: Stage, h: number, x0: number, ground: number): void {
  const L = h * 1.8;
  const shell = stage === Stage.Infant ? '#7a9a4a' : stage === Stage.Juvenile ? '#5a7a32' : '#4a6a2a';
  const dark = '#2e4418';
  const cx = x0 + L / 2;
  const cy = ground - h * 0.45;
  // Patas, tres a cada lado, y las pinzas por delante.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const sx = cx + side * L * (0.18 + i * 0.07);
      bar(ctx, sx, cy, sx + side * L * 0.14, ground - 0.5, Math.max(0.9, h * 0.06), dark);
    }
    blob(ctx, cx + side * L * 0.36, cy - h * 0.18, L * 0.1, h * 0.14, shell);
    blob(ctx, cx + side * L * 0.4, cy - h * 0.24, L * 0.05, h * 0.06, '#c8a050');
  }
  blob(ctx, cx, cy, L * 0.3, h * 0.28, shell);
  blob(ctx, cx, cy + h * 0.06, L * 0.22, h * 0.14, dark);
  // Ojos en su pedunculo.
  for (const side of [-1, 1]) {
    bar(ctx, cx + side * L * 0.06, cy - h * 0.2, cx + side * L * 0.08, cy - h * 0.42, Math.max(0.8, h * 0.05), shell);
    blob(ctx, cx + side * L * 0.08, cy - h * 0.44, Math.max(0.6, h * 0.06), Math.max(0.6, h * 0.06), '#14100c');
  }
}

/**
 * Largo del dibujo de cada uno (en altos) y donde cae el centro de su cuerpo a
 * lo largo de el: ahi va el ancla, porque ahi esta la caja de golpe.
 */
function layoutOf(species: Species, stage: Stage): { aspect: number; body: number } {
  if (species === Species.Gull) return { aspect: 1.3, body: 0.48 };
  if (species === Species.Crab) return { aspect: 1.8, body: 0.5 };
  return { aspect: staged(species, stage, ADULT[species]!).aspect, body: 0.46 };
}

/**
 * El dibujo de un animal de una etapa, mirando a la derecha, con el ancla en
 * sus pies, bajo el centro del cuerpo. El lienzo deja sitio a los dos lados:
 * la cola de un zorro sale por detras y el hocico de un bisonte por delante.
 * `detail` multiplica la densidad del lienzo, como en `art.ts`.
 */
export function makeAnimalArt(species: Species, stage: Stage, detail = 1): (FeatureArt & { figure: number }) | null {
  const h = figurePx(species, stage);
  const { aspect, body } = layoutOf(species, stage);
  const L = h * aspect;
  const x0 = MARGIN + L * 0.3;
  const w = Math.ceil(L * 1.6) + MARGIN * 2;
  const made = newCanvas(w, h + MARGIN * 2, detail);
  if (!made) return null;
  const [canvas, ctx] = made;
  const ground = h + MARGIN;
  if (species === Species.Gull) drawGull(ctx, stage, h, x0, ground);
  else if (species === Species.Crab) drawCrab(ctx, stage, h, x0, ground);
  else drawQuad(ctx, staged(species, stage, ADULT[species]!), h, x0, ground);
  return { canvas, anchorX: (x0 + L * body) / w, anchorY: ground / (h + MARGIN * 2), figure: h };
}

/**
 * Las diez especies en sus tres etapas, en una rejilla y a escala entre ellas,
 * sobre hierba: para mirar el dibujo de una vez (`window.__verdant`). Devuelve
 * el lienzo como `data:` URL.
 */
export function faunaGallery(scale = 3): string {
  const cell = 46;
  const canvas = document.createElement('canvas');
  canvas.width = cell * 3 * scale;
  canvas.height = cell * 10 * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#6a9a48';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let s = 0; s < 10; s++) {
    for (let st = 0; st < 3; st++) {
      const art = makeAnimalArt(s as Species, st as Stage, scale);
      if (!art) continue;
      // A escala del mundo: un bloque, 18 pixeles logicos.
      const k = (animalHeight(s as Species, st as Stage) * 18) / art.figure;
      const w = (art.canvas.width / scale) * k * scale;
      const h = (art.canvas.height / scale) * k * scale;
      const x = (st * cell + cell / 2) * scale - art.anchorX * w;
      const y = ((s + 1) * cell - 3) * scale - art.anchorY * h;
      ctx.drawImage(art.canvas, x, y, w, h);
    }
  }
  return canvas.toDataURL('image/png');
}
