/**
 * Gravedad, salto y caida.
 *
 * Lo que aqui se defiende es el enunciado literal del autor:
 *
 * > «desde la casilla 1 a altura 1, saltando y moviendose al norte, se sube al
 * > bloque 2 en altura 2; pero al bloque 3 en altura 2 no se llega — se estampa
 * > contra su cara y aterriza en el bloque 2, altura 1»
 *
 * Y lo que pidio esta tanda: **ya no se cambia de nivel andando**. Antes el
 * relieve solo se veia y se pasaba de un tile bajo a uno alto sin mas.
 *
 * El mundo de estas pruebas es un campo de alturas dado a mano. Es la unica
 * forma de afirmar el caso del autor tal cual: buscarlo en el mundo generado
 * seria echarlo a suertes, que es como esta prueba de humo paso tandas enteras
 * por el motivo equivocado.
 */

import { describe, expect, it } from 'vitest';
import { emptyIntent, TICK_DT } from '@verdant/shared';
import {
  AIR_CONTROL,
  applyVertical,
  createGame,
  EntityKind,
  EntityStore,
  GRAVITY,
  groundHeight,
  JUMP_SPEED,
  moveAirborne,
  moveEntity,
  skipTime,
  step,
  takeOff,
  WALK_SPEED,
  type World,
} from '@verdant/sim';

/**
 * Un mundo de alturas escrito a mano.
 *
 * Solo implementa lo que miran el movimiento y la vertical: la altura del suelo
 * y si un tile es solido. Se pasa como `World` porque es todo lo que necesitan;
 * si algun dia miran algo mas, esto dejara de compilar y sera el aviso.
 */
function heightField(
  levelAt: (x: number, y: number) => number,
  rampAt: (x: number, y: number) => number = () => -1,
): World {
  return {
    levelAt: (x: number, y: number) => levelAt(Math.floor(x), Math.floor(y)),
    groundHeightAt(wx: number, wy: number) {
      const tx = Math.floor(wx);
      const ty = Math.floor(wy);
      return groundHeight(levelAt(tx, ty), rampAt(tx, ty), wx - tx, wy - ty);
    },
    // Solo el agua detiene el paso (regla 9), y el agua es nivel negativo.
    isSolidAt: (x: number, y: number) => levelAt(Math.floor(x), Math.floor(y)) < 0,
  } as unknown as World;
}

interface Run {
  x: number;
  y: number;
  z: number;
  grounded: boolean;
  /** Altura maxima alcanzada, para poder afirmar el apice. */
  peak: number;
}

/**
 * Corre la simulacion del cuerpo unos ticks, con la misma bifurcacion que
 * `tick.ts`: en el suelo se anda, en el aire se corrige.
 */
function run(
  world: World,
  start: { x: number; y: number; z?: number },
  opts: { moveX?: number; moveY?: number; jump?: boolean; ticks: number },
): Run {
  const store = new EntityStore(4);
  const id = store.spawn(EntityKind.Player, start.x, start.y);
  store.z[id] = start.z ?? world.groundHeightAt(start.x, start.y);
  const moveX = opts.moveX ?? 0;
  const moveY = opts.moveY ?? 0;
  let peak = store.z[id];
  let haVolado = false;

  for (let t = 0; t < opts.ticks; t++) {
    if (store.grounded[id]) {
      // Se para al aterrizar: seguir andando despues falsearia el alcance del
      // salto, que es lo que varias de estas pruebas miden.
      if (haVolado) break;
      moveEntity(world, store, id, moveX, moveY, TICK_DT);
      // Solo el primer tick salta: mantener pulsado no encadena saltos.
      if (opts.jump && t === 0) takeOff(store, id);
    } else {
      haVolado = true;
      moveAirborne(world, store, id, moveX, moveY, TICK_DT);
    }
    applyVertical(world, store, id, TICK_DT);
    if (store.z[id] > peak) peak = store.z[id];
  }

  return { x: store.x[id], y: store.y[id], z: store.z[id], grounded: !!store.grounded[id], peak };
}

/** Ticks de sobra para que cualquier salto o caida de estas pruebas termine. */
const HASTA_QUE_CAIGA = 90;

describe('El enunciado del autor, como tabla', () => {
  // Norte es -Y. La casilla de partida es la fila 0 a altura 1; el resto del
  // mundo, a altura 1 salvo lo que cada caso levante.
  const desdeLaCasilla1 = { x: 0.5, y: 0.5 };

  it('el bloque de al lado a altura 2: se sube', () => {
    // Fila -1 (una casilla al norte) levantada a 2.
    const world = heightField((_x, y) => (y <= -1 ? 2 : 1));
    const out = run(world, desdeLaCasilla1, { moveY: -1, jump: true, ticks: HASTA_QUE_CAIGA });

    expect(out.grounded).toBe(true);
    expect(out.z).toBe(2);
    expect(Math.floor(out.y)).toBeLessThanOrEqual(-1);
  });

  it('el bloque a dos casillas a altura 2: se estampa y cae en el de altura 1', () => {
    // Fila -1 sigue a altura 1; la -2 sube a 2. Es la pared que no se alcanza.
    const world = heightField((_x, y) => (y <= -2 ? 2 : 1));
    const out = run(world, desdeLaCasilla1, { moveY: -1, jump: true, ticks: HASTA_QUE_CAIGA });

    expect(out.grounded).toBe(true);
    expect(out.z).toBe(1);
    // Aterriza en el bloque 2 —la casilla intermedia—, sin llegar a la de altura 2.
    expect(Math.floor(out.y)).toBe(-1);
  });

  it('el apice cae a una casilla y por encima de un bloque', () => {
    const llano = heightField(() => 1);
    const store = new EntityStore(4);
    const id = store.spawn(EntityKind.Player, 0.5, 0.5);
    store.z[id] = 1;

    let apice = 1;
    let xEnElApice = 0.5;
    let subiendo = true;
    for (let t = 0; t < HASTA_QUE_CAIGA && (subiendo || !store.grounded[id]); t++) {
      if (store.grounded[id]) {
        moveEntity(llano, store, id, 1, 0, TICK_DT);
        if (t === 0) takeOff(store, id);
      } else {
        moveAirborne(llano, store, id, 1, 0, TICK_DT);
      }
      applyVertical(llano, store, id, TICK_DT);
      if (store.z[id] > apice) {
        apice = store.z[id];
        xEnElApice = store.x[id];
      } else if (t > 0) {
        subiendo = false;
      }
    }

    // Sube mas de un bloque, que es lo que permite subirse a el.
    expect(apice - 1).toBeGreaterThan(1);
    // Y el apice cae a una casilla del origen, no a media ni a dos.
    expect(xEnElApice - 0.5).toBeGreaterThan(0.8);
    expect(xEnElApice - 0.5).toBeLessThan(1.2);
  });
});

describe('Ya no se cambia de nivel andando', () => {
  it('andar contra una pared de un bloque no sube', () => {
    const world = heightField((_x, y) => (y <= -1 ? 2 : 1));
    const out = run(world, { x: 0.5, y: 0.5 }, { moveY: -1, ticks: HASTA_QUE_CAIGA });

    expect(out.z).toBe(1);
    expect(out.grounded).toBe(true);
    // Se queda pegado a la pared, en su propia casilla.
    expect(Math.floor(out.y)).toBe(0);
  });

  it('un talud si se sube andando, que es para lo que esta', () => {
    // La casilla (0,-1) es un talud de nivel 1 que sube hacia el norte, y la
    // (0,-2) ya es el nivel 2 al que lleva.
    const world = heightField(
      (_x, y) => (y <= -2 ? 2 : 1),
      (_x, y) => (y === -1 ? 0 : -1),
    );
    const out = run(world, { x: 0.5, y: 0.5 }, { moveY: -1, ticks: HASTA_QUE_CAIGA });

    expect(out.z).toBe(2);
    expect(out.grounded).toBe(true);
    expect(Math.floor(out.y)).toBeLessThanOrEqual(-2);
  });

  it('salir de un borde es caerse, no bajar de golpe', () => {
    // Un acantilado de 3: la fila 0 esta a 3 y de la -1 en adelante, a 0.
    const world = heightField((_x, y) => (y <= -1 ? 0 : 3));
    const store = new EntityStore(4);
    const id = store.spawn(EntityKind.Player, 0.5, 0.9);
    store.z[id] = 3;

    const alturas: number[] = [];
    for (let t = 0; t < HASTA_QUE_CAIGA; t++) {
      if (store.grounded[id]) moveEntity(world, store, id, 0, -1, TICK_DT);
      else moveAirborne(world, store, id, 0, -1, TICK_DT);
      applyVertical(world, store, id, TICK_DT);
      alturas.push(store.z[id]);
    }

    // Toca el fondo y no lo atraviesa.
    expect(store.z[id]).toBe(0);
    expect(store.grounded[id]).toBe(1);
    expect(Math.min(...alturas)).toBe(0);

    // Y baja por un arco: hay alturas intermedias entre 3 y 0. Bajar de golpe
    // seria pasar de 3 a 0 sin nada en medio, que es lo que hacia antes.
    const intermedias = alturas.filter((z) => z > 0.05 && z < 2.95);
    expect(intermedias.length).toBeGreaterThan(2);
  });

  it('sin dano por caida', () => {
    const world = heightField((_x, y) => (y <= -1 ? 0 : 20));
    const store = new EntityStore(4);
    const id = store.spawn(EntityKind.Player, 0.5, 0.9);
    store.z[id] = 20;
    const salud = store.health[id];

    for (let t = 0; t < 200; t++) {
      if (store.grounded[id]) moveEntity(world, store, id, 0, -1, TICK_DT);
      else moveAirborne(world, store, id, 0, -1, TICK_DT);
      applyVertical(world, store, id, TICK_DT);
    }
    expect(store.z[id]).toBe(0);
    expect(store.health[id]).toBe(salud);
  });
});

describe('El impulso y el control en el aire', () => {
  const llano = heightField(() => 0);

  it('a paso completo el alcance son unas dos casillas', () => {
    const out = run(llano, { x: 0.5, y: 0.5 }, { moveX: 1, jump: true, ticks: HASTA_QUE_CAIGA });
    const alcance = out.x - 0.5;
    expect(alcance).toBeGreaterThan(1.7);
    expect(alcance).toBeLessThan(2.3);
  });

  it('a medio paso se llega a menos', () => {
    const pleno = run(llano, { x: 0.5, y: 0.5 }, { moveX: 1, jump: true, ticks: HASTA_QUE_CAIGA });
    const medio = run(llano, { x: 0.5, y: 0.5 }, { moveX: 0.5, jump: true, ticks: HASTA_QUE_CAIGA });

    expect(medio.x - 0.5).toBeLessThan(pleno.x - 0.5);
    // Y no es que no avance: conserva su impulso, mas corto.
    expect(medio.x - 0.5).toBeGreaterThan(0.5);
  });

  it('soltar el mando en el aire no frena: el impulso se conserva', () => {
    // Deduccion del agente, marcada como tal en `docs/pendiente.md`: el autor
    // dijo «impulso conservado» y «en el aire, correccion parcial». Tratar «no
    // pido nada» como «quiero pararme» convertiria soltar el mando en un freno
    // del 30 %, que es una correccion que nadie ha pedido.
    const sujeto = run(llano, { x: 0.5, y: 0.5 }, { moveX: 1, jump: true, ticks: HASTA_QUE_CAIGA });

    const store = new EntityStore(4);
    const id = store.spawn(EntityKind.Player, 0.5, 0.5);
    store.z[id] = 0;
    moveEntity(llano, store, id, 1, 0, TICK_DT);
    takeOff(store, id);
    // El tick del despegue cierra con su vertical, igual que en `run`: sin esto
    // se cuela un paso horizontal de mas y la comparacion mide otra cosa.
    applyVertical(llano, store, id, TICK_DT);
    for (let t = 0; t < HASTA_QUE_CAIGA && !store.grounded[id]; t++) {
      moveAirborne(llano, store, id, 0, 0, TICK_DT);
      applyVertical(llano, store, id, TICK_DT);
    }

    expect(store.x[id]).toBeCloseTo(sujeto.x, 6);
  });

  it('parado se salta en vertical, sin desplazarse apenas', () => {
    const out = run(llano, { x: 0.5, y: 0.5 }, { jump: true, ticks: HASTA_QUE_CAIGA });
    expect(Math.abs(out.x - 0.5)).toBeLessThan(1e-9);
    expect(out.peak).toBeGreaterThan(1);
  });

  it('en el aire no se puede dar media vuelta', () => {
    // Despega hacia el este a paso completo y pide ir al oeste todo el vuelo.
    const store = new EntityStore(4);
    const id = store.spawn(EntityKind.Player, 0.5, 0.5);
    store.z[id] = 0;
    moveEntity(llano, store, id, 1, 0, TICK_DT);
    takeOff(store, id);

    const despegue = store.vx[id];
    let peor = 0;
    for (let t = 0; t < HASTA_QUE_CAIGA && !store.grounded[id]; t++) {
      moveAirborne(llano, store, id, -1, 0, TICK_DT);
      applyVertical(llano, store, id, TICK_DT);
      const desvio = Math.hypot(store.vx[id] - despegue, store.vy[id]);
      if (desvio > peor) peor = desvio;
    }

    // La desviacion nunca pasa del tope acordado...
    expect(peor).toBeLessThanOrEqual(AIR_CONTROL * WALK_SPEED + 1e-9);
    // ...y por tanto sigue avanzando hacia el este pese a pedir el oeste.
    expect(store.vx[id]).toBeGreaterThan(0);
    expect(store.x[id]).toBeGreaterThan(0.5);
  });

  it('desviarse un poco si se puede', () => {
    const recto = run(llano, { x: 0.5, y: 0.5 }, { moveX: 1, jump: true, ticks: HASTA_QUE_CAIGA });
    // Despega al este y en el aire pide noreste.
    const store = new EntityStore(4);
    const id = store.spawn(EntityKind.Player, 0.5, 0.5);
    store.z[id] = 0;
    moveEntity(llano, store, id, 1, 0, TICK_DT);
    takeOff(store, id);
    for (let t = 0; t < HASTA_QUE_CAIGA && !store.grounded[id]; t++) {
      moveAirborne(llano, store, id, 1, -1, TICK_DT);
      applyVertical(llano, store, id, TICK_DT);
    }

    expect(store.y[id]).toBeLessThan(0.5);
    // Pero sin dejar de ser el mismo salto: el alcance apenas cambia.
    expect(Math.abs(store.x[id] - recto.x)).toBeLessThan(0.6);
  });
});

describe('El agua es muro tambien en el aire', () => {
  it('un salto sobre el agua acaba en la orilla de la que salio', () => {
    // Tierra a nivel 0 en x < 1, agua de x = 1 en adelante.
    const world = heightField((x) => (x >= 1 ? -1 : 0));
    const out = run(world, { x: 0.5, y: 0.5 }, { moveX: 1, jump: true, ticks: HASTA_QUE_CAIGA });

    expect(out.grounded).toBe(true);
    expect(out.z).toBe(0);
    expect(world.isSolidAt(Math.floor(out.x), Math.floor(out.y))).toBe(false);
    expect(out.x).toBeLessThan(1);
  });
});

describe('Saltar el tiempo sigue equivaliendo a vivirlo quieto', () => {
  it('tambien en pleno vuelo', () => {
    // La equivalencia es una regla del proyecto: `skipTime` tiene que ser `step`
    // con la Intent vacia, o lo que se verifique con el panel de desarrollo no
    // dice nada de la partida real. La gravedad no es movimiento —es el mundo
    // actuando sobre uno—, asi que tiene que correr en los dos.
    const saltado = createGame(4242);
    const vivido = createGame(4242);
    for (const s of [saltado, vivido]) {
      s.survivalFrozen = true;
      s.entities.z[s.playerId] += 6;
      s.entities.grounded[s.playerId] = 0;
      s.entities.vz[s.playerId] = 0;
    }

    skipTime(saltado, 120);
    for (let t = 0; t < 120; t++) step(vivido, emptyIntent());

    expect(saltado.entities.z[saltado.playerId]).toBe(vivido.entities.z[vivido.playerId]);
    expect(saltado.entities.grounded[saltado.playerId]).toBe(
      vivido.entities.grounded[vivido.playerId],
    );
    // Y aterriza: no se queda colgado en el aire una hora.
    expect(saltado.entities.grounded[saltado.playerId]).toBe(1);
  });
});

describe('Los numeros son los que se dedujeron', () => {
  it('la gravedad y el impulso siguen dando el apice a una casilla', () => {
    // Si alguien mueve `GRAVITY` o `JUMP_SPEED` sin querer, la relacion que los
    // ata se rompe aqui y no jugando: el vuelo dura `2 v0 / g` y a `WALK_SPEED`
    // eso son dos casillas.
    const vuelo = (2 * JUMP_SPEED) / GRAVITY;
    expect(vuelo * WALK_SPEED).toBeGreaterThan(1.9);
    expect(vuelo * WALK_SPEED).toBeLessThan(2.1);
    // Y el apice, un pelo por encima de un bloque.
    const apice = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
    expect(apice).toBeGreaterThan(1);
    expect(apice).toBeLessThan(1.3);
  });
});
