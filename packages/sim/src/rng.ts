/**
 * Aleatoriedad determinista.
 *
 * REGLA: en todo el nucleo de simulacion no se usa Math.random() jamas. Toda
 * aleatoriedad nace de una semilla explicita, de modo que la misma semilla
 * produzca siempre el mismo mundo. De esto dependen el multijugador con
 * prediccion, la reproduccion de bugs y los tests headless.
 */

/** PRNG rapido de 32 bits. Devuelve floats en [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash entero de dos coordenadas mas una semilla.
 * Permite decidir cosas por-tile sin estado y sin recorrer el mundo en orden:
 * cualquier tile puede evaluarse aislado y da siempre el mismo resultado.
 */
export function hash2D(seed: number, x: number, y: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (x >>> 0), 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h ^ (y >>> 0), 0x165667b1);
  h ^= h >>> 13;
  h = Math.imul(h, 0x9e3779b1);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Igual que hash2D pero normalizado a [0, 1). */
export function hash2DFloat(seed: number, x: number, y: number): number {
  return hash2D(seed, x, y) / 4294967296;
}

const GRAD_2D = new Float64Array([
  1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1, 0, -1,
]);

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

/**
 * Ruido simplex 2D con tabla de permutacion sembrada.
 * Base de toda la generacion de terreno.
 */
export class SimplexNoise {
  private readonly perm = new Uint8Array(512);
  private readonly permMod12 = new Uint8Array(512);

  constructor(seed: number) {
    const rand = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates sembrado: la tabla depende solo de la semilla.
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  /** Ruido en [-1, 1]. */
  noise2D(xin: number, yin: number): number {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);

    let i1: number;
    let j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0;
    let n1 = 0;
    let n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      const gi0 = this.permMod12[ii + this.perm[jj]] * 2;
      t0 *= t0;
      n0 = t0 * t0 * (GRAD_2D[gi0] * x0 + GRAD_2D[gi0 + 1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]] * 2;
      t1 *= t1;
      n1 = t1 * t1 * (GRAD_2D[gi1] * x1 + GRAD_2D[gi1 + 1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]] * 2;
      t2 *= t2;
      n2 = t2 * t2 * (GRAD_2D[gi2] * x2 + GRAD_2D[gi2 + 1] * y2);
    }

    return 70 * (n0 + n1 + n2);
  }

  /** Ruido fractal: varias octavas superpuestas. Devuelve aprox [-1, 1]. */
  fbm(x: number, y: number, octaves: number, lacunarity = 2, gain = 0.5): number {
    let freq = 1;
    let amp = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += this.noise2D(x * freq, y * freq) * amp;
      norm += amp;
      freq *= lacunarity;
      amp *= gain;
    }
    return sum / norm;
  }
}
