/**
 * Mando del spike: andar y girar la camara a la vez.
 *
 * En tactil se reparte la pantalla, que es el convenio de cualquier 3D en movil:
 * **la mitad izquierda es joystick y la derecha gira la camara**. Sin eso, un
 * arrastre no puede significar dos cosas.
 *
 * No reutiliza `input.ts` a proposito: aquel rota el vector de movimiento con la
 * camara isometrica de cuatro pasos, y aqui el angulo es continuo. Es codigo de
 * spike y se tira con el.
 */

export interface Move {
  /** Vector en el plano de la PANTALLA, sin rotar. Lo rota la camara. */
  readonly x: number;
  readonly y: number;
}

export class Controls {
  private readonly keys = new Set<string>();
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private stick = { x: 0, y: 0 };
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private pinch = 0;

  /** Giro pendiente de aplicar a la camara, en pixeles arrastrados. */
  look = { dx: 0, dy: 0 };
  /** Factor de zoom pendiente. */
  zoom = 1;
  onToggleProjection: (() => void) | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyP') this.onToggleProjection?.();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
      canvas.addEventListener(type, (e) => this.up(e as PointerEvent));
    }
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom *= e.deltaY > 0 ? 1.1 : 1 / 1.1;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => this.pinchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => { this.pinch = 0; });
  }

  private down(e: PointerEvent): void {
    this.canvas.setPointerCapture(e.pointerId);
    // La mitad izquierda anda, la derecha mira. Con raton, cualquier boton mira:
    // para andar ya esta WASD.
    if (e.pointerType === 'touch' && e.clientX < window.innerWidth / 2) {
      this.stickId = e.pointerId;
      this.stickOrigin = { x: e.clientX, y: e.clientY };
      this.stick = { x: 0, y: 0 };
    } else {
      this.lookId = e.pointerId;
      this.lookLast = { x: e.clientX, y: e.clientY };
    }
  }

  private move(e: PointerEvent): void {
    if (e.pointerId === this.stickId) {
      const dx = e.clientX - this.stickOrigin.x;
      const dy = e.clientY - this.stickOrigin.y;
      const len = Math.hypot(dx, dy);
      const max = 58;
      const scale = len > max ? max / len : 1;
      this.stick = { x: (dx * scale) / max, y: (dy * scale) / max };
    } else if (e.pointerId === this.lookId) {
      this.look.dx += e.clientX - this.lookLast.x;
      this.look.dy += e.clientY - this.lookLast.y;
      this.lookLast = { x: e.clientX, y: e.clientY };
    }
  }

  private up(e: PointerEvent): void {
    if (e.pointerId === this.stickId) {
      this.stickId = null;
      this.stick = { x: 0, y: 0 };
    }
    if (e.pointerId === this.lookId) this.lookId = null;
  }

  private pinchMove(e: TouchEvent): void {
    if (e.touches.length < 2) return;
    e.preventDefault();
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
    if (this.pinch > 0) this.zoom *= this.pinch / d;
    this.pinch = d;
  }

  /** El vector de movimiento en coordenadas de pantalla, sin rotar aun. */
  moveVector(): Move {
    let x = this.stick.x;
    let y = this.stick.y;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  /** Consume el giro acumulado desde el frame anterior. */
  takeLook(): { dx: number; dy: number } {
    const out = { ...this.look };
    this.look = { dx: 0, dy: 0 };
    return out;
  }

  takeZoom(): number {
    const out = this.zoom;
    this.zoom = 1;
    return out;
  }
}
