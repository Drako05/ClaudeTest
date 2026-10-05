/**
 * Almacen de entidades en "structure of arrays".
 *
 * Cada propiedad vive en su propio array tipado en vez de haber un objeto por
 * entidad. Con miles de criaturas esto evita generar basura en cada tick y
 * mantiene los datos contiguos en memoria. Es mas verboso que un array de
 * objetos, y es deliberado: es la diferencia entre escalar y no escalar.
 */

import type { Animal } from './fauna.js';

export enum EntityKind {
  Player = 0,
  /** Un animal de la fauna (`fauna.ts`). */
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
   * La misma vara que `World.floorHeightAt`, y a proposito: pisar suelo es
   * exactamente `z === floorHeightAt(x, y)` —el terreno y, encima, la estacion
   * de esa casilla—, sin conversiones ni casos especiales para los taludes.
   */
  readonly z: Float64Array;
  /** Velocidad vertical, en niveles por segundo. */
  readonly vz: Float64Array;
  /** 1 si los pies tocan el suelo. En el aire manda la gravedad. */
  readonly grounded: Uint8Array;
  /**
   * Hacia donde mira, en el plano: la ultima direccion no nula de movimiento, o
   * la mirada de la camara si la hay. Es el eje del sector del golpe, y va sin
   * redondear a ocho direcciones.
   */
  readonly facingX: Float32Array;
  readonly facingY: Float32Array;
  /**
   * Giro del plano del sector alrededor de la mirada (modo TAP), en radianes.
   * Con 0, el plano de la mirada y la horizontal a su derecha.
   */
  readonly lookRoll: Float32Array;
  /** Componente vertical de la mirada (ver `Intent.aimZ`). */
  readonly lookZ: Float32Array;
  readonly health: Float32Array;
  readonly hunger: Float32Array;
  readonly kind: Uint8Array;
  readonly alive: Uint8Array;
  /**
   * El animal que es cada entidad de fauna, o `null`. Quien es —especie, etapa,
   * sexo, territorio— sale de su chunk (`faunaOf`); la entidad solo lo lleva
   * mientras anda materializado cerca del jugador.
   */
  readonly animal: (Animal | null)[];
  /** Los PV completos de cada animal. Para el jugador, `health` va de 0 a 100. */
  readonly maxHealth: Float32Array;
  /** El periodo de paseo y el punto de paso calculados, para no repetirlos. */
  readonly wanderPeriod: Float64Array;
  readonly wanderX: Float64Array;
  readonly wanderY: Float64Array;
  /**
   * El rodeo de un animal (`walkAnimal`): su rumbo y los bloques que le quedan
   * por andar en el. 0 es que va derecho a su punto de paso; menos de 0, que
   * no encontro salida y espera al siguiente.
   */
  readonly detourX: Float32Array;
  readonly detourY: Float32Array;
  readonly detourLeft: Float32Array;
  /** Lo que lleva retrocedido un animal para que le quepa un giro. */
  readonly backedUp: Float32Array;
  /** A que velocidad avanza un animal en el aire: la de su salto, o la de su paso si se cayo andando. */
  readonly leap: Float32Array;
  /** Huecos de entidades retiradas, que `spawn` reutiliza antes de crecer. */
  private readonly free: number[] = [];

  constructor(capacity = 4096) {
    this.capacity = capacity;
    this.x = new Float64Array(capacity);
    this.y = new Float64Array(capacity);
    this.vx = new Float64Array(capacity);
    this.vy = new Float64Array(capacity);
    this.z = new Float64Array(capacity);
    this.vz = new Float64Array(capacity);
    this.grounded = new Uint8Array(capacity);
    this.facingX = new Float32Array(capacity);
    this.facingY = new Float32Array(capacity);
    this.lookZ = new Float32Array(capacity);
    this.lookRoll = new Float32Array(capacity);
    this.health = new Float32Array(capacity);
    this.hunger = new Float32Array(capacity);
    this.kind = new Uint8Array(capacity);
    this.alive = new Uint8Array(capacity);
    this.animal = new Array<Animal | null>(capacity).fill(null);
    this.maxHealth = new Float32Array(capacity);
    this.wanderPeriod = new Float64Array(capacity).fill(Number.NaN);
    this.wanderX = new Float64Array(capacity);
    this.wanderY = new Float64Array(capacity);
    this.detourX = new Float32Array(capacity);
    this.detourY = new Float32Array(capacity);
    this.detourLeft = new Float32Array(capacity);
    this.backedUp = new Float32Array(capacity);
    this.leap = new Float32Array(capacity);
  }

  spawn(kind: EntityKind, x: number, y: number): number {
    let id: number;
    if (this.free.length > 0) id = this.free.pop()!;
    else if (this.count < this.capacity) id = this.count++;
    else return INVALID_ENTITY;
    this.x[id] = x;
    this.y[id] = y;
    this.vx[id] = 0;
    this.vy[id] = 0;
    // Nace en el suelo. La altura de verdad la pone quien conoce el mundo: aqui
    // no hay `World`, y no lo va a haber — el almacen son datos planos.
    this.z[id] = 0;
    this.vz[id] = 0;
    this.grounded[id] = 1;
    this.facingX[id] = 0;
    this.facingY[id] = 1;
    this.lookZ[id] = 0;
    this.lookRoll[id] = 0;
    this.health[id] = 100;
    this.hunger[id] = 100;
    this.kind[id] = kind;
    this.alive[id] = 1;
    this.animal[id] = null;
    this.maxHealth[id] = 100;
    this.wanderPeriod[id] = Number.NaN;
    this.detourLeft[id] = 0;
    this.backedUp[id] = 0;
    this.leap[id] = 0;
    return id;
  }

  /**
   * Retira una entidad y deja su hueco para la siguiente. Es lo de la fauna,
   * que entra y sale con los chunks; el jugador no se retira nunca.
   */
  despawn(id: number): void {
    if (id < 0 || id >= this.count || this.kind[id] === EntityKind.Player) return;
    this.alive[id] = 0;
    this.animal[id] = null;
    this.free.push(id);
  }
}
