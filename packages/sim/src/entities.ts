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
    this.facingX[id] = 0;
    this.facingY[id] = 1;
    this.health[id] = 100;
    this.hunger[id] = 100;
    this.kind[id] = kind;
    this.alive[id] = 1;
    return id;
  }
}
