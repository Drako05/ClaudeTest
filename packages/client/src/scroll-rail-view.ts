/**
 * La barra deslizable, en el DOM: se engancha a un contenedor que se
 * desliza (la rejilla del inventario, la lista de recetas) y le pone al lado
 * una pista con su mando. Las cuentas son de `scroll-rail.ts`.
 *
 * - Se ve **siempre que haya mas de lo que cabe**, y solo entonces.
 * - El mando se arrastra con el dedo o el raton; tocar la pista lleva el
 *   mando alli. La rueda sigue deslizando el contenedor, y la barra la sigue.
 * - En el movil y, desde el 2026-10-01, tambien en PC (decision del autor).
 */

import { scrollFor, thumbFor, type RailMetrics } from './scroll-rail.js';

export class ScrollRail {
  private readonly rail: HTMLElement;
  private readonly thumb: HTMLElement;
  /** Donde se agarro el mando, desde su borde de arriba; null sin arrastre. */
  private grab: number | null = null;
  private pending = false;

  constructor(private readonly box: HTMLElement) {
    // La envoltura deja la rejilla donde estaba y cuelga la barra a su derecha.
    const wrap = document.createElement('div');
    wrap.className = 'railBox';
    box.replaceWith(wrap);
    wrap.appendChild(box);
    this.rail = document.createElement('div');
    this.rail.className = 'rail';
    this.rail.setAttribute('aria-hidden', 'true');
    this.thumb = document.createElement('i');
    this.rail.appendChild(this.thumb);
    wrap.appendChild(this.rail);

    box.addEventListener('scroll', () => this.update(), { passive: true });
    // Cambia lo que cabe al girar la pantalla o abrir el panel, y lo que hay al
    // ponerse la mochila o abrir una estacion con otras recetas.
    new ResizeObserver(() => this.schedule()).observe(box);
    new MutationObserver(() => this.schedule()).observe(box, { childList: true, subtree: true });

    this.rail.addEventListener('pointerdown', (e) => this.down(e));
    this.rail.addEventListener('pointermove', (e) => this.move(e));
    const up = () => (this.grab = null);
    this.rail.addEventListener('pointerup', up);
    this.rail.addEventListener('pointercancel', up);
    this.update();
  }

  private metrics(): RailMetrics {
    return { visible: this.box.clientHeight, total: this.box.scrollHeight, track: this.rail.clientHeight };
  }

  private schedule(): void {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.update();
    });
  }

  /** Recoloca el mando, y muestra u oculta la barra. */
  update(): void {
    const t = thumbFor(this.metrics(), this.box.scrollTop);
    this.rail.classList.toggle('shown', t.shown);
    this.thumb.style.height = `${t.size}px`;
    this.thumb.style.transform = `translateY(${t.offset}px)`;
  }

  private down(e: PointerEvent): void {
    const m = this.metrics();
    const t = thumbFor(m, this.box.scrollTop);
    if (!t.shown) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      this.rail.setPointerCapture(e.pointerId);
    } catch {
      // Sin captura el arrastre sigue mientras el dedo este sobre la barra.
    }
    const y = e.clientY - this.rail.getBoundingClientRect().top;
    if (y >= t.offset && y <= t.offset + t.size) {
      this.grab = y - t.offset;
    } else {
      // Fuera del mando: el mando salta alli, centrado en el dedo, y se sigue.
      this.grab = t.size / 2;
      this.box.scrollTop = scrollFor(m, y - this.grab);
    }
  }

  private move(e: PointerEvent): void {
    if (this.grab === null) return;
    e.preventDefault();
    const y = e.clientY - this.rail.getBoundingClientRect().top;
    this.box.scrollTop = scrollFor(this.metrics(), y - this.grab);
  }
}
