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

/** Un vector en las coordenadas del nucleo (`z` arriba). */
export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/** Lo torcido que se ve un trazo en pantalla: su alto entre su ancho. */
export function tiltOf(points: ReadonlyArray<{ x: number; y: number }>): number {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  return (y1 - y0) / Math.max(1, x1 - x0);
}

/**
 * El giro con el que el barrido SE VE mas horizontal desde la camara, a partir
 * del de `rollFor`. `look` dice donde caeria en pantalla con cada giro, ya
 * cortado por el terreno.
 *
 * En primera persona el de `rollFor` es exacto y se queda. En tercera la
 * camara no esta en los ojos, y si el toque cae al lado del jugador y el
 * barrido no llega al suelo, ese arco en el aire se ve de frente y torcido;
 * por eso se busca, en la media vuelta alrededor de `base`, el que deja el
 * trazo menos alto para lo ancho que es. Media vuelta y no entera: el sector
 * es simetrico, y asi el barrido sigue recorriendose hacia el mismo lado.
 */
export function flattestRoll(
  base: number,
  look: (roll: number) => ReadonlyArray<{ x: number; y: number }>,
  steps = 12,
): number {
  let best = base;
  let bestTilt = tiltOf(look(base));
  const probe = (roll: number) => {
    const t = tiltOf(look(roll));
    // Lo que empata no desplaza al de `rollFor`, que es el exacto.
    if (t < bestTilt - 1e-6) {
      best = roll;
      bestTilt = t;
    }
  };
  const step = Math.PI / steps;
  for (let k = 1; k < steps / 2; k++) {
    probe(base + k * step);
    probe(base - k * step);
  }
  // Y se afina alrededor del mejor.
  const coarse = best;
  for (let k = 1; k <= 4; k++) {
    probe(coarse + (k * step) / 5);
    probe(coarse - (k * step) / 5);
  }
  return best;
}

/**
 * El giro del plano del barrido alrededor de la mirada `dir` (unitaria) para
 * que contenga la derecha de la camara `camRight` (horizontal), que es lo que
 * lo hace verse horizontal en pantalla y centrado en el toque (pedido del
 * autor, 2026-10-01). En primera persona es exacto; en tercera, casi, porque
 * la camara no esta en los ojos. Es el `aimRoll` de la `Intent`: positivo, su
 * derecha sube, como en `sectorRays`.
 */
export function rollFor(dir: Vec3Like, camRight: Vec3Like): number {
  const flat = Math.hypot(dir.x, dir.y);
  if (flat < 1e-9) return 0;
  // La derecha horizontal de la mirada, la del sector sin girar.
  const h = { x: -dir.y / flat, y: dir.x / flat, z: 0 };
  // La derecha de la camara, quitandole lo que va a lo largo de la mirada.
  const along = camRight.x * dir.x + camRight.y * dir.y + camRight.z * dir.z;
  const t = { x: camRight.x - dir.x * along, y: camRight.y - dir.y * along, z: camRight.z - dir.z * along };
  // dir × h, el eje hacia el que sube la derecha al girar.
  const up = { x: -dir.z * h.y, y: dir.z * h.x, z: dir.x * h.y - dir.y * h.x };
  return Math.atan2(t.x * up.x + t.y * up.y + t.z * up.z, t.x * h.x + t.y * h.y + t.z * h.z);
}
