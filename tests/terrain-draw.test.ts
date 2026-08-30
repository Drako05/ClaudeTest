import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '@verdant/shared';
import { World } from '@verdant/sim';
import {
  depthOfPiece,
  groundPieces,
  overlaps,
  type GroundPiece,
} from '../packages/client/src/terrain-draw.js';

/**
 * El orden de dibujado del terreno.
 *
 * Este fichero nace de un fallo que **ningun test vio y la prueba de humo
 * tampoco**: lo vio el autor jugando. El suelo se horneaba en una textura por
 * chunk y las paredes vivian en la capa de objetos, que estaba entera por
 * encima; asi que una pared se pintaba sobre cualquier suelo, lo tuviera delante
 * o detras. Un error de orden no rompe nada que se pueda medir contando cosas:
 * hay que afirmar la regla.
 *
 * La regla es una sola: **en isometrica, lo que esta mas al sur o al este tapa a
 * lo que esta al norte o al oeste**. O sea, `wx + wy` creciente.
 */

const SEEDS = [12345, 7, 999];

/** Un chunk del mundo de prueba con relieve suficiente para que haya solapes. */
function chunkWithRelief(world: World): ReturnType<World['getChunk']> {
  let best: ReturnType<World['getChunk']> | null = null;
  let bestRange = -1;
  for (let cy = -2; cy <= 2; cy++) {
    for (let cx = -2; cx <= 2; cx++) {
      const chunk = world.getChunk(cx, cy);
      let lo = 99;
      let hi = -99;
      for (const level of chunk.level) {
        if (level < lo) lo = level;
        if (level > hi) hi = level;
      }
      if (hi - lo > bestRange) {
        bestRange = hi - lo;
        best = chunk;
      }
    }
  }
  if (!best || bestRange < 2) throw new Error('no se encontro un chunk con relieve');
  return best;
}

describe('Quien tapa a quien', () => {
  for (const seed of SEEDS) {
    it(`semilla ${seed}: dos piezas que se solapan van en orden de profundidad`, () => {
      // Es el fallo convertido en regresion. Con la arquitectura vieja —todas las
      // caras despues de todas las cimas— esta comprobacion falla.
      const world = new World(seed);
      const pieces = groundPieces(world, chunkWithRelief(world));
      expect(pieces.length).toBeGreaterThan(CHUNK_SIZE * CHUNK_SIZE);

      let compared = 0;
      for (let i = 0; i < pieces.length; i++) {
        const a = pieces[i];
        for (let j = i + 1; j < pieces.length; j++) {
          const b = pieces[j];
          // `b` se dibuja despues, asi que no puede estar mas atras que `a`.
          if (!overlaps(a.box, b.box)) continue;
          expect(
            depthOfPiece(b),
            `(${b.wx}, ${b.wy}) ${b.kind} se dibuja sobre (${a.wx}, ${a.wy}) ${a.kind}, ` +
              'que esta mas cerca de la camara',
          ).toBeGreaterThanOrEqual(depthOfPiece(a));
          compared++;
        }
      }
      expect(compared, 'no hubo ni un solape que comprobar').toBeGreaterThan(100);
    });
  }

  it('la lista sale ya ordenada por profundidad', () => {
    const world = new World(12345);
    const pieces = groundPieces(world, chunkWithRelief(world));
    for (let i = 1; i < pieces.length; i++) {
      expect(depthOfPiece(pieces[i])).toBeGreaterThanOrEqual(depthOfPiece(pieces[i - 1]));
    }
  });

  it('la cima de un tile va antes que sus propios costados', () => {
    // Los costados cuelgan por delante de la cima: pintados al reves, el suelo
    // taparia la pared que sale de el.
    const world = new World(7);
    const pieces = groundPieces(world, chunkWithRelief(world));
    const seen = new Map<string, string>();
    for (const piece of pieces) {
      const key = `${piece.wx},${piece.wy}`;
      if (piece.kind === 'top') {
        expect(seen.has(key), `dos cimas en (${key})`).toBe(false);
        seen.set(key, 'top');
      } else {
        expect(seen.get(key), `costado antes que su cima en (${key})`).toBe('top');
      }
    }
  });
});

describe('Dentro de una antidiagonal nada se pisa', () => {
  it('dos piezas de la misma profundidad nunca se solapan', () => {
    // Es la suposicion sobre la que se apoya el diseno entero: si se cumple, cada
    // antidiagonal puede ser un contenedor suelto y basta con ordenar la lista
    // corta de contenedores en vez de miles de sprites en cada frame. Si no se
    // cumpliera, habria que ordenar tambien dentro, y el coste se dispararia.
    const world = new World(999);
    const pieces = groundPieces(world, chunkWithRelief(world));

    const byDepth = new Map<number, GroundPiece[]>();
    for (const piece of pieces) {
      const d = depthOfPiece(piece);
      const list = byDepth.get(d);
      if (list) list.push(piece);
      else byDepth.set(d, [piece]);
    }

    let checked = 0;
    for (const [depth, list] of byDepth) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (list[i].wx === list[j].wx && list[i].wy === list[j].wy) continue;
          expect(
            overlaps(list[i].box, list[j].box),
            `en la fila ${depth} se pisan (${list[i].wx}, ${list[i].wy}) y ` +
              `(${list[j].wx}, ${list[j].wy})`,
          ).toBe(false);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('La geometria de cada pieza', () => {
  it('una cima se ancla a la altura de su esquina mas alta', () => {
    const world = new World(12345);
    for (const piece of groundPieces(world, chunkWithRelief(world))) {
      if (piece.kind !== 'top') continue;
      const level = world.levelAt(piece.wx, piece.wy);
      const ramp = world.rampDirAt(piece.wx, piece.wy);
      // Plano vale su nivel; en talud, un nivel mas, que es su borde alto.
      expect(piece.anchorHeight).toBe(ramp < 0 ? level : level + 1);
    }
  });

  it('cada tile aporta su cima y como mucho sus dos costados', () => {
    const world = new World(7);
    const counts = new Map<string, number>();
    for (const piece of groundPieces(world, chunkWithRelief(world))) {
      const key = `${piece.wx},${piece.wy}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(CHUNK_SIZE * CHUNK_SIZE);
    for (const [key, n] of counts) {
      expect(n, `el tile (${key}) aporta ${n} piezas`).toBeLessThanOrEqual(3);
      expect(n).toBeGreaterThan(0);
    }
  });
});
