import { describe, expect, it } from 'vitest';
import {
  BRANCH_REGROW_TICKS,
  BRANCHES_PER_TREE,
  branchesLeft,
  createGame,
  DAMAGE_DECAY_TICKS,
  generateChunk,
  Inventory,
  skipTime,
  START_SLOTS,
  step,
  type GameState,
} from '@verdant/sim';
import {
  emptyIntent,
  Feature,
  blocksBody,
  isTerrainSolid,
  RECIPES,
  Resource,
  Terrain,
  toolStats,
} from '@verdant/shared';

/**
 * La tanda 1 de recoleccion y fabricacion, decisiones del autor: trabajo por
 * golpes, herramienta en la mano, desgaste, inventario por casillas y
 * guijarros para la primera piedra. Las cifras son propuestas del plan.
 */

const AXE = RECIPES.findIndex((r) => r.output === Resource.StoneAxe);
const PICK = RECIPES.findIndex((r) => r.output === Resource.StonePickaxe);

/** El jugador en su nacimiento, que es un rellano llano de 3x3 (regla 22). */
function atSpawn(seed = 12345): { state: GameState; tx: number; ty: number } {
  const state = createGame(seed);
  const e = state.entities;
  const id = state.playerId;
  const tx = Math.floor(e.x[id]);
  const ty = Math.floor(e.y[id]);
  e.x[id] = tx + 0.5;
  e.y[id] = ty + 0.5;
  // Despejado alrededor: lo que haya de verdad al alcance contaria tambien.
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) state.world.setFeature(tx + dx, ty + dy, Feature.None);
  }
  return { state, tx, ty };
}

/** Un golpe hacia (dx, dy), mirando `down` grados hacia abajo. */
function swing(state: GameState, dx: number, dy: number, down: number) {
  const intent = emptyIntent();
  intent.harvest = true;
  intent.aimX = dx;
  intent.aimY = dy;
  intent.aimZ = Math.sin((-down * Math.PI) / 180);
  step(state, intent);
  return { results: state.lastHarvest, blocked: state.lastBlocked, broke: state.lastBroke };
}

function act(state: GameState, over: Partial<ReturnType<typeof emptyIntent>>): void {
  step(state, { ...emptyIntent(), ...over });
}

function slotOf(inv: Inventory, item: Resource): number {
  for (let i = 0; i < inv.size; i++) if (inv.itemAt(i) === item) return i;
  return -1;
}

describe('El inventario por casillas', () => {
  it('apila hasta 100, una herramienta por casilla y con sus usos', () => {
    const inv = new Inventory();
    expect(inv.openSlots()).toBe(16);
    expect(inv.add(Resource.Wood, 205)).toBe(true);
    expect([inv.counts[0], inv.counts[1], inv.counts[2]]).toEqual([100, 100, 5]);
    expect(inv.add(Resource.StoneAxe, 2)).toBe(true);
    expect(inv.itemAt(3)).toBe(Resource.StoneAxe);
    expect(inv.itemAt(4)).toBe(Resource.StoneAxe);
    expect(inv.wear[3]).toBe(toolStats(Resource.StoneAxe)!.uses);
  });

  it('lo que no cabe entero no entra, y no se toca nada', () => {
    const inv = new Inventory();
    expect(inv.add(Resource.Wood, 100 * START_SLOTS - 3)).toBe(true);
    const before = inv.totals();
    expect(inv.add(Resource.Wood, 4)).toBe(false);
    expect(inv.add(Resource.Stone, 1)).toBe(false);
    expect(inv.totals()).toEqual(before);
    expect(inv.add(Resource.Wood, 3)).toBe(true);
  });

  it('solo las cuatro primeras son la mano; se intercambian y se tiran', () => {
    const inv = new Inventory();
    inv.add(Resource.Wood, 1);
    inv.add(Resource.Stone, 1);
    inv.select(6);
    expect(inv.selected).toBe(0);
    inv.select(3);
    expect(inv.selected).toBe(3);
    inv.swap(0, 5);
    expect(inv.itemAt(5)).toBe(Resource.Wood);
    expect(inv.itemAt(0)).toBeNull();
    inv.discard(5);
    expect(inv.count(Resource.Wood)).toBe(0);
  });

  it('arrastrar apila el mismo objeto hasta el tope e intercambia los distintos', () => {
    const inv = new Inventory();
    inv.add(Resource.Wood, 100);
    inv.add(Resource.Stone, 1);
    inv.add(Resource.Wood, 60); // completa nada: la 0 esta llena, va a la 2
    expect(inv.itemAt(2)).toBe(Resource.Wood);
    inv.discard(0);
    inv.add(Resource.Wood, 70); // a la 2 (60+40=100) y el resto a la 0
    expect([inv.counts[0], inv.counts[2]]).toEqual([30, 100]);
    // 30 sobre 100: no cabe nada, todo se queda.
    inv.move(0, 2);
    expect([inv.counts[0], inv.counts[2]]).toEqual([30, 100]);
    // Al reves con hueco: 100 sobre 30 llena la 0 y deja 30 en la 2.
    inv.move(2, 0);
    expect([inv.counts[0], inv.counts[2]]).toEqual([100, 30]);
    // Distintos se intercambian.
    inv.move(1, 0);
    expect(inv.itemAt(0)).toBe(Resource.Stone);
    expect(inv.itemAt(1)).toBe(Resource.Wood);
    expect(inv.counts[1]).toBe(100);
  });
});

describe('Etapa 1: con las manos', () => {
  it('los guijarros se cogen a mano mirando al suelo, y dan piedra', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 1, ty, Feature.Pebbles);
    // Mirando al frente el sector pasa por encima: son bajos.
    expect(swing(state, 1, 0, 0).results).toHaveLength(0);
    const { results } = swing(state, 1, 0, 60);
    expect(results).toHaveLength(1);
    expect(state.inventory.count(Resource.Stone)).toBe(1);
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.None);
  });

  it('un arbusto da bayas y 1-2 de fibra de un golpe', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 1, ty, Feature.MeadowPlant);
    swing(state, 1, 0, 40);
    expect(state.inventory.count(Resource.Berries)).toBeGreaterThan(0);
    const fiber = state.inventory.count(Resource.Fiber);
    expect(fiber).toBeGreaterThanOrEqual(1);
    expect(fiber).toBeLessThanOrEqual(2);
  });

  it('un arbol a mano no cae: suelta una rama por golpe, tres como mucho', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 1, ty, Feature.MeadowTree);
    for (let i = 0; i < BRANCHES_PER_TREE + 2; i++) swing(state, 1, 0, 0);
    expect(state.inventory.count(Resource.Branch)).toBe(BRANCHES_PER_TREE);
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.MeadowTree);
    expect(state.inventory.count(Resource.Wood)).toBe(0);
  });

  it('una roca o un mineral a mano no dan nada, y lo dicen', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 1, ty, Feature.RockNode);
    const { results, blocked } = swing(state, 1, 0, 30);
    expect(results).toHaveLength(0);
    expect(blocked).toBe('needPickaxe');
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.RockNode);
  });

  it('las ramas se reponen con el tiempo, igual vividas que saltadas', () => {
    const lived = atSpawn();
    const skipped = atSpawn();
    for (const g of [lived, skipped]) {
      g.state.world.setFeature(g.tx + 1, g.ty, Feature.MeadowTree);
      for (let i = 0; i < BRANCHES_PER_TREE; i++) swing(g.state, 1, 0, 0);
      expect(branchesLeft(g.state.work, g.tx + 1, g.ty, g.state.tick)).toBe(0);
    }
    for (let i = 0; i < BRANCH_REGROW_TICKS; i++) step(lived.state, emptyIntent());
    skipTime(skipped.state, BRANCH_REGROW_TICKS);
    const a = branchesLeft(lived.state.work, lived.tx + 1, lived.ty, lived.state.tick);
    const b = branchesLeft(skipped.state.work, skipped.tx + 1, skipped.ty, skipped.state.tick);
    expect(a).toBe(1);
    expect(b).toBe(a);
  });
});

describe('Etapas 2 y 3: herramientas de piedra, y lo que sacan', () => {
  it('partida guionizada: de las manos al pico, al hacha y a los minerales', () => {
    const { state, tx, ty } = atSpawn();
    const w = state.world;
    const inv = state.inventory;

    // 1. Con las manos: 5 piedras de guijarros, fibra de arbustos, 6 ramas de
    //    dos arboles.
    for (let i = 0; i < 5; i++) {
      w.setFeature(tx + 1, ty, Feature.Pebbles);
      swing(state, 1, 0, 60);
    }
    for (let i = 0; inv.count(Resource.Fiber) < 4 && i < 8; i++) {
      w.setFeature(tx + 1, ty, Feature.MeadowPlant);
      swing(state, 1, 0, 40);
    }
    w.setFeature(tx + 1, ty, Feature.MeadowTree);
    w.setFeature(tx - 1, ty, Feature.MeadowTree);
    for (let i = 0; i < 3; i++) swing(state, 1, 0, 0);
    for (let i = 0; i < 3; i++) swing(state, -1, 0, 0);
    expect(inv.count(Resource.Stone)).toBe(5);
    expect(inv.count(Resource.Fiber)).toBeGreaterThanOrEqual(4);
    expect(inv.count(Resource.Branch)).toBe(6);

    // 2. Fabricar las dos, a mano y en cualquier sitio.
    act(state, { craft: AXE });
    expect(state.lastCrafted).toBe(AXE);
    act(state, { craft: PICK });
    expect(state.lastCrafted).toBe(PICK);
    expect(inv.count(Resource.StoneAxe)).toBe(1);
    expect(inv.count(Resource.StonePickaxe)).toBe(1);
    expect(inv.count(Resource.Stone)).toBe(0);
    expect(inv.count(Resource.Branch)).toBe(0);

    // A la mano: si no quedaron en la barra, se llevan a ella.
    const toHand = (item: Resource, slot: number) => {
      const at = slotOf(inv, item);
      if (at !== slot) act(state, { moveFrom: at, moveTo: slot });
      act(state, { select: slot });
      expect(inv.held()).toBe(item);
    };

    // 3. El hacha tala en cuatro golpes: madera, una rama, y gasta cuatro usos.
    toHand(Resource.StoneAxe, 0);
    w.setFeature(tx + 1, ty, Feature.MeadowTree);
    const wood = inv.count(Resource.Wood);
    for (let i = 0; i < 3; i++) expect(swing(state, 1, 0, 0).results).toHaveLength(0);
    expect(w.featureAt(tx + 1, ty)).toBe(Feature.MeadowTree);
    const felled = swing(state, 1, 0, 0).results;
    expect(felled).toHaveLength(1);
    expect(felled[0].felled).toBe(true);
    expect(w.featureAt(tx + 1, ty)).toBe(Feature.None);
    expect(inv.count(Resource.Wood) - wood).toBeGreaterThanOrEqual(3);
    expect(inv.count(Resource.Branch)).toBe(1);
    expect(inv.wear[inv.selected]).toBe(40 - 4);

    // El hacha no sirve con la roca, pero se gasta en ella: todo golpe que
    // toca algo gasta (el autor, 2026-10-04).
    w.setFeature(tx + 1, ty, Feature.RockNode);
    expect(swing(state, 1, 0, 30).blocked).toBe('needPickaxe');
    expect(inv.wear[inv.selected]).toBe(40 - 5);

    // 4. El pico: roca en 3, carbon en 4, cobre en 5; el hierro pide uno mejor.
    toHand(Resource.StonePickaxe, 1);
    const mine = (f: Feature, hits: number, item: Resource) => {
      w.setFeature(tx + 1, ty, f);
      const before = inv.count(item);
      for (let i = 0; i < hits - 1; i++) swing(state, 1, 0, 30);
      expect(w.featureAt(tx + 1, ty)).toBe(f);
      swing(state, 1, 0, 30);
      expect(w.featureAt(tx + 1, ty)).toBe(Feature.None);
      expect(inv.count(item)).toBeGreaterThan(before);
    };
    mine(Feature.RockNode, 3, Resource.Stone);
    mine(Feature.CoalNode, 4, Resource.Coal);
    mine(Feature.CopperNode, 5, Resource.Copper);
    w.setFeature(tx + 1, ty, Feature.IronNode);
    for (let i = 0; i < 8; i++) expect(swing(state, 1, 0, 30).blocked).toBe('needBetterPickaxe');
    expect(w.featureAt(tx + 1, ty)).toBe(Feature.IronNode);
    // Uno por golpe, tambien los que no pudo con el hierro: 3 + 4 + 5 + 8.
    expect(inv.wear[inv.selected]).toBe(40 - 20);
  });

  it('sin materiales no se fabrica nada', () => {
    const { state } = atSpawn();
    state.inventory.add(Resource.Branch, 3);
    state.inventory.add(Resource.Stone, 1);
    state.inventory.add(Resource.Fiber, 2);
    act(state, { craft: AXE });
    expect(state.lastCrafted).toBe(-1);
    expect(state.inventory.count(Resource.StoneAxe)).toBe(0);
    expect(state.inventory.count(Resource.Branch)).toBe(3);
  });

  it('con el inventario lleno el golpe no completa y el objeto se queda', () => {
    const { state, tx, ty } = atSpawn();
    state.inventory.add(Resource.Wood, 100 * START_SLOTS);
    state.world.setFeature(tx + 1, ty, Feature.MeadowPlant);
    const { results, blocked } = swing(state, 1, 0, 40);
    expect(results).toHaveLength(0);
    expect(blocked).toBe('full');
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.MeadowPlant);
  });

  it('el dano se pierde si se deja de golpear un rato', () => {
    const { state, tx, ty } = atSpawn();
    state.inventory.add(Resource.StoneAxe, 1);
    state.world.setFeature(tx + 1, ty, Feature.MeadowTree);
    swing(state, 1, 0, 0);
    swing(state, 1, 0, 0);
    for (let i = 0; i <= DAMAGE_DECAY_TICKS; i++) step(state, emptyIntent());
    swing(state, 1, 0, 0);
    swing(state, 1, 0, 0);
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.MeadowTree);
    swing(state, 1, 0, 0);
    swing(state, 1, 0, 0);
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.None);
  });

  it('una herramienta se rompe al gastar sus usos', () => {
    const { state, tx, ty } = atSpawn();
    state.inventory.add(Resource.StonePickaxe, 1);
    const uses = toolStats(Resource.StonePickaxe)!.uses;
    let broke = false;
    let hits = 0;
    while (!broke && hits < uses + 5) {
      if (state.world.featureAt(tx + 1, ty) === Feature.None) state.world.setFeature(tx + 1, ty, Feature.RockNode);
      broke = swing(state, 1, 0, 30).broke;
      hits++;
    }
    expect(broke).toBe(true);
    expect(hits).toBe(uses);
    expect(state.inventory.count(Resource.StonePickaxe)).toBe(0);
  });
});

describe('Los guijarros en el mundo', () => {
  it('estan en tierra, nunca en el agua, y no estorban el paso', () => {
    const gen = createGame(4242).world.gen;
    let land = 0;
    let pebbles = 0;
    let rock = 0;
    let rockPebbles = 0;
    for (let cy = -3; cy < 3; cy++) {
      for (let cx = -3; cx < 3; cx++) {
        const chunk = generateChunk(gen, cx, cy);
        for (let i = 0; i < chunk.feature.length; i++) {
          const t = chunk.terrain[i] as Terrain;
          const isPebbles = chunk.feature[i] === Feature.Pebbles;
          if (isTerrainSolid(t)) {
            expect(isPebbles).toBe(false);
            continue;
          }
          land++;
          if (isPebbles) pebbles++;
          if (t === Terrain.Rock) {
            rock++;
            if (isPebbles) rockPebbles++;
          }
        }
      }
    }
    expect(blocksBody(Feature.Pebbles)).toBe(false);
    expect(pebbles / land).toBeGreaterThan(0.01);
    expect(pebbles / land).toBeLessThan(0.05);
    if (rock > 500) expect(rockPebbles / rock).toBeGreaterThan(pebbles / land);
  });

  it('siempre hay guijarros cerca del nacimiento', () => {
    for (const seed of [12345, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const state = createGame(seed);
      const px = Math.floor(state.entities.x[state.playerId]);
      const py = Math.floor(state.entities.y[state.playerId]);
      let near = 0;
      for (let dy = -15; dy <= 15; dy++) {
        for (let dx = -15; dx <= 15; dx++) {
          if (Math.hypot(dx, dy) <= 15 && state.world.featureAt(px + dx, py + dy) === Feature.Pebbles) near++;
        }
      }
      // Hacen falta cinco para el hacha y el pico.
      expect(near, `semilla ${seed}`).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('Usar lo de la mano', () => {
  it('con bayas en la mano se come; con la mano vacia no pasa nada', () => {
    const { state } = atSpawn();
    const e = state.entities;
    e.hunger[state.playerId] = 50;
    act(state, { use: true });
    expect(state.lastUsed).toBeNull();
    state.inventory.add(Resource.Berries, 3);
    act(state, { select: slotOf(state.inventory, Resource.Berries) });
    act(state, { use: true });
    expect(state.lastUsed).toBe('ate');
    expect(state.inventory.count(Resource.Berries)).toBe(2);
    expect(e.hunger[state.playerId]).toBeGreaterThan(50);
  });

  it('con una semilla en la mano se siembra esa, donde toca la mirada', () => {
    const { state, tx, ty } = atSpawn();
    state.inventory.add(Resource.TreeSeed, 2);
    state.inventory.add(Resource.PlantSeed, 2);
    const kind = state.world.featureAt(tx + 1, ty);
    expect(kind).toBe(Feature.None);
    act(state, { select: slotOf(state.inventory, Resource.PlantSeed) });
    act(state, { use: true, aimX: 1, aimY: 0, aimZ: Math.sin((-50 * Math.PI) / 180) });
    // Puede que el suelo no sostenga plantas; si siembra, es con la de la mano.
    if (state.lastUsed === 'planted') {
      expect(state.inventory.count(Resource.PlantSeed)).toBe(1);
      expect(state.inventory.count(Resource.TreeSeed)).toBe(2);
    } else {
      expect(state.inventory.count(Resource.PlantSeed)).toBe(2);
    }
  });

  it('fabricar sin sitio no fabrica, y el nucleo lo deja dicho en lastBlocked', () => {
    const { state } = atSpawn();
    const inv = state.inventory;
    // Materiales de sobra, asi que sus casillas no se vacian al gastarlos, y
    // las otras trece llenas de herramientas: el hacha no tiene donde ir.
    inv.add(Resource.Branch, 10);
    inv.add(Resource.Stone, 10);
    inv.add(Resource.Fiber, 10);
    for (let i = 0; i < 13; i++) inv.add(Resource.StonePickaxe, 1);
    act(state, { craft: AXE });
    expect(state.lastCrafted).toBe(-1);
    expect(state.lastBlocked).toBe('full');
    expect(inv.count(Resource.Branch)).toBe(10);
    // Con los materiales justos, sus casillas se vacian y si cabe.
    inv.remove(Resource.Branch, 7);
    inv.remove(Resource.Stone, 8);
    inv.remove(Resource.Fiber, 8);
    act(state, { craft: AXE });
    expect(state.lastCrafted).toBe(AXE);
  });

  it('un golpe que no rompe deja su golpe para las particulas', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 1, ty, Feature.RockNode);
    swing(state, 1, 0, 30);
    expect(state.lastHits).toEqual([{ x: tx + 1, y: ty, feature: Feature.RockNode }]);
    state.world.setFeature(tx + 1, ty, Feature.Pebbles);
    swing(state, 1, 0, 60);
    expect(state.lastHits).toHaveLength(0);
    expect(state.lastHarvest).toHaveLength(1);
  });
});
