import { describe, expect, it } from 'vitest';
import { createGame, Inventory, step } from '@verdant/sim';
import { emptyIntent, Resource } from '@verdant/shared';

/**
 * Guardar en la mochila (el autor, 2026-10-18): arrastrar una casilla de la
 * barra al boton INVENTARIO la lleva al resto del inventario. «Primero apila,
 * luego vacia», y lo que no cabe se queda en la barra.
 */
describe('Guardar lo de la barra', () => {
  it('primero completa las pilas de fuera de la barra, y lo que sobra va a la primera vacia', () => {
    const inv = new Inventory();
    const put = (slot: number, item: Resource, count: number) => {
      inv.items[slot] = item;
      inv.counts[slot] = count;
    };
    put(0, Resource.Wood, 50); // en la barra
    put(5, Resource.Stone, 3); // la primera de fuera, ocupada por otra cosa
    put(6, Resource.Wood, 80); // una pila a medias de lo mismo
    inv.stow(0);
    expect(inv.itemAt(0)).toBeNull();
    expect(inv.counts[6]).toBe(100);
    // Lo que sobra (30), a la primera vacia de fuera de la barra: la 7.
    expect(inv.itemAt(7)).toBe(Resource.Wood);
    expect(inv.counts[7]).toBe(30);
    expect(inv.counts[5]).toBe(3);
  });

  it('lo que no cabe se queda en la barra; sin sitio, nada', () => {
    const inv = new Inventory();
    inv.add(Resource.Stone, 100 * 15); // todo lleno de piedra, la barra tambien
    inv.remove(Resource.Stone, 30); // la ultima casilla, a 70
    inv.stow(0);
    expect(inv.counts[0]).toBe(70);
    expect(inv.counts[14]).toBe(100);
    inv.stow(0);
    expect(inv.counts[0]).toBe(70);
  });

  it('una herramienta va entera a la primera vacia, con su desgaste', () => {
    const inv = new Inventory();
    inv.add(Resource.StoneAxe, 1);
    inv.wear[0] = 7;
    inv.add(Resource.Stone, 5); // casilla 1
    inv.stow(0);
    expect(inv.itemAt(0)).toBeNull();
    expect(inv.itemAt(5)).toBe(Resource.StoneAxe);
    expect(inv.wear[5]).toBe(7);
  });

  it('desde una casilla que no es de la barra no hace nada', () => {
    const inv = new Inventory();
    inv.add(Resource.Stone, 5);
    inv.move(0, 9);
    inv.stow(9);
    expect(inv.itemAt(9)).toBe(Resource.Stone);
    expect(inv.counts[9]).toBe(5);
  });

  it('llega por la Intent (regla 5)', () => {
    const state = createGame(12345);
    state.inventory.add(Resource.Stone, 5);
    step(state, { ...emptyIntent(), stow: 0 });
    expect(state.inventory.itemAt(0)).toBeNull();
    expect(state.inventory.itemAt(5)).toBe(Resource.Stone);
  });
});
