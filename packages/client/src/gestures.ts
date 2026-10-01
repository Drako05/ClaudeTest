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
 * movil: **cada dedo elige dueno al nacer y no lo cambia nunca**. Un rincon de
 * abajo a la izquierda es del joystick (`setStickZone`); el resto de la
 * pantalla, de la camara. Y
 * una pinza solo existe si sus DOS dedos son de la camara.
 *
 * Y un tercer dueno, que no nace en el lienzo: **el dedo del boton de accion**
 * (`'actionLook'`). El autor pidio apretar la accion y, sin soltar, arrastrar
 * ese mismo dedo para girar la camara —como la mirada es la de la camara, es
 * barrer alrededor—. Gira igual que un dedo de camara, pero **no cuenta para la
 * pinza**: si contara, el dedo de la accion mas uno de camara serian dos dedos
 * de camara y el zoom saltaria solo.
 */

/**
 * `'tapHold'` es el dedo del mundo que, en el modo TAP, se ha quedado quieto
 * `HOLD_MS`: ataca sostenido y, si luego se arrastra, gira la camara sin dejar
 * de atacar. Gira como el dedo de la accion y, como el, no cuenta para la
 * pinza.
 */
export type Role = 'stick' | 'look' | 'actionLook' | 'tapHold';

/** Clave de un puntero: los del lienzo son `pointerId`; los del boton, texto. */
export type PointerKey = number | string;

interface Touch {
  role: Role;
  x: number;
  y: number;
  /** Donde nacio. En el stick es el centro del joystick flotante. */
  originX: number;
  originY: number;
  /** Si viene de un dedo. Un raton no acciona igual que un pulgar. */
  isTouch: boolean;
  /** Lo mas que se ha alejado de donde nacio. Distingue un clic de un arrastre. */
  travel: number;
  /** Cuando nacio, en ms: distingue un toque de uno sostenido (modo TAP). */
  bornAt: number;
  /** Si llego a compartir pantalla con otro dedo de camara: era una pinza. */
  paired: boolean;
}

/**
 * Lo que tiene que quedarse quieto un dedo en el mundo para que, en el modo
 * TAP, sea un ataque sostenido y no un toque. **Deduccion mia**: lejos de los
 * 500 ms del toque largo de Chrome, que hizo caer una prueba a suertes
 * (escape 8 de la auditoria).
 */
export const HOLD_MS = 300;

/**
 * Pixeles que puede moverse un puntero sin dejar de ser un CLIC.
 *
 * El raton gira la camara arrastrando, asi que el clic de accion tiene que
 * convivir con eso: se decide al soltar, y lo que no se ha movido era un clic.
 * Un raton quieto nunca se mueve exactamente cero —la mano tiembla y el sensor
 * lo nota—, y seis pixeles es holgura de sobra sin que un arrastre corto cuele.
 */
export const TAP_SLOP = 6;

/** Lo que se sabe de un puntero al soltarlo. */
export interface Release {
  readonly role: Role;
  readonly isTouch: boolean;
  /** True si apenas se movio: fue un clic, no un arrastre. */
  readonly tap: boolean;
  /** Lo que estuvo apoyado, en ms. */
  readonly heldMs: number;
  /** Si llego a ser parte de una pinza. */
  readonly paired: boolean;
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
  private readonly touches = new Map<PointerKey, Touch>();
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
   * La zona del joystick, medida de la pantalla por quien la conoce: desde el
   * borde izquierdo hasta `right` y desde el de abajo hasta `top`. En el movil
   * es hasta el borde derecho del anillo de salud y la mitad de la altura de
   * CORRER (decision del autor, 2026-09-30). Sin medir, el cuadrante.
   */
  private stickZone: { right: number; top: number } | null = null;

  setStickZone(zone: { right: number; top: number } | null): void {
    this.stickZone = zone;
  }

  /**
   * A quien pertenece un toque que nace en `(x, y)`.
   *
   * La zona del joystick (`setStickZone`) es un rincon de abajo a la
   * izquierda: el resto de la pantalla gira la camara. Sin zona medida, el
   * cuadrante inferior izquierdo, que fue la zona hasta el 2026-09-30.
   *
   * Con raton siempre es camara: para andar ya esta WASD, y un raton no tiene
   * dos punteros con los que pellizcar.
   */
  roleFor(x: number, y: number, isTouch: boolean): Role {
    if (!isTouch) return 'look';
    // Solo un dedo puede llevar el joystick; el segundo en la zona mira.
    if (this.hasStick()) return 'look';
    const zone = this.stickZone ?? { right: this.width / 2, top: this.height / 2 };
    return x < zone.right && y > zone.top ? 'stick' : 'look';
  }

  down(id: number, x: number, y: number, isTouch: boolean, now = 0): void {
    const role = this.roleFor(x, y, isTouch);
    this.touches.set(id, { role, x, y, originX: x, originY: y, isTouch, travel: 0, bornAt: now, paired: false });
    // Dos dedos de camara a la vez son una pinza: ninguno de los dos sera ya
    // un toque ni un sostenido del modo TAP.
    const looks = this.lookTouches();
    if (looks.length >= 2) for (const t of looks) t.paired = true;
    // Que entre o salga un dedo de camara reinicia la referencia de la pinza:
    // sin esto, levantar uno de los dos daba un salto de zoom.
    this.resetPinch();
  }

  /**
   * El dedo que aprieta el boton de accion. Nace fuera del lienzo, asi que no
   * pasa por `roleFor`: su dueno es siempre el mismo.
   */
  downAction(key: string, x: number, y: number): void {
    this.touches.set(key, { role: 'actionLook', x, y, originX: x, originY: y, isTouch: true, travel: 0, bornAt: 0, paired: false });
  }

  move(id: PointerKey, x: number, y: number): void {
    const touch = this.touches.get(id);
    if (!touch) return;

    // Se mide contra el ORIGEN y se queda con el maximo: ir y volver sigue
    // siendo un arrastre, no un clic.
    const travel = Math.hypot(x - touch.originX, y - touch.originY);
    if (travel > touch.travel) touch.travel = travel;

    if (touch.role === 'actionLook' || touch.role === 'tapHold') {
      // No gira hasta pasar `TAP_SLOP`: un pulgar que solo mantiene el boton
      // tiembla, y sin umbral la camara daria tirones. Lo de antes del umbral
      // se pierde a proposito, para no dar un salto al cruzarlo. (Umbral
      // deducido por el agente, no pedido por el autor.)
      if (touch.travel > TAP_SLOP) {
        this.orbitX += x - touch.x;
        this.orbitY += y - touch.y;
      }
    } else if (touch.role === 'look') {
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

  /**
   * Suelta un puntero y cuenta que era.
   *
   * Devuelve lo que hacia falta para decidir la accion: de quien era, si venia
   * de un dedo y si apenas se movio. Quien decide que hacer con eso es
   * `controls.ts` — aqui no se sabe que existe una accion.
   */
  up(id: PointerKey, now = 0): Release | null {
    const touch = this.touches.get(id);
    this.touches.delete(id);
    // El dedo de la accion no forma parte de ninguna pinza: soltarlo no la toca.
    if (touch?.role !== 'actionLook' && touch?.role !== 'tapHold') this.resetPinch();
    if (!touch) return null;
    return {
      role: touch.role,
      isTouch: touch.isTouch,
      tap: touch.travel <= TAP_SLOP,
      heldMs: now - touch.bornAt,
      paired: touch.paired,
    };
  }

  /**
   * Modo TAP: si el dedo `id` del mundo lleva `HOLD_MS` quieto y solo, y por
   * tanto pasa a ser un ataque sostenido. Si lo es, cambia de dueno
   * (`'tapHold'`): desde ahi arrastrarlo gira la camara sin parar de atacar.
   */
  promoteHold(id: PointerKey, now: number): boolean {
    const touch = this.touches.get(id);
    if (!touch || touch.role !== 'look' || !touch.isTouch || touch.paired) return false;
    if (touch.travel > TAP_SLOP || now - touch.bornAt < HOLD_MS) return false;
    touch.role = 'tapHold';
    this.resetPinch();
    return true;
  }

  /** Donde esta ahora un dedo, o `null` si ya no esta apoyado. */
  pointOf(id: PointerKey): { x: number; y: number } | null {
    const touch = this.touches.get(id);
    return touch ? { x: touch.x, y: touch.y } : null;
  }

  /** Se sueltan todos: al perder el foco de la ventana, por ejemplo. */
  clear(): void {
    this.touches.clear();
    this.resetPinch();
    this.orbitX = 0;
    this.orbitY = 0;
    this.zoomFactor = 1;
  }

  /**
   * La DIRECCION del joystick, unitaria, con zona muerta aplicada.
   *
   * Antes devolvia un vector de magnitud proporcional al desplazamiento del
   * pulgar, y el nucleo lo usaba de acelerador. El autor lo cambio al pedir la
   * carrera: el mando apunta y el interruptor decide la velocidad. La zona
   * muerta se queda —apoyar el pulgar sin querer andar no debe mover a nadie—,
   * pero al cruzarla ya se va a velocidad de marcha entera.
   */
  stick(): { x: number; y: number } {
    for (const touch of this.touches.values()) {
      if (touch.role !== 'stick') continue;
      const dx = touch.x - touch.originX;
      const dy = touch.y - touch.originY;
      const len = Math.hypot(dx, dy);
      if (len < STICK_RADIUS * STICK_DEAD) return { x: 0, y: 0 };
      return { x: dx / len, y: dy / len };
    }
    return { x: 0, y: 0 };
  }

  /**
   * Donde esta el pulgar dentro del joystick, para DIBUJARLO.
   *
   * Va aparte de `stick()` desde que aquella devuelve direccion pura: el mando
   * de la pantalla tiene que seguir al pulgar de verdad, aunque la velocidad ya
   * no dependa de cuanto se haya desplazado.
   */
  stickKnob(): { x: number; y: number } {
    for (const touch of this.touches.values()) {
      if (touch.role !== 'stick') continue;
      const dx = touch.x - touch.originX;
      const dy = touch.y - touch.originY;
      const len = Math.hypot(dx, dy);
      if (len === 0) return { x: 0, y: 0 };
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

  /**
   * True mientras haya dos dedos de camara apoyados, se muevan o no: es lo que
   * sostiene el catalejo de la primera persona, que vuelve al soltarlos.
   */
  get pinchHeld(): boolean {
    return this.lookTouches().length >= 2;
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
