/**
 * Punto de entrada del cliente: bucle de juego y HUD.
 *
 * El bucle usa paso fijo con acumulador. La simulacion avanza siempre en
 * incrementos de TICK_DT exactos, pase lo que pase con los FPS, y el render
 * interpola entre el tick anterior y el actual. Es la separacion que mantiene
 * la simulacion determinista y el movimiento suave al mismo tiempo.
 */

import { createGame, step, type GameState } from '@verdant/sim';
import { Resource, TICK_DT } from '@verdant/shared';
import { Input } from './input.js';
import { Renderer } from './renderer.js';

/** Techo de tiempo por frame. Sin esto, una pausa larga de la pestana dispara
 *  cientos de ticks de golpe y el juego se congela intentando ponerse al dia. */
const MAX_FRAME_SECONDS = 0.25;

const el = {
  healthText: byId('healthText'),
  healthFill: byId('healthFill'),
  hungerText: byId('hungerText'),
  hungerFill: byId('hungerFill'),
  wood: byId('wood'),
  stone: byId('stone'),
  berries: byId('berries'),
  seed: byId('seed'),
  pos: byId('pos'),
  chunks: byId('chunks'),
  fps: byId('fps'),
  dead: byId('dead'),
  restart: byId('restart'),
};

function byId(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Falta el elemento #${id} en el HTML`);
  return node;
}

/**
 * Semilla de la URL si la hay, para poder compartir un mundo concreto.
 * Envuelto en try/catch porque en un iframe con sandbox restrictivo el acceso a
 * location puede lanzar; en ese caso simplemente se juega un mundo al azar.
 */
function seedFromLocation(): number {
  try {
    const param = new URLSearchParams(window.location.search).get('seed');
    if (param !== null) {
      const parsed = Number.parseInt(param, 10);
      if (Number.isFinite(parsed)) return parsed >>> 0;
    }
  } catch {
    // Sin acceso a la URL: mundo al azar.
  }
  // Math.random aqui es legitimo: esto es el cliente eligiendo que mundo abrir,
  // no la simulacion. Dentro de packages/sim estaria prohibido.
  return (Math.random() * 0xffffffff) >>> 0;
}

async function main(): Promise<void> {
  const renderer = await Renderer.create();

  let state: GameState = createGame(seedFromLocation());
  let prevX = state.entities.x[state.playerId];
  let prevY = state.entities.y[state.playerId];

  function restart(): void {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    // Reflejar la semilla en la URL es una comodidad, no un requisito: si el
    // entorno no lo permite (iframe con sandbox), el juego sigue igual.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('seed', String(seed));
      window.history.replaceState({}, '', url);
    } catch {
      // Ignorado a proposito.
    }

    renderer.reset();
    state = createGame(seed);
    prevX = state.entities.x[state.playerId];
    prevY = state.entities.y[state.playerId];
    el.dead.classList.remove('show');
  }

  const input = new Input({
    onRestart: restart,
    onZoom: (factor) => renderer.zoomBy(factor),
  });
  el.restart.addEventListener('click', restart);

  let accumulator = 0;
  let last = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;
  let hudTimer = 0;

  renderer.app.ticker.add(() => {
    const now = performance.now();
    let frame = (now - last) / 1000;
    last = now;
    if (frame > MAX_FRAME_SECONDS) frame = MAX_FRAME_SECONDS;

    fpsAccum += frame;
    fpsFrames++;

    accumulator += frame;
    while (accumulator >= TICK_DT) {
      prevX = state.entities.x[state.playerId];
      prevY = state.entities.y[state.playerId];
      step(state, input.consume());
      accumulator -= TICK_DT;
    }

    renderer.render(state, prevX, prevY, accumulator / TICK_DT);

    hudTimer += frame;
    if (hudTimer >= 0.1) {
      updateHud(state, fpsFrames / Math.max(fpsAccum, 1e-6));
      hudTimer = 0;
      fpsAccum = 0;
      fpsFrames = 0;
    }
  });

  // Sonda para los tests de humo: permite a Playwright leer el estado real del
  // juego en vez de adivinarlo a partir de pixeles.
  Object.defineProperty(window, '__verdant', {
    get: () => ({
      tick: state.tick,
      seed: state.world.seed,
      // Expuesto para que la prueba de humo pueda comprobar que el zoom cambia
      // de verdad, en vez de asumirlo mirando pixeles.
      tilesOnScreen: renderer.tilesVisible,
      objects: renderer.objectCount,
      chunks: state.world.loadedChunkCount,
      x: state.entities.x[state.playerId],
      y: state.entities.y[state.playerId],
      health: state.entities.health[state.playerId],
      hunger: state.entities.hunger[state.playerId],
      inventory: Array.from(state.inventory),
    }),
  });
}

function updateHud(state: GameState, fps: number): void {
  const { entities, playerId, inventory } = state;
  const health = entities.health[playerId];
  const hunger = entities.hunger[playerId];

  el.healthText.textContent = String(Math.ceil(health));
  el.healthFill.style.width = `${Math.max(0, health)}%`;
  el.hungerText.textContent = String(Math.ceil(hunger));
  el.hungerFill.style.width = `${Math.max(0, hunger)}%`;

  el.wood.textContent = String(inventory[Resource.Wood]);
  el.stone.textContent = String(inventory[Resource.Stone]);
  el.berries.textContent = String(inventory[Resource.Berries]);

  el.seed.textContent = String(state.world.seed);
  el.pos.textContent = `${Math.floor(entities.x[playerId])}, ${Math.floor(entities.y[playerId])}`;
  el.chunks.textContent = String(state.world.loadedChunkCount);
  el.fps.textContent = String(Math.round(fps));

  el.dead.classList.toggle('show', entities.alive[playerId] === 0);
}

void main();
