import { describe, expect, it } from 'vitest';
import { Feature, Terrain } from '@verdant/shared';
import { TREE_TRUNKS } from '@verdant/sim';
import { rockMesh, turnVoxels } from '../packages/client/src/rock-mesh.js';
import { treeShapeOf } from '../packages/client/src/tree-shapes.js';
import {
  BUSHES,
  CROWNS,
  PEBBLES,
  PLAYER,
  ROCK_SHAPE,
  SAPLINGS,
  STATION_ART,
  STONES,
  TERRAIN_TILES,
  WATER_ART,
  WORLD_PX,
  type WorldArt,
} from '../packages/client/src/world-art.js';
import { BARK, treeArt } from '../packages/client/src/world-sprites.js';
import { VOXEL_PX, VOXEL_TILES } from '../packages/client/src/voxel-art.js';

/**
 * El pixelart del mundo (el autor, 2026-10-19; guia de arte, directriz 7):
 * «caras de 24x24 en bloques (voxeles 12x12). Esa debe ser la medida para todo
 * elemento del juego». Aqui se mide el formato; como se ve, en la hoja de
 * `?mundo=1`.
 */

/** Todos los dibujos, con su nombre. */
function everything(): [string, WorldArt][] {
  const out: [string, WorldArt][] = [];
  for (const [t, tiles] of Object.entries(TERRAIN_TILES)) tiles.forEach((a, i) => out.push([`suelo ${Terrain[+t]} ${i}`, a]));
  for (const [t, tiles] of Object.entries(VOXEL_TILES)) tiles.forEach((a, i) => out.push([`voxel ${Terrain[+t]} ${i}`, a]));
  for (const [name, table] of [['copa', CROWNS], ['mata', BUSHES], ['brote', SAPLINGS], ['piedra', STONES]] as const) {
    for (const [f, a] of Object.entries(table)) out.push([`${name} ${Feature[+f]}`, a!]);
  }
  for (const [f, faces] of Object.entries(STATION_ART)) for (const [k, a] of Object.entries(faces!)) out.push([`estacion ${Feature[+f]} ${k}`, a]);
  out.push(['agua', WATER_ART], ['guijarros', PEBBLES], ['jugador', PLAYER]);
  return out;
}

describe('Los dibujos del mundo', () => {
  it('son rejillas bien formadas, y cada letra que usan esta en su paleta', () => {
    for (const [name, art] of everything()) {
      const w = art.rows[0]!.length;
      expect(art.rows.every((r) => r.length === w), `${name}: filas de distinto ancho`).toBe(true);
      for (const ch of art.rows.join('')) if (ch !== '.') expect(art.palette[ch], `${name}: «${ch}» sin color`).toBeDefined();
    }
  });

  it('no les sobra ningun color, salvo la corteza de las copas, que pinta el tronco debajo', () => {
    for (const [name, art] of everything()) {
      const used = new Set(art.rows.join(''));
      const keep = name.startsWith('copa') ? BARK : '';
      const spare = Object.keys(art.palette).filter((k) => !used.has(k) && !keep.includes(k));
      expect(spare, name).toEqual([]);
    }
  });

  it('cada copa lleva sus cuatro tonos de corteza, aunque no los use: con ellos se pinta el tronco desnudo', () => {
    // Sin uno, el juego pintaria ese tono transparente y el tronco saldria a
    // trozos (paso en la tanda: las coniferas median 0,2 bloques de tronco).
    for (const [f, crown] of Object.entries(CROWNS)) {
      for (const ch of BARK) expect(crown!.palette[ch], `${Feature[+f]}: sin «${ch}»`).toBeDefined();
    }
  });

  it('cada suelo tiene 3 o 4 variantes (el autor), y no hay dos iguales; tambien las del voxel', () => {
    for (const [t, tiles] of [...Object.entries(TERRAIN_TILES), ...Object.entries(VOXEL_TILES)]) {
      expect(tiles.length, Terrain[+t]).toBeGreaterThanOrEqual(3);
      expect(tiles.length, Terrain[+t]).toBeLessThanOrEqual(4);
      expect(new Set(tiles.map((a) => a.rows.join(''))).size, Terrain[+t]).toBe(tiles.length);
    }
  });

  it('las caras del voxel miden 12 × 12: la mitad de las de bloque, a la misma densidad (el autor, 2026-10-20)', () => {
    expect(VOXEL_PX * 2).toBe(WORLD_PX);
    expect(Object.keys(VOXEL_TILES).sort()).toEqual(Object.keys(TERRAIN_TILES).sort());
    for (const tiles of Object.values(VOXEL_TILES)) {
      for (const a of tiles) expect([a.rows[0]!.length, a.rows.length]).toEqual([VOXEL_PX, VOXEL_PX]);
    }
  });

  it('las caras de bloque miden 24 de ancho, y de alto 24 por bloque', () => {
    for (const tiles of Object.values(TERRAIN_TILES)) {
      for (const a of tiles) expect([a.rows[0]!.length, a.rows.length]).toEqual([WORLD_PX, WORLD_PX]);
    }
    for (const a of [WATER_ART, ...Object.values(STONES)]) expect([a!.rows[0]!.length, a!.rows.length]).toEqual([WORLD_PX, WORLD_PX]);
    // La mesa mide 1 bloque y el horno 1,25: su costado y su frente, 24 y 30 de alto.
    expect(STATION_ART[Feature.Workbench]!.side.rows.length).toBe(WORLD_PX);
    expect(STATION_ART[Feature.Furnace]!.side.rows.length).toBe(WORLD_PX * 1.25);
  });

  it('cada copa mide, a 24 pixeles por bloque, lo que su especie', () => {
    for (const [f, crown] of Object.entries(CROWNS)) {
      const shape = treeShapeOf(+f as Feature)!;
      expect(crown!.rows.length, Feature[+f]).toBe(Math.round(shape.crownH * WORLD_PX));
      expect(crown!.rows[0]!.length, Feature[+f]).toBe(Math.round(shape.crownW * WORLD_PX));
    }
  });
});

describe('El arbol entero: su copa sobre el tronco del nucleo', () => {
  it('el tronco desnudo que se ve es el de su hitbox, en los dos extremos de cada especie', () => {
    for (const [f, law] of Object.entries(TREE_TRUNKS)) {
      const feature = +f as Feature;
      for (const bare of [Math.max(2, law!.bareMean - 2 * law!.bareSd), law!.bareMean + 2 * law!.bareSd]) {
        const art = treeArt(feature, bare, law!.trunkW)!;
        // La tirada de corteza en la columna del pie, desde abajo.
        let run = 0;
        for (let y = art.rows.length - 1; y >= 0 && BARK.includes(art.rows[y]![art.footX]!); y--) run++;
        expect(run, `${Feature[feature]} con ${bare.toFixed(2)} de tronco`).toBe(Math.round(bare * WORLD_PX));
      }
    }
  });
});

describe('La roca de voxeles', () => {
  /** Las caras de la malla, por la direccion de su normal. */
  function normals(turn: number): string[] {
    const m = rockMesh(ROCK_SHAPE, turn);
    const out: string[] = [];
    for (let t = 0; t < m.indices.length; t += 6) {
      const p = [0, 1, 2].map((k) => [0, 1, 2].map((c) => m.positions[m.indices[t + k]! * 3 + c]!));
      const u = p[1]!.map((v, c) => v - p[0]![c]!);
      const v = p[2]!.map((w, c) => w - p[0]![c]!);
      const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
      out.push(n.map((c) => Math.sign(Math.round(c * 1000))).join(','));
    }
    return out;
  }

  /** Si un punto (x, alto, z de three.js) cae dentro de un voxel de la roca girada. */
  function solid(turn: number, [x, y, z]: number[]): boolean {
    return turnVoxels(ROCK_SHAPE, turn).some(
      ([e, s, h]) => x > e * 0.5 - 0.5 && x < e * 0.5 && z > s * 0.5 - 0.5 && z < s * 0.5 && y > h * 0.5 && y < h * 0.5 + 0.5,
    );
  }

  it('no dibuja caras escondidas entre dos voxeles, ni la de abajo', () => {
    // 7 voxeles: 4 tapas (las 3 de arriba y la del escalon) y 16 caras de lado
    // (8 alrededor de la fila de abajo, 6 alrededor de la de arriba y las 2
    // que dan a la esquina que falta). Con las escondidas serian 42.
    expect(normals(0).length).toBe(20);
    expect(normals(0).filter((n) => n === '0,1,0').length).toBe(4);
    expect(normals(0).some((n) => n === '0,-1,0')).toBe(false);
  });

  it('cada cara mira hacia fuera (se ven por delante) y tiene la luz de su lado', () => {
    for (const turn of [0, 1, 2, 3]) {
      const m = rockMesh(ROCK_SHAPE, turn);
      for (let t = 0; t < m.indices.length; t += 6) {
        const i0 = m.indices[t]!;
        const p = [0, 1, 2].map((k) => [0, 1, 2].map((c) => m.positions[m.indices[t + k]! * 3 + c]!));
        const u = p[1]!.map((v, c) => v - p[0]![c]!);
        const v = p[2]!.map((w, c) => w - p[0]![c]!);
        const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
        // Hacia fuera: justo delante de la cara no hay roca, y justo detras si.
        const ids = [0, 1, 2, 5].map((k) => m.indices[t + k]!);
        const c = [0, 1, 2].map((k) => ids.reduce((sum, i) => sum + m.positions[i * 3 + k]!, 0) / 4);
        const len = Math.hypot(n[0]!, n[1]!, n[2]!);
        const step = (k: number) => c.map((v, i) => v + (n[i]! / len) * k);
        expect(solid(turn, step(0.01)), `giro ${turn}: delante de la cara hay roca`).toBe(false);
        expect(solid(turn, step(-0.01)), `giro ${turn}: detras de la cara no hay roca`).toBe(true);
        // La luz: arriba entera; oeste y norte (-x, -z) 0,95; este y sur, 0,74.
        const light = m.colors[i0 * 3]!;
        const want = n[1]! > 0 ? 1 : n[0]! < 0 || n[2]! < 0 ? 0.95 : 0.74;
        expect(light, `giro ${turn}`).toBeCloseTo(want, 6);
      }
    }
  });

  it('cabe en su casilla, y girar no cambia cuantos voxeles tiene ni su alto', () => {
    for (const turn of [0, 1, 2, 3]) {
      const m = rockMesh(ROCK_SHAPE, turn);
      for (let i = 0; i < m.positions.length; i += 3) {
        expect(Math.abs(m.positions[i]!)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(m.positions[i + 2]!)).toBeLessThanOrEqual(0.5);
        expect(m.positions[i + 1]!).toBeLessThanOrEqual(1);
      }
      expect(new Set(turnVoxels(ROCK_SHAPE, turn).map((v) => v.join(','))).size).toBe(ROCK_SHAPE.length);
    }
    // Y gira de verdad: el hueco de la esquina cambia de sitio.
    expect(turnVoxels(ROCK_SHAPE, 1).map((v) => v.join(',')).sort()).not.toEqual(ROCK_SHAPE.map((v) => v.join(',')).sort());
  });
});
