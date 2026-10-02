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
 * Shift enciende y apaga la carrera, E abre el inventario, 1-4 eligen la
 * mano, como la rueda del raton, R empieza un mundo nuevo, + y - acercan y
 * alejan, y P cambia de proyeccion. Clic izquierdo golpea y clic derecho usa
 * lo de la mano.
 */

import { Gestures, HOLD_MS, STICK_RADIUS } from './gestures.js';
import type { MouseLook } from './pointer-lock.js';

/** Cuanto aguanta el catalejo tras la ultima pulsacion de + o -, en ms. */
const ZOOM_HOLD_MS = 800;
/**
 * Rueda que cuesta pasar una casilla de la barra con un trackpad, en pixeles;
 * una muesca de raton la supera siempre y pasa justo una. **Deduccion mia.**
 */
const WHEEL_STEP = 50;
/** Lo minimo que se ve encendido un boton tocado (USAR, SALTAR). **Deduccion mia.** */
const FLASH_MS = 150;
/** Donde se recuerda el auto salto en el navegador (solo comodidad). */
const AUTO_JUMP_STORAGE_KEY = 'verdant.autoJump';
/** Donde se recuerda la ENTRADA (MIRA o TAP) en el navegador (solo comodidad). */
const TAP_INPUT_STORAGE_KEY = 'verdant.tapInput';

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
  /** La rueda recorre la barra de la mano: `+1` la siguiente, `-1` la anterior. */
  onHotbarStep: ((delta: number) => void) | null = null;
  /** El raton capturado de PC, si lo hay: decide los clics antes que los gestos. */
  mouseLook: MouseLook | null = null;

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

  /**
   * La zona del joystick, medida en la pantalla de ahora: hasta el borde
   * derecho del anillo de salud y desde abajo hasta la mitad de CORRER
   * (decision del autor, 2026-09-30). Se mide en cada toque, asi que sigue a
   * cualquier giro o cambio de tamano sin escuchar nada mas. Si alguno no se
   * ve, `null`, y los gestos vuelven al cuadrante.
   */
  private static stickZone(): { right: number; top: number } | null {
    const ring = document.getElementById('healthRing')?.getBoundingClientRect();
    const run = document.getElementById('run')?.getBoundingClientRect();
    if (!ring || !run || ring.width === 0 || run.height === 0) return null;
    return { right: ring.right, top: run.top + run.height / 2 };
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
      // TAB cambia el modo de golpe (decision del autor) y no mueve el foco.
      if (e.code === 'Tab') {
        e.preventDefault();
        if (!e.repeat) this.modeKey();
      }
      this.keys.add(e.code);
      if (e.repeat) return;
      switch (e.code) {
        case 'KeyP':
          this.onToggleProjection?.();
          break;
        // E abre y cierra el inventario con el recetario (decision del autor).
        // Comer y sembrar ya no tienen tecla: se hacen con clic derecho,
        // llevando la baya o la semilla en la mano.
        case 'KeyE':
          this.onToggleInventory?.();
          break;
        case 'KeyR':
          this.onRestart?.();
          break;
        // Cada boton de PC tiene su tecla (pedido del autor, 2026-10-02): la
        // informacion, I, y el panel del bioma, B. Pulsan el boton, asi que
        // hacen exactamente lo mismo que el clic.
        case 'KeyI':
          document.getElementById('hudToggle')?.click();
          break;
        case 'KeyB':
          document.getElementById('statsToggle')?.click();
          break;
        // El zoom es solo con + y - desde que la rueda recorre la barra de la
        // mano (pedido del autor). El paso es el de la rueda de antes: 1.25.
        case 'Equal':
        case 'NumpadAdd':
          this.keyZoom /= 1.25;
          this.lastZoomKeyAt = performance.now();
          break;
        case 'Minus':
        case 'NumpadSubtract':
          this.keyZoom *= 1.25;
          this.lastZoomKeyAt = performance.now();
          break;
        default:
          break;
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.gestures.clear();
      this.drawStick();
    });

    // En un dispositivo de puntero grueso el racimo del pulgar se muestra de
    // entrada, sin esperar a que el jugador adivine que existe.
    if (window.matchMedia?.('(pointer: coarse)').matches) Controls.revealTouchUi();

    // El menu del navegador no sale nunca, y en todo el documento: con solo el
    // lienzo, el clic derecho que abre una estacion lo dejaba caer sobre el
    // panel recien abierto bajo el cursor (lo vio el autor).
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      // Y si no, al primer dedo de verdad. No es adorno: un portatil tactil
      // declara puntero fino, asi que sin esta segunda via sus botones no
      // aparecerian nunca.
      if (e.pointerType === 'touch') Controls.revealTouchUi();

      // El raton de PC con el cursor capturado (`pointer-lock.ts`): el clic que
      // captura solo reanuda, y ya capturado golpea en el acto. Ninguno de los
      // dos pasa por los gestos: sin cursor visible no hay arrastre.
      const mouse = this.mouseLook?.pointerDown(e) ?? null;
      if (mouse) {
        if (mouse === 'strike') this.actionQueued = true;
        if (mouse === 'use') this.useQueued = true;
        return;
      }

      // La captura puede fallar —un puntero ya soltado, un evento sintetico— y
      // si lanza aqui se lleva por delante el registro del dedo, que es lo que
      // de verdad importa. Es una comodidad, no un requisito.
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignorado a proposito: sin captura el gesto sigue funcionando.
      }
      if (e.pointerType === 'touch') this.gestures.setStickZone(Controls.stickZone());
      this.gestures.down(e.pointerId, e.clientX, e.clientY, e.pointerType === 'touch', performance.now());
      // Modo TAP: si el dedo se queda quieto `HOLD_MS`, es un ataque sostenido.
      if (this.tapInput && e.pointerType === 'touch') {
        const id = e.pointerId;
        window.setTimeout(() => {
          if (this.gestures.promoteHold(id, performance.now())) {
            this.tapHoldId = id;
            this.tapStrikeQueued = true;
          }
        }, HOLD_MS);
      }
      this.drawStick();
    });
    canvas.addEventListener('pointermove', (e) => {
      this.gestures.move(e.pointerId, e.clientX, e.clientY);
      this.drawStick();
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
      canvas.addEventListener(type, (e) => {
        const pointerId = (e as PointerEvent).pointerId;
        const released = this.gestures.up(pointerId, performance.now());
        if (pointerId === this.tapHoldId) this.tapHoldId = null;
        // Modo TAP: un toque rapido en el mundo, sin moverse y sin ser parte de
        // una pinza, usa en ese punto y luego ataca (`main.ts`).
        if (
          type === 'pointerup' && released && this.tapInput && released.isTouch &&
          released.role === 'look' && released.tap && !released.paired && released.heldMs < HOLD_MS
        ) {
          this.tapQueued = { x: (e as PointerEvent).clientX, y: (e as PointerEvent).clientY };
        }
        // El clic izquierdo del raton acciona, pero SOLO si no arrastro: con la
        // camara libre, arrastrar es girar la vista, y las dos cosas comparten
        // boton. Se decide al soltar porque hasta entonces no se sabe cual de
        // las dos era. En tactil no: ahi acciona el boton, y un dedo sobre el
        // mundo gira la camara y nada mas.
        if (type === 'pointerup' && released && !released.isTouch && released.tap) {
          // Izquierdo golpea; derecho usa (decision del autor).
          const button = (e as PointerEvent).button;
          if (button === 0) this.actionQueued = true;
          if (button === 2) this.useQueued = true;
        }
        this.drawStick();
      });
    }

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        // La rueda ya no acerca: recorre la barra de la mano (pedido del
        // autor). Hacia abajo, la siguiente. Una muesca es UNA casilla, mida lo
        // que mida (Chrome manda unos 100 px, otros 120 o 3 lineas); un
        // trackpad, que manda muchos saltos pequenos, acumula hasta
        // `WHEEL_STEP` antes de pasar una. Cambiar de sentido empieza de cero.
        const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? WHEEL_STEP : 1);
        if (dy === 0) return;
        if (Math.sign(dy) !== Math.sign(this.wheelAcc)) this.wheelAcc = 0;
        this.wheelAcc += dy;
        if (Math.abs(this.wheelAcc) >= WHEEL_STEP) {
          this.onHotbarStep?.(Math.sign(this.wheelAcc));
          this.wheelAcc = 0;
        }
      },
      { passive: false },
    );
    // El navegador hace su propio zoom de pagina con dos dedos si no se le dice
    // que no; con `touch-action: none` en el CSS y esto, el pellizco es nuestro.
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  private keyZoom = 1;
  /** Rueda acumulada que aun no llega a una casilla. */
  private wheelAcc = 0;
  /** Ultima vez que se pulso + o -, en ms. */
  private lastZoomKeyAt = -Infinity;
  private jumpQueued = false;
  private useQueued = false;
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

  /**
   * Golpe en modo preciso: solo el primer objetivo del centro de la mira; si
   * no, el barrido. Interruptor, como correr: TAB en PC y el boton MODO (en PC
   * junto a la barra de la mano; en el movil, junto al ataque). Arranca en
   * barrido y no se recuerda (propuesta mia).
   */
  precise = false;
  private readonly modeEls: HTMLElement[] = [];

  private toggleMode(): void {
    this.precise = !this.precise;
    // El icono de cada boton dice el modo activo: tajo o mirilla (CSS).
    document.body.classList.toggle('precise', this.precise);
    for (const el of this.modeEls) {
      el.setAttribute('aria-pressed', String(this.precise));
      el.setAttribute('aria-label', this.precise ? 'Modo preciso' : 'Modo barrido');
    }
  }

  /**
   * Conecta un boton MODO: un toque o un clic cambia de modo, y se enciende
   * mientras se pulsa, como USAR y SALTAR (pedido del autor, 2026-09-30).
   */
  bindModeButton(el: HTMLElement | null): void {
    if (!el) return;
    this.modeEls.push(el);
    this.bindTap(el, () => this.toggleMode());
  }

  /** TAB: cambia el modo y enciende un instante el boton MODO (propuesta mia). */
  private modeKey(): void {
    this.toggleMode();
    for (const el of this.modeEls) {
      el.classList.add('on');
      setTimeout(() => el.classList.remove('on'), FLASH_MS);
    }
  }

  /**
   * Auto salto: andando hacia un bloque que se sube de un salto, se salta solo
   * justo antes de chocar (lo decide el nucleo, `systems/autojump.ts`).
   * Interruptor del movil, montado sobre SALTAR (decision del autor,
   * 2026-09-30): arranca apagado y **se recuerda** en el navegador de cada
   * dispositivo, como el angulo de vision.
   */
  autoJump = Controls.storedAutoJump();
  private autoJumpEl: HTMLElement | null = null;

  private static storedAutoJump(): boolean {
    try {
      return window.localStorage.getItem(AUTO_JUMP_STORAGE_KEY) === '1';
    } catch {
      // Sin almacenamiento (ventana privada, datos bloqueados): apagado.
      return false;
    }
  }

  private toggleAutoJump(): void {
    this.autoJump = !this.autoJump;
    this.showAutoJump();
    try {
      window.localStorage.setItem(AUTO_JUMP_STORAGE_KEY, this.autoJump ? '1' : '0');
    } catch {
      // Se aplica igual; solo no se recordara.
    }
  }

  private showAutoJump(): void {
    this.autoJumpEl?.classList.toggle('on', this.autoJump);
    this.autoJumpEl?.setAttribute('aria-pressed', String(this.autoJump));
  }

  /** Conecta el boton de auto salto, con el mismo toque que el de correr. */
  bindAutoJumpButton(el: HTMLElement | null): void {
    if (!el) return;
    this.autoJumpEl = el;
    this.showAutoJump();
    const press = (e: Event) => {
      e.preventDefault();
      this.toggleAutoJump();
    };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('pointerdown', (e) => {
      if ((e as PointerEvent).pointerType !== 'touch') press(e);
    });
  }

  /**
   * ENTRADA del movil (decision del autor, 2026-10-01): en **MIRA** se actua
   * hacia la cruz, como siempre; en **TAP**, ademas, tocando el mundo. Un toque
   * rapido usa en ese punto y, si no se uso nada, ataca; mantenerlo
   * `HOLD_MS` ataca sostenido, y arrastrarlo despues gira la camara sin parar
   * de atacar; arrastrar antes es solo camara. ATAQUE y USAR siguen yendo a la
   * cruz en los dos. Interruptor como MODO, que arranca en MIRA y **se
   * recuerda** como el auto salto.
   */
  tapInput = Controls.storedTapInput();
  private readonly inputEls: HTMLElement[] = [];
  /** El toque rapido del modo TAP, con su punto de pantalla. Se consume una vez. */
  private tapQueued: { x: number; y: number } | null = null;
  /** El primer golpe del sostenido, en cuanto se reconoce. */
  private tapStrikeQueued = false;
  /** El dedo que sostiene el ataque en el modo TAP. */
  private tapHoldId: number | null = null;

  private static storedTapInput(): boolean {
    try {
      return window.localStorage.getItem(TAP_INPUT_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private toggleInput(): void {
    this.tapInput = !this.tapInput;
    this.showInput();
    try {
      window.localStorage.setItem(TAP_INPUT_STORAGE_KEY, this.tapInput ? '1' : '0');
    } catch {
      // Se aplica igual; solo no se recordara.
    }
  }

  private showInput(): void {
    // El icono dice la entrada: la cruz en MIRA y la mano en TAP (CSS).
    document.body.classList.toggle('tap-input', this.tapInput);
    for (const el of this.inputEls) {
      el.setAttribute('aria-pressed', String(this.tapInput));
      el.setAttribute('aria-label', this.tapInput ? 'Entrada: tap' : 'Entrada: mira');
    }
  }

  /** Conecta el boton ENTRADA: como MODO, un toque alterna y se enciende. */
  bindInputButton(el: HTMLElement | null): void {
    if (!el) return;
    this.inputEls.push(el);
    this.showInput();
    this.bindTap(el, () => this.toggleInput());
  }

  /** El toque rapido del modo TAP, si lo hubo: su punto de pantalla. */
  takeTap(): { x: number; y: number } | null {
    const out = this.tapQueued;
    this.tapQueued = null;
    return out;
  }

  /** El primer golpe de un sostenido del modo TAP. Se consume una vez. */
  takeTapStrike(): boolean {
    const out = this.tapStrikeQueued;
    this.tapStrikeQueued = false;
    return out;
  }

  /** Donde esta el dedo que sostiene el ataque del modo TAP, o `null`. */
  tapHoldPoint(): { x: number; y: number } | null {
    return this.tapHoldId === null ? null : this.gestures.pointOf(this.tapHoldId);
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
    this.bindTap(el, () => (this.jumpQueued = true));
  }

  /** Consume el «usar» pedido (clic derecho o boton USAR), si lo hubo. */
  takeUse(): boolean {
    const out = this.useQueued;
    this.useQueued = false;
    return out;
  }

  /**
   * El boton USAR del movil, junto al de accion: de un solo toque, no repite al
   * mantener. Sustituye a los de comer y sembrar (decision del autor).
   */
  bindUseButton(el: HTMLElement | null): void {
    this.bindTap(el, () => (this.useQueued = true));
  }

  /**
   * Un boton de un solo toque. Mientras el dedo esta puesto se ve encendido,
   * como el ataque mantenido (pedido del autor), y al soltar se apaga, pero no
   * antes de `FLASH_MS`: un toque rapido tambien tiene que verse.
   */
  private bindTap(el: HTMLElement | null, run: () => void): void {
    if (!el) return;
    let since = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const press = (e: Event) => {
      e.preventDefault();
      run();
      if (timer !== null) clearTimeout(timer);
      timer = null;
      since = performance.now();
      el.classList.add('on');
    };
    const release = () => {
      if (!el.classList.contains('on') || timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        el.classList.remove('on');
      }, Math.max(0, FLASH_MS - (performance.now() - since)));
    };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('pointerdown', (e) => {
      if ((e as PointerEvent).pointerType !== 'touch') press(e);
    });
    for (const type of ['touchend', 'touchcancel', 'pointerup', 'pointercancel']) {
      el.addEventListener(type, release);
    }
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

  /**
   * Si el zoom se esta sosteniendo: pinza apoyada, o + / - pulsado hace menos
   * de `ZOOM_HOLD_MS`. Una tecla no se «suelta» a efectos del catalejo, asi que
   * el de la primera persona vuelve cuando se deja de pulsar un momento
   * (deduccion del agente, no del autor).
   */
  get zoomHeld(): boolean {
    return this.gestures.pinchHeld || performance.now() - this.lastZoomKeyAt < ZOOM_HOLD_MS;
  }

  takeZoom(): number {
    const out = this.gestures.takeZoom() * this.keyZoom;
    this.keyZoom = 1;
    return out;
  }
}
