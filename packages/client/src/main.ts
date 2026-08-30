/**
 * Punto de entrada del cliente: bucle de juego y HUD.
 *
 * El bucle usa paso fijo con acumulador. La simulacion avanza siempre en
 * incrementos de TICK_DT exactos, pase lo que pase con los FPS, y el render
 * interpola entre el tick anterior y el actual. Es la separacion que mantiene
 * la simulacion determinista y el movimiento suave al mismo tiempo.
 */

import {
  actionArea,
  clockLabel,
  createGame,
  dayNumber,
  skipTime,
  step,
  toChunkCoord,
  type GameState,
} from '@verdant/sim';
import {
  BIOME_NAMES,
  EQUILIBRIUM_BAND,
  LIFE_KIND_NAMES,
  LifeKind,
  Resource,
  TICK_DT,
  TERRAIN_NAMES,
  Terrain,
  MINERAL_NODES,
  RESOURCE_NAMES,
  harvestOf,
  isTerrainSolid,
  isFeatureSolid,
} from '@verdant/shared';
import { DevTools } from './devtools.js';
import { Effects } from './effects.js';
import { debrisPalette } from './palette.js';
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
  treeSeed: byId('treeSeed'),
  plantSeed: byId('plantSeed'),
  coal: byId('coal'),
  iron: byId('iron'),
  copper: byId('copper'),
  statsToggle: byId('statsToggle'),
  statsPanel: byId('statsPanel'),
  biomeName: byId('biomeName'),
  biomeScope: byId('biomeScope'),
  biomeBars: byId('biomeBars'),
  rewardState: byId('rewardState'),
  chunkScope: byId('chunkScope'),
  chunkBars: byId('chunkBars'),
  clock: byId('clock'),
  day: byId('day'),
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

/** Instante inicial via `?t=`, para poder abrir el mundo a una hora concreta. */
function startTickFromLocation(): number | undefined {
  try {
    const param = new URLSearchParams(window.location.search).get('t');
    if (param === null) return undefined;
    const parsed = Number.parseInt(param, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  } catch {
    // Sin acceso a la URL: se usa el amanecer por defecto.
  }
  return undefined;
}

/**
 * Posicion inicial via `?x=&y=`, para abrir el mundo en un sitio concreto.
 *
 * Nace de necesitarlo en la prueba de humo —llegar andando a la montana esquiva
 * arboles y es un via crucis— pero sirve igual para volver a mano a un punto que
 * se quiere mirar dos veces.
 */
function startPlaceFromLocation(): { x: number; y: number } | undefined {
  try {
    const params = new URLSearchParams(window.location.search);
    const x = Number.parseFloat(params.get('x') ?? '');
    const y = Number.parseFloat(params.get('y') ?? '');
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  } catch {
    // Sin acceso a la URL: se aparece donde diga findSpawn.
  }
  return undefined;
}

/**
 * Un mineral de la montana y una casilla libre justo al norte desde la que
 * golpearlo.
 *
 * Existe solo para la prueba de humo. Sin esto habria que pasear por la montana
 * a ver si aparece algo, y con el carbon al 0.00225 por casilla eso es una
 * loteria: la prueba fallaria por azar, no por un fallo. Es la misma clase de
 * ayuda que `tilesOnScreen` para el zoom.
 */
/** El punto mas alto que se encuentre cerca. La prueba de humo sube ahi. */
function peakSpot(state: GameState): { stand: { x: number; y: number }; level: number } | null {
  const px = Math.floor(state.entities.x[state.playerId]);
  const py = Math.floor(state.entities.y[state.playerId]);
  const gen = state.world.gen;

  let best: { stand: { x: number; y: number }; level: number } | null = null;
  for (let y = py - 300; y <= py + 300; y += 3) {
    for (let x = px - 300; x <= px + 300; x += 3) {
      const level = gen.levelAt(x, y);
      if (best && level <= best.level) continue;
      best = { stand: { x: x + 0.5, y: y + 0.5 }, level };
    }
  }
  return best;
}

/**
 * Sitio desde el que se ve una pared de dos o mas bloques.
 *
 * Igual que `mineralSpot`, existe para que la prueba de humo no juegue a la
 * loteria: el relieve alto es escaso a proposito —esa fue la calibracion— y
 * esperar a tropezar con uno paseando fallaria por azar y no por un fallo.
 */
function cliffSpot(state: GameState): { stand: { x: number; y: number }; drop: number } | null {
  const px = Math.floor(state.entities.x[state.playerId]);
  const py = Math.floor(state.entities.y[state.playerId]);
  const gen = state.world.gen;

  let best: { stand: { x: number; y: number }; drop: number; d: number } | null = null;
  for (let y = py - 220; y <= py + 220; y += 2) {
    for (let x = px - 220; x <= px + 220; x += 2) {
      const level = gen.levelAt(x, y);
      if (level < 0) continue;
      let drop = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        drop = Math.max(drop, gen.levelAt(x + dx, y + dy) - level);
      }
      if (drop < 2) continue;
      const d = Math.max(Math.abs(x - px), Math.abs(y - py));
      if (!best || d < best.d) best = { stand: { x: x + 0.5, y: y + 0.5 }, drop, d };
    }
  }
  return best ? { stand: best.stand, drop: best.drop } : null;
}

/**
 * Resumen del relieve alrededor del jugador, para la prueba de humo.
 *
 * Los tres numeros que interesan: que haya varias alturas —si no, el relieve no
 * se esta generando—, que haya taludes por los que subir y que existan paredes
 * de dos o mas bloques, que es lo que el autor pidio expresamente. Se lee del
 * GENERADOR y no del mundo, para no registrar chunks solo por mirar.
 */
function reliefAround(state: GameState): { levels: number; ramps: number; tallWalls: number } {
  const px = Math.floor(state.entities.x[state.playerId]);
  const py = Math.floor(state.entities.y[state.playerId]);
  const gen = state.world.gen;
  const seen = new Set<number>();
  let ramps = 0;
  let tallWalls = 0;

  for (let y = py - 40; y <= py + 40; y++) {
    for (let x = px - 40; x <= px + 40; x++) {
      const level = gen.levelAt(x, y);
      if (level < 0) continue;
      seen.add(level);
      if (gen.rampDirAt(x, y) >= 0) ramps++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (gen.levelAt(x + dx, y + dy) - level >= 2) {
          tallWalls++;
          break;
        }
      }
    }
  }
  return { levels: seen.size, ramps, tallWalls };
}

function mineralSpot(
  state: GameState,
): { stand: { x: number; y: number }; node: { x: number; y: number }; kind: string } | null {
  const px = Math.floor(state.entities.x[state.playerId]);
  const py = Math.floor(state.entities.y[state.playerId]);
  const gen = state.world.gen;

  let best: { stand: { x: number; y: number }; node: { x: number; y: number }; kind: string; d: number } | null = null;
  for (let y = py - 200; y <= py + 200; y++) {
    for (let x = px - 200; x <= px + 200; x++) {
      const terrain = gen.terrainAt(x, y);
      if (terrain !== Terrain.Rock) continue;
      const feature = gen.featureAt(x, y, terrain);
      if (!MINERAL_NODES.includes(feature)) continue;

      // La casilla desde la que se golpea: al norte, pisable y despejada.
      const sy = y - 1;
      const standTerrain = gen.terrainAt(x, sy);
      if (isTerrainSolid(standTerrain)) continue;
      if (isFeatureSolid(gen.featureAt(x, sy, standTerrain))) continue;

      const d = Math.max(Math.abs(x - px), Math.abs(y - py));
      if (!best || d < best.d) {
        best = {
          stand: { x: x + 0.5, y: sy + 0.5 },
          node: { x, y },
          kind: RESOURCE_NAMES[harvestOf(feature)!.resource],
          d,
        };
      }
    }
  }
  return best ? { stand: best.stand, node: best.node, kind: best.kind } : null;
}

async function main(): Promise<void> {
  const renderer = await Renderer.create();

  /** Coloca al jugador donde diga la URL, si lo dice. */
  function placeStart(target: GameState): GameState {
    const place = startPlaceFromLocation();
    if (place) {
      target.entities.x[target.playerId] = place.x;
      target.entities.y[target.playerId] = place.y;
      // El streaming se pone al dia solo en el primer tick, que ve el cambio de
      // chunk contra los `NaN` con los que nace el estado.
      target.world.ensureAround(place.x, place.y, 2);
    }
    return target;
  }

  let state: GameState = placeStart(createGame(seedFromLocation(), startTickFromLocation()));
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
    effects.clear();
    state = placeStart(createGame(seed));
    prevX = state.entities.x[state.playerId];
    prevY = state.entities.y[state.playerId];
    el.dead.classList.remove('show');
  }

  const effects = new Effects();

  const dev = new DevTools({
    onSkip: (ticks) => {
      skipTime(state, ticks);
      // Tras un salto, el estado observado cambia de golpe; no tiene sentido
      // registrarlo como si el jugador hubiera recolectado o comido.
      dev.observe(Array.from(state.inventory), state.entities.hunger[state.playerId], 0);
    },
  });

  const input = new Input({
    onRestart: restart,
    onZoom: (factor) => renderer.zoomBy(factor),
    aimFrom: (clientX, clientY) => {
      const world = renderer.pointerToWorld(clientX, clientY);
      const dx = world.x - state.entities.x[state.playerId];
      const dy = world.y - state.entities.y[state.playerId];
      // Con el cursor practicamente encima del personaje no hay direccion que
      // valga; se conserva la mirada anterior en vez de dar tumbos.
      return Math.hypot(dx, dy) < 0.35 ? null : { x: dx, y: dy };
    },
  });
  el.restart.addEventListener('click', restart);

  // El panel del entorno se despliega y repliega con el mismo boton.
  el.statsToggle.addEventListener('click', () => {
    const open = el.statsPanel.hidden;
    el.statsPanel.hidden = !open;
    el.statsToggle.classList.toggle('open', open);
    el.statsToggle.setAttribute('aria-expanded', String(open));
    if (open) updateStats(state);
  });

  let accumulator = 0;
  let last = performance.now();
  let hudTimer = 0;

  // Medicion de FPS sobre una ventana de UN SEGUNDO.
  //
  // Antes se promediaba cada 0.1 s: a 60 Hz son apenas seis frames, asi que un
  // solo frame lento hacia saltar el numero decenas de unidades y era ilegible.
  // El resto del HUD se sigue refrescando a 10 Hz para que las barras respondan.
  let fpsWindow = 0;
  let fpsFrames = 0;
  let worstFrame = 0;
  let fps = 0;
  let worstFrameMs = 0;

  renderer.app.ticker.add(() => {
    const now = performance.now();
    const rawFrame = (now - last) / 1000;
    last = now;
    // El peor frame se mide SIN recortar: recortarlo ocultaria justo el tiron
    // que interesa detectar.
    if (rawFrame > worstFrame) worstFrame = rawFrame;

    const frame = Math.min(rawFrame, MAX_FRAME_SECONDS);

    fpsWindow += frame;
    fpsFrames++;
    if (fpsWindow >= 1) {
      fps = fpsFrames / fpsWindow;
      worstFrameMs = worstFrame * 1000;
      fpsWindow = 0;
      fpsFrames = 0;
      worstFrame = 0;
    }

    // Las herramientas de desarrollo pueden pausar o acelerar el tiempo. Con
    // escala cero el acumulador no avanza y la simulacion queda congelada.
    accumulator += frame * dev.timeScale;
    // Se copia cada frame, como los conmutadores de bordes: asi reiniciar la
    // partida o abrir el panel antes de que exista el estado se resuelve solo.
    state.survivalFrozen = dev.survivalFrozen;
    while (accumulator >= TICK_DT) {
      prevX = state.entities.x[state.playerId];
      prevY = state.entities.y[state.playerId];
      // La Intent se guarda en vez de pasarse en linea: hace falta saber si se
      // acciono para lanzar el slash, aunque no se derribara nada.
      const intent = input.consume();
      step(state, intent);
      if (intent.harvest) {
        effects.spawnSlash(actionArea(state.entities, state.playerId));
      }
      for (const hit of state.lastHarvest) {
        // Los escombros se posan en la cima del tile del que salieron, no en el
        // plano cero: talar en una meseta no puede tirar la madera al mar.
        effects.spawnDebris(
          hit.tileX,
          hit.tileY,
          debrisPalette(hit.feature),
          state.world.levelAt(hit.tileX, hit.tileY),
        );
      }
      accumulator -= TICK_DT;
    }

    // Con el tiempo escalado: pausar congela los efectos y a 64x no inundan.
    effects.advance(frame * dev.timeScale);
    renderer.render(state, prevX, prevY, accumulator / TICK_DT, effects);

    hudTimer += frame;
    if (hudTimer >= 0.1) {
      updateHud(state, fps);
      updateStats(state);
      renderer.setDebugOverlays(dev.showChunkBorders, dev.showBiomeBorders);
      dev.observe(
        Array.from(state.inventory),
        state.entities.hunger[state.playerId],
        state.world.biomeAt(
          Math.floor(state.entities.x[state.playerId]),
          Math.floor(state.entities.y[state.playerId]),
        ),
      );
      hudTimer = 0;
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
      clock: clockLabel(state.tick),
      tracked: state.world.trackedChunkCount,
      dev: dev.active,
      timeScale: dev.timeScale,
      survivalFrozen: dev.survivalFrozen,
      borderSegments: renderer.borderSegmentCount,
      misplacedBorders: renderer.misplacedBorderCount,
      facing: [state.entities.facingX[state.playerId], state.entities.facingY[state.playerId]],
      terrain: TERRAIN_NAMES[
        state.world.terrainAt(
          Math.floor(state.entities.x[state.playerId]),
          Math.floor(state.entities.y[state.playerId]),
        )
      ],
      /** Altura del suelo bajo el jugador y del relieve que le rodea. */
      level: state.world.levelAt(
        Math.floor(state.entities.x[state.playerId]),
        Math.floor(state.entities.y[state.playerId]),
      ),
      relief: reliefAround(state),
      cliffSpot: cliffSpot(state),
      peakSpot: peakSpot(state),
      faces: renderer.faceCount,
      playerHidden: renderer.playerHidden,
      /** Roca visible mas cercana. La usa la prueba de humo para ir a la montana. */
      mineralSpot: mineralSpot(state),
      effects: effects.tally,
      area: actionArea(state.entities, state.playerId).map((t) => [t.x, t.y]),
      biome: BIOME_NAMES[
        state.world.biomeAt(
          Math.floor(state.entities.x[state.playerId]),
          Math.floor(state.entities.y[state.playerId]),
        )
      ],
      balanced: state.world.isBiomeBalanced(
        toChunkCoord(Math.floor(state.entities.x[state.playerId])),
        toChunkCoord(Math.floor(state.entities.y[state.playerId])),
        state.world.biomeAt(
          Math.floor(state.entities.x[state.playerId]),
          Math.floor(state.entities.y[state.playerId]),
        ),
      ),
      fps,
      /** Frame mas lento del ultimo segundo: es lo que delata un tiron. */
      worstFrameMs,
      chunks: state.world.loadedChunkCount,
      x: state.entities.x[state.playerId],
      y: state.entities.y[state.playerId],
      health: state.entities.health[state.playerId],
      hunger: state.entities.hunger[state.playerId],
      inventory: Array.from(state.inventory),
    }),
  });
}

/**
 * Una fila de barra del panel, reutilizada entre refrescos.
 *
 * Se construye una vez y despues solo se actualizan sus valores: reconstruir el
 * DOM diez veces por segundo provocaria parpadeos y basura innecesaria.
 */
interface StatRow {
  root: HTMLElement;
  fill: HTMLElement;
  state: HTMLElement;
}

function makeStatRow(container: HTMLElement, label: string): StatRow {
  const root = document.createElement('div');
  root.className = 'statRow';
  root.innerHTML =
    `<div class="label"><span>${label}</span><span class="state">—</span></div>` +
    '<div class="track"><div class="band"></div><div class="fill"></div></div>';
  container.appendChild(root);
  return {
    root,
    fill: root.querySelector('.fill') as HTMLElement,
    state: root.querySelector('.state') as HTMLElement,
  };
}

/** La barra llega hasta 1.5x del referente; el rango sano se marca encima. */
const BAR_SCALE = 1.5;

function updateStatRow(row: StatRow, count: number, reference: number): void {
  if (reference <= 0) {
    row.fill.style.width = '0%';
    row.fill.className = 'fill';
    row.state.className = 'state';
    row.state.textContent = 'sin presencia';
    return;
  }
  const ratio = count / reference;
  row.fill.style.width = `${Math.min(ratio / BAR_SCALE, 1) * 100}%`;

  let mood = 'ok';
  let text = 'en equilibrio';
  if (ratio < 1 - EQUILIBRIUM_BAND) {
    mood = 'low';
    text = 'por debajo';
  } else if (ratio > 1 + EQUILIBRIUM_BAND) {
    mood = 'high';
    text = 'saturado';
  }
  row.fill.className = `fill ${mood}`;
  row.state.className = `state ${mood}`;
  row.state.textContent = text;
}

const KINDS: readonly LifeKind[] = [LifeKind.Tree, LifeKind.Plant, LifeKind.Animal];
const biomeRows: StatRow[] = [];
const chunkRows: StatRow[] = [];

/**
 * Vuelca el estado del entorno en el panel.
 *
 * No se muestran cantidades absolutas a proposito: con el bioma a medio generar
 * no serian significativas. Lo que se ve es cuanto se desvia lo que hay del
 * equilibrio con el que nacio, con el rango sano marcado sobre la barra.
 */
function updateStats(state: GameState): void {
  if (el.statsPanel.hidden) return;

  const { entities, playerId, world } = state;
  const tileX = Math.floor(entities.x[playerId]);
  const tileY = Math.floor(entities.y[playerId]);
  const cx = toChunkCoord(tileX);
  const cy = toChunkCoord(tileY);
  // El bioma que se anuncia es el del SUELO que pisa el jugador, no el
  // predominante de su chunk: por eso antes podia decir bosque estando sobre
  // hierba.
  const standing = world.biomeAt(tileX, tileY);

  if (biomeRows.length === 0) {
    for (const kind of KINDS) {
      biomeRows.push(makeStatRow(el.biomeBars, LIFE_KIND_NAMES[kind]));
      chunkRows.push(makeStatRow(el.chunkBars, LIFE_KIND_NAMES[kind]));
    }
  }

  const biome = world.biomeStats(cx, cy, standing);
  el.biomeName.textContent = BIOME_NAMES[biome.kind] ?? 'Bioma';
  el.biomeScope.textContent =
    `${biome.chunks} chunk${biome.chunks === 1 ? '' : 's'} explorado` +
    `${biome.chunks === 1 ? '' : 's'}${biome.truncated ? ' (parcial)' : ''}`;

  KINDS.forEach((kind, i) => {
    updateStatRow(biomeRows[i], biome.count[kind], biome.reference[kind]);
    updateStatRow(
      chunkRows[i],
      world.countOf(cx, cy, standing, kind),
      world.referenceOf(cx, cy, standing, kind),
    );
  });

  if (biome.balanced) {
    el.rewardState.className = 'on';
    el.rewardState.textContent = 'Bioma equilibrado: recolectar rinde mas y brotan variantes raras.';
  } else if (biome.overcrowded > 0) {
    el.rewardState.className = 'off';
    el.rewardState.textContent =
      `${biome.overcrowded} chunk${biome.overcrowded === 1 ? '' : 's'} saturado` +
      `${biome.overcrowded === 1 ? '' : 's'}: sin recompensas hasta que la competencia lo corrija.`;
  } else {
    el.rewardState.className = 'off';
    el.rewardState.textContent = 'Bioma fuera de rango: siembra para recuperar las recompensas.';
  }

  el.chunkScope.textContent = `${cx}, ${cy}`;
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
  el.treeSeed.textContent = String(inventory[Resource.TreeSeed]);
  el.plantSeed.textContent = String(inventory[Resource.PlantSeed]);
  el.coal.textContent = String(inventory[Resource.Coal]);
  el.iron.textContent = String(inventory[Resource.Iron]);
  el.copper.textContent = String(inventory[Resource.Copper]);

  el.clock.textContent = clockLabel(state.tick);
  el.day.textContent = String(dayNumber(state.tick));
  el.seed.textContent = String(state.world.seed);
  el.pos.textContent = `${Math.floor(entities.x[playerId])}, ${Math.floor(entities.y[playerId])}`;
  el.chunks.textContent = String(state.world.loadedChunkCount);
  // Hasta que cierre la primera ventana de medicion no hay dato que mostrar.
  el.fps.textContent = fps > 0 ? String(Math.round(fps)) : '—';

  el.dead.classList.toggle('show', entities.alive[playerId] === 0);
}

void main();
