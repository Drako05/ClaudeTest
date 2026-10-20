import { describe, expect, it } from 'vitest';
import {
  createGame,
  DAMAGE_DECAY_TICKS,
  footing,
  headroom,
  hitboxAt,
  step,
  topOf,
  VOXELS_PER_TILE,
  World,
  type GameState,
} from '@verdant/sim';
import { CHUNK_SIZE, emptyIntent, Feature, Resource, Terrain, ToolKind, toolStats, voxelWorkOf } from '@verdant/shared';

/**
 * La destruccion del terreno (el autor, 2026-10-20): el voxel de 0,5 es la
 * unidad del terreno; cada golpe da a cada voxel que toca, que aguanta 3 y se
 * rompe solo; debajo hay mas de lo mismo, sin fondo; nada cae; con cualquier
 * cosa en la mano; sin particulas ni botin.
 */

/** El jugador en su nacimiento, un rellano llano de 3x3, con el alrededor despejado. Con la semilla 7, de hierba: se cava con pala. */
function atSpawn(seed = 7): { state: GameState; tx: number; ty: number; h: number } {
  const state = createGame(seed);
  const e = state.entities;
  const id = state.playerId;
  const tx = Math.floor(e.x[id]);
  const ty = Math.floor(e.y[id]);
  e.x[id] = tx + 0.5;
  e.y[id] = ty + 0.5;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) state.world.setFeature(tx + dx, ty + dy, Feature.None);
  }
  return { state, tx, ty, h: state.world.columnTop(tx * VOXELS_PER_TILE, ty * VOXELS_PER_TILE) };
}

/** Un golpe hacia (dx, dy), mirando `down` grados hacia abajo. */
function swing(state: GameState, dx: number, dy: number, down: number, precise = false) {
  const intent = emptyIntent();
  intent.harvest = true;
  intent.precise = precise;
  intent.aimX = dx;
  intent.aimY = dy;
  intent.aimZ = Math.sin((-down * Math.PI) / 180);
  step(state, intent);
  return state.lastVoxelHits;
}

/** Una columna de tierra cualquiera lejos del origen, y su altura. */
function landColumn(world: World): { vx: number; vy: number; h: number } {
  for (let x = 0; x < 400; x++) {
    if (world.terrainAt(x, 3) === Terrain.Water || world.terrainAt(x, 3) === Terrain.DeepWater) continue;
    const vx = x * VOXELS_PER_TILE + 1;
    const vy = 3 * VOXELS_PER_TILE;
    return { vx, vy, h: world.columnTop(vx, vy) };
  }
  throw new Error('sin tierra');
}

describe('el overlay del terreno: lo roto', () => {
  it('romper el voxel de arriba baja la columna; uno de debajo deja el de arriba en el aire', () => {
    const world = new World(7);
    const { vx, vy, h } = landColumn(world);
    expect(world.isSolidVoxel(vx, vy, h - 1)).toBe(true);
    expect(world.breakVoxel(vx, vy, h - 1)).toBe(true);
    expect(world.isSolidVoxel(vx, vy, h - 1)).toBe(false);
    expect(world.columnTop(vx, vy)).toBe(h - 1);
    // Sin gravedad para los bloques: el de arriba se queda.
    expect(world.breakVoxel(vx, vy, h - 3)).toBe(true);
    expect(world.columnTop(vx, vy)).toBe(h - 1);
    expect(world.floorBelow(vx, vy, h - 2)).toBe(h - 3);
    expect(world.ceilingAbove(vx, vy, h - 3)).toBe(h - 2);
    expect(world.ceilingAbove(vx, vy, h - 1)).toBe(Infinity);
    // Lo que no es terreno no se rompe, y lo roto no se rompe dos veces.
    expect(world.breakVoxel(vx, vy, h - 1)).toBe(false);
    expect(world.breakVoxel(vx, vy, h + 4)).toBe(false);
  });

  it('sin fondo: debajo siempre hay mas', () => {
    const world = new World(7);
    const { vx, vy, h } = landColumn(world);
    for (let z = h - 1; z >= h - 60; z--) expect(world.breakVoxel(vx, vy, z)).toBe(true);
    expect(world.columnTop(vx, vy)).toBe(h - 60);
    expect(world.isSolidVoxel(vx, vy, h - 61)).toBe(true);
  });

  it('el fondo del agua no se rompe', () => {
    const world = new World(7);
    let water: [number, number] | null = null;
    for (let x = 0; x < 2000 && !water; x++) if (world.terrainAt(x, 3) === Terrain.Water) water = [x, 3];
    expect(water).not.toBeNull();
    const [x, y] = water!;
    const vx = x * VOXELS_PER_TILE;
    const vy = y * VOXELS_PER_TILE;
    const h = world.columnTop(vx, vy);
    expect(world.breakVoxel(vx, vy, h - 1)).toBe(false);
    expect(world.columnTop(vx, vy)).toBe(h);
  });

  it('lo roto sobrevive a descargar el chunk, y el generador no se entera (regla 3)', () => {
    const world = new World(7);
    const { vx, vy, h } = landColumn(world);
    world.breakVoxel(vx, vy, h - 1);
    world.pruneFar(1e6, 1e6, 0);
    expect(world.loadedChunkCount).toBe(0);
    expect(world.columnTop(vx, vy)).toBe(h - 1);
    expect(world.potentialTop(vx, vy)).toBe(h);
    expect(world.gen.columnTopAt(vx, vy)).toBe(h);
  });

  it('el dibujo se entera: sube la revision del terreno del chunk, y de la vecina en el borde', () => {
    const world = new World(7);
    const cols = CHUNK_SIZE * VOXELS_PER_TILE;
    // Un voxel en el borde oeste del chunk (1, 0), con tierra.
    let vx = cols;
    let vy = 0;
    for (; vy < cols; vy++) if (world.columnTop(vx, vy) >= 0 && world.terrainAt(1 * CHUNK_SIZE, Math.floor(vy / 2)) !== Terrain.Water) break;
    const own = world.getChunk(1, 0);
    const west = world.getChunk(0, 0);
    const east = world.getChunk(2, 0);
    const [o, w, e] = [own.terrainRevision, west.terrainRevision, east.terrainRevision];
    const r = own.revision;
    expect(world.breakVoxel(vx, vy, world.columnTop(vx, vy) - 1)).toBe(true);
    expect(own.terrainRevision).toBe(o + 1);
    expect(west.terrainRevision).toBe(w + 1);
    expect(east.terrainRevision).toBe(e);
    // Los objetos no se rehacen por un voxel.
    expect(own.revision).toBe(r);
  });
});

describe('nada cae (el autor, 2026-10-20)', () => {
  it('un objeto cuyo apoyo se rompe se queda donde estaba', () => {
    const { state, tx, ty } = atSpawn();
    const w = state.world;
    w.setFeature(tx + 2, ty, Feature.RockNode);
    const z0 = hitboxAt(w, tx + 2, ty)!.z0;
    for (let s = 0; s < 4; s++) {
      const vx = (tx + 2) * VOXELS_PER_TILE + (s % 2);
      const vy = ty * VOXELS_PER_TILE + Math.floor(s / 2);
      w.breakVoxel(vx, vy, w.columnTop(vx, vy) - 1);
    }
    expect(hitboxAt(w, tx + 2, ty)!.z0).toBe(z0);
  });

  it('lo generado tambien: se apoya en el terreno que dio el generador', () => {
    const world = new World(7);
    for (let x = 0; x < 400; x++) {
      for (let y = 0; y < 40; y++) {
        if (world.featureAt(x, y) !== Feature.RockNode) continue;
        const z0 = hitboxAt(world, x, y)!.z0;
        for (let s = 0; s < 4; s++) {
          const vx = x * VOXELS_PER_TILE + (s % 2);
          const vy = y * VOXELS_PER_TILE + Math.floor(s / 2);
          world.breakVoxel(vx, vy, world.columnTop(vx, vy) - 1);
        }
        expect(hitboxAt(world, x, y)!.z0).toBe(z0);
        return;
      }
    }
    throw new Error('ninguna roca');
  });

  it('lo que aparece en un hoyo se apoya en su fondo', () => {
    const { state, tx, ty } = atSpawn();
    const w = state.world;
    const x = tx + 2;
    for (let s = 0; s < 4; s++) {
      const vx = x * VOXELS_PER_TILE + (s % 2);
      const vy = ty * VOXELS_PER_TILE + Math.floor(s / 2);
      w.breakVoxel(vx, vy, w.columnTop(vx, vy) - 1);
    }
    const floor = topOf(w.columnTop(x * VOXELS_PER_TILE, ty * VOXELS_PER_TILE));
    w.setFeature(x, ty, Feature.RockNode);
    expect(hitboxAt(w, x, ty)!.z0).toBe(floor);
  });
});

describe('la fisica con terreno en el aire (regla 21)', () => {
  /** Las columnas de 0,5 que pisa el jugador de su casilla: las cuatro. */
  function columnsOf(tx: number, ty: number): [number, number][] {
    return [0, 1, 2, 3].map((s) => [tx * VOXELS_PER_TILE + (s % 2), ty * VOXELS_PER_TILE + Math.floor(s / 2)]);
  }

  it('se cae en un hoyo', () => {
    const { state, tx, ty, h } = atSpawn();
    for (const [vx, vy] of columnsOf(tx, ty)) for (let z = h - 1; z >= h - 4; z--) state.world.breakVoxel(vx, vy, z);
    for (let i = 0; i < 60; i++) step(state, emptyIntent());
    expect(state.entities.z[state.playerId]).toBeCloseTo(topOf(h - 4), 9);
  });

  it('bajo un techo se pisa el suelo, no el techo, y la cabeza choca', () => {
    const { state, tx, ty, h } = atSpawn();
    const e = state.entities;
    const id = state.playerId;
    // Un hueco de 2,5 bajo el voxel de arriba, que se queda en el aire.
    for (const [vx, vy] of columnsOf(tx, ty)) for (let z = h - 2; z >= h - 6; z--) state.world.breakVoxel(vx, vy, z);
    e.z[id] = topOf(h - 6);
    expect(footing(state.world, e, id)).toBeCloseTo(topOf(h - 6), 9);
    expect(headroom(state.world, e, id)).toBeCloseTo(topOf(h - 1), 9);
    let peak = e.z[id];
    const jump = { ...emptyIntent(), jump: true };
    for (let i = 0; i < 40; i++) {
      step(state, i === 0 ? jump : emptyIntent());
      peak = Math.max(peak, e.z[id]);
    }
    // Sin techo subiria 1,16; con el, la cabeza se queda en su base.
    expect(peak + 1.8).toBeLessThanOrEqual(topOf(h - 1) + 1e-9);
    expect(peak).toBeGreaterThan(topOf(h - 6) + 0.5);
  });
});

describe('un escalon con techo encima solo se sube si se cabe', () => {
  /**
   * Una cueva al este del jugador: en su casilla, un hueco de 2,5 bajo el
   * techo; en la de delante, medio bloque mas arriba, un hueco de `gap`
   * medios bloques bajo el suyo. Devuelve hasta donde llega andando 1 s.
   */
  function walkInto(gap: number): { x: number; edge: number } {
    const { state, tx, ty, h } = atSpawn();
    const w = state.world;
    const e = state.entities;
    const id = state.playerId;
    for (let vy = ty * VOXELS_PER_TILE - 1; vy <= ty * VOXELS_PER_TILE + 2; vy++) {
      for (let vx = tx * VOXELS_PER_TILE - 1; vx < (tx + 1) * VOXELS_PER_TILE; vx++) for (let z = h - 2; z >= h - 6; z--) w.breakVoxel(vx, vy, z);
      for (let vx = (tx + 1) * VOXELS_PER_TILE; vx < (tx + 2) * VOXELS_PER_TILE; vx++) {
        for (let z = h - 5; z < h - 5 + gap; z++) w.breakVoxel(vx, vy, z);
      }
    }
    e.z[id] = topOf(h - 6);
    for (let i = 0; i < 60; i++) step(state, { ...emptyIntent(), moveX: 1, aimX: 1, aimY: 0 });
    return { x: e.x[id], edge: tx + 1 };
  }

  it('con 2 de hueco (el cuerpo mide 1,8), se sube', () => {
    const { x, edge } = walkInto(4);
    expect(x).toBeGreaterThan(edge);
  });

  it('con 1,5, no: la cabeza no cabe', () => {
    const { x, edge } = walkInto(3);
    expect(x).toBeLessThan(edge);
  });
});

/** Pone `tool` en la mano. */
function hold(state: GameState, tool: Resource): void {
  const inv = state.inventory;
  inv.add(tool, 1);
  inv.select(inv.items.indexOf(tool));
  expect(inv.held()).toBe(tool);
}

describe('que rompe cada suelo (el autor, 2026-10-20)', () => {
  it('la roca, el pico; lo maleable, la pala; el agua, nada; con 3 de trabajo', () => {
    expect(voxelWorkOf(Terrain.Rock)).toEqual({ tool: ToolKind.Pickaxe, tier: 1, work: 3 });
    for (const t of [Terrain.Sand, Terrain.Grass, Terrain.Forest, Terrain.Tundra, Terrain.Snow]) {
      expect(voxelWorkOf(t), Terrain[t]).toEqual({ tool: ToolKind.Shovel, tier: 1, work: 3 });
    }
    expect(voxelWorkOf(Terrain.Water)).toBeNull();
    expect(voxelWorkOf(Terrain.DeepWater)).toBeNull();
  });

  it('las palas: tres tiers, como el hacha y el pico', () => {
    const tiers: [Resource, Resource][] = [
      [Resource.StoneShovel, Resource.StonePickaxe],
      [Resource.CopperShovel, Resource.CopperPickaxe],
      [Resource.IronShovel, Resource.IronPickaxe],
    ];
    for (const [shovel, pick] of tiers) {
      expect(toolStats(shovel)).toEqual({ ...toolStats(pick)!, kind: ToolKind.Shovel });
    }
  });
});

describe('el golpe rompe el terreno (el autor, 2026-10-20)', () => {
  it('el barrido da a cada voxel que toca, una vez; con la pala de piedra, al 3.º se rompe', () => {
    const { state } = atSpawn();
    hold(state, Resource.StoneShovel);
    const first = swing(state, 1, 0, 60);
    expect(first.length).toBeGreaterThan(1);
    const keys = first.map((v) => `${v.x},${v.y},${v.z}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(first.every((v) => !v.broken)).toBe(true);
    swing(state, 1, 0, 60);
    for (const v of first) expect(state.world.isSolidVoxel(v.x, v.y, v.z)).toBe(true);
    const third = swing(state, 1, 0, 60);
    const broken = third.filter((v) => v.broken);
    expect(broken.length).toBe(first.length);
    for (const v of first) expect(state.world.isSolidVoxel(v.x, v.y, v.z)).toBe(false);
    // Sin particulas, ni impacto, ni botin.
    expect(state.lastHits).toHaveLength(0);
    expect(state.lastImpacts).toHaveLength(0);
    expect(state.lastHarvest).toHaveLength(0);
    expect(state.world.drops.size).toBe(0);
  });

  it('el poder resta: con la de cobre, dos golpes; con la de hierro, uno; y cada golpe gasta un uso', () => {
    for (const [tool, hits] of [[Resource.CopperShovel, 2], [Resource.IronShovel, 1]] as const) {
      const { state } = atSpawn();
      hold(state, tool);
      const inv = state.inventory;
      const wear = inv.wear[inv.selected];
      const a = swing(state, 1, 0, 60);
      for (let i = 1; i < hits; i++) {
        expect(a.every((v) => state.world.isSolidVoxel(v.x, v.y, v.z)), Resource[tool]).toBe(true);
        swing(state, 1, 0, 60);
      }
      expect(a.every((v) => !state.world.isSolidVoxel(v.x, v.y, v.z)), Resource[tool]).toBe(true);
      expect(inv.wear[inv.selected]).toBe(wear - hits);
    }
  });

  it('sin pala no se rompe lo maleable: a mano, con hacha o con pico; y el golpe gasta igual', () => {
    for (const tool of [null, Resource.StoneAxe, Resource.IronPickaxe]) {
      const { state } = atSpawn();
      if (tool !== null) hold(state, tool);
      const inv = state.inventory;
      const wear = inv.wear[inv.selected];
      let a = swing(state, 1, 0, 60);
      expect(a.length).toBeGreaterThan(0);
      for (let i = 0; i < 4; i++) a = swing(state, 1, 0, 60);
      expect(a.every((v) => state.world.isSolidVoxel(v.x, v.y, v.z) && !v.broken)).toBe(true);
      expect(state.lastBlocked).toBe('needShovel');
      if (tool !== null) expect(inv.wear[inv.selected]).toBe(wear - 5);
    }
  });

  it('el daño se olvida a los 3 s sin golpe', () => {
    const { state } = atSpawn();
    hold(state, Resource.StoneShovel);
    const a = swing(state, 1, 0, 60);
    swing(state, 1, 0, 60);
    for (let i = 0; i <= DAMAGE_DECAY_TICKS; i++) step(state, emptyIntent());
    swing(state, 1, 0, 60);
    expect(a.every((v) => state.world.isSolidVoxel(v.x, v.y, v.z))).toBe(true);
  });

  it('en preciso, solo el voxel del centro de la mira; con un objeto delante, ninguno', () => {
    const { state, tx, ty } = atSpawn();
    hold(state, Resource.StoneShovel);
    expect(swing(state, 1, 0, 60, true)).toHaveLength(1);
    state.world.setFeature(tx + 1, ty, Feature.RockNode);
    expect(swing(state, 1, 0, 40, true)).toHaveLength(0);
  });

  it('el terreno tapado por un objeto no se golpea', () => {
    const { state } = atSpawn();
    hold(state, Resource.StoneShovel);
    const open = swing(state, 1, 0, 40).length;
    const fresh = atSpawn();
    hold(fresh.state, Resource.StoneShovel);
    fresh.state.world.setFeature(fresh.tx + 1, fresh.ty, Feature.Workbench);
    const covered = swing(fresh.state, 1, 0, 40);
    expect(covered.length).toBeLessThan(open);
  });

  it('mirando al frente en llano no toca el suelo', () => {
    const { state } = atSpawn();
    expect(swing(state, 1, 0, 0)).toHaveLength(0);
  });
});
