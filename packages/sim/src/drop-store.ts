/**
 * Los objetos sueltos en el mundo (el autor, 2026-10-18: «todo botin generado
 * debe ser arrojado como items flotantes en el suelo»). Solo los datos; la
 * fisica, el iman y de donde salen viven en `systems/drops.ts`.
 *
 * Son un monton por tipo: lo que suelta un arbol, cuatro de madera y una rama,
 * son dos montones (el autor). Viven en el `World`, fuera de los chunks, como
 * el overlay (regla 4): siguen ahi aunque su chunk se descarte, hasta que
 * caducan a los 2 dias de juego (el autor, 2026-10-19), y no hace falta
 * simularlos lejos, porque posados no cambian.
 *
 * Sin dependencias, para que `world.ts` lo pueda tener sin ciclos.
 */

import type { Resource } from '@verdant/shared';

/** La media huella de un monton, para buscar su suelo. **Deduccion mia.** */
export const DROP_HALF = 0.15;

export interface Drop {
  /** Unico y estable mientras exista: el cliente lo dibuja por el. */
  readonly id: number;
  readonly item: Resource;
  count: number;
  /** Usos que le quedan, si es una herramienta: tirarla no la arregla. */
  readonly wear: number;
  /** Posicion: `z` es la altura de su parte de abajo, en bloques. */
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Posado, flotando quieto sobre su suelo. Lo que reposa no se simula. */
  resting: boolean;
  /** Volando hacia el jugador, que lo esta recogiendo (el iman). */
  homing: boolean;
  /** Desde que tick se deja recoger: lo recien tirado no vuelve en el acto. */
  pickableAt: number;
  /** El tick en que se genero: de ahi cuenta su caducidad (`DROP_LIFE_TICKS`). */
  born: number;
}

export type DropSpec = Omit<Drop, 'id' | 'resting' | 'homing'>;

export class DropStore {
  private next = 1;
  private readonly byId = new Map<number, Drop>();

  get size(): number {
    return this.byId.size;
  }

  add(spec: DropSpec): Drop {
    const drop: Drop = { ...spec, id: this.next++, resting: false, homing: false };
    this.byId.set(drop.id, drop);
    return drop;
  }

  get(id: number): Drop | undefined {
    return this.byId.get(id);
  }

  remove(id: number): void {
    this.byId.delete(id);
  }

  /** Todos, en el orden en que salieron: el mismo en cada partida (regla 2). */
  values(): IterableIterator<Drop> {
    return this.byId.values();
  }

  /**
   * Despierta lo posado sobre una casilla que acaba de cambiar (se talo, se
   * coloco o se rompio algo): su suelo ya no es el que era.
   */
  wake(tx: number, ty: number): void {
    const reach = 0.5 + DROP_HALF;
    for (const d of this.byId.values()) {
      if (d.resting && Math.abs(d.x - (tx + 0.5)) <= reach && Math.abs(d.y - (ty + 0.5)) <= reach) d.resting = false;
    }
  }
}
