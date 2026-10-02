/**
 * El raton de PC lleva la mirada, y soltarlo pone el juego en pausa.
 *
 * Decisiones del autor (2026-09-28): en PC, hacia donde se mueve el cursor se
 * mueve la vista, en las tres vistas. Para eso el navegador tiene que
 * **capturar** el cursor (Pointer Lock): lo oculta, entrega el movimiento
 * relativo y **Esc lo suelta siempre**, porque asi lo impone el navegador. Y
 * de ahi sale lo demas:
 *
 * - **Pausa solo el Esc del jugador**: cuando el navegador suelta el cursor sin
 *   que el juego lo pidiera. Y al arrancar, porque el navegador exige un clic
 *   para capturar. En pausa sale el aviso.
 * - **Lo que suelta el propio juego no pausa** (`free`): el inventario, el
 *   panel de desarrollo y la muerte. Al cerrarlos se intenta capturar otra
 *   vez; si el navegador no lo deja, **se sigue jugando** con el cursor
 *   suelto, sin girar la vista, hasta el primer clic.
 * - **Cerrar el inventario con Esc captura como E** (pedido del autor,
 *   2026-10-02), pero al SOLTAR la tecla y con red (`captureSoft`): si el
 *   navegador suelta esa captura en menos de `SOFT_GRACE_MS`, no fue el
 *   jugador y no pausa. Pedirla con Esc apoyado acababa en pausa en el Chrome
 *   del autor y no en el headless (escapes 11 y 14).
 * - **Un clic en la pantalla lo captura y reanuda**, y ese clic no golpea.
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
  /** El panel de desarrollo o el inventario estan abiertos. */
  devOpen: boolean;
  /** El cursor lo solto el juego, no el Esc del jugador. */
  free: boolean;
}

/** Sin cursor capturado el juego esta en pausa, salvo que lo soltara el juego. */
export function isPaused({ mouseMode, locked, devOpen, free }: PauseInputs): boolean {
  return mouseMode && !locked && !devOpen && !free;
}

/**
 * Lo que vale la red de `captureSoft`: una captura pedida sin gesto claro que
 * el navegador suelta antes de esto no la solto el jugador. Deduccion mia.
 */
export const SOFT_GRACE_MS = 1000;

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
  /**
   * El cursor esta suelto porque lo solto el juego: no pausa. Se apaga al
   * capturar, y con el Esc del jugador, que es lo unico que pausa.
   */
  private free = false;
  /** El juego acaba de pedir soltar: el siguiente `pointerlockchange` es suyo. */
  private releasing = false;
  /** La captura pendiente se pidio con `captureSoft`. */
  private softPending = false;
  /** Hasta cuando una perdida de la captura no la cuenta como del jugador. */
  private softUntil = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly devOpen: () => boolean,
  ) {
    this.fine = window.matchMedia?.('(pointer: fine)').matches ?? false;
    // Capturar es asincrono: si entre pedirlo y conseguirlo se abrio un panel
    // que quiere el cursor libre (desarrollo, inventario), se suelta en el acto.
    // Sin esto, abrir un panel justo tras pedir la captura lo dejaba abierto
    // con el cursor capturado y sus botones sin poder pulsarse.
    document.addEventListener('pointerlockchange', () => {
      if (this.locked) {
        this.free = false;
        this.softUntil = this.softPending ? performance.now() + SOFT_GRACE_MS : 0;
        this.softPending = false;
        if (this.devOpen()) this.release();
        return;
      }
      // Suelto sin haberlo pedido el juego: el Esc del jugador, que pausa.
      // Salvo dentro de la red de `captureSoft`: ahi lo solto el navegador.
      if (!this.releasing) this.free = performance.now() < this.softUntil;
      this.releasing = false;
      this.softUntil = 0;
    });
    document.addEventListener('pointerlockerror', () => {
      this.softPending = false;
    });
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
    return isPaused({
      mouseMode: this.mouseMode,
      locked: this.locked,
      devOpen: this.devOpen(),
      free: this.free,
    });
  }

  /**
   * Un `pointerdown` de raton en el lienzo, antes que los gestos. Devuelve lo
   * que fue: `'capture'` si captura el cursor (y no golpea), `'strike'` si con
   * el cursor capturado es un golpe —en el acto, porque ya no hay arrastre que
   * distinguir—, `'use'` si es el derecho, o `null` si no es cosa suya (sin modo raton, o con el panel de
   * desarrollo abierto, donde se sigue arrastrando para girar).
   */
  pointerDown(e: PointerEvent): 'capture' | 'strike' | 'use' | null {
    if (e.pointerType !== 'mouse' || !this.mouseMode || this.devOpen()) return null;
    // Capturado: el izquierdo golpea y el derecho usa (decision del autor).
    if (this.locked) return e.button === 0 ? 'strike' : e.button === 2 ? 'use' : 'capture';
    this.capture();
    return 'capture';
  }

  /** Pide capturar el cursor. Tiene que ir dentro de un gesto del usuario. */
  capture(): void {
    this.softPending = false;
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

  /**
   * Pide capturar sin un gesto claro (al soltar el Esc que cerro el
   * inventario), con red: si el navegador la suelta enseguida, no pausa y el
   * cursor queda suelto por el juego, como si no se hubiera pedido.
   */
  captureSoft(): void {
    if (!this.mouseMode || this.locked) return;
    this.capture();
    this.softPending = true;
  }

  /** Suelta el cursor sin pausar: lo pide el juego, no el jugador. */
  release(): void {
    if (!this.locked) return;
    this.free = true;
    this.releasing = true;
    document.exitPointerLock();
  }

  /** Si el cursor esta suelto por el juego, sin pausa. Para el humo. */
  get freed(): boolean {
    return this.free && !this.locked;
  }

  /** El movimiento del raton acumulado desde el ultimo frame, en pixeles. */
  takeTurn(): { dx: number; dy: number } {
    const out = { dx: this.dx, dy: this.dy };
    this.dx = 0;
    this.dy = 0;
    return out;
  }
}
