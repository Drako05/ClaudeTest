/**
 * La luz de un boton pulsado, la misma para todos (el autor, 2026-10-18:
 * «Estandariza la construcción para todos los botones»). Todo `.btn` tocado
 * lleva `.pressed` mientras el dedo o el raton siguen encima y, como minimo,
 * `FLASH_MS`: un toque rapido tambien se ve. Como se escucha en el documento,
 * vale para los botones que se crean despues sin hacer nada.
 *
 * `.pressed` es pulsar; `.on` y `.open` son estados (CORRER puesto, la mochila
 * abierta). El CSS los pinta igual.
 */

/** Lo menos que dura encendido un boton tocado (propuesta mia, 2026-09-30). */
export const FLASH_MS = 150;

/** Enciende un boton un instante, sin dedo: TAB con MODO. */
export function flash(el: Element, ms = FLASH_MS): void {
  el.classList.add('pressed');
  setTimeout(() => el.classList.remove('pressed'), ms);
}

export function bindPressLight(doc: Document): void {
  // Cada dedo, su boton: se pulsan varios a la vez (saltar con el ataque puesto).
  const held = new Map<number, { el: Element; since: number }>();
  doc.addEventListener(
    'pointerdown',
    (e) => {
      const el = (e.target as Element | null)?.closest?.('.btn');
      if (!el || (el as HTMLButtonElement).disabled) return;
      el.classList.add('pressed');
      held.set(e.pointerId, { el, since: performance.now() });
    },
    true,
  );
  const release = (e: PointerEvent): void => {
    const press = held.get(e.pointerId);
    if (!press) return;
    held.delete(e.pointerId);
    setTimeout(() => {
      // Si otro dedo lo volvio a pulsar entretanto, sigue encendido.
      if (![...held.values()].some((p) => p.el === press.el)) press.el.classList.remove('pressed');
    }, Math.max(0, FLASH_MS - (performance.now() - press.since)));
  };
  doc.addEventListener('pointerup', release, true);
  doc.addEventListener('pointercancel', release, true);
}
