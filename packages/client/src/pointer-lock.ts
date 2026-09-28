/**
 * El raton de PC lleva la mirada, y soltarlo pone el juego en pausa.
 *
 * Decisiones del autor (2026-09-28): en PC, hacia donde se mueve el cursor se
 * mueve la vista, en las tres vistas. Para eso el navegador tiene que
 * **capturar** el cursor (Pointer Lock): lo oculta, entrega el movimiento
 * relativo y **Esc lo suelta siempre**, porque asi lo impone el navegador. Y
 * de ahi sale lo demas:
 *
 * - **Sin cursor capturado, el juego esta en pausa**, con el aviso en
 *   pantalla. Tambien al arrancar: el navegador exige un clic para capturar.
 * - **Un clic en la pantalla lo captura y reanuda**, y ese clic no golpea.
 * - El **panel de desarrollo** suelta el cursor pero **no pausa**: tiene su
 *   propia pausa y sirve para ver pasar el tiempo. El inventario ni lo suelta.
 *
 * El movil no entra aqui: `mouseMode` exige un puntero fino y se apaga al
 * primer toque de verdad (`touch-active`), para que un portatil tactil jugado
 * con el dedo no se quede congelado (esto ultimo es deduccion mia).
 */

export interface PauseInputs {
  /** PC con raton: puntero fino y ningun toque de verdad todavia. */
  mouseMode: boolean;
  /** El cursor esta capturado. */
  locked: boolean;
  /** El panel de desarrollo esta abierto. */
  devOpen: boolean;
}

/** Sin cursor capturado el juego esta en pausa, salvo con el panel de desarrollo. */
export function isPaused({ mouseMode, locked, devOpen }: PauseInputs): boolean {
  return mouseMode && !locked && !devOpen;
}

export class MouseLook {
  private dx = 0;
  private dy = 0;
  /**
   * Si el cursor estaba capturado en el ultimo movimiento. Chrome manda un
   * salto espurio en el primer movimiento tras capturar —en headless, el
   * recorrido entero hasta el centro de la ventana—, y ese se descarta. Se
   * detecta aqui y no con `pointerlockchange` porque, medido, el salto llega
   * ANTES que ese evento.
   */
  private wasLocked = false;
  private readonly fine: boolean;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly devOpen: () => boolean,
  ) {
    this.fine = window.matchMedia?.('(pointer: fine)').matches ?? false;
    document.addEventListener('mousemove', (e) => {
      const first = !this.wasLocked;
      this.wasLocked = this.locked;
      if (!this.locked || first) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
  }

  get mouseMode(): boolean {
    return this.fine && !document.body.classList.contains('touch-active');
  }

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  get paused(): boolean {
    return isPaused({ mouseMode: this.mouseMode, locked: this.locked, devOpen: this.devOpen() });
  }

  /**
   * Un `pointerdown` de raton en el lienzo, antes que los gestos. Devuelve lo
   * que fue: `'capture'` si captura el cursor (y no golpea), `'strike'` si con
   * el cursor capturado es un golpe —en el acto, porque ya no hay arrastre que
   * distinguir—, o `null` si no es cosa suya (sin modo raton, o con el panel de
   * desarrollo abierto, donde se sigue arrastrando para girar).
   */
  pointerDown(e: PointerEvent): 'capture' | 'strike' | null {
    if (e.pointerType !== 'mouse' || !this.mouseMode || this.devOpen()) return null;
    if (this.locked) return e.button === 0 ? 'strike' : 'capture';
    this.capture();
    return 'capture';
  }

  /** Pide capturar el cursor. Tiene que ir dentro de un gesto del usuario. */
  capture(): void {
    if (!this.mouseMode || this.locked) return;
    try {
      // Si el navegador lo rechaza —Chrome no deja volver a capturar hasta un
      // segundo despues de un Esc—, se sigue en pausa y el siguiente clic lo
      // reintenta.
      const pending = this.canvas.requestPointerLock() as unknown;
      if (pending instanceof Promise) pending.catch(() => {});
    } catch {
      // Igual: en pausa hasta el proximo clic.
    }
  }

  release(): void {
    if (this.locked) document.exitPointerLock();
  }

  /** El movimiento del raton acumulado desde el ultimo frame, en pixeles. */
  takeTurn(): { dx: number; dy: number } {
    const out = { dx: this.dx, dy: this.dy };
    this.dx = 0;
    this.dy = 0;
    return out;
  }
}
