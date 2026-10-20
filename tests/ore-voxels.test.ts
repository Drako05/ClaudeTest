import { describe, expect, it } from 'vitest';
import {
  CHUNK_COLUMNS,
  createGame,
  generateChunk,
  hitboxAt,
  isOre,
  oreFormation,
  oreVoxelLoot,
  VOXELS_PER_TILE,
  World,
} from '@verdant/sim';
import { CHUNK_SIZE, Feature, Resource } from '@verdant/shared';
import { groundCount, oreSite, strikeDown } from './ground.js';

/**
 * Las menas como formacion de voxeles (el autor, 2026-10-20): ocho voxeles de
 * 0,5 —uno abajo, el 2 × 2 en medio y tres arriba—; los dos primeros niveles
 * sustituyen terreno y el de arriba queda encima. Cada voxel se pica solo, con
 * su tier de pico y el trabajo de su mena, y suelta 0-1 de su mineral (el
 * carbon, 1-2), sin particulas.
 */

const ORES = [Feature.CoalNode, Feature.CopperNode, Feature.IronNode];

describe('la formacion', () => {
  it('ocho voxeles: uno abajo, cuatro en medio y tres arriba, dentro de su casilla', () => {
    for (let k = 0; k < 40; k++) {
      const shape = oreFormation(7, k, -k * 3);
      expect(shape).toHaveLength(8);
      expect(shape.filter(([, , z]) => z === -2)).toHaveLength(1);
      expect(shape.filter(([, , z]) => z === -1)).toHaveLength(4);
      expect(shape.filter(([, , z]) => z === 0)).toHaveLength(3);
      for (const [e, s] of shape) expect([e, s].every((c) => c === 0 || c === 1)).toBe(true);
      expect(new Set(shape.map((v) => v.join())).size).toBe(8);
    }
  });

  it('en el mundo: los dos niveles de abajo son terreno que cambia de material, y el de arriba asoma encima', () => {
    for (const ore of ORES) {
      const world = new World(12345);
      const { tx, ty } = oreSite(world, ore);
      const f = world.oreFormationAt(tx, ty)!;
      expect(f.feature).toBe(ore);
      expect(f.voxels).toHaveLength(8);
      let above = 0;
      for (const [vx, vy, vz] of f.voxels) {
        expect(world.oreAt(vx, vy, vz)).toBe(ore);
        expect(world.isSolidVoxel(vx, vy, vz)).toBe(true);
        if (vz === f.base) {
          // El de arriba: sobre la columna mas baja, la que da la base.
          above++;
          expect(world.columnTop(vx, vy)).toBeGreaterThanOrEqual(f.base + 1);
        } else {
          expect(vz).toBeLessThan(f.base);
        }
      }
      expect(above).toBe(3);
      // Lo de al lado de la formacion es terreno sin mas.
      expect(world.oreAt(tx * VOXELS_PER_TILE - 1, ty * VOXELS_PER_TILE, f.base - 1)).toBe(Feature.None);
    }
  });

  it('la mena ya no es un objeto: no tiene caja', () => {
    const world = new World(12345);
    for (const ore of ORES) {
      const { tx, ty } = oreSite(world, ore);
      expect(world.featureAt(tx, ty)).toBe(ore);
      expect(hitboxAt(world, tx, ty)).toBeNull();
    }
  });

  it('la generacion sigue pura: el chunk y el generador dicen la misma altura en las menas', () => {
    const world = new World(12345);
    let checked = 0;
    for (const ore of ORES) {
      const { tx, ty } = oreSite(world, ore);
      const cx = Math.floor(tx / CHUNK_SIZE);
      const cy = Math.floor(ty / CHUNK_SIZE);
      const a = generateChunk(world.gen, cx, cy);
      const b = generateChunk(world.gen, cx, cy);
      expect(a.height).toEqual(b.height);
      expect(a.oreBase).toEqual(b.oreBase);
      for (let s = 0; s < 4; s++) {
        const vx = tx * VOXELS_PER_TILE + (s & 1);
        const vy = ty * VOXELS_PER_TILE + (s >> 1);
        const h = a.height[(vy - cy * CHUNK_COLUMNS) * CHUNK_COLUMNS + (vx - cx * CHUNK_COLUMNS)];
        expect(world.gen.columnTopAt(vx, vy)).toBe(h);
        checked++;
      }
    }
    expect(checked).toBe(12);
    expect(isOre(Feature.RockNode)).toBe(false);
  });
});

describe('picar una mena', () => {
  it('cada voxel aguanta su trabajo: el carbon, 4 con el pico de piedra; y no suelta particulas', () => {
    const state = createGame(12345);
    state.inventory.add(Resource.StonePickaxe, 1);
    state.inventory.select(state.inventory.items.indexOf(Resource.StonePickaxe));
    const { tx, ty } = oreSite(state.world, Feature.CoalNode);
    const top = state.world.oreFormationAt(tx, ty)!.voxels.reduce((a, b) => (b[2] > a[2] ? b : a));
    for (let i = 0; i < 3; i++) expect(strikeDown(state, top[0], top[1])).toBe(false);
    expect(strikeDown(state, top[0], top[1])).toBe(true);
    expect(state.lastHits).toHaveLength(0);
    expect(state.lastImpacts).toHaveLength(0);
    expect(state.lastHarvest).toHaveLength(0);
    // El carbon, de 1 a 2.
    expect(groundCount(state.world, Resource.Coal)).toBeGreaterThanOrEqual(1);
  });

  it('el botin por voxel: de 0 a 1 del mineral, el carbon de 1 a 2, y de las dos cantidades', () => {
    for (const ore of ORES) {
      const seen = new Set<number>();
      for (let k = 0; k < 200; k++) seen.add(oreVoxelLoot(12345, ore, k, -k, k % 7));
      expect([...seen].sort()).toEqual(ore === Feature.CoalNode ? [1, 2] : [0, 1]);
    }
  });

  it('con el ultimo voxel la casilla queda vacia', () => {
    const state = createGame(12345);
    state.inventory.add(Resource.IronPickaxe, 1);
    state.inventory.select(state.inventory.items.indexOf(Resource.IronPickaxe));
    const { tx, ty } = oreSite(state.world, Feature.CopperNode);
    for (let k = 0; k < 40 && state.world.oreFormationAt(tx, ty)!.voxels.length > 0; k++) {
      const left = state.world.oreFormationAt(tx, ty)!.voxels;
      expect(state.world.featureAt(tx, ty)).toBe(Feature.CopperNode);
      const top = left.reduce((a, b) => (b[2] > a[2] ? b : a));
      for (let i = 0; i < 2; i++) strikeDown(state, top[0], top[1]);
    }
    expect(state.world.oreFormationAt(tx, ty)!.voxels).toHaveLength(0);
    expect(state.world.featureAt(tx, ty)).toBe(Feature.None);
  });
});
