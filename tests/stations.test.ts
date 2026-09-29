import { describe, expect, it } from 'vitest';
import {
  createGame,
  EQUIP_BACK,
  EQUIP_WAIST,
  hitboxAt,
  Inventory,
  skipTime,
  START_SLOTS,
  stationNear,
  step,
  STATION_BOXES,
  type GameState,
} from '@verdant/sim';
import {
  emptyIntent,
  Feature,
  isFeatureSolid,
  RECIPES,
  Resource,
  Station,
  STATION_RANGE,
  Terrain,
  toolStats,
  Wear,
  type Intent,
} from '@verdant/shared';

/**
 * La tanda 2 de fabricacion: mesa, horno, metales y ropa. Decisiones del autor
 * (2026-09-29): la estacion se coloca con USAR llevandola en la mano, USAR
 * mirandola la abre siempre, sus recetas solo sirven a menos de 3 casillas, y
 * la ropa abre casillas que no se pueden cerrar llenas.
 */

const recipeOf = (item: Resource) => RECIPES.findIndex((r) => r.output === item);

/** El jugador en su nacimiento, en el centro de su casilla y con todo despejado. */
function atSpawn(seed = 12345): { state: GameState; tx: number; ty: number } {
  const state = createGame(seed);
  const e = state.entities;
  const id = state.playerId;
  const tx = Math.floor(e.x[id]);
  const ty = Math.floor(e.y[id]);
  e.x[id] = tx + 0.5;
  e.y[id] = ty + 0.5;
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) state.world.setFeature(tx + dx, ty + dy, Feature.None);
  }
  return { state, tx, ty };
}

function act(state: GameState, over: Partial<Intent>): void {
  step(state, { ...emptyIntent(), ...over });
}

/** Mirar hacia `(dx, dy)` bajando `down` grados, y usar. */
function use(state: GameState, dx: number, dy: number, down: number): void {
  act(state, { use: true, aimX: dx, aimY: dy, aimZ: Math.sin((-down * Math.PI) / 180) });
}

/** Un golpe hacia `(dx, dy)` bajando `down` grados. */
function hit(state: GameState, dx: number, dy: number, down: number): void {
  act(state, { harvest: true, aimX: dx, aimY: dy, aimZ: Math.sin((-down * Math.PI) / 180) });
}

/** Pone una mesa en la mano (casilla 0) y la coloca en la casilla de al lado. */
function placeWorkbench(state: GameState): void {
  state.inventory.add(Resource.Workbench, 1);
  use(state, 1, 0, 60);
}

describe('Colocar una estacion', () => {
  it('con USAR y la estacion en la mano, donde la mirada toca el suelo', () => {
    const { state, tx, ty } = atSpawn();
    placeWorkbench(state);
    expect(state.lastUsed).toBe('placed');
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.Workbench);
    expect(state.inventory.count(Resource.Workbench)).toBe(0);
  });

  it('estorba el paso', () => {
    expect(isFeatureSolid(Feature.Workbench)).toBe(true);
    expect(isFeatureSolid(Feature.Furnace)).toBe(true);
    const { state, tx, ty } = atSpawn();
    placeWorkbench(state);
    const id = state.playerId;
    for (let i = 0; i < 60; i++) act(state, { moveX: 1 });
    // El cuerpo se para contra la cara de la mesa, sin entrar en su casilla.
    expect(state.entities.x[id]).toBeLessThan(tx + 1);
    expect(Math.floor(state.entities.y[id])).toBe(ty);
  });

  it('no se coloca en una casilla ocupada ni sobre el propio cuerpo', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 1, ty, Feature.Pebbles);
    placeWorkbench(state);
    expect(state.lastUsed).toBeNull();
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.Pebbles);
    expect(state.inventory.count(Resource.Workbench)).toBe(1);

    // Mirando a los pies: la casilla que se pisa.
    state.world.setFeature(tx + 1, ty, Feature.None);
    use(state, 1, 0, 89);
    expect(state.world.featureAt(tx, ty)).toBe(Feature.None);
    expect(state.inventory.count(Resource.Workbench)).toBe(1);
  });

  it('no se coloca en el agua', () => {
    for (const seed of [12345, 999, 4242, 31337, 7]) {
      const { state, tx, ty } = atSpawn(seed);
      const w = state.world;
      for (let dy = -30; dy <= 30; dy++) {
        for (let dx = -30; dx <= 30; dx++) {
          const x = tx + dx;
          const y = ty + dy;
          if (w.terrainAt(x, y) !== Terrain.Water || w.isSolidAt(x - 1, y)) continue;
          const id = state.playerId;
          state.entities.x[id] = x - 0.5;
          state.entities.y[id] = y + 0.5;
          state.entities.z[id] = w.groundHeightAt(x - 0.5, y + 0.5);
          state.inventory.add(Resource.Workbench, 1);
          use(state, 1, 0, 60);
          expect(w.featureAt(x, y)).toBe(Feature.None);
          expect(state.inventory.count(Resource.Workbench)).toBe(1);
          return;
        }
      }
    }
    throw new Error('ninguna semilla tiene agua cerca del nacimiento');
  });

  it('no se coloca en un talud', () => {
    // Un talud cualquiera cerca del nacimiento de alguna semilla.
    for (const seed of [12345, 999, 4242, 31337, 7]) {
      const { state, tx, ty } = atSpawn(seed);
      const w = state.world;
      for (let dy = -20; dy <= 20; dy++) {
        for (let dx = -20; dx <= 20; dx++) {
          const x = tx + dx;
          const y = ty + dy;
          if (w.rampDirAt(x, y) < 0 || w.terrainAt(x, y) === Terrain.Water) continue;
          // Se pone al jugador a una casilla del talud, mirandolo.
          const id = state.playerId;
          state.entities.x[id] = x - 0.5;
          state.entities.y[id] = y + 0.5;
          state.entities.z[id] = w.groundHeightAt(x - 0.5, y + 0.5);
          w.setFeature(x, y, Feature.None);
          state.inventory.add(Resource.Workbench, 1);
          use(state, 1, 0, 60);
          expect(w.featureAt(x, y)).not.toBe(Feature.Workbench);
          return;
        }
      }
    }
    throw new Error('ninguna semilla tiene un talud cerca del nacimiento');
  });
});

describe('Desmontar una estacion', () => {
  it('a mano, en 3 golpes, y vuelve al inventario entera', () => {
    const { state, tx, ty } = atSpawn();
    placeWorkbench(state);
    hit(state, 1, 0, 30);
    hit(state, 1, 0, 30);
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.Workbench);
    hit(state, 1, 0, 30);
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.None);
    expect(state.inventory.count(Resource.Workbench)).toBe(1);
  });

  it('con el inventario lleno se queda donde esta', () => {
    const { state, tx, ty } = atSpawn();
    placeWorkbench(state);
    state.inventory.add(Resource.Wood, 100 * START_SLOTS);
    for (let i = 0; i < 5; i++) hit(state, 1, 0, 30);
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.Workbench);
    expect(state.lastBlocked).toBe('full');
  });

  it('su hitbox ocupa la casilla entera, con el alto de su estacion', () => {
    const { state, tx, ty } = atSpawn();
    placeWorkbench(state);
    const box = hitboxAt(state.world, tx + 1, ty)!;
    expect(box.x1 - box.x0).toBeCloseTo(1);
    expect(box.z1 - box.z0).toBeCloseTo(STATION_BOXES[Station.Workbench].height);
  });
});

describe('Abrir una estacion', () => {
  it('USAR mirandola la abre, aunque se lleven bayas en la mano', () => {
    const { state, tx, ty } = atSpawn();
    placeWorkbench(state);
    state.inventory.add(Resource.Berries, 5);
    state.entities.hunger[state.playerId] = 50;
    use(state, 1, 0, 30);
    expect(state.lastUsed).toBe('opened');
    expect(state.lastOpened).toEqual({ station: Station.Workbench, x: tx + 1, y: ty });
    expect(state.inventory.count(Resource.Berries)).toBe(5);

    // Sin mirarla, las bayas se comen.
    use(state, -1, 0, 30);
    expect(state.lastUsed).toBe('ate');
    expect(state.lastOpened).toBeNull();
  });

  it('solo se abre lo que se mira: lo de detras de otra cosa no', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 2, ty, Feature.Workbench);
    state.world.setFeature(tx + 1, ty, Feature.RockNode);
    // Sin la roca, esta mirada abre la mesa: la prueba no pasa por mirar mal.
    use(state, 1, 0, 35);
    expect(state.lastUsed).not.toBe('opened');
    state.world.setFeature(tx + 1, ty, Feature.None);
    use(state, 1, 0, 35);
    expect(state.lastUsed).toBe('opened');
    state.world.setFeature(tx + 1, ty, Feature.RockNode);
    use(state, 1, 0, 35);
    expect(state.lastUsed).not.toBe('opened');
  });
});

describe('Fabricar junto a una estacion', () => {
  it('una receta de mesa pide la mesa a 3 casillas o menos', () => {
    const { state, tx, ty } = atSpawn();
    const axe = recipeOf(Resource.CopperAxe);
    const give = () => {
      state.inventory.add(Resource.Branch, 2);
      state.inventory.add(Resource.CopperIngot, 3);
    };
    give();
    act(state, { craft: axe });
    expect(state.lastCrafted).toBe(-1);

    state.world.setFeature(tx + 3, ty, Feature.Workbench);
    // Del centro del jugador al centro de la mesa, exactamente 3: vale.
    expect(stationNear(state.world, tx + 0.5, ty + 0.5, Station.Workbench)).toBe(true);
    act(state, { craft: axe });
    expect(state.lastCrafted).toBe(axe);
    expect(state.inventory.count(Resource.CopperAxe)).toBe(1);

    // Un pelo mas lejos, ya no.
    expect(stationNear(state.world, tx + 0.5 - 0.01, ty + 0.5, Station.Workbench)).toBe(false);
    // Y el horno no sirve de mesa.
    state.world.setFeature(tx + 3, ty, Feature.Furnace);
    give();
    act(state, { craft: axe });
    expect(state.lastCrafted).toBe(-1);
    expect(STATION_RANGE).toBe(3);
  });

  it('fundir es una receta mas del horno, instantanea', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 2, ty, Feature.Furnace);
    state.inventory.add(Resource.Copper, 2);
    state.inventory.add(Resource.Coal, 1);
    act(state, { craft: recipeOf(Resource.CopperIngot) });
    expect(state.inventory.count(Resource.CopperIngot)).toBe(1);
    expect(state.inventory.count(Resource.Copper)).toBe(0);
    expect(state.inventory.count(Resource.Coal)).toBe(0);
  });

  it('las recetas de estacion no se ven en el inventario: son de su estacion', () => {
    for (const r of RECIPES) {
      if (r.output === Resource.Workbench || r.output === Resource.Furnace) expect(r.station).toBe(Station.Hand);
      if (r.output === Resource.CopperIngot || r.output === Resource.IronIngot) expect(r.station).toBe(Station.Furnace);
      if (toolStats(r.output) && toolStats(r.output)!.tier > 1) expect(r.station).toBe(Station.Workbench);
    }
  });
});

describe('Las herramientas de metal', () => {
  it('el pico de cobre mina hierro; el de hierro, mas deprisa', () => {
    const { state, tx, ty } = atSpawn();
    const inv = state.inventory;
    const mine = (pick: Resource): number => {
      inv.discard(0);
      inv.add(pick, 1);
      act(state, { select: 0 });
      state.world.setFeature(tx + 1, ty, Feature.IronNode);
      for (let hits = 1; hits <= 10; hits++) {
        hit(state, 1, 0, 30);
        if (state.world.featureAt(tx + 1, ty) === Feature.None) return hits;
      }
      return Infinity;
    };
    expect(mine(Resource.StonePickaxe)).toBe(Infinity);
    expect(mine(Resource.CopperPickaxe)).toBe(3);
    expect(mine(Resource.IronPickaxe)).toBe(2);
    expect(inv.count(Resource.Iron)).toBeGreaterThan(0);
  });

  it('cobre: poder 2 y 120 usos; hierro: poder 3 y 250', () => {
    expect(toolStats(Resource.CopperAxe)).toMatchObject({ power: 2, uses: 120 });
    expect(toolStats(Resource.CopperPickaxe)).toMatchObject({ power: 2, uses: 120 });
    expect(toolStats(Resource.IronAxe)).toMatchObject({ power: 3, uses: 250 });
    expect(toolStats(Resource.IronPickaxe)).toMatchObject({ power: 3, uses: 250 });
  });
});

describe('La ropa', () => {
  it('la bolsa abre 2 casillas y la mochila 6, cada una en su hueco', () => {
    const inv = new Inventory();
    inv.add(Resource.FiberBag, 1);
    inv.add(Resource.FrameBackpack, 1);
    expect(inv.openSlots()).toBe(16);
    // La prenda equivocada no entra en el hueco.
    inv.move(0, EQUIP_BACK);
    expect(inv.worn[Wear.Back]).toBeNull();
    inv.move(0, EQUIP_WAIST);
    expect(inv.worn[Wear.Waist]).toBe(Resource.FiberBag);
    expect(inv.openSlots()).toBe(18);
    inv.move(1, EQUIP_BACK);
    expect(inv.worn[Wear.Back]).toBe(Resource.FrameBackpack);
    expect(inv.openSlots()).toBe(24);
    // Lo puesto cuenta en los totales, no en lo que se gasta.
    expect(inv.totals()[Resource.FiberBag]).toBe(1);
    expect(inv.count(Resource.FiberBag)).toBe(0);
  });

  it('sin la prenda su tramo no existe: no se llena ni se arrastra a el', () => {
    const inv = new Inventory();
    expect(inv.add(Resource.Wood, 100 * START_SLOTS)).toBe(true);
    expect(inv.add(Resource.Wood, 1)).toBe(false);
    expect(inv.fits([{ item: Resource.Stone, count: 1 }])).toBe(false);
    inv.move(0, START_SLOTS);
    expect(inv.itemAt(START_SLOTS)).toBeNull();
  });

  it('no se quita una prenda con sus casillas ocupadas', () => {
    const inv = new Inventory();
    inv.add(Resource.FrameBackpack, 1);
    inv.move(0, EQUIP_BACK);
    inv.add(Resource.Wood, 100 * START_SLOTS + 1);
    const [a] = inv.rangeOf(Wear.Back);
    expect(inv.itemAt(a)).toBe(Resource.Wood);
    inv.discard(3);
    inv.move(EQUIP_BACK, 3);
    expect(inv.worn[Wear.Back]).toBe(Resource.FrameBackpack);
    inv.discard(EQUIP_BACK);
    expect(inv.worn[Wear.Back]).toBe(Resource.FrameBackpack);

    // Con el tramo vacio si, a una casilla vacia de fuera del tramo.
    inv.discard(a);
    inv.move(EQUIP_BACK, a);
    expect(inv.worn[Wear.Back]).toBe(Resource.FrameBackpack);
    inv.move(EQUIP_BACK, 3);
    expect(inv.worn[Wear.Back]).toBeNull();
    expect(inv.itemAt(3)).toBe(Resource.FrameBackpack);
    expect(inv.openSlots()).toBe(16);
  });
});

describe('La partida de la tanda 2', () => {
  it('de la mesa y el horno a los lingotes, al hierro y a la mochila', () => {
    const { state, tx, ty } = atSpawn();
    const inv = state.inventory;
    const craft = (item: Resource) => {
      act(state, { craft: recipeOf(item) });
      expect(state.lastCrafted).toBe(recipeOf(item));
    };
    inv.add(Resource.Wood, 12);
    inv.add(Resource.Stone, 10);
    inv.add(Resource.Coal, 2 + 5 + 4);
    inv.add(Resource.Copper, 2 * 5);
    inv.add(Resource.Iron, 2 * 2);
    inv.add(Resource.Branch, 6);
    inv.add(Resource.Fiber, 18);

    // Mesa y horno, a mano.
    craft(Resource.Workbench);
    craft(Resource.Furnace);
    const toHand = (item: Resource) => {
      for (let i = 0; i < inv.size; i++) {
        if (inv.itemAt(i) !== item) continue;
        if (i !== 0) act(state, { moveFrom: i, moveTo: 0 });
        break;
      }
      act(state, { select: 0 });
      expect(inv.inHand()).toBe(item);
    };
    toHand(Resource.Workbench);
    use(state, 1, 0, 60);
    toHand(Resource.Furnace);
    use(state, -1, 0, 60);
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.Workbench);
    expect(state.world.featureAt(tx - 1, ty)).toBe(Feature.Furnace);

    // Fundir: 5 lingotes de cobre (3 para el pico y 2 para la mochila) y 2 de
    // hierro... que no bastan para el pico de hierro, que pide 3.
    for (let i = 0; i < 5; i++) craft(Resource.CopperIngot);
    craft(Resource.IronIngot);
    craft(Resource.IronIngot);
    expect(inv.count(Resource.CopperIngot)).toBe(5);
    expect(inv.count(Resource.IronIngot)).toBe(2);

    craft(Resource.CopperPickaxe);
    craft(Resource.FiberBag);
    craft(Resource.FrameBackpack);
    act(state, { craft: recipeOf(Resource.IronPickaxe) });
    expect(state.lastCrafted).toBe(-1);

    // Vestirse: 24 casillas.
    const slotOf = (item: Resource) => {
      for (let i = 0; i < inv.size; i++) if (inv.itemAt(i) === item) return i;
      return -1;
    };
    act(state, { moveFrom: slotOf(Resource.FiberBag), moveTo: EQUIP_WAIST });
    act(state, { moveFrom: slotOf(Resource.FrameBackpack), moveTo: EQUIP_BACK });
    expect(inv.openSlots()).toBe(24);

    // Y con el pico de cobre, hierro.
    toHand(Resource.CopperPickaxe);
    state.world.setFeature(tx, ty + 1, Feature.IronNode);
    for (let i = 0; i < 3; i++) hit(state, 0, 1, 30);
    expect(state.world.featureAt(tx, ty + 1)).toBe(Feature.None);
    expect(inv.count(Resource.Iron)).toBeGreaterThan(0);
  });

  it('las estaciones no son vida y no las toca el paso del ecosistema', () => {
    const { state, tx, ty } = atSpawn();
    placeWorkbench(state);
    skipTime(state, 60 * 60 * 30);
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.Workbench);
  });
});
