import { describe, expect, it } from 'vitest';
import {
  ACTION_TILES,
  actionTiles,
  DIRECTIONS,
  directionOf,
  EntityKind,
  EntityStore,
  facingOf,
  isDiagonal,
} from '@verdant/sim';
import { actionArea } from '@verdant/sim';

/**
 * La mirada y el area de efecto.
 *
 * El autor lo describio en dos casos —mirando en recto y mirando en diagonal—
 * pero es una sola regla: la casilla apuntada mas sus dos vecinas en el anillo
 * de 8 direcciones. Aqui esta esa regla escrita como tabla, para que sea
 * comprobable y no una interpretacion mia.
 */

const N = 0;
const NE = 1;
const E = 2;
const SE = 3;
const S = 4;
const SW = 5;
const W = 6;
const NW = 7;

/** Las tripletas como texto, para poder compararlas sin depender del orden. */
function tilesOf(dir: number): Set<string> {
  return new Set(actionTiles(0, 0, dir).map((t) => `${t.x},${t.y}`));
}

describe('El area de efecto, direccion por direccion', () => {
  // La especificacion del autor, entera. Desde (0,0), en cada direccion.
  const expected: ReadonlyArray<readonly [number, string, string[]]> = [
    [N, 'norte', ['0,-1', '-1,-1', '1,-1']],
    [NE, 'noreste', ['1,-1', '0,-1', '1,0']],
    [E, 'este', ['1,0', '1,-1', '1,1']],
    [SE, 'sureste', ['1,1', '1,0', '0,1']],
    [S, 'sur', ['0,1', '1,1', '-1,1']],
    [SW, 'suroeste', ['-1,1', '0,1', '-1,0']],
    [W, 'oeste', ['-1,0', '-1,1', '-1,-1']],
    [NW, 'noroeste', ['-1,-1', '-1,0', '0,-1']],
  ];

  for (const [dir, name, tiles] of expected) {
    it(`mirando al ${name} afecta a ${tiles.join(' ')}`, () => {
      expect(tilesOf(dir)).toEqual(new Set(tiles));
    });
  }

  it('siempre son tres casillas distintas', () => {
    for (let dir = 0; dir < DIRECTIONS.length; dir++) {
      expect(actionTiles(0, 0, dir)).toHaveLength(ACTION_TILES);
      expect(tilesOf(dir).size, `${dir} repite casilla`).toBe(ACTION_TILES);
    }
  });

  it('la casilla apuntada va siempre la primera', () => {
    // De ella dependen sembrar y el reticulo, que marcan una sola casilla.
    for (let dir = 0; dir < DIRECTIONS.length; dir++) {
      const [first] = actionTiles(7, -3, dir);
      expect(first).toEqual({ x: 7 + DIRECTIONS[dir].x, y: -3 + DIRECTIONS[dir].y });
    }
  });

  it('las tres tocan al personaje, ninguna queda a dos casillas', () => {
    for (let dir = 0; dir < DIRECTIONS.length; dir++) {
      for (const tile of actionTiles(0, 0, dir)) {
        expect(Math.max(Math.abs(tile.x), Math.abs(tile.y))).toBe(1);
      }
    }
  });
});

/**
 * El enunciado del autor, comprobado como propiedad y no solo como tabla: una
 * tabla podria estar mal copiada y seguir siendo consistente consigo misma.
 */
describe('La forma del area segun el enunciado del autor', () => {
  it('mirando en recto, las dos flanqueantes quedan en diagonal del personaje', () => {
    for (const dir of [N, E, S, W]) {
      const [aimed, ...flanks] = actionTiles(0, 0, dir);
      // La apuntada es la de justo enfrente: ortogonal.
      expect(aimed.x === 0 || aimed.y === 0).toBe(true);
      for (const flank of flanks) {
        expect(flank.x !== 0 && flank.y !== 0, `${flank.x},${flank.y} no es diagonal`).toBe(true);
        // Y ademas pegada a la apuntada, «a lado y lado de la primera casilla».
        expect(Math.abs(flank.x - aimed.x) + Math.abs(flank.y - aimed.y)).toBe(1);
      }
    }
  });

  it('mirando en diagonal, las flanqueantes son adyacentes al personaje y a la apuntada', () => {
    for (const dir of [NE, SE, SW, NW]) {
      const [aimed, ...flanks] = actionTiles(0, 0, dir);
      expect(aimed.x !== 0 && aimed.y !== 0).toBe(true);
      for (const flank of flanks) {
        // Adyacente al personaje en ortogonal.
        expect(Math.abs(flank.x) + Math.abs(flank.y)).toBe(1);
        // Y adyacente a la apuntada.
        expect(Math.abs(flank.x - aimed.x) + Math.abs(flank.y - aimed.y)).toBe(1);
      }
    }
  });

  it('las diagonales son las impares del anillo', () => {
    for (let dir = 0; dir < DIRECTIONS.length; dir++) {
      expect(isDiagonal(dir)).toBe(dir % 2 === 1);
    }
  });
});

describe('Redondear un vector cualquiera a una de las ocho', () => {
  it('cada direccion se redondea a si misma', () => {
    for (let dir = 0; dir < DIRECTIONS.length; dir++) {
      expect(directionOf(DIRECTIONS[dir].x, DIRECTIONS[dir].y)).toBe(dir);
    }
  });

  it('un vector intermedio cae en el sector que le toca', () => {
    // Casi al este, ligeramente al norte: sigue siendo este hasta los 22.5 grados.
    expect(directionOf(10, -1)).toBe(E);
    expect(directionOf(10, -3)).toBe(E);
    // Pasados los 22.5 grados ya es noreste.
    expect(directionOf(10, -8)).toBe(NE);
    expect(directionOf(1, -10)).toBe(N);
  });

  it('el vector nulo no apunta a ningun sitio', () => {
    // Quien llame decide que hacer; lo que no puede es inventarse una direccion.
    expect(directionOf(0, 0)).toBe(-1);
  });

  it('la mirada que se guarda es unitaria', () => {
    for (let dir = 0; dir < DIRECTIONS.length; dir++) {
      const f = facingOf(dir);
      expect(Math.hypot(f.x, f.y)).toBeCloseTo(1, 12);
      expect(directionOf(f.x, f.y)).toBe(dir);
    }
  });
});

describe('El area de una entidad', () => {
  function playerAt(x: number, y: number, fx: number, fy: number): [EntityStore, number] {
    const store = new EntityStore(4);
    const id = store.spawn(EntityKind.Player, x, y);
    store.facingX[id] = fx;
    store.facingY[id] = fy;
    return [store, id];
  }

  it('parte de la casilla que pisa, no de su posicion exacta', () => {
    // El fallo que esto cierra: se apuntaba con `floor(pos + mirada * 1.1)`, asi
    // que pegado al borde de la casilla se saltaba a dos casillas de distancia.
    // Se recorre el ancho entero de una casilla y el area no puede moverse.
    for (const offset of [0.01, 0.25, 0.5, 0.75, 0.99]) {
      const [store, id] = playerAt(4 + offset, 9 + offset, 1, 0);
      expect(actionArea(store, id), `fallo con desplazamiento ${offset}`).toEqual([
        { x: 5, y: 9 },
        { x: 5, y: 8 },
        { x: 5, y: 10 },
      ]);
    }
  });

  it('sin mirada todavia, apunta al sur, que es hacia donde nace mirando', () => {
    const [store, id] = playerAt(0.5, 0.5, 0, 0);
    expect(actionArea(store, id)[0]).toEqual({ x: 0, y: 1 });
  });

  it('funciona igual en coordenadas negativas', () => {
    const [store, id] = playerAt(-3.5, -7.5, 0, -1);
    expect(actionArea(store, id)).toEqual([
      { x: -4, y: -9 },
      { x: -5, y: -9 },
      { x: -3, y: -9 },
    ]);
  });
});
