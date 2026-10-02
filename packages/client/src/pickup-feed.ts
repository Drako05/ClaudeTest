/**
 * El registro de objetos: «+5 Madera», «-1 Bayas», cada vez que algo entra o
 * sale del inventario (pedido del autor, 2026-09-29).
 *
 * Puro y sin DOM, como `effects.ts`: aqui vive cuanto le queda a cada linea y
 * donde esta, y `main.ts` solo la pinta. Asi se mide en Node.
 *
 * Lo que es del autor: aparece una linea pequena, sube despacio mientras se
 * desvanece —como el chat de un directo—, las nuevas van debajo de las
 * anteriores y **nunca hay mas de cinco**: al llegar la quinta, la mas vieja
 * se apaga mucho mas deprisa. Los tiempos y distancias son **deduccion mia**.
 *
 * Sale de COMPARAR los totales del inventario entre frames, igual que el
 * registro del panel de desarrollo: el nucleo no se entera de que existe, y
 * mover un objeto de casilla no escribe nada porque no cambia ningun total.
 */

import { RESOURCE_NAMES } from '@verdant/shared';

/** Lo que vive una linea, en segundos. **Deduccion mia.** */
export const FEED_SECONDS = 3;
/** Lo que tarda en irse la mas vieja cuando llega la quinta. **Deduccion mia.** */
export const FEED_FAST_SECONDS = 0.3;
/** Lo que sube una linea a lo largo de su vida, en pixeles. **Deduccion mia.** */
export const FEED_RISE = 18;
/** Alto de una linea, en pixeles: lo que la separa de la de debajo. */
export const FEED_LINE = 15;
/** Nunca mas de cinco a la vez (del autor). */
export const FEED_MAX = 5;
/** Fraccion de la vida que pasa entera antes de empezar a desvanecerse. */
const FADE_FROM = 0.4;
/** Rapidez con la que una linea se desliza al hueco que deja otra, por segundo. */
const SLIDE_RATE = 12;

/** Lo que cambio de cada objeto entre dos recuentos. */
export interface Delta {
  readonly item: number;
  readonly delta: number;
}

/** Lo que cambio entre dos recuentos de totales por objeto; nada si son iguales. */
export function inventoryDelta(prev: readonly number[], next: readonly number[]): Delta[] {
  const out: Delta[] = [];
  const n = Math.max(prev.length, next.length);
  for (let item = 0; item < n; item++) {
    const delta = (next[item] ?? 0) - (prev[item] ?? 0);
    if (delta !== 0) out.push({ item, delta });
  }
  return out;
}

/** «+5 Madera» o «-1 Bayas», con el signo ASCII que escribio el autor. */
export function deltaText({ item, delta }: Delta): string {
  return `${delta > 0 ? '+' : ''}${delta} ${RESOURCE_NAMES[item]}`;
}

export interface FeedLine {
  readonly id: number;
  readonly text: string;
  readonly gain: boolean;
  age: number;
  /** Edad a la que se va. Se acorta cuando le toca apagarse deprisa. */
  life: number;
  /** Si se esta apagando deprisa: edad y opacidad al empezar. */
  fast: { at: number; from: number } | null;
  /**
   * Posicion suavizada desde la mas vieja, en pixeles: hacia abajo en el
   * movil, hacia arriba en PC (`aboveButtonY`).
   */
  fromTop: number;
}

export class PickupFeed {
  readonly lines: FeedLine[] = [];
  private nextId = 0;

  /** Una linea nueva, debajo de las que ya hay. */
  push(text: string, gain: boolean): void {
    const n = this.lines.length;
    this.lines.push({
      id: this.nextId++,
      text,
      gain,
      age: 0,
      life: FEED_SECONDS,
      fast: null,
      fromTop: n * FEED_LINE,
    });
    // Nunca mas de cinco: si llegan muchas de golpe, la mas vieja cae en el acto.
    while (this.lines.length > FEED_MAX) this.lines.shift();
    // Y al llegar a cinco, la mas vieja que aun no se iba se apaga deprisa.
    if (this.lines.length >= FEED_MAX) {
      const oldest = this.lines.find((l) => !l.fast);
      if (oldest) {
        oldest.fast = { at: oldest.age, from: opacityOf(oldest) };
        oldest.life = Math.min(oldest.life, oldest.age + FEED_FAST_SECONDS);
      }
    }
  }

  /** Lo que haya en el inventario: una linea por objeto que cambio. */
  pushDeltas(deltas: readonly Delta[]): void {
    for (const d of deltas) this.push(deltaText(d), d.delta > 0);
  }

  /** Avanza `dt` segundos de tiempo real. */
  advance(dt: number): void {
    for (const l of this.lines) l.age += dt;
    for (let i = this.lines.length - 1; i >= 0; i--) {
      if (this.lines[i].age >= this.lines[i].life) this.lines.splice(i, 1);
    }
    const k = 1 - Math.exp(-SLIDE_RATE * dt);
    this.lines.forEach((l, i) => {
      l.fromTop += (i * FEED_LINE - l.fromTop) * k;
    });
  }

  clear(): void {
    this.lines.length = 0;
  }
}

/** Opacidad de una linea: entera al principio y desvaneciendose despues. */
export function opacityOf(l: FeedLine): number {
  if (l.fast) return Math.max(0, l.fast.from * (1 - (l.age - l.fast.at) / FEED_FAST_SECONDS));
  const p = l.age / FEED_SECONDS;
  return p < FADE_FROM ? 1 : Math.max(0, 1 - (p - FADE_FROM) / (1 - FADE_FROM));
}

/** Lo que ha subido una linea desde que nacio, en pixeles. */
export function riseOf(l: FeedLine): number {
  return FEED_RISE * Math.min(1, l.age / FEED_SECONDS);
}

/**
 * En PC, donde va una linea respecto al borde de arriba del boton INVENTARIO,
 * en pixeles (negativo es encima): **baja hacia el boton** mientras se
 * desvanece (pedido del autor, 2026-10-02). Lo mismo que en el movil, que
 * cuelga debajo y sube hacia el, pero del reves: la mas vieja, la mas cercana
 * al boton, y las nuevas encima (esa simetria es deduccion mia).
 */
export function aboveButtonY(l: FeedLine): number {
  return -(l.fromTop + FEED_RISE - riseOf(l));
}
