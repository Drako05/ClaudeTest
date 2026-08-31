import { afterEach, describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '@verdant/shared';
import { World } from '@verdant/sim';
import {
  heightOffset,
  setView,
  toWorldSpace,
  VIEW_COUNT,
  worldToScreen,
} from '../packages/client/src/projection.js';
import {
  cueExtent,
  cueOffset,
  depthOfPiece,
  groundPieces,
  MAX_CUE_DROP,
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

afterEach(() => setView(0));

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
      // Es el fallo convertido en regresion, y se corre en las CUATRO vistas: la
      // camara gira, y si la profundidad no girara con ella cada pieza acabaria
      // en la fila equivocada y el dibujo se vendria abajo en tres de las cuatro.
      for (let v = 0; v < VIEW_COUNT; v++) {
        setView(v);
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
              `vista ${v}: (${b.wx}, ${b.wy}) ${b.kind} se dibuja sobre ` +
                `(${a.wx}, ${a.wy}) ${a.kind}, que esta mas cerca de la camara`,
            ).toBeGreaterThanOrEqual(depthOfPiece(a));
            compared++;
          }
        }
        expect(compared, `vista ${v}: no hubo ni un solape que comprobar`).toBeGreaterThan(100);
      }
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

  it('cada tile aporta su cima, sus dos costados y sus dos senales', () => {
    const world = new World(7);
    const counts = new Map<string, number>();
    for (const piece of groundPieces(world, chunkWithRelief(world))) {
      const key = `${piece.wx},${piece.wy}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(CHUNK_SIZE * CHUNK_SIZE);
    for (const [key, n] of counts) {
      expect(n, `el tile (${key}) aporta ${n} piezas`).toBeLessThanOrEqual(5);
      expect(n).toBeGreaterThan(0);
    }
  });
});

describe('Las dos caras que se ven, y las dos que no', () => {
  it('en cada vista se dibujan los dos costados que dan a la camara', () => {
    // Cuales son los dos cambia al girar. Si se quedaran fijos, en tres de las
    // cuatro vistas se dibujarian las paredes del lado que el propio bloque tapa
    // y faltarian las que si se ven.
    for (let v = 0; v < VIEW_COUNT; v++) {
      setView(v);
      const world = new World(12345);
      const pieces = groundPieces(world, chunkWithRelief(world));
      const ahead = { east: toWorldSpace(1, 0), south: toWorldSpace(0, 1) };

      let checked = 0;
      for (const piece of pieces) {
        if (piece.kind !== 'east' && piece.kind !== 'south') continue;
        const d = ahead[piece.kind];
        const here = world.levelAt(piece.wx, piece.wy);
        const there = world.levelAt(piece.wx + d.x, piece.wy + d.y);
        // El costado cuelga hacia el vecino que queda DELANTE, y ese vecino tiene
        // que estar mas abajo: si no, no habria pared que ver.
        expect(there, `vista ${v}: cara hacia arriba en (${piece.wx}, ${piece.wy})`).toBeLessThan(
          here + 1,
        );
        checked++;
      }
      expect(checked, `vista ${v}: ni un costado`).toBeGreaterThan(10);
    }
  });

  it('las senales de altura van solo en las dos aristas SIN cara', () => {
    // Son las traseras: las que tapa el propio bloque. Puestas delante, taparian
    // la pared que si se ve, y ademas serian redundantes.
    for (let v = 0; v < VIEW_COUNT; v++) {
      setView(v);
      const world = new World(7);
      const pieces = groundPieces(world, chunkWithRelief(world));
      const behind = { backEast: toWorldSpace(0, -1), backWest: toWorldSpace(-1, 0) };

      let cues = 0;
      for (const piece of pieces) {
        if (piece.kind !== 'backEast' && piece.kind !== 'backWest') continue;
        const d = behind[piece.kind];
        const here = world.levelAt(piece.wx, piece.wy);
        const there = world.levelAt(piece.wx + d.x, piece.wy + d.y);
        // La senal solo existe donde hay desnivel de verdad hacia atras.
        expect(there, `vista ${v}: senal sin desnivel en (${piece.wx}, ${piece.wy})`).toBeLessThan(
          here,
        );
        expect(piece.drop).toBeGreaterThan(0);
        expect(piece.drop).toBeLessThanOrEqual(MAX_CUE_DROP);
        cues++;
      }
      expect(cues, `vista ${v}: ni una senal de altura`).toBeGreaterThan(0);
    }
  });
});

describe('La sombra de una arista trasera va tumbada, y hacia atras', () => {
  it('se aleja de la arista hacia profundidad MENOR, no hacia arriba', () => {
    // El fallo que esto cierra: la sombra se extruia en vertical, y en
    // isometrica una superficie vertical es una PARED. Se veia como un panel
    // oscuro de pie sobre la arista en vez de como una sombra en el suelo.
    //
    // Tumbada significa que se desplaza en la direccion de «una fila hacia
    // atras», que en pantalla sube Y se mueve de lado. La comprobacion mira las
    // dos cosas: que se aleja en horizontal —una extrusion vertical no lo hace—
    // y que va hacia el lado correcto de la arista.
    for (const kind of ['backEast', 'backWest'] as const) {
      for (let drop = 1; drop <= MAX_CUE_DROP; drop++) {
        const d = cueOffset(kind, drop);
        expect(Math.abs(d.x), `${kind} con caida ${drop} no se aleja de lado`).toBeGreaterThan(0);
        expect(d.y, `${kind} con caida ${drop} no sube`).toBeLessThan(0);
        // Y en la direccion de la casilla de detras: la de atras-este se aleja
        // hacia la derecha de la pantalla y la de atras-oeste hacia la izquierda.
        expect(Math.sign(d.x)).toBe(kind === 'backEast' ? 1 : -1);
        // Sobre el plano del suelo la proporcion es la de la isometrica, 2:1.
        expect(Math.abs(d.x / d.y)).toBeCloseTo(2, 6);
      }
    }
  });

  it('una caida mayor proyecta mas sombra, pero acotada', () => {
    let previous = 0;
    for (let drop = 1; drop <= MAX_CUE_DROP; drop++) {
      const extent = cueExtent(drop);
      expect(extent).toBeGreaterThan(previous);
      previous = extent;
    }
    // Pasada la casilla la mancha se derramaria sobre varias filas de atras y
    // dejaria de leerse como la sombra de ESTE escalon.
    expect(cueExtent(MAX_CUE_DROP)).toBeLessThan(1);
    expect(cueExtent(99)).toBe(cueExtent(MAX_CUE_DROP));
  });

  it('la caja de la senal se extiende hacia atras de su tile', () => {
    // Es lo que permite que la sombra pinte sobre terreno ya dibujado sin pisar
    // a nadie: hacia delante hay piezas que van despues.
    for (let v = 0; v < VIEW_COUNT; v++) {
      setView(v);
      const world = new World(12345);
      let checked = 0;
      for (const piece of groundPieces(world, chunkWithRelief(world))) {
        if (piece.kind !== 'backEast' && piece.kind !== 'backWest') continue;
        const tile = worldToScreen(piece.wx, piece.wy);
        // La caja llega mas arriba que la esquina norte del tile: eso es «hacia
        // atras» en pantalla. Con la sombra bien tumbada siempre se cumple.
        expect(piece.box.y0, `vista ${v}: la senal no se aleja hacia atras`).toBeLessThan(
          tile.y + heightOffset(world.levelAt(piece.wx, piece.wy)),
        );
        checked++;
      }
      expect(checked, `vista ${v}: ni una senal`).toBeGreaterThan(0);
    }
  });
});
