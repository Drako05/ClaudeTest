/**
 * Mando del spike: la capa de DOM sobre `gestures.ts`.
 *
 * Aqui no hay ninguna regla, solo traduccion: los eventos del navegador se
 * reducen a numeros y se le pasan a `Gestures`, que es puro y donde vive de
 * verdad quien manda sobre cada dedo. Se separo asi porque el fallo que trajo el
 * autor —andar y girar a la vez cambiaba el zoom— era una regla de esas, y una
 * regla no se comprueba jugando con dos pulgares en un headless.
 *
 * No reutiliza `input.ts`: aquel rota el vector de movimiento con la camara
 * isometrica de cuatro pasos, y aqui el angulo es continuo. Es codigo de spike y
 * se tira con el.
 */

import { Gestures, STICK_RADIUS } from './gestures.js';

export interface Move {
  /** Vector en el plano de la PANTALLA, sin rotar. Lo rota la camara. */
  readonly x: number;
  readonly y: number;
}

export class Controls {
  private readonly keys = new Set<string>();
  private readonly gestures: Gestures;
  onToggleProjection: (() => void) | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly stickEl: HTMLElement | null = null,
    private readonly knobEl: HTMLElement | null = null,
  ) {
    this.gestures = new Gestures(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', () =>
      this.gestures.resize(window.innerWidth, window.innerHeight),
    );

    window.addEventListener('keydown', (e) => {
      // La repeticion del sistema operativo no encadena saltos: una pulsacion
      // es un salto. El pestillo lo consume el bucle con `takeJump`.
      if (!e.repeat && e.code === 'Space') {
        this.jumpQueued = true;
        e.preventDefault();
      }
      this.keys.add(e.code);
      if (e.code === 'KeyP') this.onToggleProjection?.();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.gestures.clear();
      this.drawStick();
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      // La captura puede fallar —un puntero ya soltado, un evento sintetico— y
      // si lanza aqui se lleva por delante el registro del dedo, que es lo que
      // de verdad importa. Es una comodidad, no un requisito.
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignorado a proposito: sin captura el gesto sigue funcionando.
      }
      this.gestures.down(e.pointerId, e.clientX, e.clientY, e.pointerType === 'touch');
      this.drawStick();
    });
    canvas.addEventListener('pointermove', (e) => {
      this.gestures.move(e.pointerId, e.clientX, e.clientY);
      this.drawStick();
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
      canvas.addEventListener(type, (e) => {
        this.gestures.up((e as PointerEvent).pointerId);
        this.drawStick();
      });
    }

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.wheelZoom *= e.deltaY > 0 ? 1.1 : 1 / 1.1;
      },
      { passive: false },
    );
    // El navegador hace su propio zoom de pagina con dos dedos si no se le dice
    // que no; con `touch-action: none` en el CSS y esto, el pellizco es nuestro.
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  private wheelZoom = 1;
  private jumpQueued = false;

  /** Consume el salto pedido desde el frame anterior, si lo hubo. */
  takeJump(): boolean {
    const out = this.jumpQueued;
    this.jumpQueued = false;
    return out;
  }

  /**
   * El boton de saltar del movil.
   *
   * Va conectado aparte del lienzo a proposito: los dedos del lienzo tienen
   * dueno (`gestures.ts`) y este no es de ninguno de los dos —ni anda ni gira—,
   * asi que si naciera dentro contaria como dedo de camara y el pulgar de
   * saltar giraria la vista, o peor, formaria pinza con el que ya gira.
   */
  bindJumpButton(el: HTMLElement | null): void {
    if (!el) return;
    const press = (e: Event) => {
      e.preventDefault();
      this.jumpQueued = true;
    };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('pointerdown', (e) => {
      if ((e as PointerEvent).pointerType !== 'touch') press(e);
    });
  }

  /** Pinta el joystick flotante donde nacio el pulgar, si hay alguno. */
  private drawStick(): void {
    if (!this.stickEl || !this.knobEl) return;
    const center = this.gestures.stickCenter();
    if (!center) {
      this.stickEl.classList.remove('on');
      return;
    }
    const stick = this.gestures.stick();
    this.stickEl.classList.add('on');
    this.stickEl.style.left = `${center.x}px`;
    this.stickEl.style.top = `${center.y}px`;
    this.knobEl.style.transform =
      `translate(-50%, -50%) translate(${stick.x * STICK_RADIUS}px, ${stick.y * STICK_RADIUS}px)`;
  }

  /** El vector de movimiento en coordenadas de pantalla, sin rotar aun. */
  moveVector(): Move {
    const stick = this.gestures.stick();
    let x = stick.x;
    let y = stick.y;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  /** Consume el giro acumulado desde el frame anterior. */
  takeLook(): { dx: number; dy: number } {
    return this.gestures.takeOrbit();
  }

  takeZoom(): number {
    const out = this.gestures.takeZoom() * this.wheelZoom;
    this.wheelZoom = 1;
    return out;
  }
}
