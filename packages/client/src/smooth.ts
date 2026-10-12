/**
 * Lo que suaviza el dibujo sin tocar la simulacion (2026-10-12).
 *
 * Sustituye a la camara con retraso de la fase C, que el autor probo y
 * descarto: «no ayudo en nada, incluso en primera persona genera tirones raros,
 * es injugable asi». Eligio esto, de lo que se le propuso:
 *
 * - **Interpolar el dibujo entre ticks** (`TickInterpolation`). La simulacion
 *   va a 60 Hz y la pantalla a lo que de: sin esto, a 144 Hz unos fotogramas
 *   avanzan un tick y otros ninguno, y lo que se mueve va a saltos. Se dibuja
 *   entre el tick anterior y el ultimo, en la fraccion de tick que lleva el
 *   acumulador (regla 8: la interpolacion es cosa del cliente). Cuesta un tick
 *   de retraso en lo que se ve de la posicion; la mirada no lo lleva.
 * - **Suavizar solo el escalon** (`StepSmoother`). Subir medio bloque andando
 *   es de golpe en el nucleo (regla 21); la camara lo sube en una curva corta.
 *   Nada mas: no hay retraso al andar ni al girar, y la camara mira por la
 *   linea de la mirada, sin punto de mira.
 *
 * Las dos son de dibujo: la `Intent` lleva la mirada tal cual (regla 5) y el
 * golpe sale de los ojos de verdad. **Puro**: sin three.js ni DOM, para
 * afirmarlo en Node.
 */

/**
 * Lo que tarda en apagarse el desfase de un escalon, en segundos: queda menos
 * de un 5 %. Ajustable en el panel de desarrollo, de 0 (sin suavizar) a
 * `STEP_SMOOTH_MAX`.
 *
 * **Decision del autor** (2026-10-12), tras probarlo con el deslizador: «con
 * 0,1 s se notan los escalones sin ser incomodos, ya pasados los 0,2 s casi se
 * pierde el "jalon" del escalon». La curva la propuse yo y es la que probo: un
 * muelle criticamente amortiguado, que arranca sin velocidad, llega sin codo y
 * nunca se pasa. Con una exponencial simple el primer fotograma ya subia el
 * 40 % del escalon: un tiron.
 */
export const STEP_SMOOTH = 0.1;
/** Lo que mueve el deslizador del panel de desarrollo. */
export const STEP_SMOOTH_MAX = 0.3;
/**
 * `ω·t` en que un muelle criticamente amortiguado, saliendo quieto, deja un
 * 5 %: `(1 + ωt)·e^-ωt = 0,05`.
 */
const SETTLE = 4.744;

/**
 * Lo que cuenta como escalon: una subida de golpe, en un tick, con los pies en
 * el suelo antes y despues. Por debajo, ruido de coma flotante; por encima del
 * maximo no es un escalon sino otra cosa (aparecer en otro sitio). **Deduccion
 * mia**: andando se sube como mucho medio bloque (`STEP_UP`), y el doble deja
 * margen sin confundirlo con un salto de sitio.
 */
const STEP_MIN = 1e-6;
const STEP_MAX = 1;

/**
 * Mas lejos que esto en un tick no se interpola: se salta. Es para lo que no es
 * moverse —nacer, reaparecer, abrir con `?x=&y=`—. **Deduccion mia**, la misma
 * distancia que tenia el retraso: cayendo diez bloques se van ~0,6 por tick.
 */
export const INTERP_SNAP = 8;

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Las posiciones del tick anterior de lo que se dibuja, para dibujar entre ese
 * y el ultimo.
 */
export class TickInterpolation {
  private readonly before = new Map<number, Point3>();

  /**
   * Antes de cada tick: guarda donde esta cada `id` de `ids`, que es donde
   * estaba «antes» cuando el tick acabe. Olvida los demas.
   */
  capture(ids: Iterable<number>, x: ArrayLike<number>, y: ArrayLike<number>, z: ArrayLike<number>): void {
    this.before.clear();
    for (const id of ids) this.before.set(id, { x: x[id], y: y[id], z: z[id] });
  }

  /**
   * Sube lo de antes de `id` en `dz`: un escalon no se interpola —el cuerpo
   * sube de golpe, como en el nucleo—, que de suavizarlo se encarga la camara.
   */
  lift(id: number, dz: number): void {
    const p = this.before.get(id);
    if (p) p.z += dz;
  }

  /**
   * Donde dibujar `id`, que ahora esta en `now`, a la fraccion `alpha` (0 a 1)
   * del tick que va del anterior al ultimo. Sin anterior, o mas lejos que
   * `INTERP_SNAP`, donde esta.
   */
  at(id: number, now: Point3, alpha: number): Point3 {
    const p = this.before.get(id);
    if (!p) return { ...now };
    if (Math.hypot(now.x - p.x, now.y - p.y, now.z - p.z) > INTERP_SNAP) return { ...now };
    const a = Math.min(1, Math.max(0, alpha));
    return { x: p.x + (now.x - p.x) * a, y: p.y + (now.y - p.y) * a, z: p.z + (now.z - p.z) * a };
  }
}

/**
 * El desfase de la camara al subir un escalon: nace al subir de golpe —la
 * camara se queda donde estaba— y se apaga en `STEP_SMOOTH`.
 */
export class StepSmoother {
  /** Lo que la camara va por debajo de los ojos, en bloques (cero o negativo). */
  offset = 0;
  /** A que velocidad se apaga, en bloques por segundo: el muelle tiene inercia. */
  private speed = 0;
  /** El mayor desfase desde el arranque, en valor absoluto: para la prueba de humo. */
  peak = 0;

  /**
   * Un tick: la altura de los pies antes y despues, y si estaban en el suelo.
   * Devuelve lo que ha subido de golpe, o 0 si no fue un escalon.
   */
  tick(zBefore: number, zAfter: number, groundedBefore: boolean, groundedAfter: boolean): number {
    const rise = zAfter - zBefore;
    if (!groundedBefore || !groundedAfter || rise <= STEP_MIN || rise > STEP_MAX) return 0;
    this.offset -= rise;
    this.peak = Math.max(this.peak, -this.offset);
    return rise;
  }

  /**
   * Apaga el desfase lo que toca en `dt` segundos. Con `time` cero, de golpe.
   * Es la solucion exacta del muelle, no un paso de integracion: vale igual
   * con un fotograma de 1/144 s que con uno de 0,25.
   */
  advance(dt: number, time = STEP_SMOOTH): void {
    if (time <= 0) {
      this.offset = this.speed = 0;
      return;
    }
    const w = SETTLE / time;
    const t = Math.max(0, dt);
    const decay = Math.exp(-w * t);
    const carry = this.speed + w * this.offset;
    this.offset = (this.offset + carry * t) * decay;
    this.speed = (this.speed - w * carry * t) * decay;
  }
}
