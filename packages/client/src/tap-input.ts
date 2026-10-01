/**
 * El orden de las cosas en el modo TAP de la ENTRADA (decision del autor,
 * 2026-10-01), tick a tick y sin DOM, para afirmarlo en Node
 * (`tests/tap-input.test.ts`):
 *
 * - **Un toque rapido** en el mundo USA en ese punto y, al tick siguiente,
 *   ATACA alli **solo si el USAR no hizo nada**: abrir una estacion, comer,
 *   sembrar o colocar cancelan el ataque.
 * - **Un toque sostenido** ataca en el acto y luego con la cadencia del boton
 *   (`ACTION_REPEAT_TICKS`), hacia donde este el dedo en cada golpe.
 *
 * Que es un toque y que un sostenido lo decide `gestures.ts`; donde cae la
 * mirada, `main.ts`. `A` es esa mirada, que aqui no se mira.
 */

/** Lo que pide un tick del modo TAP. */
export interface TapTick<A> {
  use: boolean;
  harvest: boolean;
  /** La mirada de este tick, o `null` para la de siempre (la cruz). */
  aim: A | null;
}

export interface TapInput<A> {
  /** La mirada de un toque rapido recien hecho, o `null`. */
  tap: A | null;
  /** Mientras se sostiene: la mirada hacia el dedo, que se pide solo al golpear. */
  hold: (() => A) | null;
  /** True el tick en que se reconoce el sostenido: golpea en el acto. */
  strike: boolean;
  /** Si el USAR del tick anterior se ejecuto (`state.lastUsed`). */
  usedLast: boolean;
}

export class TapSequencer<A> {
  /** El ataque que sigue a un toque si su USAR no hizo nada. */
  private pending: A | null = null;
  private ticks = 0;

  constructor(private readonly repeatTicks: number) {}

  step(input: TapInput<A>): TapTick<A> {
    const out: TapTick<A> = { use: false, harvest: false, aim: null };
    if (this.pending !== null) {
      if (!input.usedLast) {
        out.harvest = true;
        out.aim = this.pending;
      }
      this.pending = null;
    }
    if (input.tap !== null) {
      out.use = true;
      out.aim = input.tap;
      this.pending = input.tap;
    }
    if (input.hold) {
      if (input.strike || ++this.ticks >= this.repeatTicks) {
        out.harvest = true;
        out.aim = input.hold();
        this.ticks = 0;
      }
    } else {
      this.ticks = 0;
    }
    return out;
  }

  /** Olvida lo pendiente: con el inventario abierto solo se anda. */
  clear(): void {
    this.pending = null;
    this.ticks = 0;
  }
}
