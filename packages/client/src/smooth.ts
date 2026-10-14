/**
 * Lo que suaviza el dibujo sin tocar la simulacion (2026-10-12).
 *
 * Sustituye a la camara con retraso de la fase C, que el autor probo y
 * descarto: «no ayudo en nada, incluso en primera persona genera tirones raros,
 * es injugable asi». **Interpolar el dibujo entre ticks**
 * (`TickInterpolation`): la simulacion va a 60 Hz y la pantalla a lo que de;
 * sin esto, a 144 Hz unos fotogramas avanzan un tick y otros ninguno, y lo que
 * se mueve va a saltos. Se dibuja entre el tick anterior y el ultimo, en la
 * fraccion de tick que lleva el acumulador (regla 8: la interpolacion es cosa
 * del cliente). Cuesta un tick de retraso en lo que se ve de la posicion; la
 * mirada no lo lleva.
 *
 * Del 2026-10-12 al 14 la camara ademas suavizaba el escalon, que el nucleo
 * subia de golpe. El autor: «la camara suavizada fue solucionar el problema
 * equivocado»; desde el 2026-10-14 el cuerpo sube el escalon tick a tick
 * (`CLIMB_SPEED`), y la camara solo lo sigue.
 *
 * Es de dibujo: la `Intent` lleva la mirada tal cual (regla 5) y el golpe sale
 * de los ojos de verdad. **Puro**: sin three.js ni DOM, para afirmarlo en Node.
 */

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
