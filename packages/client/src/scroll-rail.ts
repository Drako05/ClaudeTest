/**
 * La geometria de la barra deslizable del movil (pedido del autor,
 * 2026-09-30): con mas casillas de las que caben, costaba atinar con el dedo al
 * fondo de la rejilla para deslizarla, porque casi todo es casilla y apoyar el
 * dedo en una empieza un arrastre. La barra va al lado, se ve siempre que haya
 * mas de lo que cabe, y su mando se arrastra.
 *
 * Aqui solo las cuentas, sin DOM, para medirlas en Node (`tests/scroll-rail.test.ts`);
 * `scroll-rail-view.ts` las dibuja y escucha el dedo.
 */

/** Alto minimo del mando, para que el dedo lo encuentre. **Deduccion mia.** */
export const MIN_THUMB = 44;

export interface RailMetrics {
  /** Alto de lo que se ve del contenedor (`clientHeight`). */
  visible: number;
  /** Alto de todo su contenido (`scrollHeight`). */
  total: number;
  /** Alto de la pista de la barra. */
  track: number;
}

export interface Thumb {
  /** Si hay que mostrar la barra: solo con mas contenido del que cabe. */
  shown: boolean;
  /** Alto del mando. */
  size: number;
  /** Donde empieza el mando, desde arriba de la pista. */
  offset: number;
}

/** Lo que se puede deslizar el contenido. */
function scrollRange(m: RailMetrics): number {
  return Math.max(0, m.total - m.visible);
}

/**
 * El mando para un `scrollTop`: tan alto como la parte que se ve (nunca
 * menos de `MIN_THUMB` ni mas que la pista) y colocado en la misma proporcion
 * que lo deslizado.
 */
export function thumbFor(m: RailMetrics, scrollTop: number): Thumb {
  const range = scrollRange(m);
  // Medio pixel de holgura: el navegador redondea los altos, y una rejilla que
  // cabe justa no tiene que sacar la barra.
  if (range <= 0.5 || m.track <= 0) return { shown: false, size: 0, offset: 0 };
  const size = Math.min(m.track, Math.max(MIN_THUMB, (m.track * m.visible) / m.total));
  const free = m.track - size;
  const t = Math.min(1, Math.max(0, scrollTop / range));
  return { shown: true, size, offset: free * t };
}

/**
 * Al reves: el `scrollTop` que corresponde a tener el mando en `offset`. Es
 * lo que usa el arrastre, y tocar la pista (con el mando centrado en el dedo).
 */
export function scrollFor(m: RailMetrics, offset: number): number {
  const range = scrollRange(m);
  const thumb = thumbFor(m, 0);
  if (!thumb.shown) return 0;
  const free = m.track - thumb.size;
  if (free <= 0) return 0;
  const t = Math.min(1, Math.max(0, offset / free));
  return t * range;
}
