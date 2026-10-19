/**
 * El inventario por casillas (decision del autor: casillas con pilas, y el
 * bolso anade casillas).
 *
 * Cada casilla guarda UN tipo de objeto hasta su tope (`stackMax`): cien de un
 * recurso, una herramienta con su desgaste. Las cinco primeras —la primera fila
 * de la rejilla, de 5 columnas— son la barra, y la elegida es lo que se tiene
 * en la mano (el autor, 2026-10-19).
 *
 * `add` mete de golpe o no mete: `fits` responde antes de tocar nada. Lo que
 * viene del suelo y lo fabricado entran en lo que quepa (`addSome`), y el resto
 * se queda en el suelo o cae a los pies (el autor, 2026-10-18: todo botin cae
 * al suelo).
 *
 * **Los equipables** (2026-10-04): catorce huecos de PERSONAJE (`Equip`), cada
 * uno con su objeto y el desgaste que traia. El **Bolso** abre un tramo fijo
 * detras de las casillas base —la bolsa sus 2 primeras, la mochila las 6—, y
 * una casilla cerrada no existe para nada: ni para meter, ni para sacar, ni
 * para arrastrar. Que el tramo sea fijo y no «las ultimas N» es lo que hace
 * bien definida la regla del autor: **el bolso no se quita con sus casillas
 * ocupadas** (propuesta mia).
 */

import {
  BAG_RANGE,
  bagCapacity,
  Equip,
  EQUIP_COUNT,
  equipOf,
  RESOURCE_COUNT,
  stackMax,
  toolStats,
  type Resource,
} from '@verdant/shared';

/** Casillas con que se empieza: 15, tres filas de 5 (el autor, 2026-10-19). */
export const START_SLOTS = 15;
/** Las primeras casillas forman la barra de la mano: la primera fila, 5 (el autor, 2026-10-19). */
export const HOTBAR_SLOTS = 5;
/**
 * Indices de los huecos de PERSONAJE para arrastrar (`Intent.moveFrom`/`moveTo`,
 * `discard`): `EQUIP_BASE + Equip`, lejos de cualquier casilla para que no se
 * confundan.
 */
export const EQUIP_BASE = 1000;

/** El indice de arrastre de un hueco de PERSONAJE. */
export function equipSlot(e: Equip): number {
  return EQUIP_BASE + e;
}

const EMPTY = -1;

/** Lo que sale de una casilla al tirarla: el objeto, cuantos y su desgaste. */
export interface Thrown {
  readonly item: Resource;
  readonly count: number;
  readonly wear: number;
}

export interface Bundle {
  item: Resource;
  count: number;
}

/** El hueco de PERSONAJE que es un indice de arrastre, o `null` si es una casilla. */
export function equipOfSlot(slot: number): Equip | null {
  const e = slot - EQUIP_BASE;
  return e >= 0 && e < EQUIP_COUNT ? (e as Equip) : null;
}

export class Inventory {
  /** Objeto de cada casilla, o -1 si esta vacia. Incluye el tramo del Bolso. */
  readonly items: Int16Array;
  readonly counts: Int32Array;
  /** Usos que le quedan a la herramienta de cada casilla. */
  readonly wear: Int32Array;
  /** Lo equipado en cada hueco (`Equip`), o `null`. */
  readonly worn: (Resource | null)[] = new Array<Resource | null>(EQUIP_COUNT).fill(null);
  /** Usos que le quedan a lo equipado: un arma conserva su desgaste al ponerla y quitarla. */
  readonly wornWear = new Int32Array(EQUIP_COUNT);
  /** Casilla de la barra que se tiene en la mano. */
  selected = 0;

  /** `base`: las casillas sin bolso. El tramo del Bolso va detras. */
  constructor(readonly base: number = START_SLOTS) {
    const size = base + BAG_RANGE;
    this.items = new Int16Array(size).fill(EMPTY);
    this.counts = new Int32Array(size);
    this.wear = new Int32Array(size);
  }

  /** Cuantos indices de casilla hay, abiertos o no: el tope para recorrerlas. */
  get size(): number {
    return this.items.length;
  }

  /** El tramo de casillas del Bolso: `[desde, hasta)`, abiertas o no. */
  bagRange(): [number, number] {
    return [this.base, this.base + BAG_RANGE];
  }

  /** Si una casilla existe ahora mismo: las base siempre; las del Bolso, las que abre lo puesto. */
  isOpen(slot: number): boolean {
    if (slot < 0 || slot >= this.size) return false;
    return slot < this.base + bagCapacity(this.worn[Equip.Bag]);
  }

  /** Cuantas casillas hay abiertas: 15, 17 o 21. */
  openSlots(): number {
    return this.base + bagCapacity(this.worn[Equip.Bag]);
  }

  itemAt(slot: number): Resource | null {
    const e = equipOfSlot(slot);
    if (e !== null) return this.worn[e];
    const item = this.items[slot];
    return item === EMPTY || item === undefined ? null : (item as Resource);
  }

  /** Los usos que le quedan a lo de una casilla o un hueco. */
  wearAt(slot: number): number {
    const e = equipOfSlot(slot);
    if (e !== null) return this.wornWear[e];
    return this.wear[slot] ?? 0;
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
   * equiparse algo no cuenta como perderlo en el registro de objetos.
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

  /** Cuantas unidades de un objeto caben aun, en pilas a medias y casillas vacias. */
  room(item: Resource): number {
    const max = stackMax(item);
    let n = 0;
    for (let i = 0; i < this.size; i++) {
      if (!this.isOpen(i)) continue;
      if (this.items[i] === EMPTY) n += max;
      else if (this.items[i] === item) n += Math.max(0, max - this.counts[i]);
    }
    return n;
  }

  /**
   * Mete lo que quepa de un objeto y devuelve cuantos entraron. `wear`: los
   * usos de una herramienta que vuelve del suelo, que no se arregla al tirarla.
   */
  addSome(item: Resource, count: number, wear?: number): number {
    const n = Math.min(Math.max(0, count), this.room(item));
    if (n > 0) this.put(item, n, wear);
    return n;
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

  /** El arma equipada en su hueco de PERSONAJE, o `null`. */
  weapon(): Resource | null {
    return this.worn[Equip.Weapon];
  }

  /**
   * Gasta un uso del arma equipada. Al llegar a cero se rompe y el hueco queda
   * vacio. Devuelve true si se rompio.
   */
  wearWeapon(): boolean {
    if (this.worn[Equip.Weapon] === null) return false;
    this.wornWear[Equip.Weapon]--;
    if (this.wornWear[Equip.Weapon] > 0) return false;
    this.worn[Equip.Weapon] = null;
    this.wornWear[Equip.Weapon] = 0;
    return true;
  }

  /** Gasta uno de lo que se lleva en la mano (una estacion al colocarla). */
  spendInHand(): void {
    const slot = this.selected;
    if (this.items[slot] === EMPTY) return;
    this.counts[slot]--;
    if (this.counts[slot] <= 0) this.clear(slot);
  }

  /** La primera casilla vacia y abierta, barra incluida, o -1 si no hay ninguna. */
  firstFree(): number {
    for (let i = 0; i < this.size; i++) if (this.items[i] === EMPTY && this.isOpen(i)) return i;
    return -1;
  }

  /**
   * Separa `n` de una pila a la primera casilla libre, barra incluida (el
   * autor, 2026-10-19: «Dividir»). Entre 1 y la pila menos 1 —separarla entera
   * seria moverla (*deduccion*)—; sin casilla libre, o fuera de eso, nada.
   */
  split(slot: number, n: number): void {
    if (!this.isOpen(slot) || this.items[slot] === EMPTY) return;
    const count = this.counts[slot];
    if (!Number.isInteger(n) || n < 1 || n >= count) return;
    const to = this.firstFree();
    if (to < 0) return;
    this.items[to] = this.items[slot];
    this.counts[to] = n;
    this.counts[slot] = count - n;
  }

  /**
   * Destruye la pila entera de una casilla: desaparece, sin caer al suelo (el
   * autor, 2026-10-19). Lo equipado no se destruye desde aqui.
   */
  destroy(slot: number): void {
    if (!this.isOpen(slot) || this.items[slot] === EMPTY) return;
    this.clear(slot);
  }

  /** Saca `count` de una casilla concreta; false, sin tocar nada, si no hay tantos. */
  takeFrom(slot: number, count: number): boolean {
    if (!this.isOpen(slot) || this.items[slot] === EMPTY || this.counts[slot] < count) return false;
    this.counts[slot] -= count;
    if (this.counts[slot] === 0) this.clear(slot);
    return true;
  }

  select(slot: number): void {
    if (slot >= 0 && slot < HOTBAR_SLOTS) this.selected = slot;
  }

  /**
   * Arrastrar una casilla a otra (decision del autor): el mismo objeto se apila
   * hasta el tope y lo que sobra se queda en el origen; uno distinto, o una
   * herramienta, se intercambia. Hacia o desde un hueco de PERSONAJE, equipa o
   * quita.
   */
  move(from: number, to: number): void {
    if (equipOfSlot(from) !== null || equipOfSlot(to) !== null) {
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

  /** True si el tramo del Bolso no tiene nada: lo que va en el se puede quitar. */
  bagEmpty(): boolean {
    const [a, b] = this.bagRange();
    for (let i = a; i < b; i++) if (this.items[i] !== EMPTY) return false;
    return true;
  }

  /** Si lo de un hueco de PERSONAJE se puede quitar: el Bolso, solo con su tramo vacio (el autor). */
  canUnequip(e: Equip): boolean {
    return this.worn[e] !== null && (e !== Equip.Bag || this.bagEmpty());
  }

  /**
   * Guarda lo de una casilla de la barra en el resto del inventario (el autor,
   * 2026-10-18: arrastrarla al boton INVENTARIO). Primero completa las pilas
   * del mismo objeto fuera de la barra, y lo que sobre va a la primera casilla
   * vacia; lo que no cabe se queda en la barra (el autor: «primero apila,
   * luego vacia»). Una herramienta va entera, con su desgaste.
   */
  stow(slot: number): void {
    if (slot < 0 || slot >= HOTBAR_SLOTS) return;
    const item = this.itemAt(slot);
    if (item === null) return;
    const max = stackMax(item);
    let left = this.counts[slot];
    for (let i = HOTBAR_SLOTS; i < this.size && left > 0; i++) {
      if (!this.isOpen(i) || this.items[i] !== item || this.counts[i] >= max) continue;
      const n = Math.min(left, max - this.counts[i]);
      this.counts[i] += n;
      left -= n;
    }
    for (let i = HOTBAR_SLOTS; i < this.size && left > 0; i++) {
      if (!this.isOpen(i) || this.items[i] !== EMPTY) continue;
      const n = Math.min(left, max);
      this.items[i] = item;
      this.counts[i] = n;
      this.wear[i] = this.wear[slot];
      left -= n;
    }
    if (left === 0) this.clear(slot);
    else this.counts[slot] = left;
  }

  /**
   * Saca lo de una casilla para tirarlo, y lo devuelve con su desgaste: lo
   * lanza al mundo `tick.ts` (el autor, 2026-10-18). Lo equipado se tira solo
   * si se podria quitar. `null` si no habia nada que tirar.
   */
  discard(slot: number): Thrown | null {
    const e = equipOfSlot(slot);
    if (e !== null) {
      const item = this.worn[e];
      if (item === null || !this.canUnequip(e)) return null;
      const wear = this.wornWear[e];
      this.worn[e] = null;
      this.wornWear[e] = 0;
      return { item, count: 1, wear };
    }
    const item = this.itemAt(slot);
    if (item === null || !this.isOpen(slot)) return null;
    const thrown = { item, count: this.counts[slot], wear: this.wear[slot] };
    this.clear(slot);
    return thrown;
  }

  /**
   * Equipar (casilla → hueco) o quitar (hueco → casilla). En un hueco solo
   * entra lo suyo (`equipOf`), y lo puesto solo sale si se puede quitar
   * (`canUnequip`) y a una casilla de fuera del tramo del Bolso, que se
   * cerraria con el dentro. Si el otro lado ya tiene algo valido, **se
   * intercambian** (propuesta mia); si no, nada. El desgaste viaja con el
   * objeto.
   */
  private moveWorn(from: number, to: number): void {
    const eFrom = equipOfSlot(from);
    const eTo = equipOfSlot(to);
    if ((eFrom === null) === (eTo === null)) return;
    const e = (eFrom ?? eTo) as Equip;
    const slot = eFrom === null ? from : to;
    if (!this.isOpen(slot)) return;
    const [a, b] = this.bagRange();
    if (e === Equip.Bag && slot >= a && slot < b) return;
    const loose = this.itemAt(slot);
    if (loose !== null && equipOf(loose) !== e) return;
    const worn = this.worn[e];
    if (worn !== null && !this.canUnequip(e)) return;
    // Lo de la casilla entra en el hueco y lo puesto sale a la casilla. Desde
    // el hueco hacia una casilla vacia, o al reves, uno de los dos es nada.
    if (loose === null && worn === null) return;
    const looseWear = this.wear[slot];
    const wornWear = this.wornWear[e];
    this.worn[e] = loose;
    this.wornWear[e] = loose === null ? 0 : looseWear;
    if (worn === null) {
      this.clear(slot);
    } else {
      this.items[slot] = worn;
      this.counts[slot] = 1;
      this.wear[slot] = wornWear;
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
    for (let e = 0; e < this.worn.length; e++) c.worn[e] = this.worn[e];
    c.wornWear.set(this.wornWear);
    c.selected = this.selected;
    return c;
  }

  /**
   * Mete sin comprobar antes: primero rellena pilas, luego casillas vacias.
   * Una herramienta nueva entra con todos sus usos, o con `wear` si se da.
   */
  private put(item: Resource, count: number, wear?: number): boolean {
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
      this.wear[i] = wear ?? toolStats(item)?.uses ?? 0;
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
