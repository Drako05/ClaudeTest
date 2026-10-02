import { describe, expect, it } from 'vitest';
import {
  createGame,
  EYE_HEIGHT,
  facingToward,
  EQUIP_BACK,
  EQUIP_WAIST,
  hitboxAt,
  Inventory,
  skipTime,
  START_SLOTS,
  stationNear,
  step,
  STATION_BOXES,
  STRIKE_RANGE,
  type GameState,
} from '@verdant/sim';
import {
  emptyIntent,
  Feature,
  isFeatureSolid,
  RECIPES,
  Resource,
  Station,
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

  it('su cara principal mira a quien la pone, desde cualquiera de los cuatro lados', () => {
    // Pedido del autor, 2026-10-02. 0 = +y, 1 = +x, 2 = -y, 3 = -x.
    const sides: Array<[number, number, number]> = [
      [1, 0, 3], // al este del jugador: el frente mira al oeste, hacia el
      [-1, 0, 1],
      [0, 1, 2],
      [0, -1, 0],
    ];
    for (const [dx, dy, facing] of sides) {
      const { state, tx, ty } = atSpawn();
      state.inventory.add(Resource.Workbench, 1);
      use(state, dx, dy, 60);
      expect(state.world.featureAt(tx + dx, ty + dy)).toBe(Feature.Workbench);
      expect(state.world.stationFacingAt(tx + dx, ty + dy)).toBe(facing);
    }
  });

  it('el lado que da al jugador: el eje en que esta mas lejos', () => {
    expect(facingToward(0, 0, 3.5, 1.2)).toBe(1);
    expect(facingToward(0, 0, -2.5, 0.9)).toBe(3);
    expect(facingToward(0, 0, 1.2, 4.5)).toBe(0);
    expect(facingToward(0, 0, 0.2, -3)).toBe(2);
  });

  it('estorba de lado, como una pared de su altura', () => {
    // No es un muro de arriba abajo: es suelo que se pisa (decision del autor,
    // 2026-09-30), y de lado estorba por la regla 21.
    expect(isFeatureSolid(Feature.Workbench)).toBe(false);
    expect(isFeatureSolid(Feature.Furnace)).toBe(false);
    const { state, tx, ty } = atSpawn();
    placeWorkbench(state);
    const id = state.playerId;
    for (let i = 0; i < 60; i++) act(state, { moveX: 1 });
    // Los pies se paran en el borde de la mesa, sin entrar en su casilla.
    expect(state.entities.x[id]).toBeLessThan(tx + 1);
    expect(state.entities.x[id]).toBeGreaterThan(tx + 0.9);
    expect(Math.floor(state.entities.y[id])).toBe(ty);
    expect(state.entities.z[id]).toBeCloseTo(state.world.groundHeightAt(tx + 0.5, ty + 0.5));
  });

  it('a la mesa se sube de un salto y se esta de pie encima', () => {
    const { state, tx, ty } = atSpawn();
    placeWorkbench(state);
    const id = state.playerId;
    const ground = state.world.groundHeightAt(tx + 0.5, ty + 0.5);
    // Pegado a su borde, salto en el sitio y, en el aire, un poco hacia ella:
    // a paso completo el salto pasaria por encima y caeria al otro lado.
    for (let i = 0; i < 20; i++) act(state, { moveX: 1 });
    act(state, { jump: true });
    for (let i = 0; i < 12; i++) act(state, { moveX: 1 });
    for (let i = 0; i < 40; i++) act(state, {});
    expect(Math.floor(state.entities.x[id])).toBe(tx + 1);
    expect(state.entities.grounded[id]).toBe(1);
    expect(state.entities.z[id]).toBeCloseTo(ground + 1);

    // Y si se desmonta la mesa que se pisa, se cae al suelo.
    state.world.setFeature(tx + 1, ty, Feature.None);
    for (let i = 0; i < 60; i++) act(state, {});
    expect(state.entities.z[id]).toBeCloseTo(ground);
  });

  it('al horno no se sube desde su mismo nivel: mide 1,25 y el salto llega a 1,16', () => {
    const { state, tx, ty } = atSpawn();
    state.inventory.add(Resource.Furnace, 1);
    use(state, 1, 0, 60);
    expect(state.world.featureAt(tx + 1, ty)).toBe(Feature.Furnace);
    const id = state.playerId;
    for (let i = 0; i < 20; i++) act(state, { moveX: 1 });
    for (let k = 0; k < 5; k++) {
      act(state, { moveX: 1, jump: true });
      for (let i = 0; i < 40; i++) act(state, { moveX: 1 });
    }
    expect(state.entities.x[id]).toBeLessThan(tx + 1);
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

  it('mirando a una pared, aparece delante de ella y se posa en su suelo', () => {
    // Un llano de dos casillas al pie de una pared de dos o mas bloques, hacia +x.
    for (const seed of [12345, 999, 4242, 31337, 7]) {
      const state = createGame(seed);
      const w = state.world;
      const id = state.playerId;
      const sx = Math.floor(state.entities.x[id]);
      const sy = Math.floor(state.entities.y[id]);
      for (let dy = -30; dy <= 30; dy++) {
        for (let dx = -30; dx <= 30; dx++) {
          const x = sx + dx;
          const y = sy + dy;
          const level = w.levelAt(x, y);
          if (level < 0 || w.levelAt(x + 1, y) !== level || w.levelAt(x + 2, y) < level + 2) continue;
          if (w.rampDirAt(x, y) >= 0 || w.rampDirAt(x + 1, y) >= 0) continue;
          w.setFeature(x, y, Feature.None);
          w.setFeature(x + 1, y, Feature.None);
          state.entities.x[id] = x + 0.5;
          state.entities.y[id] = y + 0.5;
          state.entities.z[id] = w.groundHeightAt(x + 0.5, y + 0.5);
          state.inventory.add(Resource.Workbench, 1);
          // Mirando casi de frente: la mirada toca la pared, no el suelo.
          use(state, 1, 0, 5);
          expect(state.lastUsed).toBe('placed');
          expect(w.featureAt(x + 1, y)).toBe(Feature.Workbench);
          // La mirada la toco en alto, y el cliente la deja caer desde ahi.
          expect(state.lastPlaced!.z).toBeGreaterThan(w.groundHeightAt(x + 1.5, y + 0.5) + 0.5);
          return;
        }
      }
    }
    throw new Error('ninguna semilla tiene una pared de dos bloques cerca del nacimiento');
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
    // Y se lleva su frente: la proxima que se ponga ahi mirara a quien la ponga.
    expect(state.world.stationFacingAt(tx + 1, ty)).toBeNull();
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
  it('una receta de mesa pide la mesa al alcance, medido hasta su cara', () => {
    // Decision del autor (2026-10-01): de los ojos al punto mas cercano de la
    // caja de la estacion, y la distancia es siempre la del alcance.
    const { state, tx, ty } = atSpawn();
    const axe = recipeOf(Resource.CopperAxe);
    const give = () => {
      state.inventory.add(Resource.Branch, 2);
      state.inventory.add(Resource.CopperIngot, 3);
    };
    give();
    act(state, { craft: axe });
    expect(state.lastCrafted).toBe(-1);

    state.world.setFeature(tx + 4, ty, Feature.Workbench);
    const box = hitboxAt(state.world, tx + 4, ty)!;
    const id = state.playerId;
    const boxes = (x: number, y: number) => hitboxAt(state.world, x, y);
    // Los ojos a la altura de siempre; lo que separa de la cara es horizontal
    // y vertical (los ojos van por encima de la mesa).
    const eyeZ = state.entities.z[id] + EYE_HEIGHT;
    const dz = Math.max(0, eyeZ - box.z1);
    const flat = Math.sqrt(STRIKE_RANGE * STRIKE_RANGE - dz * dz);
    const eyeAt = (gap: number) => ({ x: box.x0 - gap, y: ty + 0.5, z: eyeZ });
    expect(stationNear(state.world, eyeAt(flat - 0.01), Station.Workbench, boxes)).toBe(true);
    expect(stationNear(state.world, eyeAt(flat + 0.01), Station.Workbench, boxes)).toBe(false);

    // Y el nucleo acepta o no la receta con esa misma cuenta.
    state.entities.x[id] = box.x0 - (flat - 0.01);
    act(state, { craft: axe });
    expect(state.lastCrafted).toBe(axe);
    expect(state.inventory.count(Resource.CopperAxe)).toBe(1);
    give();
    state.entities.x[id] = box.x0 - (flat + 0.05);
    act(state, { craft: axe });
    expect(state.lastCrafted).toBe(-1);

    // Y el horno no sirve de mesa.
    state.entities.x[id] = box.x0 - 1;
    state.world.setFeature(tx + 4, ty, Feature.Furnace);
    act(state, { craft: axe });
    expect(state.lastCrafted).toBe(-1);
  });

  it('el horno, mas alto, tambien se mide hasta su caja', () => {
    const { state, tx, ty } = atSpawn();
    state.world.setFeature(tx + 4, ty, Feature.Furnace);
    const box = hitboxAt(state.world, tx + 4, ty)!;
    const boxes = (x: number, y: number) => hitboxAt(state.world, x, y);
    const eyeZ = state.entities.z[state.playerId] + EYE_HEIGHT;
    const dz = Math.max(0, eyeZ - box.z1);
    const flat = Math.sqrt(STRIKE_RANGE * STRIKE_RANGE - dz * dz);
    expect(box.z1 - box.z0).toBeCloseTo(1.25, 9);
    expect(stationNear(state.world, { x: box.x0 - flat + 0.01, y: ty + 0.5, z: eyeZ }, Station.Furnace, boxes)).toBe(true);
    expect(stationNear(state.world, { x: box.x0 - flat - 0.01, y: ty + 0.5, z: eyeZ }, Station.Furnace, boxes)).toBe(false);
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
