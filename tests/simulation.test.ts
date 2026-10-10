import { describe, expect, it } from 'vitest';
import {
  BODY_RADIUS,
  createGame,
  EntityKind,
  EntityStore,
  HUNGER_DECAY_PER_SEC,
  HUNGER_EMPTY_DAYS,
  JUMP_HUNGER,
  hitboxAt,
  Inventory,
  targetTile,
  treeTrunkAt,
  moveEntity,
  RUN_MULTIPLIER,
  INERTIA_TIME,
  RUN_SPEED,
  skipTime,
  step,
  tryHarvestArea,
  tryPlant,
  WALK_SPEED,
  WorkState,
  World,
} from '@verdant/sim';
import {
  DAY_TICKS,
  emptyIntent,
  Feature,
  LifeKind,
  lifeKindOf,
  Resource,
  TICK_DT,
  TICK_HZ,
  type Intent,
} from '@verdant/shared';

function intent(over: Partial<Intent> = {}): Intent {
  return { ...emptyIntent(), ...over };
}

function runTicks(state: ReturnType<typeof createGame>, n: number, i: Intent): void {
  for (let k = 0; k < n; k++) step(state, i);
}

/**
 * Centro de una zona `2·half+1` sin nada solido y **toda al mismo nivel**.
 *
 * Lo del nivel se anadio con la fisica de altura: ahora una pared detiene el
 * paso, asi que medir velocidades sobre relieve mediria ademas contra que se
 * choca. Es la misma razon por la que esto no se mide en el navegador.
 */
function flatOpenSpot(world: World, half = 3): { x: number; y: number } {
  for (let radius = 0; radius < 240; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        let clear = true;
        const level = world.flatTopAt(dx, dy);
        for (let ty = -half; ty <= half && clear; ty++) {
          for (let tx = -half; tx <= half; tx++) {
            if (level === null || world.isSolidAt(dx + tx, dy + ty) || world.flatTopAt(dx + tx, dy + ty) !== level) {
              clear = false;
              break;
            }
          }
        }
        if (clear) return { x: dx + 0.5, y: dy + 0.5 };
      }
    }
  }
  throw new Error('no se encontro una zona llana y abierta en el mundo de prueba');
}

/** Planta al jugador en un sitio concreto, con los pies en su suelo. */
function placePlayer(state: ReturnType<typeof createGame>, at: { x: number; y: number }): void {
  const { entities, playerId, world } = state;
  entities.x[playerId] = at.x;
  entities.y[playerId] = at.y;
  entities.z[playerId] = world.groundHeightAt(at.x, at.y);
}

describe('simulacion', () => {
  it('el jugador aparece en un tile transitable', () => {
    for (const seed of [1, 2, 3, 100, 9999]) {
      const state = createGame(seed);
      const px = state.entities.x[state.playerId];
      const py = state.entities.y[state.playerId];
      expect(state.world.isSolidAt(Math.floor(px), Math.floor(py))).toBe(false);
      expect(state.entities.kind[state.playerId]).toBe(EntityKind.Player);
    }
  });

  it('el hambre baja con el tiempo al ritmo esperado', () => {
    const state = createGame(42);
    const before = state.entities.hunger[state.playerId];
    runTicks(state, TICK_HZ * 10, intent());
    const after = state.entities.hunger[state.playerId];
    const expected = before - HUNGER_DECAY_PER_SEC * 10;
    // Tolerancia holgada a proposito: hunger vive en un Float32Array y acumular
    // 600 restas en precision simple deriva unas milesimas. Sigue siendo
    // determinista (float32 esta definido por IEEE-754), solo que no coincide
    // con la aritmetica en float64 del valor esperado.
    expect(after).toBeCloseTo(expected, 2);
  });

  it('sin comer, el hambre llega a cero y entonces cae la salud', () => {
    const state = createGame(42);
    // `HUNGER_EMPTY_DAYS` dias vacian el hambre; veinte segundos mas, y se
    // pasa hambre de verdad.
    runTicks(state, HUNGER_EMPTY_DAYS * DAY_TICKS + TICK_HZ * 20, intent());
    expect(state.entities.hunger[state.playerId]).toBe(0);
    expect(state.entities.health[state.playerId]).toBeLessThan(100);
  });

  it('el jugador muere si la salud llega a cero', () => {
    const state = createGame(42);
    // Lo que tarda en vaciarse el hambre, y 50 s de hambre para vaciar la salud.
    runTicks(state, HUNGER_EMPTY_DAYS * DAY_TICKS + TICK_HZ * 60, intent());
    expect(state.entities.health[state.playerId]).toBe(0);
    expect(state.entities.alive[state.playerId]).toBe(0);
  });

  it('el movimiento cambia la posicion y nunca atraviesa solidos', () => {
    const state = createGame(7);
    const startX = state.entities.x[state.playerId];
    runTicks(state, 120, intent({ moveX: 1 }));
    expect(state.entities.x[state.playerId]).toBeGreaterThan(startX);

    // En ningun momento el cuerpo debe solapar un tile solido.
    const px = state.entities.x[state.playerId];
    const py = state.entities.y[state.playerId];
    for (const [dx, dy] of [
      [-BODY_RADIUS, -BODY_RADIUS],
      [BODY_RADIUS, -BODY_RADIUS],
      [-BODY_RADIUS, BODY_RADIUS],
      [BODY_RADIUS, BODY_RADIUS],
    ]) {
      expect(state.world.isSolidAt(Math.floor(px + dx), Math.floor(py + dy))).toBe(false);
    }
  });

  it('la diagonal no es mas rapida que la ortogonal', () => {
    // En zona llana y despejada: desde que el relieve estorba, arrancar donde
    // caiga mediria contra que se choca cada uno, no su velocidad.
    const a = createGame(31);
    const b = createGame(31);
    const spot = flatOpenSpot(a.world, 5);
    placePlayer(a, spot);
    placePlayer(b, spot);

    runTicks(a, 30, intent({ moveX: 1 }));
    runTicks(b, 30, intent({ moveX: 1, moveY: 1 }));

    const moveA = Math.hypot(a.entities.x[a.playerId] - spot.x, a.entities.y[a.playerId] - spot.y);
    const moveB = Math.hypot(b.entities.x[b.playerId] - spot.x, b.entities.y[b.playerId] - spot.y);
    expect(moveA).toBeGreaterThan(0);
    expect(moveB).toBeLessThanOrEqual(moveA + 1e-9);
  });

  it('recolectar un arbol da madera y vacia el tile', () => {
    const world = new World(1234);
    // Buscamos un arbol concreto en el mundo generado.
    let found: { x: number; y: number } | null = null;
    for (let y = -60; y < 60 && !found; y++) {
      for (let x = -60; x < 60; x++) {
        if (lifeKindOf(world.featureAt(x, y)) === LifeKind.Tree) {
          found = { x, y };
          break;
        }
      }
    }
    expect(found).not.toBeNull();

    const inventory = new Int32Array(3);
    const before = world.featureAt(found!.x, found!.y);
    expect(lifeKindOf(before)).toBe(LifeKind.Tree);

    world.setFeature(found!.x, found!.y, Feature.None);
    inventory[Resource.Wood] += 3;

    expect(world.featureAt(found!.x, found!.y)).toBe(Feature.None);
    expect(inventory[Resource.Wood]).toBe(3);
  });

  it('las mutaciones sobreviven al descarte y regeneracion del chunk', () => {
    // Esta es la razon de existir del overlay de mutaciones: si el chunk se
    // descarta y se vuelve a generar, lo que el jugador cambio debe seguir ahi.
    const world = new World(555);
    let tree: { x: number; y: number } | null = null;
    for (let y = 0; y < 80 && !tree; y++) {
      for (let x = 0; x < 80; x++) {
        if (lifeKindOf(world.featureAt(x, y)) === LifeKind.Tree) {
          tree = { x, y };
          break;
        }
      }
    }
    expect(tree).not.toBeNull();

    world.setFeature(tree!.x, tree!.y, Feature.None);
    world.pruneFar(100000, 100000, 1); // descarta todo
    expect(world.loadedChunkCount).toBe(0);

    expect(world.featureAt(tree!.x, tree!.y)).toBe(Feature.None);
  });

  it('el streaming mantiene acotada la memoria al caminar lejos', () => {
    const state = createGame(11);
    runTicks(state, TICK_HZ * 40, intent({ moveX: 1 }));
    const maxChunks = (2 * 5 + 1) ** 2; // radio de descarte
    expect(state.world.loadedChunkCount).toBeLessThanOrEqual(maxChunks);
  });
});

/**
 * Dos velocidades y nada entre medias.
 *
 * Esto sustituye a los tests del movimiento ANALOGICO, que afirmaban justo lo
 * contrario: que media deflexion del joystick recorria media distancia. El autor
 * lo cambio al pedir la carrera —«el mando apunta, el interruptor decide la
 * velocidad»—, asi que lo que antes era la regla es ahora el fallo, y se afirma
 * al reves. La zona muerta del joystick no vive aqui sino en el cliente
 * (`STICK_DEAD` en `packages/client/src/gestures.ts`):
 * el nucleo solo ve direcciones.
 */
describe('marcha y carrera', () => {
  /** Distancia recorrida en `ticks` empujando con el vector dado. */
  function travel(moveX: number, moveY: number, running = false, ticks = 30): number {
    const world = new World(2468);
    const spot = flatOpenSpot(world);
    const store = new EntityStore(4);
    const id = store.spawn(EntityKind.Player, spot.x, spot.y);
    // Los pies, a la altura del suelo: sin esto el cuerpo esta por debajo del
    // terreno y no puede entrar en ninguna casilla, ni siquiera la de al lado.
    store.z[id] = world.groundHeightAt(spot.x, spot.y);
    for (let i = 0; i < ticks; i++) {
      moveEntity(world, store, id, moveX, moveY, TICK_DT, running);
    }
    return Math.hypot(store.x[id] - spot.x, store.y[id] - spot.y);
  }

  it('la magnitud del mando ya NO cambia la velocidad', () => {
    const full = travel(1, 0);
    expect(full).toBeGreaterThan(0);
    // Media deflexion, un cuarto o el triple: todas andan lo mismo.
    for (const magnitude of [0.25, 0.4, 0.5, 0.75, 3]) {
      expect(travel(magnitude, 0), `magnitud ${magnitude}`).toBeCloseTo(full, 6);
    }
  });

  it('correr recorre mas que andar, y justo lo que dice el multiplicador', () => {
    const andando = travel(1, 0);
    const corriendo = travel(1, 0, true);
    expect(corriendo).toBeGreaterThan(andando);
    expect(corriendo / andando).toBeCloseTo(RUN_MULTIPLIER, 6);
  });

  it('las velocidades son las dos constantes que las nombran, tras arrancar en 0,1 s', () => {
    const ticks = 30;
    // La inercia (el autor, 2026-10-10): el arranque sube la velocidad a ritmo
    // constante durante `INERTIA_TIME`, n ticks, y cuesta (n − 1) / 2 ticks de
    // paso; despues se anda a la velocidad que nombra la constante.
    const n = Math.round(INERTIA_TIME / TICK_DT);
    const lost = (n - 1) / 2;
    expect(travel(1, 0, false, ticks)).toBeCloseTo(WALK_SPEED * (ticks - lost) * TICK_DT, 6);
    expect(travel(1, 0, true, ticks)).toBeCloseTo(RUN_SPEED * (ticks - lost) * TICK_DT, 6);
  });

  it('el teclado sigue recorriendo lo mismo en diagonal que en ortogonal', () => {
    expect(travel(0, 1)).toBeCloseTo(travel(1, 0), 6);
    expect(travel(-1, -1)).toBeCloseTo(travel(1, 0), 6);
    // Y corriendo tambien: normalizar la direccion es previo a elegir velocidad.
    expect(travel(-1, -1, true)).toBeCloseTo(travel(1, 0, true), 6);
  });

  it('por debajo del umbral de ruido no hay movimiento', () => {
    expect(travel(1e-9, 0)).toBe(0);
    expect(travel(1e-9, 0, true)).toBe(0);
  });
});

/**
 * El interruptor de supervivencia de las herramientas de desarrollo.
 *
 * Sin el, las herramientas no sirven para lo que se hicieron: saltar un dia son
 * ocho minutos de mundo, o sea el hambre entera, y el personaje muere poco despues
 * de que se pueda observar nada del ecosistema.
 */
describe('Congelar la supervivencia', () => {
  it('con la supervivencia congelada, saltar un dia entero no gasta nada', () => {
    const state = createGame(31337);
    state.survivalFrozen = true;
    const hunger = state.entities.hunger[state.playerId];
    const health = state.entities.health[state.playerId];

    skipTime(state, DAY_TICKS);

    expect(state.entities.hunger[state.playerId]).toBe(hunger);
    expect(state.entities.health[state.playerId]).toBe(health);
    expect(state.entities.alive[state.playerId]).toBe(1);
    // El mundo si avanza: lo congelado es el personaje, no el tiempo.
    expect(state.tick).toBe(createGame(31337).tick + DAY_TICKS);
  });

  it('sin congelar, saltar lo que tarda en vaciarse el hambre y un dia mas mata', () => {
    const state = createGame(31337);
    skipTime(state, (HUNGER_EMPTY_DAYS + 1) * DAY_TICKS);

    // Es justo el comportamiento que hacia inservible el boton de +1 dia.
    expect(state.entities.hunger[state.playerId]).toBe(0);
    expect(state.entities.alive[state.playerId]).toBe(0);
  });

  it('el interruptor tambien congela el juego normal, no solo los saltos', () => {
    const state = createGame(31337);
    state.survivalFrozen = true;
    const hunger = state.entities.hunger[state.playerId];

    const idle = emptyIntent();
    for (let t = 0; t < TICK_HZ * 30; t++) step(state, idle);

    expect(state.entities.hunger[state.playerId]).toBe(hunger);
  });

  it('apagarlo devuelve el hambre a su ritmo de siempre', () => {
    const state = createGame(31337);
    state.survivalFrozen = true;
    const idle = emptyIntent();
    for (let t = 0; t < TICK_HZ * 30; t++) step(state, idle);

    state.survivalFrozen = false;
    const before = state.entities.hunger[state.playerId];
    for (let t = 0; t < TICK_HZ * 10; t++) step(state, idle);

    const lost = before - state.entities.hunger[state.playerId];
    // Con dos decimales: el hambre vive en un Float32Array y 600 restas
    // acumulan unas milesimas de error.
    expect(lost).toBeCloseTo(HUNGER_DECAY_PER_SEC * 10, 2);
  });
});

/**
 * El hambre gasta segun el esfuerzo (decision del autor, 2026-09-30): quieto o
 * andando se vacia en dos dias de juego (`HUNGER_EMPTY_DAYS`); corriendo y avanzando, por el mismo
 * factor que la velocidad; y cada salto que despega cuesta un 0,25 %.
 */
describe('El hambre segun el esfuerzo', () => {
  /**
   * Hambre perdida en `n` ticks con esa Intent, empezando llena y en una zona
   * llana y despejada: correr contra una pared o un escalon no es avanzar, y la
   * cuenta mediria contra que se choca.
   */
  function lost(seed: number, n: number, i: Intent): number {
    const state = createGame(seed);
    placeOnFlat(state);
    const before = state.entities.hunger[state.playerId];
    runTicks(state, n, i);
    return before - state.entities.hunger[state.playerId];
  }

  function placeOnFlat(state: ReturnType<typeof createGame>): void {
    const spot = flatOpenSpot(state.world);
    state.entities.x[state.playerId] = spot.x;
    state.entities.y[state.playerId] = spot.y;
    state.entities.z[state.playerId] = state.world.groundHeightAt(spot.x, spot.y);
  }

  it('quieto, el hambre llena se vacia en dos dias de juego', () => {
    // Se deriva de la duracion del dia: si cambia, el hambre la sigue.
    expect(HUNGER_EMPTY_DAYS).toBe(2);
    expect(HUNGER_DECAY_PER_SEC * HUNGER_EMPTY_DAYS * DAY_TICKS * TICK_DT).toBeCloseTo(100, 9);
    const state = createGame(42);
    runTicks(state, HUNGER_EMPTY_DAYS * DAY_TICKS - 60 * TICK_HZ, intent());
    // A un minuto del final queda justo un minuto de hambre, con la deriva de
    // 57.600 restas en float32 (unas centesimas).
    expect(state.entities.hunger[state.playerId]).toBeCloseTo(60 * HUNGER_DECAY_PER_SEC, 0);
    // Y al acabar, nada.
    runTicks(state, 60 * TICK_HZ, intent());
    expect(state.entities.hunger[state.playerId]).toBeLessThan(0.1);
  });

  it('andando se gasta como quieto', () => {
    const quieto = lost(42, 30, intent());
    const andando = lost(42, 30, intent({ moveX: 1 }));
    expect(andando).toBeCloseTo(quieto, 3);
  });

  it('corriendo y avanzando se gasta por el factor de la carrera', () => {
    // 20 ticks a la carrera son 1,4 casillas: caben en la zona despejada.
    const quieto = lost(42, 20, intent());
    const corriendo = lost(42, 20, intent({ moveX: 1, run: true }));
    expect(corriendo / quieto).toBeCloseTo(RUN_MULTIPLIER, 2);
  });

  it('con la carrera encendida pero quieto se gasta como quieto', () => {
    const quieto = lost(42, TICK_HZ * 10, intent());
    const encendida = lost(42, TICK_HZ * 10, intent({ run: true }));
    expect(encendida).toBeCloseTo(quieto, 5);
  });

  it('cada salto que despega cuesta un 0,25 % del hambre', () => {
    const state = createGame(42);
    const before = state.entities.hunger[state.playerId];
    step(state, intent({ jump: true }));
    const drain = HUNGER_DECAY_PER_SEC * TICK_DT;
    expect(before - state.entities.hunger[state.playerId]).toBeCloseTo(JUMP_HUNGER + drain, 4);
    expect(JUMP_HUNGER).toBe(0.25);
  });

  it('el auto salto cobra como un salto: contra una mesa, un 0,25 %', () => {
    // Una mesa delante (1 de alto, se sube de un salto) y andando hacia ella.
    const drainOf = (auto: boolean) => {
      const state = createGame(42);
      const tx = Math.floor(state.entities.x[state.playerId]);
      const ty = Math.floor(state.entities.y[state.playerId]);
      state.world.setFeature(tx + 1, ty, Feature.Workbench);
      const before = state.entities.hunger[state.playerId];
      let airborne = false;
      for (let t = 0; t < 30; t++) {
        step(state, intent({ moveX: 1, autoJump: auto }));
        if (!state.entities.grounded[state.playerId]) airborne = true;
      }
      return { lost: before - state.entities.hunger[state.playerId], airborne };
    };
    const con = drainOf(true);
    const sin = drainOf(false);
    expect(con.airborne).toBe(true);
    expect(sin.airborne).toBe(false);
    expect(con.lost - sin.lost).toBeCloseTo(JUMP_HUNGER, 3);
  });

  it('pulsar saltar en el aire no cobra nada', () => {
    const state = createGame(42);
    step(state, intent({ jump: true }));
    expect(state.entities.grounded[state.playerId]).toBe(0);
    const before = state.entities.hunger[state.playerId];
    step(state, intent({ jump: true }));
    const drain = HUNGER_DECAY_PER_SEC * TICK_DT;
    expect(before - state.entities.hunger[state.playerId]).toBeCloseTo(drain, 4);
  });

  it('con la supervivencia congelada, ni correr ni saltar gastan', () => {
    const state = createGame(42);
    state.survivalFrozen = true;
    const before = state.entities.hunger[state.playerId];
    runTicks(state, TICK_HZ * 3, intent({ moveX: 1, run: true, jump: true }));
    expect(state.entities.hunger[state.playerId]).toBe(before);
  });
});

/**
 * Apuntar con el cursor y accionar en area.
 *
 * La mirada viaja en la Intent, asi que estos tests la ejercitan por donde
 * entrara tambien desde la red: nadie escribe `facingX` a mano.
 */
describe('Mirada y golpe', () => {
  it('el apuntado de la Intent fija la mirada, con su inclinacion', () => {
    const state = createGame(31337);
    state.survivalFrozen = true;

    const aim = emptyIntent();
    aim.aimX = 1;
    aim.aimY = 0;
    aim.aimZ = -0.5;
    step(state, aim);
    expect(state.entities.facingX[state.playerId]).toBeCloseTo(1, 6);
    expect(state.entities.facingY[state.playerId]).toBeCloseTo(0, 6);
    expect(state.entities.lookZ[state.playerId]).toBeCloseTo(-0.5, 6);

    // Sin redondear a ocho direcciones: la mirada entra tal cual.
    aim.aimX = Math.cos(0.3);
    aim.aimY = Math.sin(0.3);
    step(state, aim);
    expect(state.entities.facingX[state.playerId]).toBeCloseTo(Math.cos(0.3), 6);
    expect(state.entities.facingY[state.playerId]).toBeCloseTo(Math.sin(0.3), 6);
  });

  it('el apuntado manda aunque se ande en otra direccion', () => {
    // Es el caso que motivo el cambio: andar hacia un lado mirando a otro.
    const state = createGame(31337);
    state.survivalFrozen = true;

    const intent = emptyIntent();
    intent.moveX = 1;
    intent.aimX = 0;
    intent.aimY = -1;
    step(state, intent);

    expect(state.entities.facingY[state.playerId]).toBeCloseTo(-1, 6);
    expect(state.entities.facingX[state.playerId]).toBeCloseTo(0, 6);
  });

  it('sin apuntado, la mirada sigue al movimiento', () => {
    // La regresion de lo que ya funcionaba: teclado solo y joystick en reposo.
    const state = createGame(31337);
    state.survivalFrozen = true;

    const intent = emptyIntent();
    intent.moveX = 1;
    for (let t = 0; t < 10; t++) step(state, intent);

    expect(state.entities.facingX[state.playerId]).toBeCloseTo(1, 6);
    expect(state.entities.facingY[state.playerId]).toBeCloseTo(0, 6);
  });

  /**
   * Un rellano llano de 3x3 alrededor de `(x, y)` en el mundo 2024, sin agua ni
   * escalones, con todo lo que tuviera quitado y el jugador en su centro, de pie
   * y mirando al este con esa inclinacion.
   */
  function onFlat(lookZ: number) {
    const world = new World(2024);
    world.setNow(0);
    for (let y = -60; y < 60; y++) {
      for (let x = -60; x < 60; x++) {
        const level = world.flatTopAt(x, y);
        if (level === null || level < 0) continue;
        let ok = true;
        for (let dy = -1; dy <= 1 && ok; dy++) {
          for (let dx = -1; dx <= 2 && ok; dx++) {
            ok = world.flatTopAt(x + dx, y + dy) === level;
          }
        }
        if (!ok) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 2; dx++) world.setFeature(x + dx, y + dy, Feature.None);
        }
        const store = new EntityStore(4);
        const id = store.spawn(EntityKind.Player, x + 0.5, y + 0.5);
        store.z[id] = world.groundHeightAt(x + 0.5, y + 0.5);
        store.facingX[id] = 1;
        store.facingY[id] = 0;
        store.lookZ[id] = lookZ;
        return { world, store, id, x, y };
      }
    }
    throw new Error('no hay un rellano llano');
  }
  const down = (deg: number) => Math.sin((-deg * Math.PI) / 180);

  it('recolectar se lleva todo lo que el golpe toca y suma el botin de todo', () => {
    const { world, store, id, x, y } = onFlat(down(45));
    const rocks = [
      { x: x + 1, y },
      { x: x + 1, y: y - 1 },
      { x: x + 1, y: y + 1 },
    ];
    for (const r of rocks) world.setFeature(r.x, r.y, Feature.RockNode);
    // Y una fuera de alcance, a tres casillas en recto: no cae.
    world.setFeature(x + 3, y, Feature.RockNode);

    // La roca pide pico y tres golpes (trabajo por golpes): los dos primeros
    // solo acumulan dano en las tres a la vez.
    const inventory = new Inventory();
    inventory.add(Resource.StonePickaxe, 1);
    const work = new WorkState();
    expect(tryHarvestArea(world, store, id, inventory, 0, work).results).toHaveLength(0);
    expect(tryHarvestArea(world, store, id, inventory, 1, work).results).toHaveLength(0);
    const { results } = tryHarvestArea(world, store, id, inventory, 2, work);

    expect(results).toHaveLength(3);
    for (const r of rocks) expect(world.featureAt(r.x, r.y)).toBe(Feature.None);
    expect(world.featureAt(x + 3, y)).toBe(Feature.RockNode);
    const reported = results.reduce((sum, r) => sum + r.amount + r.seeds, 0);
    expect(inventory.count(Resource.Stone)).toBe(reported);
    // Un uso por golpe que toca algo, alcance a una roca o a tres.
    expect(inventory.wear[0]).toBe(40 - 3);
  });

  it('del arbol se golpea el tronco que se dibuja, no la copa', () => {
    const at = onFlat(0);
    at.world.setFeature(at.x + 1, at.y, Feature.MeadowTree);
    // El hitbox es exactamente el tronco que dibuja el cliente.
    const box = hitboxAt(at.world, at.x + 1, at.y)!;
    const trunk = treeTrunkAt(at.world.seed, at.x + 1, at.y, Feature.MeadowTree)!;
    expect(box.z1 - box.z0).toBeCloseTo(trunk.bare, 9);
    expect(box.x1 - box.x0).toBeCloseTo(trunk.width, 9);

    // Mirando al frente, a la altura de los ojos, el tronco cae: cuatro golpes
    // de hacha.
    const axe = () => {
      const inv = new Inventory();
      inv.add(Resource.StoneAxe, 1);
      return inv;
    };
    const work = new WorkState();
    const inv = axe();
    for (let t = 0; t < 4; t++) tryHarvestArea(at.world, at.store, at.id, inv, t, work);
    expect(at.world.featureAt(at.x + 1, at.y)).toBe(Feature.None);

    // Mirando por encima del tronco, a la copa, no.
    const high = onFlat(Math.sin((60 * Math.PI) / 180));
    high.world.setFeature(high.x + 1, high.y, Feature.MeadowTree);
    const highWork = new WorkState();
    const highInv = axe();
    for (let t = 0; t < 4; t++) tryHarvestArea(high.world, high.store, high.id, highInv, t, highWork);
    expect(high.world.featureAt(high.x + 1, high.y)).toBe(Feature.MeadowTree);
  });

  it('sembrar va a la casilla donde la mirada toca el suelo, y solo a esa', () => {
    const { world, store, id, x, y } = onFlat(down(50));
    const inventory = new Inventory();
    inventory.add(Resource.TreeSeed, 3);
    inventory.add(Resource.PlantSeed, 3);
    expect(targetTile(world, store, id)).toEqual({ x: x + 1, y });
    const planted = tryPlant(world, store, id, inventory);

    // Puede no brotar si el terreno no sostiene ninguna especie; si brota, es
    // ahi, una sola, y gasta una semilla.
    if (planted !== null) {
      expect(world.featureAt(x + 1, y)).not.toBe(Feature.None);
      expect(world.featureAt(x + 1, y - 1)).toBe(Feature.None);
      expect(world.featureAt(x + 1, y + 1)).toBe(Feature.None);
      expect(world.featureAt(x, y)).toBe(Feature.None);
      expect(inventory.count(Resource.TreeSeed) + inventory.count(Resource.PlantSeed)).toBe(5);
    }

    // Mirando al frente la mirada no toca el suelo: no se siembra.
    store.lookZ[id] = 0;
    expect(targetTile(world, store, id)).toBeNull();
  });
});
