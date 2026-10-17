/**
 * El + o - de una receta, mantenido (el autor, 2026-10-17): suma de uno en
 * uno, varias veces por segundo, y cada segundo mas deprisa. Su ejemplo, tal
 * cual: 3 el primer segundo, 4 el siguiente, 5… (*deduccion* que sea
 * exactamente ese). Cada segundo, sus pasos repartidos a partes iguales.
 */
export const QTY_FIRST_RATE = 3;

/** Los pasos dados a `ms` de pulsar, contando el del acto. */
export function qtySteps(ms: number): number {
  if (ms < 0) return 0;
  const s = Math.floor(ms / 1000);
  const rate = QTY_FIRST_RATE + s;
  // Los segundos enteros: 3 + 4 + … + (3 + s - 1).
  const before = s * QTY_FIRST_RATE + (s * (s - 1)) / 2;
  return before + Math.floor(((ms - s * 1000) * rate) / 1000) + 1;
}
