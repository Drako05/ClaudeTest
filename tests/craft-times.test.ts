import { describe, expect, it } from 'vitest';
import { RECIPES, Resource } from '@verdant/shared';
import { craftableTimes, Inventory, tryCraft } from '@verdant/sim';

/**
 * Fabricar N veces de golpe (el autor, 2026-10-17): los botones + y - de la
 * receta eligen cuantas, y un solo mantener fabrica las N, hasta lo que
 * alcance. Todo o nada.
 */
describe('Fabricar varias veces de golpe', () => {
  // El lingote de cobre: 2 de cobre y 1 de carbon, en el horno.
  const ingot = RECIPES.findIndex((r) => r.output === Resource.CopperIngot);
  const anywhere = () => true;

  it('N veces gasta N veces los ingredientes y da N veces el resultado', () => {
    const inv = new Inventory();
    inv.add(Resource.Copper, 7);
    inv.add(Resource.Coal, 5);
    expect(tryCraft(inv, ingot, anywhere, 3)).toBe('ok');
    expect(inv.count(Resource.CopperIngot)).toBe(3);
    expect(inv.count(Resource.Copper)).toBe(1);
    expect(inv.count(Resource.Coal)).toBe(2);
  });

  it('si no alcanza para las N, no fabrica ninguna', () => {
    const inv = new Inventory();
    inv.add(Resource.Copper, 7);
    inv.add(Resource.Coal, 5);
    expect(tryCraft(inv, ingot, anywhere, 4)).toBe('missing');
    expect(inv.count(Resource.CopperIngot)).toBe(0);
    expect(inv.count(Resource.Copper)).toBe(7);
  });

  it('el tope es lo que dan los ingredientes, y fabricar el tope vale', () => {
    const inv = new Inventory();
    inv.add(Resource.Copper, 7);
    inv.add(Resource.Coal, 5);
    expect(craftableTimes(inv, ingot)).toBe(3);
    expect(tryCraft(inv, ingot, anywhere, craftableTimes(inv, ingot))).toBe('ok');
    expect(craftableTimes(inv, ingot)).toBe(0);
  });

  it('el tope es lo que dan los ingredientes; lo que no cabe se derrama', () => {
    // Tres casillas llenas: 99 lingotes, 21 de cobre y 30 de carbon. Los
    // ingredientes dan para 10, y aunque solo cabe uno (el que cierra la pila
    // de 100), el tope es 10: lo que no cabe cae a los pies (el autor,
    // 2026-10-18), por `spill`.
    const full = () => {
      const inv = new Inventory(3);
      inv.add(Resource.CopperIngot, 99);
      inv.add(Resource.Copper, 21);
      inv.add(Resource.Coal, 30);
      return inv;
    };
    expect(craftableTimes(full(), ingot)).toBe(10);
    const spilled: Array<[Resource, number]> = [];
    const inv = full();
    expect(tryCraft(inv, ingot, anywhere, 2, (item, n) => spilled.push([item, n]))).toBe('ok');
    expect(inv.count(Resource.CopperIngot)).toBe(100);
    expect(spilled).toEqual([[Resource.CopperIngot, 1]]);
  });

  it('una sola vez es lo de siempre', () => {
    const inv = new Inventory();
    inv.add(Resource.Copper, 2);
    inv.add(Resource.Coal, 1);
    expect(tryCraft(inv, ingot, anywhere)).toBe('ok');
    expect(inv.count(Resource.CopperIngot)).toBe(1);
  });
});
