/**
 * El mando: la capa de DOM sobre `gestures.ts`.
 *
 * Aqui no hay ninguna regla, solo traduccion: los eventos del navegador se
 * reducen a numeros y se le pasan a `Gestures`, que es puro y donde vive de
 * verdad quien manda sobre cada dedo. Se separo asi porque el fallo que trajo el
 * autor —andar y girar a la vez cambiaba el zoom— era una regla de esas, y una
 * regla no se comprueba jugando con dos pulgares en un headless.
 *
 * Las teclas son las de siempre: WASD o flechas para andar, Espacio salta,
 * Shift enciende y apaga la carrera, E come, F siembra, I abre el inventario,
 * R empieza un mundo nuevo, + y - acercan y alejan, y P cambia de proyeccion.
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
  onRestart: (() => void) | null = null;
  onToggleInventory: (() => void) | null = null;

  /**
   * Enciende los controles de pulgar.
   *
   * Una clase en el `body` y el CSS decide. Correr, saltar y accionar no se ven en PC —Shift, Espacio y
   * el clic izquierdo ya hacen lo mismo, y ahi solo estorban—, pero el boton de
   * vista no depende de esto: ese se ve siempre, porque es el unico sin tecla
   * anunciada.
   */
  private static revealTouchUi(): void {
    document.body.classList.add('touch-active');
  }

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
      // Correr es un interruptor: una pulsacion lo enciende, la siguiente lo
      // apaga. `e.repeat` descartado, asi que mantener Shift no lo hace
      // parpadear.
      if (!e.repeat && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) {
        this.toggleRun();
      }
      this.keys.add(e.code);
      if (e.repeat) return;
      switch (e.code) {
        case 'KeyP':
          this.onToggleProjection?.();
          break;
        case 'KeyE':
          this.eatQueued = true;
          break;
        case 'KeyF':
          this.plantQueued = true;
          break;
        // El inventario tiene tecla; el HUD no, solo su boton (decision del
        // autor).
        case 'KeyI':
          this.onToggleInventory?.();
          break;
        case 'KeyR':
          this.onRestart?.();
          break;
        // El mismo paso que la rueda del isometrico: 1.25 por pulsacion.
        case 'Equal':
        case 'NumpadAdd':
          this.wheelZoom /= 1.25;
          break;
        case 'Minus':
        case 'NumpadSubtract':
          this.wheelZoom *= 1.25;
          break;
        default:
          break;
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.gestures.clear();
      this.drawStick();
    });

    // En un dispositivo de puntero grueso el racimo del pulgar se muestra de
    // entrada, sin esperar a que el jugador adivine que existe.
    if (window.matchMedia?.('(pointer: coarse)').matches) Controls.revealTouchUi();

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      // Y si no, al primer dedo de verdad. No es adorno: un portatil tactil
      // declara puntero fino, asi que sin esta segunda via sus botones no
      // aparecerian nunca.
      if (e.pointerType === 'touch') Controls.revealTouchUi();

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
        const released = this.gestures.up((e as PointerEvent).pointerId);
        // El clic izquierdo del raton acciona, pero SOLO si no arrastro: con la
        // camara libre, arrastrar es girar la vista, y las dos cosas comparten
        // boton. Se decide al soltar porque hasta entonces no se sabe cual de
        // las dos era. En tactil no: ahi acciona el boton, y un dedo sobre el
        // mundo gira la camara y nada mas.
        if (
          type === 'pointerup' &&
          released &&
          !released.isTouch &&
          released.tap &&
          (e as PointerEvent).button === 0
        ) {
          this.actionQueued = true;
        }
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
  private eatQueued = false;
  private plantQueued = false;
  private runEl: HTMLElement | null = null;

  /** Accion pedida de un clic o de un toque. Se consume una vez. */
  private actionQueued = false;
  /** True mientras el boton de accion siga pulsado, para que repita. */
  actionHeld = false;

  /**
   * Consume la accion pedida desde el frame anterior.
   *
   * Igual que el salto y por lo mismo: un pestillo, para que un clic que dura
   * menos que un fotograma se registre igual.
   */
  takeAction(): boolean {
    const out = this.actionQueued;
    this.actionQueued = false;
    return out;
  }

  /**
   * El boton de accion del movil: acciona al tocarlo y REPITE si se mantiene,
   * que es la cadencia que ya tenia el juego. El raton no repite —un clic es
   * una accion— porque mantener pulsado ahi significa arrastrar la camara.
   */
  bindActionButton(el: HTMLElement | null): void {
    if (!el) return;
    const press = (e: Event) => {
      e.preventDefault();
      this.actionQueued = true;
      this.actionHeld = true;
      el.classList.add('on');
    };
    const release = () => {
      this.actionHeld = false;
      el.classList.remove('on');
    };

    /**
     * El dedo que aprieta tambien gira la camara si se arrastra, sin soltar la
     * accion: pedido del autor. Los `touchmove` siguen llegando al elemento
     * donde nacio el dedo aunque salga de el, asi que basta con escucharlos
     * aqui. La regla —umbral, que no haga pinza— vive en `gestures.ts`.
     */
    const keyOf = (t: Touch) => `accion:${t.identifier}`;
    el.addEventListener(
      'touchstart',
      (e) => {
        press(e);
        for (const t of Array.from(e.changedTouches)) this.gestures.downAction(keyOf(t), t.clientX, t.clientY);
      },
      { passive: false },
    );
    el.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) this.gestures.move(keyOf(t), t.clientX, t.clientY);
      },
      { passive: false },
    );
    const lift = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) this.gestures.up(keyOf(t));
      // Se suelta la accion cuando no queda ningun dedo sobre el boton.
      if (e.targetTouches.length === 0) release();
    };
    el.addEventListener('touchend', lift);
    el.addEventListener('touchcancel', lift);

    el.addEventListener('pointerdown', (e) => {
      if ((e as PointerEvent).pointerType !== 'touch') press(e);
    });
    // Con raton, soltar o salirse del boton suelta la accion. Con un dedo no:
    // arrastrarlo fuera es girar la camara, y la accion tiene que seguir.
    for (const type of ['pointerup', 'pointerleave']) {
      el.addEventListener(type, (e) => {
        if ((e as PointerEvent).pointerType !== 'touch') release();
      });
    }
  }

  /** Carrera encendida. Interruptor, no tecla mantenida. */
  running = false;

  private toggleRun(): void {
    this.running = !this.running;
    // Con teclado no hay boton que mirar, asi que el estado lo dice la ayuda:
    // sin indicador, un interruptor deja adivinando por que el personaje va
    // como va.
    document.body.classList.toggle('running', this.running);
    this.runEl?.classList.toggle('on', this.running);
    this.runEl?.setAttribute('aria-pressed', String(this.running));
  }

  /** Conecta el boton de correr del movil, igual que el de saltar. */
  bindRunButton(el: HTMLElement | null): void {
    if (!el) return;
    this.runEl = el;
    const press = (e: Event) => {
      e.preventDefault();
      this.toggleRun();
    };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('pointerdown', (e) => {
      if ((e as PointerEvent).pointerType !== 'touch') press(e);
    });
  }

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

  /** Consume la comida pedida, si la hubo. Un toque es un bocado. */
  takeEat(): boolean {
    const out = this.eatQueued;
    this.eatQueued = false;
    return out;
  }

  /** Consume la siembra pedida, si la hubo. */
  takePlant(): boolean {
    const out = this.plantQueued;
    this.plantQueued = false;
    return out;
  }

  /**
   * Comer y sembrar del movil: de un solo toque, no repiten al mantener. Van
   * aparte del lienzo por lo mismo que el salto.
   */
  bindEatButton(el: HTMLElement | null): void {
    this.bindTap(el, () => (this.eatQueued = true));
  }

  bindPlantButton(el: HTMLElement | null): void {
    this.bindTap(el, () => (this.plantQueued = true));
  }

  private bindTap(el: HTMLElement | null, run: () => void): void {
    if (!el) return;
    const press = (e: Event) => {
      e.preventDefault();
      run();
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
    // El mando dibujado sigue al PULGAR, no a la direccion que sale de el: la
    // velocidad ya no depende del desplazamiento, pero el dedo si esta donde
    // esta y el mando tiene que estar debajo.
    const knob = this.gestures.stickKnob();
    this.stickEl.classList.add('on');
    this.stickEl.style.left = `${center.x}px`;
    this.stickEl.style.top = `${center.y}px`;
    this.knobEl.style.transform =
      `translate(-50%, -50%) translate(${knob.x * STICK_RADIUS}px, ${knob.y * STICK_RADIUS}px)`;
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
