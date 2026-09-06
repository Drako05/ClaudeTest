/**
 * De quien es cada dedo.
 *
 * **Puro**: sin DOM ni three.js, como `terrain-mesh.ts`. `controls.ts` solo le
 * pasa eventos ya reducidos a numeros. Se saca aparte porque el fallo que cierra
 * es exactamente de esta clase —una regla sobre quien manda sobre que dedo— y
 * eso se afirma en un test o no se afirma.
 *
 * El fallo: la pinza se calculaba sobre `event.touches`, que son TODOS los dedos
 * sobre el lienzo. Un dedo andando en el joystick mas otro girando la camara son
 * dos toques, asi que se leian como una pinza y mover cualquiera de los dos
 * cambiaba el zoom sin que nadie lo pidiera.
 *
 * La regla, que es la de Genshin y la de casi cualquier tercera persona en
 * movil: **cada dedo elige dueno al nacer y no lo cambia nunca**. El cuadrante
 * inferior izquierdo es del joystick; el resto de la pantalla, de la camara. Y
 * una pinza solo existe si sus DOS dedos son de la camara.
 */

export type Role = 'stick' | 'look';

interface Touch {
  role: Role;
  x: number;
  y: number;
  /** Donde nacio. En el stick es el centro del joystick flotante. */
  originX: number;
  originY: number;
}

/** Radio en pixeles al que el joystick da su valor maximo. */
export const STICK_RADIUS = 58;

/**
 * Fraccion del radio por debajo de la cual el joystick no vale nada.
 *
 * Sin ella, apoyar el pulgar sin querer andar empuja al personaje: un toque
 * nunca cae exactamente en su propio origen.
 */
export const STICK_DEAD = 0.14;

/** Pixeles que tienen que separarse dos dedos antes de que cuente como pinza. */
export const PINCH_THRESHOLD = 10;

export class Gestures {
  private readonly touches = new Map<number, Touch>();
  private orbitX = 0;
  private orbitY = 0;
  private zoomFactor = 1;
  /** Separacion de la ultima pinza, o 0 si no hay ninguna en curso. */
  private pinchDistance = 0;
  /** True cuando la pinza ya paso el umbral y esta mandando sobre el zoom. */
  private pinching = false;

  constructor(private width: number, private height: number) {}

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /**
   * A quien pertenece un toque que nace en `(x, y)`.
   *
   * El cuadrante inferior izquierdo es el del joystick, y no la mitad izquierda
   * entera: reservando media pantalla te quedas sin sitio para girar la camara a
   * ese lado. Arriba a la izquierda sigue siendo camara.
   *
   * Con raton siempre es camara: para andar ya esta WASD, y un raton no tiene
   * dos punteros con los que pellizcar.
   */
  roleFor(x: number, y: number, isTouch: boolean): Role {
    if (!isTouch) return 'look';
    // Solo un dedo puede llevar el joystick; el segundo en la zona mira.
    if (this.hasStick()) return 'look';
    return x < this.width / 2 && y > this.height / 2 ? 'stick' : 'look';
  }

  down(id: number, x: number, y: number, isTouch: boolean): void {
    const role = this.roleFor(x, y, isTouch);
    this.touches.set(id, { role, x, y, originX: x, originY: y });
    // Que entre o salga un dedo de camara reinicia la referencia de la pinza:
    // sin esto, levantar uno de los dos daba un salto de zoom.
    this.resetPinch();
  }

  move(id: number, x: number, y: number): void {
    const touch = this.touches.get(id);
    if (!touch) return;

    if (touch.role === 'look') {
      const looks = this.lookTouches();
      // Con DOS dedos de camara manda la pinza y el giro se suspende: si no,
      // pellizcar hace girar la vista al mismo tiempo.
      if (looks.length >= 2) {
        touch.x = x;
        touch.y = y;
        this.applyPinch();
        return;
      }
      this.orbitX += x - touch.x;
      this.orbitY += y - touch.y;
    }

    touch.x = x;
    touch.y = y;
  }

  up(id: number): void {
    this.touches.delete(id);
    this.resetPinch();
  }

  /** Se sueltan todos: al perder el foco de la ventana, por ejemplo. */
  clear(): void {
    this.touches.clear();
    this.resetPinch();
    this.orbitX = 0;
    this.orbitY = 0;
    this.zoomFactor = 1;
  }

  /** El vector del joystick, de -1 a 1 y ya con zona muerta aplicada. */
  stick(): { x: number; y: number } {
    for (const touch of this.touches.values()) {
      if (touch.role !== 'stick') continue;
      const dx = touch.x - touch.originX;
      const dy = touch.y - touch.originY;
      const len = Math.hypot(dx, dy);
      if (len < STICK_RADIUS * STICK_DEAD) return { x: 0, y: 0 };
      const scale = (len > STICK_RADIUS ? STICK_RADIUS / len : 1) / STICK_RADIUS;
      return { x: dx * scale, y: dy * scale };
    }
    return { x: 0, y: 0 };
  }

  /** Donde dibujar el joystick flotante, o `null` si no hay ninguno activo. */
  stickCenter(): { x: number; y: number } | null {
    for (const touch of this.touches.values()) {
      if (touch.role === 'stick') return { x: touch.originX, y: touch.originY };
    }
    return null;
  }

  /** El giro acumulado desde la ultima vez que se pidio, en pixeles. */
  takeOrbit(): { dx: number; dy: number } {
    const out = { dx: this.orbitX, dy: this.orbitY };
    this.orbitX = 0;
    this.orbitY = 0;
    return out;
  }

  /** El zoom acumulado desde la ultima vez, como factor multiplicativo. */
  takeZoom(): number {
    const out = this.zoomFactor;
    this.zoomFactor = 1;
    return out;
  }

  private hasStick(): boolean {
    for (const touch of this.touches.values()) {
      if (touch.role === 'stick') return true;
    }
    return false;
  }

  private lookTouches(): Touch[] {
    const out: Touch[] = [];
    for (const touch of this.touches.values()) {
      if (touch.role === 'look') out.push(touch);
    }
    return out;
  }

  private resetPinch(): void {
    this.pinchDistance = 0;
    this.pinching = false;
  }

  /**
   * La pinza, calculada SOLO con los dos dedos de camara.
   *
   * Aqui esta el arreglo: mirando la lista de dedos de camara y no la de todos
   * los dedos del lienzo, un joystick mas una camara dejan de parecer una pinza.
   */
  private applyPinch(): void {
    const [a, b] = this.lookTouches();
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (this.pinchDistance === 0) {
      this.pinchDistance = distance;
      return;
    }
    // Un umbral antes de empezar: dos dedos quietos tiemblan unos pixeles, y sin
    // esto el zoom vibraria solo por apoyarlos.
    if (!this.pinching) {
      if (Math.abs(distance - this.pinchDistance) < PINCH_THRESHOLD) return;
      this.pinching = true;
      this.pinchDistance = distance;
      return;
    }
    this.zoomFactor *= this.pinchDistance / distance;
    this.pinchDistance = distance;
  }
}
