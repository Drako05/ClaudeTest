/**
 * El inventario por casillas (decision del autor: casillas con pilas, y la ropa
 * anade casillas).
 *
 * Cada casilla guarda UN tipo de objeto hasta su tope (`stackMax`): cien de un
 * recurso, una herramienta con su desgaste. Las cuatro primeras son la barra, y
 * la elegida es lo que se tiene en la mano.
 *
 * Todo lo que entra lo hace de golpe o no entra: `fits` responde antes de
 * tocar nada, para que un botin que no cabe deje el objeto en el mundo en vez
 * de repartirse a medias (propuesta mia del plan: no se pierde nada).
 *
 * **La ropa abre tramos fijos** (tanda 2): detras de las casillas base van las
 * de la cintura y detras las de la espalda, y un tramo sin su prenda no existe
 * para nada —ni para meter, ni para sacar, ni para arrastrar—. Que el tramo sea
 * fijo y no «las ultimas N» es lo que hace bien definida la regla del autor:
 * **una prenda no se quita con sus casillas ocupadas** (propuesta mia).
 */

import {
  garmentOf,
  RESOURCE_COUNT,
  stackMax,
  toolStats,
  Wear,
  WEAR_SLOTS,
  type Resource,
} from '@verdant/shared';

/** Casillas con que se empieza: 16, decision del autor. */
export const START_SLOTS = 16;
/** Las primeras casillas forman la barra de la mano. */
export const HOTBAR_SLOTS = 4;
/**
 * Indices de los huecos de ropa para arrastrar (`Intent.moveFrom`/`moveTo`,
 * `discard`): lejos de cualquier casilla, para que no se confundan.
 */
export const EQUIP_BASE = 1000;
export const EQUIP_WAIST = EQUIP_BASE + Wear.Waist;
export const EQUIP_BACK = EQUIP_BASE + Wear.Back;

const EMPTY = -1;
const EXTRA_SLOTS = WEAR_SLOTS.reduce((a, b) => a + b, 0);

export interface Bundle {
  item: Resource;
  count: number;
}

/** El hueco de ropa que es un indice de arrastre, o `null` si es una casilla. */
export function wearOfSlot(slot: number): Wear | null {
  const w = slot - EQUIP_BASE;
  return w >= 0 && w < WEAR_SLOTS.length ? (w as Wear) : null;
}

export class Inventory {
  /** Objeto de cada casilla, o -1 si esta vacia. Incluye los tramos de la ropa. */
  readonly items: Int16Array;
  readonly counts: Int32Array;
  /** Usos que le quedan a la herramienta de cada casilla. */
  readonly wear: Int32Array;
  /** La prenda de cada hueco (`Wear`), o `null`. */
  readonly worn: (Resource | null)[] = WEAR_SLOTS.map(() => null);
  /** Casilla de la barra que se tiene en la mano. */
  selected = 0;

  /** `base`: las casillas sin ropa. Los tramos de la ropa van detras. */
  constructor(readonly base: number = START_SLOTS) {
    const size = base + EXTRA_SLOTS;
    this.items = new Int16Array(size).fill(EMPTY);
    this.counts = new Int32Array(size);
    this.wear = new Int32Array(size);
  }

  /** Cuantos indices de casilla hay, abiertos o no: el tope para recorrerlas. */
  get size(): number {
    return this.items.length;
  }

  /** El tramo de casillas de un hueco de ropa: `[desde, hasta)`. */
  rangeOf(w: Wear): [number, number] {
    let start = this.base;
    for (let i = 0; i < w; i++) start += WEAR_SLOTS[i];
    return [start, start + WEAR_SLOTS[w]];
  }

  /** Si una casilla existe ahora mismo: las base siempre; las de ropa, con ella. */
  isOpen(slot: number): boolean {
    if (slot < 0 || slot >= this.size) return false;
    if (slot < this.base) return true;
    for (let w = 0; w < WEAR_SLOTS.length; w++) {
      const [a, b] = this.rangeOf(w);
      if (slot >= a && slot < b) return this.worn[w] !== null;
    }
    return false;
  }

  /** Cuantas casillas hay abiertas: 16, 18, 22 o 24. */
  openSlots(): number {
    let n = 0;
    for (let i = 0; i < this.size; i++) if (this.isOpen(i)) n++;
    return n;
  }

  itemAt(slot: number): Resource | null {
    const w = wearOfSlot(slot);
    if (w !== null) return this.worn[w];
    const item = this.items[slot];
    return item === EMPTY || item === undefined ? null : (item as Resource);
  }

  /**
   * Cuantos hay de un objeto, sumando las casillas. Lo que se lleva puesto NO
   * cuenta: no se gasta en una receta.
   */
  count(item: Resource): number {
    let n = 0;
    for (let i = 0; i < this.size; i++) if (this.items[i] === item) n += this.counts[i];
    return n;
  }

  /**
   * Totales por objeto, indexados por `Resource`, **con lo puesto**: asi
   * equiparse una prenda no cuenta como perderla en el registro de objetos.
   */
  totals(): number[] {
    const out = new Array<number>(RESOURCE_COUNT).fill(0);
    for (let i = 0; i < this.size; i++) if (this.items[i] !== EMPTY) out[this.items[i]] += this.counts[i];
    for (const g of this.worn) if (g !== null) out[g]++;
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

  /** Gasta uno de lo que se lleva en la mano (una estacion al colocarla). */
  spendInHand(): void {
    const slot = this.selected;
    if (this.items[slot] === EMPTY) return;
    this.counts[slot]--;
    if (this.counts[slot] <= 0) this.clear(slot);
  }

  select(slot: number): void {
    if (slot >= 0 && slot < HOTBAR_SLOTS) this.selected = slot;
  }

  /**
   * Arrastrar una casilla a otra (decision del autor): el mismo objeto se apila
   * hasta el tope y lo que sobra se queda en el origen; uno distinto, o una
   * herramienta, se intercambia. Hacia o desde un hueco de ropa, equipa o quita.
   */
  move(from: number, to: number): void {
    if (wearOfSlot(from) !== null || wearOfSlot(to) !== null) {
      this.moveWorn(from, to);
      return;
    }
    if (!this.isOpen(from) || !this.isOpen(to) || from === to) return;
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
    if (!this.isOpen(a) || !this.isOpen(b) || a === b) return;
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

  /** True si el tramo de un hueco de ropa no tiene nada: la prenda se puede quitar. */
  rangeEmpty(w: Wear): boolean {
    const [a, b] = this.rangeOf(w);
    for (let i = a; i < b; i++) if (this.items[i] !== EMPTY) return false;
    return true;
  }

  /**
   * Tira lo de una casilla. Aun no hay objetos sueltos: desaparece. Una prenda
   * puesta se tira solo si se podria quitar.
   */
  discard(slot: number): void {
    const w = wearOfSlot(slot);
    if (w !== null) {
      if (this.worn[w] !== null && this.rangeEmpty(w)) this.worn[w] = null;
      return;
    }
    if (this.isOpen(slot)) this.clear(slot);
  }

  /**
   * Equipar (casilla → hueco) o quitar (hueco → casilla). Solo entra en un hueco
   * su prenda y solo si esta libre; y una prenda solo se quita a una casilla
   * vacia de fuera de su tramo, y con el tramo vacio (el autor).
   */
  private moveWorn(from: number, to: number): void {
    const wFrom = wearOfSlot(from);
    const wTo = wearOfSlot(to);
    if (wFrom === null && wTo !== null) {
      const item = this.itemAt(from);
      if (!this.isOpen(from) || item === null || garmentOf(item) !== wTo) return;
      if (this.worn[wTo] !== null) return;
      this.worn[wTo] = item;
      this.clear(from);
      return;
    }
    if (wFrom !== null && wTo === null) {
      const item = this.worn[wFrom];
      if (item === null || !this.isOpen(to) || this.items[to] !== EMPTY) return;
      if (!this.rangeEmpty(wFrom)) return;
      const [a, b] = this.rangeOf(wFrom);
      if (to >= a && to < b) return;
      this.worn[wFrom] = null;
      this.items[to] = item;
      this.counts[to] = 1;
      this.wear[to] = 0;
    }
  }

  private clear(slot: number): void {
    this.items[slot] = EMPTY;
    this.counts[slot] = 0;
    this.wear[slot] = 0;
  }

  private clone(): Inventory {
    const c = new Inventory(this.base);
    c.items.set(this.items);
    c.counts.set(this.counts);
    c.wear.set(this.wear);
    for (let w = 0; w < this.worn.length; w++) c.worn[w] = this.worn[w];
    c.selected = this.selected;
    return c;
  }

  /** Mete sin comprobar antes: primero rellena pilas, luego casillas vacias. */
  private put(item: Resource, count: number): boolean {
    const max = stackMax(item);
    let left = count;
    for (let i = 0; i < this.size && left > 0; i++) {
      if (this.items[i] !== item || this.counts[i] >= max || !this.isOpen(i)) continue;
      const n = Math.min(left, max - this.counts[i]);
      this.counts[i] += n;
      left -= n;
    }
    for (let i = 0; i < this.size && left > 0; i++) {
      if (this.items[i] !== EMPTY || !this.isOpen(i)) continue;
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
