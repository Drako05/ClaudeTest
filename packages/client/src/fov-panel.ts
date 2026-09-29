/**
 * La barra del angulo de vision de la primera persona, que sale desde detras
 * del ojo.
 *
 * Todo lo que decide como se abre y como se cierra es del autor (2026-09-28):
 *
 * - **Solo en primera persona**, que es la unica vista a la que afecta.
 * - **PC**: se abre al pasar el raton por encima del ojo, sin clic, y salir con
 *   el raton no la cierra. El clic del ojo sigue cambiando de vista.
 * - **Movil**: se abre con un toque sostenido de mas de `HOLD_MS` en el ojo, y
 *   al soltar **no** cambia de vista. Un toque corto cambia de vista como
 *   siempre y la cierra, aunque estuviera abierta.
 * - Se cierra con **cualquier accion** —una tecla, la rueda— o apoyando el
 *   raton o el dedo fuera de ella.
 * - El angulo **se recuerda** en el navegador de cada dispositivo, y el
 *   catalejo parte de el (`OrbitCamera.setFpFov`).
 *
 * El ojo no la cierra al apoyar el dedo: la cierra su `click`, que es el que
 * cambia de vista. Si la cerrara el `pointerdown`, sostener el ojo con la barra
 * abierta la haria parpadear.
 */

import { FP_FOV, FP_FOV_MAX, FP_FOV_MIN, type OrbitCamera } from './camera.js';

/** Lo que hay que sostener el ojo para abrir la barra: mas de 1 s, del autor. */
export const HOLD_MS = 1000;

/** Donde se guarda el angulo elegido. Solo es comodidad de cada jugador. */
export const FOV_STORAGE_KEY = 'verdant.fpFov';

/** El angulo guardado, o el de siempre si no hay o no se entiende. */
export function readStoredFov(raw: string | null): number {
  const n = raw === null || raw.trim() === '' ? NaN : Number(raw);
  if (!Number.isFinite(n)) return FP_FOV;
  return Math.min(FP_FOV_MAX, Math.max(FP_FOV_MIN, Math.round(n)));
}

export class FovPanel {
  private shown = false;
  /** El toque sostenido abrio la barra: el `click` que le sigue no es de vista. */
  private swallowClick = false;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly panel: HTMLElement,
    private readonly range: HTMLInputElement,
    private readonly value: HTMLElement,
    private readonly eye: HTMLElement,
    private readonly camera: OrbitCamera,
  ) {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(FOV_STORAGE_KEY);
    } catch {
      // Sin almacenamiento (ventana privada, datos bloqueados): el de siempre.
    }
    camera.setFpFov(readStoredFov(stored));
    this.render();

    range.addEventListener('input', () => {
      camera.setFpFov(Number(range.value));
      this.render();
      try {
        window.localStorage.setItem(FOV_STORAGE_KEY, String(camera.fpFov));
      } catch {
        // Se aplica igual; solo no se recordara.
      }
    });

    // PC: pasar el raton por encima. Un dedo tambien dispara `pointerenter`, y
    // ese no cuenta: en el movil la abre el toque sostenido.
    eye.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && this.firstPerson) this.show();
    });

    // Movil: sostener. Cada toque nuevo olvida el anterior, por si tras el
    // sostenido el navegador no llego a mandar su `click`.
    eye.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      this.swallowClick = false;
      this.cancelHold();
      this.holdTimer = setTimeout(() => {
        this.holdTimer = null;
        if (!this.firstPerson) return;
        this.show();
        this.swallowClick = true;
      }, HOLD_MS);
    });
    for (const type of ['pointerup', 'pointercancel'] as const) {
      eye.addEventListener(type, () => this.cancelHold());
    }
    // Sin esto el movil saca su menu contextual al sostener el dedo.
    eye.addEventListener('contextmenu', (e) => e.preventDefault());

    // Cualquier accion la cierra. En captura, para enterarse antes que nadie.
    document.addEventListener(
      'keydown',
      (e) => {
        if (!this.shown) return;
        // Con la barra enfocada, las flechas la moverian ademas de andar.
        if (e.target === range) e.preventDefault();
        this.hide();
      },
      true,
    );
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (this.shown && !this.inside(e.target, true)) this.hide();
      },
      true,
    );
    document.addEventListener(
      'wheel',
      (e) => {
        if (this.shown && !this.inside(e.target, false)) this.hide();
      },
      { capture: true, passive: true },
    );
  }

  get open(): boolean {
    return this.shown;
  }

  /**
   * Lo pregunta el `click` del ojo: si viene de un toque sostenido que abrio
   * la barra, no cambia de vista.
   */
  takeSwallowedClick(): boolean {
    const swallow = this.swallowClick;
    this.swallowClick = false;
    return swallow;
  }

  show(): void {
    if (this.shown) return;
    this.shown = true;
    // Sale desde detras del ojo hacia el lado donde hay sitio: a la izquierda
    // si el ojo esta a la derecha (PC), y a la derecha si esta a la izquierda
    // (en el movil vive en el menu OTROS). Propuesta mia.
    const eye = this.eye.getBoundingClientRect();
    const mid = eye.left + eye.width / 2;
    // Con el ojo pegado al borde derecho (PC), sale hacia la izquierda como
    // siempre; con el ojo en otro sitio, hacia la derecha si cabe.
    const fromLeft = eye.right < window.innerWidth - 80;
    // Y si hacia la derecha no cabe (un telefono estrecho con el ojo en medio
    // de la fila de OTROS), cae justo debajo del ojo, dentro de la pantalla.
    const width = this.panel.offsetWidth;
    const below = fromLeft && mid + width > window.innerWidth - 8;
    this.panel.classList.toggle('fromLeft', fromLeft && !below);
    this.panel.classList.toggle('below', below);
    this.panel.style.top = `${below ? eye.bottom + 8 : eye.top}px`;
    this.panel.style.left = below
      ? `${Math.max(8, Math.min(window.innerWidth - width - 8, mid - width / 2))}px`
      : fromLeft
        ? `${mid}px`
        : '';
    this.panel.classList.add('open');
    this.panel.setAttribute('aria-hidden', 'false');
    this.range.tabIndex = 0;
  }

  hide(): void {
    this.cancelHold();
    if (!this.shown) return;
    this.shown = false;
    this.panel.classList.remove('open');
    this.panel.setAttribute('aria-hidden', 'true');
    this.range.tabIndex = -1;
    this.range.blur();
  }

  private get firstPerson(): boolean {
    return this.camera.projection === 'primera';
  }

  private cancelHold(): void {
    if (this.holdTimer !== null) clearTimeout(this.holdTimer);
    this.holdTimer = null;
  }

  /** Si `target` es la barra (o, con `withEye`, el ojo). */
  private inside(target: EventTarget | null, withEye: boolean): boolean {
    if (!(target instanceof Node)) return false;
    return this.panel.contains(target) || (withEye && this.eye.contains(target));
  }

  private render(): void {
    const fov = this.camera.fpFov;
    this.range.value = String(fov);
    this.value.textContent = `${fov}°`;
  }
}
