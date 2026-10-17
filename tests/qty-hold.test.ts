import { describe, expect, it } from 'vitest';
import { qtySteps } from '../packages/client/src/qty-hold.js';

describe('El + y el - mantenidos', () => {
  it('el primer paso, en el acto', () => {
    expect(qtySteps(0)).toBe(1);
    expect(qtySteps(-1)).toBe(0);
  });

  it('3 por segundo el primer segundo, 4 el segundo, 5 el tercero (el ejemplo del autor)', () => {
    // El primero en el acto y otros dos antes de cumplir el segundo.
    expect(qtySteps(999)).toBe(3);
    // Los del segundo siguiente, cada 250 ms.
    expect(qtySteps(1000)).toBe(4);
    expect(qtySteps(1249)).toBe(4);
    expect(qtySteps(1250)).toBe(5);
    expect(qtySteps(1999)).toBe(7);
    // El tercero, cada 200 ms.
    expect(qtySteps(2000)).toBe(8);
    expect(qtySteps(2999)).toBe(12);
    expect(qtySteps(3000)).toBe(13);
  });

  it('cada segundo da uno mas que el anterior', () => {
    for (let s = 0; s < 10; s++) expect(qtySteps(s * 1000 + 999.9) - qtySteps(s * 1000 - 0.1)).toBe(3 + s);
  });
});
