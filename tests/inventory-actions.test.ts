import { describe, expect, it } from 'vitest';
import { createGame, equipSlot, Inventory, step, type GameState } from '@verdant/sim';
import { emptyIntent, Equip, Resource, type Intent } from '@verdant/shared';

/**
 * El menu de una casilla (el autor, 2026-10-19): Usar, Dividir, Equipar y
 * Destruir. Dividir lleva lo separado a la primera casilla libre, barra
 * incluida; Destruir borra la pila entera; Usar come de esa casilla.
 */

function act(state: GameState, over: Partial<Intent>): void {
  step(state, { ...emptyIntent(), ...over });
}

describe('Dividir', () => {
  it('separa lo pedido a la primera casilla libre, barra incluida', () => {
    const inv = new Inventory();
    inv.add(Resource.Wood, 40); // casilla 0
    inv.add(Resource.Stone, 5); // casilla 1
    inv.move(0, 7); // la madera, fuera de la barra; libre la 0
    inv.split(7, 15);
    expect(inv.counts[7]).toBe(25);
    expect(inv.itemAt(0)).toBe(Resource.Wood);
    expect(inv.counts[0]).toBe(15);
  });

  it('entre 1 y la pila menos 1: ni 0, ni la pila entera, ni mas', () => {
    const inv = new Inventory();
    inv.add(Resource.Wood, 10);
    for (const n of [0, 10, 11, -3, 2.5]) {
      inv.split(0, n);
      expect(inv.counts[0], `${n}`).toBe(10);
      expect(inv.itemAt(1), `${n}`).toBeNull();
    }
    inv.split(0, 9);
    expect([inv.counts[0], inv.counts[1]]).toEqual([1, 9]);
  });

  it('sin casilla libre no hace nada', () => {
    const inv = new Inventory();
    inv.add(Resource.Wood, 100 * 14 + 50); // 14 llenas y una de 50: ninguna vacia
    inv.split(14, 20);
    expect(inv.counts[14]).toBe(50);
    expect(inv.firstFree()).toBe(-1);
  });

  it('llega por la Intent (regla 5)', () => {
    const state = createGame(12345);
    state.inventory.add(Resource.Stone, 8);
    act(state, { splitFrom: 0, splitCount: 3 });
    expect([state.inventory.counts[0], state.inventory.counts[1]]).toEqual([5, 3]);
  });
});

describe('Destruir', () => {
  it('borra la pila entera, sin dejar nada en el suelo', () => {
    const state = createGame(12345);
    state.inventory.add(Resource.Stone, 30);
    const before = state.world.drops.size;
    act(state, { destroy: 0 });
    expect(state.inventory.itemAt(0)).toBeNull();
    expect(state.inventory.count(Resource.Stone)).toBe(0);
    expect(state.world.drops.size).toBe(before);
  });

  it('una casilla cerrada o vacia no se toca', () => {
    const inv = new Inventory();
    inv.add(Resource.Stone, 3);
    inv.destroy(5);
    inv.destroy(inv.base); // el tramo del Bolso, cerrado
    expect(inv.count(Resource.Stone)).toBe(3);
  });
});

describe('Usar', () => {
  it('come de esa casilla, no de la ultima que tenga el objeto', () => {
    const state = createGame(12345);
    const inv = state.inventory;
    inv.add(Resource.Berries, 8); // casilla 0
    inv.split(0, 3); // 3 en la 1: la ultima con bayas
    state.entities.hunger[state.playerId] = 50;
    act(state, { useSlot: 0 });
    expect(inv.counts[0]).toBe(4);
    expect(inv.counts[1]).toBe(3);
    expect(state.entities.hunger[state.playerId]).toBeGreaterThan(50);
  });

  it('con el hambre llena, o con algo que no se come, no hace nada', () => {
    const state = createGame(12345);
    const inv = state.inventory;
    inv.add(Resource.Berries, 3);
    inv.add(Resource.Stone, 3);
    state.entities.hunger[state.playerId] = 100;
    act(state, { useSlot: 0 });
    expect(inv.counts[0]).toBe(3);
    state.entities.hunger[state.playerId] = 50;
    act(state, { useSlot: 1 });
    expect(inv.counts[1]).toBe(3);
  });
});

describe('Equipar', () => {
  it('es mover a su hueco de PERSONAJE, con la regla del Bolso', () => {
    const state = createGame(12345);
    const inv = state.inventory;
    inv.add(Resource.FiberBag, 1);
    act(state, { moveFrom: 0, moveTo: equipSlot(Equip.Bag) });
    expect(inv.worn[Equip.Bag]).toBe(Resource.FiberBag);
    expect(inv.itemAt(0)).toBeNull();
  });
});
