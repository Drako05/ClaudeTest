import { describe, expect, it } from 'vitest';
import {
  BODY_RADIUS,
  createGame,
  EYE_HEIGHT,
  facingToward,
  equipSlot,
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
  blocksBody,
  RECIPES,
  Resource,
  Station,
  Terrain,
  toolStats,
  Equip,
  EQUIP_COUNT,
  type Intent,
} from '@verdant/shared';

/**
 * La tanda 2 de fabricacion: mesa, horno, metales y ropa. Decisiones del autor
 * (2026-09-29): la estacion se coloca con USAR llevandola en la mano, USAR
 * mirandola la abre siempre, sus recetas solo sirven al alcance —de los ojos a
 * su caja, `stationNear`, desde el 2026-10-01; antes, 3 casillas a su centro—, y
 * la ropa abre casillas que no se pueden cerrar llenas. Desde el 2026-10-04 la
 * bolsa y la mochila van al Bolso, una sola, entre los catorce equipables, y
 * el Arma golpea a los animales (`Los equipables`).
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
    // Su caja choca y se pisa (decisiones del autor, 2026-09-30 y 2026-10-05):
    // de lado estorba por la regla 21, y encima se esta de pie.
    expect(blocksBody(Feature.Workbench)).toBe(true);
    expect(blocksBody(Feature.Furnace)).toBe(true);
    const { state, tx, ty } = atSpawn();
    placeWorkbench(state);
    const id = state.playerId;
    for (let i = 0; i < 60; i++) act(state, { moveX: 1 });
    // La huella se para al tocar la mesa (el autor, 2026-10-05): el centro
    // queda a `BODY_RADIUS` de su cara, no dentro de su casilla.
    expect(state.entities.x[id] + BODY_RADIUS).toBeLessThanOrEqual(tx + 1);
    expect(state.entities.x[id] + BODY_RADIUS).toBeGreaterThan(tx + 0.9);
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
    // Con voxeles, esas paredes solo las dan los salientes (regla 14), que son
    // escasos: hay que mirar lejos.
    for (const seed of [12345, 999, 4242, 31337, 7]) {
      const state = createGame(seed);
      const w = state.world;
      const id = state.playerId;
      const sx = Math.floor(state.entities.x[id]);
      const sy = Math.floor(state.entities.y[id]);
      for (let dy = -90; dy <= 90; dy++) {
        for (let dx = -90; dx <= 90; dx++) {
          const x = sx + dx;
          const y = sy + dy;
          const level = w.flatTopAt(x, y);
          const wall = w.flatTopAt(x + 2, y);
          if (level === null || level < 0 || w.flatTopAt(x + 1, y) !== level || wall === null || wall < level + 2) continue;
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

  it('sobre una casilla con escalon dentro, la estacion se apoya en lo mas alto; lo generado, en lo mas bajo', () => {
    // El autor (2026-10-06): lo que pone el jugador se queda sobre lo que toque;
    // lo generado va apoyado entero. Una caja centrada pisa las cuatro columnas
    // de 0,5 de su casilla.
    const { state, tx, ty } = atSpawn(7);
    const w = state.world;
    for (let dy = -40; dy <= 40; dy++) {
      for (let dx = -40; dx <= 40; dx++) {
        const x = tx + dx;
        const y = ty + dy;
        if (w.flatTopAt(x, y) !== null || w.terrainAt(x, y) === Terrain.Water) continue;
        const tops = [0, 1, 2, 3].map((s) => w.columnTop(x * 2 + (s % 2), y * 2 + Math.floor(s / 2)) / 2);
        w.setFeature(x, y, Feature.Workbench);
        expect(hitboxAt(w, x, y)!.z0).toBe(Math.max(...tops));
        w.setFeature(x, y, Feature.RockNode);
        expect(hitboxAt(w, x, y)!.z0).toBe(Math.min(...tops));
        return;
      }
    }
    throw new Error('no hay ninguna casilla con escalon dentro cerca del nacimiento');
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

describe('Los equipables', () => {
  const BAG = equipSlot(Equip.Bag);
  const WEAPON = equipSlot(Equip.Weapon);

  it('bolsa y mochila solo van al Bolso, una a la vez: abren 2 o 6 casillas', () => {
    const inv = new Inventory();
    inv.add(Resource.FiberBag, 1);
    inv.add(Resource.FrameBackpack, 1);
    expect(inv.openSlots()).toBe(16);
    // En ningun otro hueco: ni en el Cinturon, donde iba la bolsa, ni en el Arma.
    for (let e = 0 as Equip; e < EQUIP_COUNT; e++) {
      if (e === Equip.Bag) continue;
      inv.move(0, equipSlot(e));
      expect(inv.worn[e], `${e}`).toBeNull();
    }
    inv.move(0, BAG);
    expect(inv.worn[Equip.Bag]).toBe(Resource.FiberBag);
    expect(inv.openSlots()).toBe(18);
    // La mochila sobre la bolsa las intercambia (con el tramo vacio): 22, no 24.
    inv.move(1, BAG);
    expect(inv.worn[Equip.Bag]).toBe(Resource.FrameBackpack);
    expect(inv.itemAt(1)).toBe(Resource.FiberBag);
    expect(inv.openSlots()).toBe(22);
    // Lo puesto cuenta en los totales, no en lo que se gasta.
    expect(inv.totals()[Resource.FrameBackpack]).toBe(1);
    expect(inv.count(Resource.FrameBackpack)).toBe(0);
  });

  it('sin bolso su tramo no existe, y la bolsa solo abre sus 2 primeras', () => {
    const inv = new Inventory();
    expect(inv.add(Resource.Wood, 100 * START_SLOTS)).toBe(true);
    expect(inv.add(Resource.Wood, 1)).toBe(false);
    expect(inv.fits([{ item: Resource.Stone, count: 1 }])).toBe(false);
    inv.move(0, START_SLOTS);
    expect(inv.itemAt(START_SLOTS)).toBeNull();

    inv.discard(0);
    inv.add(Resource.FiberBag, 1);
    inv.move(0, BAG);
    // La casilla que dejo la bolsa, y las 2 suyas.
    expect(inv.add(Resource.Wood, 300)).toBe(true);
    expect(inv.add(Resource.Wood, 1)).toBe(false);
    expect(inv.isOpen(START_SLOTS + 1)).toBe(true);
    expect(inv.isOpen(START_SLOTS + 2)).toBe(false);
  });

  it('el bolso no se quita ni se cambia con sus casillas ocupadas', () => {
    const inv = new Inventory();
    inv.add(Resource.FrameBackpack, 1);
    inv.move(0, BAG);
    inv.add(Resource.Wood, 100 * START_SLOTS + 1);
    const [a] = inv.bagRange();
    expect(inv.itemAt(a)).toBe(Resource.Wood);
    inv.discard(3);
    inv.move(BAG, 3);
    expect(inv.worn[Equip.Bag]).toBe(Resource.FrameBackpack);
    inv.discard(BAG);
    expect(inv.worn[Equip.Bag]).toBe(Resource.FrameBackpack);
    // Tampoco se cambia por la bolsa: se cerrarian casillas llenas.
    inv.add(Resource.FiberBag, 1);
    inv.move(3, BAG);
    expect(inv.worn[Equip.Bag]).toBe(Resource.FrameBackpack);

    // Con el tramo vacio si, a una casilla de fuera del tramo.
    inv.discard(a);
    inv.move(BAG, a);
    expect(inv.worn[Equip.Bag]).toBe(Resource.FrameBackpack);
    inv.discard(4);
    inv.move(BAG, 4);
    expect(inv.worn[Equip.Bag]).toBeNull();
    expect(inv.itemAt(4)).toBe(Resource.FrameBackpack);
    expect(inv.openSlots()).toBe(16);
  });

  it('en el Arma solo entran armas, y conservan su desgaste al ponerlas y quitarlas', () => {
    const inv = new Inventory();
    inv.add(Resource.IronPickaxe, 1);
    inv.add(Resource.StoneDagger, 1);
    inv.add(Resource.IronSword, 1);
    inv.move(0, WEAPON);
    expect(inv.weapon()).toBeNull();
    // Gastado a mano, para ver que el desgaste viaja con el arma.
    inv.selected = 1;
    inv.wearHeld();
    inv.wearHeld();
    const left = toolStats(Resource.StoneDagger)!.uses - 2;
    expect(inv.wearAt(1)).toBe(left);
    inv.move(1, WEAPON);
    expect(inv.weapon()).toBe(Resource.StoneDagger);
    expect(inv.wearAt(WEAPON)).toBe(left);
    expect(inv.itemAt(1)).toBeNull();
    // La espada sobre el punal los intercambia, cada uno con sus usos.
    inv.move(2, WEAPON);
    expect(inv.weapon()).toBe(Resource.IronSword);
    expect(inv.wearAt(WEAPON)).toBe(toolStats(Resource.IronSword)!.uses);
    expect(inv.itemAt(2)).toBe(Resource.StoneDagger);
    expect(inv.wearAt(2)).toBe(left);
    // Y se quita a una casilla vacia con los suyos.
    inv.move(WEAPON, 1);
    expect(inv.weapon()).toBeNull();
    expect(inv.wearAt(1)).toBe(toolStats(Resource.IronSword)!.uses);
  });

  it('el arma equipada que se gasta del todo deja su hueco vacio', () => {
    const inv = new Inventory();
    inv.add(Resource.StoneDagger, 1);
    inv.move(0, WEAPON);
    const uses = toolStats(Resource.StoneDagger)!.uses;
    for (let i = 0; i < uses - 1; i++) expect(inv.wearWeapon()).toBe(false);
    expect(inv.wearWeapon()).toBe(true);
    expect(inv.weapon()).toBeNull();
    expect(inv.totals()[Resource.StoneDagger]).toBe(0);
  });

  it('las armas: punal a mano, espadas en la mesa, en su categoria', () => {
    const armas = RECIPES.filter((r) => r.category === 'Armas');
    expect(armas.map((r) => [r.output, r.station])).toEqual([
      [Resource.StoneDagger, Station.Hand],
      [Resource.CopperSword, Station.Workbench],
      [Resource.IronSword, Station.Workbench],
    ]);
    expect(armas.map((r) => toolStats(r.output)?.damage)).toEqual([15, 30, 45]);
    // Duran menos que la herramienta de su material (el autor).
    expect(toolStats(Resource.StoneDagger)!.uses).toBeLessThan(toolStats(Resource.StoneAxe)!.uses);
    expect(toolStats(Resource.CopperSword)!.uses).toBeLessThan(toolStats(Resource.CopperAxe)!.uses);
    expect(toolStats(Resource.IronSword)!.uses).toBeLessThan(toolStats(Resource.IronAxe)!.uses);
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

    // Ponerse la mochila: 22 casillas. La bolsa ya no cabe a la vez.
    const slotOf = (item: Resource) => {
      for (let i = 0; i < inv.size; i++) if (inv.itemAt(i) === item) return i;
      return -1;
    };
    act(state, { moveFrom: slotOf(Resource.FrameBackpack), moveTo: equipSlot(Equip.Bag) });
    expect(inv.openSlots()).toBe(22);

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
