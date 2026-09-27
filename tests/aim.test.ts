import { describe, expect, it } from 'vitest';
import {
  ACTION_HALF_ANGLE,
  ACTION_RANGE,
  coneTiles,
  frontTile,
  LOOK_DOWN_ANGLE,
  levelStep,
} from '@verdant/sim';

/**
 * El cono de la accion (regla 12): 1,5 bloques y 90 grados alrededor de la
 * mirada real, con la casilla que se pisa siempre dentro. Numeros del autor.
 */
const key = (t: { x: number; y: number }): string => `${t.x},${t.y}`;
const set = (tiles: Array<{ x: number; y: number }>): Set<string> => new Set(tiles.map(key));
const deg = (d: number): [number, number] => [Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180)];

describe('cono de la accion', () => {
  it('son los numeros del autor: 1,5 bloques y 90 grados', () => {
    expect(ACTION_RANGE).toBe(1.5);
    expect(ACTION_HALF_ANGLE).toBeCloseTo(Math.PI / 4, 12);
    expect(LOOK_DOWN_ANGLE).toBeCloseTo((25 * Math.PI) / 180, 12);
  });

  it('en el centro de la casilla y mirando en recto, coge lo mismo que el area de antes', () => {
    // Al este: la de enfrente, las dos diagonales y la propia.
    const tiles = coneTiles(5.5, 5.5, 1, 0);
    expect(set(tiles)).toEqual(set([{ x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 6 }, { x: 5, y: 5 }]));
    // La mas centrada primero y la propia la ultima.
    expect(tiles[0]).toEqual({ x: 6, y: 5 });
    expect(tiles[tiles.length - 1]).toEqual({ x: 5, y: 5 });
  });

  it('en diagonal, la diagonal y sus dos ortogonales: el caso del autor mirando a 3', () => {
    // Rejilla 1-9 con el jugador en el 5: mirando a 3 (noreste) se afectan 2, 3, 6 y 5.
    expect(set(coneTiles(5.5, 5.5, ...deg(-45)))).toEqual(
      set([{ x: 5, y: 4 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 5, y: 5 }]),
    );
  });

  it('sigue la mirada real: a 22,5 grados solo entran las dos que caen dentro', () => {
    // Al este-sureste: la de enfrente y la diagonal del sureste; la del noreste
    // queda a 67,5 grados, fuera.
    expect(set(coneTiles(5.5, 5.5, ...deg(22.5)))).toEqual(
      set([{ x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 5 }]),
    );
  });

  it('no llega a la segunda casilla en recto: el alcance es 1,5', () => {
    // Desde cualquier punto de la casilla propia, el centro de la de dos mas
    // alla queda a mas de 1,5: el cono nunca se salta una fila.
    for (const x of [5.0, 5.5, 5.9, 5.99]) {
      expect(set(coneTiles(x, 5.5, 1, 0)).has('7,5')).toBe(false);
    }
    // Pero pegado al borde de la casilla, alcanza diagonales que desde el centro
    // no: la del noreste pasa de 1,41 a 1,03.
    expect(set(coneTiles(5.9, 5.1, 1, 0)).has('6,4')).toBe(true);
  });

  it('nada de lo que queda detras entra, salvo la casilla propia', () => {
    for (const d of [0, 30, 90, 135, 200, 290]) {
      const [fx, fy] = deg(d);
      for (const t of coneTiles(5.5, 5.5, fx, fy)) {
        if (t.x === 5 && t.y === 5) continue;
        const dx = t.x + 0.5 - 5.5;
        const dy = t.y + 0.5 - 5.5;
        expect((dx * fx + dy * fy) / Math.hypot(dx, dy)).toBeGreaterThanOrEqual(Math.cos(Math.PI / 4) - 1e-9);
        expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(1.5 + 1e-9);
      }
    }
  });

  it('sin mirada solo queda la casilla propia', () => {
    expect(coneTiles(5.5, 5.5, 0, 0)).toEqual([{ x: 5, y: 5 }]);
  });
});

describe('casilla de enfrente (donde se siembra)', () => {
  it('es la primera que cruza el centro de la mirada', () => {
    expect(frontTile(5.5, 5.5, 1, 0)).toEqual({ x: 6, y: 5 });
    expect(frontTile(5.5, 5.5, 0, -1)).toEqual({ x: 5, y: 4 });
    // Mirando casi al este pero pegado al borde de arriba, se sale por arriba.
    expect(frontTile(5.5, 5.05, ...deg(-20))).toEqual({ x: 5, y: 4 });
    expect(frontTile(5.5, 5.5, ...deg(-20))).toEqual({ x: 6, y: 5 });
  });
});

describe('las dos alturas', () => {
  it('mirando al frente o arriba, la de arriba; mas de 25 grados hacia abajo, la de abajo', () => {
    const z = (d: number): number => Math.sin((d * Math.PI) / 180);
    expect(levelStep(z(0))).toBe(1);
    expect(levelStep(z(40))).toBe(1);
    // La primera persona entra mirando a -11 grados: todavia al frente.
    expect(levelStep(z(-11))).toBe(1);
    expect(levelStep(z(-24))).toBe(1);
    expect(levelStep(z(-26))).toBe(-1);
    // La orbital arranca a 35 grados de elevacion: mira hacia abajo.
    expect(levelStep(z(-35))).toBe(-1);
  });
});
