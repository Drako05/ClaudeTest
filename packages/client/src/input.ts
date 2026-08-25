/**
 * Teclado -> Intent.
 *
 * El input NUNCA muta el estado de la simulacion directamente: solo produce una
 * Intent que el tick consume. Es lo que permitira, sin reescribir nada, enviar
 * esa misma Intent por red a un servidor autoritativo.
 */

import { emptyIntent, type Intent } from '@verdant/shared';

export interface InputActions {
  onRestart: () => void;
  onZoom: (factor: number) => void;
}

export class Input {
  private readonly held = new Set<string>();
  /** Acciones de pulsacion unica, pendientes de consumir por el proximo tick. */
  private harvestQueued = false;
  private eatQueued = false;

  constructor(actions: InputActions) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) {
        // Mantener pulsado no debe encadenar recolecciones: una pulsacion, una accion.
        if (e.code === 'Space') e.preventDefault();
        return;
      }
      this.held.add(e.code);

      switch (e.code) {
        case 'Space':
          this.harvestQueued = true;
          e.preventDefault();
          break;
        case 'KeyE':
          this.eatQueued = true;
          break;
        case 'KeyR':
          actions.onRestart();
          break;
        case 'Equal':
        case 'NumpadAdd':
          actions.onZoom(1 / 1.25);
          break;
        case 'Minus':
        case 'NumpadSubtract':
          actions.onZoom(1.25);
          break;
        default:
          break;
      }
    });

    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    // Sin esto, salir de la pestana con una tecla pulsada deja al jugador andando solo.
    window.addEventListener('blur', () => this.held.clear());
  }

  /** Produce la Intent del tick y consume las acciones de pulsacion unica. */
  consume(): Intent {
    const intent = emptyIntent();

    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) intent.moveX -= 1;
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) intent.moveX += 1;
    if (this.held.has('KeyW') || this.held.has('ArrowUp')) intent.moveY -= 1;
    if (this.held.has('KeyS') || this.held.has('ArrowDown')) intent.moveY += 1;

    intent.harvest = this.harvestQueued;
    intent.eat = this.eatQueued;
    this.harvestQueued = false;
    this.eatQueued = false;

    return intent;
  }
}
