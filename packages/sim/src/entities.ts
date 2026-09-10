/**
 * Almacen de entidades en "structure of arrays".
 *
 * Cada propiedad vive en su propio array tipado en vez de haber un objeto por
 * entidad. Con miles de criaturas esto evita generar basura en cada tick y
 * mantiene los datos contiguos en memoria. Es mas verboso que un array de
 * objetos, y es deliberado: es la diferencia entre escalar y no escalar.
 */

export enum EntityKind {
  Player = 0,
  Critter = 1,
}

export const INVALID_ENTITY = -1;

export class EntityStore {
  readonly capacity: number;
  count = 0;

  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly vx: Float64Array;
  readonly vy: Float64Array;
  /**
   * Altura de los pies, en NIVELES, con decimales.
   *
   * La misma vara que `World.groundHeightAt`, y a proposito: pisar suelo es
   * exactamente `z === groundHeightAt(x, y)`, sin conversiones ni casos
   * especiales para los taludes.
   */
  readonly z: Float64Array;
  /** Velocidad vertical, en niveles por segundo. */
  readonly vz: Float64Array;
  /** 1 si los pies tocan el suelo. En el aire manda la gravedad. */
  readonly grounded: Uint8Array;
  /**
   * Velocidad horizontal en el instante del despegue.
   *
   * Se guarda porque el control en el aire es un **tope de desviacion** sobre
   * ella, no una velocidad nueva: sin recordar de que impulso se salio no hay
   * con que medir cuanto se ha desviado.
   */
  readonly takeoffVx: Float64Array;
  readonly takeoffVy: Float64Array;
  /** Ultima direccion no nula de movimiento: define el tile que se recolecta. */
  readonly facingX: Float32Array;
  readonly facingY: Float32Array;
  readonly health: Float32Array;
  readonly hunger: Float32Array;
  readonly kind: Uint8Array;
  readonly alive: Uint8Array;

  constructor(capacity = 4096) {
    this.capacity = capacity;
    this.x = new Float64Array(capacity);
    this.y = new Float64Array(capacity);
    this.vx = new Float64Array(capacity);
    this.vy = new Float64Array(capacity);
    this.z = new Float64Array(capacity);
    this.vz = new Float64Array(capacity);
    this.grounded = new Uint8Array(capacity);
    this.takeoffVx = new Float64Array(capacity);
    this.takeoffVy = new Float64Array(capacity);
    this.facingX = new Float32Array(capacity);
    this.facingY = new Float32Array(capacity);
    this.health = new Float32Array(capacity);
    this.hunger = new Float32Array(capacity);
    this.kind = new Uint8Array(capacity);
    this.alive = new Uint8Array(capacity);
  }

  spawn(kind: EntityKind, x: number, y: number): number {
    if (this.count >= this.capacity) return INVALID_ENTITY;
    const id = this.count++;
    this.x[id] = x;
    this.y[id] = y;
    this.vx[id] = 0;
    this.vy[id] = 0;
    // Nace en el suelo. La altura de verdad la pone quien conoce el mundo: aqui
    // no hay `World`, y no lo va a haber — el almacen son datos planos.
    this.z[id] = 0;
    this.vz[id] = 0;
    this.grounded[id] = 1;
    this.takeoffVx[id] = 0;
    this.takeoffVy[id] = 0;
    this.facingX[id] = 0;
    this.facingY[id] = 1;
    this.health[id] = 100;
    this.hunger[id] = 100;
    this.kind[id] = kind;
    this.alive[id] = 1;
    return id;
  }
}
