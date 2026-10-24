/**
 * El desglose del frame mas caro, para medir los tirones en el telefono.
 *
 * El contador de FPS es una media de un segundo, y un tiron se diluye en ella:
 * un frame de 300 ms en un segundo de 42 fps sale como «32». Esto guarda el
 * frame que mas trabajo llevo en los ultimos `HOLD_SECONDS`, con lo que gasto en
 * cada parte, para leerlo en el panel de desarrollo mientras se cruza un borde
 * de chunk (tanda movil 1, 2026-10-24).
 *
 * Mide tiempo de reloj real (`performance.now()`), no el del juego: con el reloj
 * manual de las pruebas el juego no avanza solo, pero el trabajo cuesta igual.
 * Es trabajo de CPU del hilo principal; lo que la GPU tarde despues no se ve
 * aqui, salvo la subida de geometria nueva, que three.js hace dentro de
 * `render` y por eso cae en «gpu».
 */

/** Las partes del frame que se miden. */
export const PHASES = ['nucleo', 'malla', 'objetos', 'menas', 'sombras', 'fauna', 'gpu'] as const;
export type Phase = (typeof PHASES)[number];

/** Cuanto se guarda el peor frame antes de olvidarlo: lo justo para leerlo. */
const HOLD_SECONDS = 5;

export interface FramePeak {
  /** Trabajo del frame entero, en ms. */
  readonly totalMs: number;
  /** Chunks construidos en ese frame. */
  readonly chunks: number;
  /** Ms de cada parte. Lo que falta hasta `totalMs` es el resto del frame. */
  readonly phases: Readonly<Record<Phase, number>>;
}

const zero = (): Record<Phase, number> =>
  Object.fromEntries(PHASES.map((p) => [p, 0])) as Record<Phase, number>;

export class FrameProbe {
  private start = 0;
  private current = zero();
  private chunks = 0;
  private held: FramePeak = { totalMs: 0, chunks: 0, phases: zero() };
  private heldAt = 0;

  /** Abre el frame. */
  begin(): void {
    this.start = performance.now();
    this.current = zero();
    this.chunks = 0;
  }

  /** Suma `ms` a una parte del frame en curso. */
  add(phase: Phase, ms: number): void {
    this.current[phase] += ms;
  }

  /** Mide lo que tarda `fn` y lo suma a `phase`. */
  time<T>(phase: Phase, fn: () => T): T {
    const t0 = performance.now();
    const out = fn();
    this.current[phase] += performance.now() - t0;
    return out;
  }

  /** Un chunk construido en este frame. */
  countChunk(): void {
    this.chunks++;
  }

  /** Cierra el frame y lo guarda si es el peor de la ventana. */
  end(): void {
    const now = performance.now();
    const totalMs = now - this.start;
    if (totalMs >= this.held.totalMs || (now - this.heldAt) / 1000 > HOLD_SECONDS) {
      this.held = { totalMs, chunks: this.chunks, phases: this.current };
      this.heldAt = now;
    }
  }

  get peak(): FramePeak {
    return this.held;
  }

  /** El pico en una linea, para el panel. */
  get text(): string {
    const p = this.held;
    const parts = PHASES.filter((k) => p.phases[k] >= 0.5).map((k) => `${k} ${p.phases[k].toFixed(0)}`);
    return `${p.totalMs.toFixed(0)} ms · ${p.chunks} chunks${parts.length ? ` · ${parts.join(' · ')}` : ''}`;
  }
}
