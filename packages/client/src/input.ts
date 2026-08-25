/**
 * Teclado y tactil -> Intent.
 *
 * El input NUNCA muta el estado de la simulacion directamente: solo produce una
 * Intent que el tick consume. Es lo que permitira, sin reescribir nada, enviar
 * esa misma Intent por red a un servidor autoritativo. Anadir el tactil no
 * cambia esa frontera: es una segunda fuente que alimenta la misma estructura.
 */

import { emptyIntent, type Intent } from '@verdant/shared';

export interface InputActions {
  onRestart: () => void;
  /** Factor < 1 acerca, > 1 aleja. */
  onZoom: (factor: number) => void;
}

/** Desplazamiento en pixeles que equivale a deflexion completa del joystick. */
const STICK_RADIUS_PX = 58;
/** Por debajo de esto el pulgar apoyado no debe mover al personaje. */
const STICK_DEADZONE = 0.16;
/** Ticks entre recolecciones al mantener pulsado: 15 a 60 Hz = 4 por segundo. */
const HARVEST_REPEAT_TICKS = 15;
/** Zonas de interfaz donde un toque no debe crear el joystick. */
const UI_SELECTOR = '#hud, #help, #dead, .touch-btn';

interface StickState {
  /** identifier del toque que controla el joystick, o null si no hay ninguno. */
  touchId: number | null;
  originX: number;
  originY: number;
  x: number;
  y: number;
}

export class Input {
  private readonly held = new Set<string>();

  /** Recoleccion latcheada: garantiza que un toque brevisimo se registre igual. */
  private harvestQueued = false;
  private harvestHeld = false;
  private harvestTicks = 0;
  private eatQueued = false;

  private readonly stick: StickState = { touchId: null, originX: 0, originY: 0, x: 0, y: 0 };
  private pinchDistance = 0;

  private readonly stickEl: HTMLElement | null;
  private readonly knobEl: HTMLElement | null;

  constructor(private readonly actions: InputActions) {
    this.stickEl = document.getElementById('stick');
    this.knobEl = document.getElementById('stickKnob');

    this.bindKeyboard();
    this.bindTouch();
    this.bindButtons();

    // En un dispositivo de puntero grueso los controles se muestran de entrada,
    // sin esperar a que el usuario adivine que existen.
    if (window.matchMedia?.('(pointer: coarse)').matches) this.revealTouchUi();
  }

  private revealTouchUi(): void {
    document.body.classList.add('touch-active');
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      // La repeticion del sistema operativo se ignora: la cadencia de
      // recoleccion la marca HARVEST_REPEAT_TICKS, igual en teclado y en tactil.
      if (e.repeat) {
        if (e.code === 'Space') e.preventDefault();
        return;
      }
      this.held.add(e.code);

      switch (e.code) {
        case 'Space':
          this.pressHarvest();
          e.preventDefault();
          break;
        case 'KeyE':
          this.eatQueued = true;
          break;
        case 'KeyR':
          this.actions.onRestart();
          break;
        case 'Equal':
        case 'NumpadAdd':
          this.actions.onZoom(1 / 1.25);
          break;
        case 'Minus':
        case 'NumpadSubtract':
          this.actions.onZoom(1.25);
          break;
        default:
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.held.delete(e.code);
      if (e.code === 'Space') this.releaseHarvest();
    });

    // Sin esto, salir de la pestana con una tecla pulsada deja al jugador
    // andando solo, o recolectando indefinidamente.
    window.addEventListener('blur', () => {
      this.held.clear();
      this.releaseHarvest();
      this.endStick();
    });
  }

  private pressHarvest(): void {
    this.harvestQueued = true;
    this.harvestHeld = true;
    this.harvestTicks = 0;
  }

  private releaseHarvest(): void {
    this.harvestHeld = false;
    this.harvestTicks = 0;
  }

  /** Botones fijos: recolectar (mantiene y repite), comer y pantalla completa. */
  private bindButtons(): void {
    const harvest = document.getElementById('btnHarvest');
    const eat = document.getElementById('btnEat');

    if (harvest) {
      const press = (e: Event) => {
        e.preventDefault();
        this.revealTouchUi();
        this.pressHarvest();
        harvest.classList.add('pressed');
      };
      const release = () => {
        this.releaseHarvest();
        harvest.classList.remove('pressed');
      };
      harvest.addEventListener('touchstart', press, { passive: false });
      harvest.addEventListener('touchend', release);
      harvest.addEventListener('touchcancel', release);
      // pointerdown cubre raton y lapiz sin duplicar el evento tactil.
      harvest.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') press(e);
      });
      harvest.addEventListener('pointerup', release);
      harvest.addEventListener('pointerleave', release);
    }

    if (eat) {
      const press = (e: Event) => {
        e.preventDefault();
        this.revealTouchUi();
        this.eatQueued = true;
      };
      eat.addEventListener('touchstart', press, { passive: false });
      eat.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') press(e);
      });
    }
  }

  /** Joystick flotante: nace donde se apoye el pulgar, fuera de la interfaz. */
  private bindTouch(): void {
    window.addEventListener(
      'touchstart',
      (e) => {
        this.revealTouchUi();

        for (const touch of Array.from(e.changedTouches)) {
          const target = touch.target as Element | null;
          if (target?.closest?.(UI_SELECTOR)) continue;
          if (this.stick.touchId !== null) continue;
          this.beginStick(touch);
          e.preventDefault();
          break;
        }
      },
      { passive: false },
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        // Pellizcar para hacer zoom, solo si no se esta usando el joystick: asi
        // un segundo dedo mientras se camina no provoca zooms accidentales.
        if (this.stick.touchId === null && e.touches.length >= 2) {
          this.updatePinch(e.touches[0], e.touches[1]);
          e.preventDefault();
          return;
        }

        for (const touch of Array.from(e.changedTouches)) {
          if (touch.identifier !== this.stick.touchId) continue;
          this.stick.x = touch.clientX;
          this.stick.y = touch.clientY;
          this.drawStick();
          e.preventDefault();
          break;
        }
      },
      { passive: false },
    );

    const end = (e: TouchEvent) => {
      if (e.touches.length < 2) this.pinchDistance = 0;
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === this.stick.touchId) this.endStick();
      }
    };
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
  }

  private updatePinch(a: Touch, b: Touch): void {
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (this.pinchDistance > 0 && distance > 0) {
      // Separar los dedos acerca la camara, de ahi el cociente invertido.
      this.actions.onZoom(this.pinchDistance / distance);
    }
    this.pinchDistance = distance;
  }

  private beginStick(touch: Touch): void {
    this.stick.touchId = touch.identifier;
    this.stick.originX = touch.clientX;
    this.stick.originY = touch.clientY;
    this.stick.x = touch.clientX;
    this.stick.y = touch.clientY;
    if (this.stickEl) {
      this.stickEl.style.left = `${touch.clientX}px`;
      this.stickEl.style.top = `${touch.clientY}px`;
      this.stickEl.classList.add('active');
    }
    this.drawStick();
  }

  private endStick(): void {
    this.stick.touchId = null;
    this.stickEl?.classList.remove('active');
    if (this.knobEl) this.knobEl.style.transform = 'translate(-50%, -50%)';
  }

  /** Mueve el pomo del joystick, acotado al radio, para dar feedback visual. */
  private drawStick(): void {
    if (!this.knobEl) return;
    const { dx, dy } = this.stickVector(STICK_RADIUS_PX);
    this.knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  /** Desplazamiento del joystick en pixeles, acotado a `limit`. */
  private stickVector(limit: number): { dx: number; dy: number } {
    const rawX = this.stick.x - this.stick.originX;
    const rawY = this.stick.y - this.stick.originY;
    const length = Math.hypot(rawX, rawY);
    if (length <= limit || length === 0) return { dx: rawX, dy: rawY };
    return { dx: (rawX / length) * limit, dy: (rawY / length) * limit };
  }

  /** Produce la Intent del tick y consume las acciones de pulsacion unica. */
  consume(): Intent {
    const intent = emptyIntent();

    if (this.stick.touchId !== null) {
      // El joystick manda mientras este activo: magnitud en [0, 1], que el
      // sistema de movimiento traduce a velocidad proporcional.
      const { dx, dy } = this.stickVector(STICK_RADIUS_PX);
      const magnitude = Math.hypot(dx, dy) / STICK_RADIUS_PX;
      if (magnitude > STICK_DEADZONE) {
        // Reescalar desde la zona muerta evita el salto de velocidad al cruzarla.
        const scaled = (magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE);
        const length = Math.hypot(dx, dy);
        intent.moveX = (dx / length) * scaled;
        intent.moveY = (dy / length) * scaled;
      }
    } else {
      if (this.held.has('KeyA') || this.held.has('ArrowLeft')) intent.moveX -= 1;
      if (this.held.has('KeyD') || this.held.has('ArrowRight')) intent.moveX += 1;
      if (this.held.has('KeyW') || this.held.has('ArrowUp')) intent.moveY -= 1;
      if (this.held.has('KeyS') || this.held.has('ArrowDown')) intent.moveY += 1;
    }

    if (this.harvestQueued) {
      // Un toque suelto siempre recolecta una vez, aunque dure menos de un tick.
      intent.harvest = true;
      this.harvestQueued = false;
      this.harvestTicks = 0;
    } else if (this.harvestHeld) {
      this.harvestTicks++;
      if (this.harvestTicks >= HARVEST_REPEAT_TICKS) {
        intent.harvest = true;
        this.harvestTicks = 0;
      }
    }

    intent.eat = this.eatQueued;
    this.eatQueued = false;

    return intent;
  }
}
