/**
 * El inventario por casillas (decision del autor: casillas con pilas, y la ropa
 * anadira casillas).
 *
 * Cada casilla guarda UN tipo de objeto hasta su tope (`stackMax`): veinte de
 * un recurso, una herramienta con su desgaste. Las cuatro primeras son la
 * barra, y la elegida es lo que se tiene en la mano.
 *
 * Todo lo que entra lo hace de golpe o no entra: `fits` responde antes de
 * tocar nada, para que un botin que no cabe deje el objeto en el mundo en vez
 * de repartirse a medias (propuesta mia del plan: no se pierde nada).
 */

import { RESOURCE_COUNT, stackMax, toolStats, type Resource } from '@verdant/shared';

/** Casillas con que se empieza: 16, decision del autor. */
export const START_SLOTS = 16;
/** Las primeras casillas forman la barra de la mano. */
export const HOTBAR_SLOTS = 4;

const EMPTY = -1;

export interface Bundle {
  item: Resource;
  count: number;
}

export class Inventory {
  /** Objeto de cada casilla, o -1 si esta vacia. */
  readonly items: Int16Array;
  readonly counts: Int32Array;
  /** Usos que le quedan a la herramienta de cada casilla. */
  readonly wear: Int32Array;
  /** Casilla de la barra que se tiene en la mano. */
  selected = 0;

  constructor(readonly size: number = START_SLOTS) {
    this.items = new Int16Array(size).fill(EMPTY);
    this.counts = new Int32Array(size);
    this.wear = new Int32Array(size);
  }

  itemAt(slot: number): Resource | null {
    const item = this.items[slot];
    return item === EMPTY ? null : (item as Resource);
  }

  /** Cuantos hay de un objeto, sumando todas las casillas. */
  count(item: Resource): number {
    let n = 0;
    for (let i = 0; i < this.size; i++) if (this.items[i] === item) n += this.counts[i];
    return n;
  }

  /** Totales por objeto, indexados por `Resource`: lo que pinta el HUD. */
  totals(): number[] {
    const out = new Array<number>(RESOURCE_COUNT).fill(0);
    for (let i = 0; i < this.size; i++) if (this.items[i] !== EMPTY) out[this.items[i]] += this.counts[i];
    return out;
  }

  /** Si cabe todo a la vez, contando lo que se va a sacar antes. */
  fits(add: readonly Bundle[], remove: readonly Bundle[] = []): boolean {
    const trial = this.clone();
    for (const r of remove) if (!trial.take(r.item, r.count)) return false;
    for (const a of add) if (!trial.put(a.item, a.count)) return false;
    return true;
  }

  /** Mete `count` de un objeto. Devuelve false, SIN haber tocado nada, si no cabe. */
  add(item: Resource, count: number): boolean {
    if (count <= 0) return true;
    if (!this.fits([{ item, count }])) return false;
    this.put(item, count);
    return true;
  }

  /** Saca `count` de un objeto. Devuelve false, sin tocar nada, si no hay. */
  remove(item: Resource, count: number): boolean {
    if (count <= 0) return true;
    if (this.count(item) < count) return false;
    this.take(item, count);
    return true;
  }

  /** Lo que haya en la casilla de la mano, sea herramienta o no. */
  inHand(): Resource | null {
    return this.itemAt(this.selected);
  }

  /** La herramienta que se tiene en la mano, o `null` si son las manos. */
  held(): Resource | null {
    const item = this.itemAt(this.selected);
    return item !== null && toolStats(item) ? item : null;
  }

  /**
   * Gasta un uso de la herramienta de la mano. Al llegar a cero se rompe y la
   * casilla queda vacia. Devuelve true si se rompio.
   */
  wearHeld(): boolean {
    const slot = this.selected;
    if (this.held() === null) return false;
    this.wear[slot]--;
    if (this.wear[slot] > 0) return false;
    this.clear(slot);
    return true;
  }

  select(slot: number): void {
    if (slot >= 0 && slot < HOTBAR_SLOTS) this.selected = slot;
  }

  /**
   * Arrastrar una casilla a otra (decision del autor): el mismo objeto se apila
   * hasta el tope y lo que sobra se queda en el origen; uno distinto, o una
   * herramienta, se intercambia.
   */
  move(from: number, to: number): void {
    if (from < 0 || to < 0 || from >= this.size || to >= this.size || from === to) return;
    const item = this.items[from];
    if (item === EMPTY) return;
    if (this.items[to] === item && !toolStats(item as Resource)) {
      const room = stackMax(item as Resource) - this.counts[to];
      const n = Math.min(room, this.counts[from]);
      this.counts[to] += n;
      this.counts[from] -= n;
      if (this.counts[from] === 0) this.clear(from);
      return;
    }
    this.swap(from, to);
  }

  swap(a: number, b: number): void {
    if (a < 0 || b < 0 || a >= this.size || b >= this.size || a === b) return;
    const item = this.items[a];
    const count = this.counts[a];
    const wear = this.wear[a];
    this.items[a] = this.items[b];
    this.counts[a] = this.counts[b];
    this.wear[a] = this.wear[b];
    this.items[b] = item;
    this.counts[b] = count;
    this.wear[b] = wear;
  }

  /** Tira lo de una casilla. Aun no hay objetos sueltos: desaparece. */
  discard(slot: number): void {
    if (slot >= 0 && slot < this.size) this.clear(slot);
  }

  private clear(slot: number): void {
    this.items[slot] = EMPTY;
    this.counts[slot] = 0;
    this.wear[slot] = 0;
  }

  private clone(): Inventory {
    const c = new Inventory(this.size);
    c.items.set(this.items);
    c.counts.set(this.counts);
    c.wear.set(this.wear);
    c.selected = this.selected;
    return c;
  }

  /** Mete sin comprobar antes: primero rellena pilas, luego casillas vacias. */
  private put(item: Resource, count: number): boolean {
    const max = stackMax(item);
    let left = count;
    for (let i = 0; i < this.size && left > 0; i++) {
      if (this.items[i] !== item || this.counts[i] >= max) continue;
      const n = Math.min(left, max - this.counts[i]);
      this.counts[i] += n;
      left -= n;
    }
    for (let i = 0; i < this.size && left > 0; i++) {
      if (this.items[i] !== EMPTY) continue;
      const n = Math.min(left, max);
      this.items[i] = item;
      this.counts[i] = n;
      this.wear[i] = toolStats(item)?.uses ?? 0;
      left -= n;
    }
    return left === 0;
  }

  /** Saca sin comprobar antes, de la ultima casilla hacia la primera. */
  private take(item: Resource, count: number): boolean {
    let left = count;
    for (let i = this.size - 1; i >= 0 && left > 0; i--) {
      if (this.items[i] !== item) continue;
      const n = Math.min(left, this.counts[i]);
      this.counts[i] -= n;
      left -= n;
      if (this.counts[i] === 0) this.clear(i);
    }
    return left === 0;
  }
}
