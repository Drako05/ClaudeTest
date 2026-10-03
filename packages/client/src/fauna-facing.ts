/**
 * Que dibujo de un animal toca, segun desde donde se le mira.
 *
 * Decision del autor (2026-10-03): **ocho direcciones**. Se mide el angulo,
 * en el suelo, entre hacia donde mira el animal y hacia donde esta la camara,
 * y se reparte en sectores de 45°: de frente, tres cuartos de frente, de
 * perfil, tres cuartos de espaldas y de espaldas. Los tres de en medio salen
 * en espejo hacia un lado u otro, asi que son **5 dibujos y sus espejos**. La
 * altura de la camara no cuenta: desde arriba se ve el dibujo de su angulo en
 * el suelo, de pie y entero (ver `docs/fauna.md`).
 *
 * Con **histeresis** (`VIEW_HYSTERESIS_DEG`): el sector solo cambia cuando el
 * angulo pasa su borde por mas de ese margen, para que un animal que mira
 * justo en el borde, o una camara que tiembla, no lo haga parpadear.
 *
 * Puro, sin three.js: lo prueba `tests/fauna-facing.test.ts`.
 */

/** Los cinco dibujos de un animal. Los dibujos de lado miran a la derecha. */
export enum View {
  Front = 0,
  FrontQuarter = 1,
  Side = 2,
  BackQuarter = 3,
  Back = 4,
}

export const VIEW_COUNT = 5;

/**
 * Cuanto tiene que pasarse el angulo del borde de su sector para cambiar de
 * dibujo, en grados. **Deduccion mia**: lo justo para que no parpadee.
 */
export const VIEW_HYSTERESIS_DEG = 8;

/**
 * El angulo, en grados en (-180, 180], de la camara vista desde el animal,
 * medido desde hacia donde mira: 0 es de frente, 180 de espaldas, y positivo
 * cuando en pantalla tiene la cabeza a la derecha. En el suelo del nucleo
 * (`x`, `y`), que en three.js son `x` y `z`.
 */
export function cameraAngle(facingX: number, facingY: number, toCameraX: number, toCameraY: number): number {
  const cross = facingX * toCameraY - facingY * toCameraX;
  const dot = facingX * toCameraX + facingY * toCameraY;
  return (Math.atan2(cross, dot) * 180) / Math.PI;
}

/** Lo que va de un angulo a otro, por el camino corto, en grados. */
function gap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * El sector, de -3 a 4 (de 45° cada uno, 0 de frente y 4 de espaldas), con
 * la histeresis respecto al de antes si lo hay.
 */
export function sectorOf(angle: number, previous: number | null): number {
  if (previous !== null && gap(angle, previous * 45) <= 22.5 + VIEW_HYSTERESIS_DEG) return previous;
  const s = Math.round(angle / 45);
  return s === -4 ? 4 : s;
}

/** El dibujo de un sector, y si va en espejo (la cabeza a la izquierda). */
export function viewOfSector(sector: number): { view: View; mirror: boolean } {
  return { view: Math.abs(sector) as View, mirror: sector < 0 };
}
