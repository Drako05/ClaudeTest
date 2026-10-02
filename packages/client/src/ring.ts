/**
 * Los anillos de salud y hambre de la barra de PC (boceto del autor,
 * 2026-09-30), que son tambien los del movil desde ese mismo dia: se vacian **en sentido horario**, y lo gastado crece desde las
 * 12.
 *
 * Es un `stroke-dasharray` sobre un circulo girado -90 grados, cuyo trazo
 * empieza a las 12 y avanza en sentido horario. El trazo visible mide lo que
 * queda y se desplaza hasta el final del recorrido: asi el hueco, que es lo
 * gastado, queda entre las 12 y donde empieza el color, y crece hacia la derecha
 * como las agujas del reloj. Puro, para medirlo en Node.
 */

/** Circunferencia del anillo: radio 20 en su `viewBox` de 48. */
export const RING_LENGTH = 2 * Math.PI * 20;

/** El trazo de un anillo lleno en `value` sobre 100. */
export function ringDash(value: number, length = RING_LENGTH): { dasharray: string; dashoffset: number } {
  const left = (Math.max(0, Math.min(100, value)) / 100) * length;
  return { dasharray: `${left} ${length}`, dashoffset: -(length - left) };
}
