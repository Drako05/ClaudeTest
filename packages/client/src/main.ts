/**
 * El cliente: bucle de juego, escena y cableado de todo lo demas.
 *
 * Nacio como un experimento para decidir con una medida si un mundo con relieve
 * de verdad se entendia con la camara libre, y a cuantos FPS iba en el telefono
 * del autor. La respuesta fue que si —80+ FPS, y eligio la perspectiva—, y el
 * cliente isometrico con el que convivio se retiro despues (`docs/isometrico.md`).
 *
 * El bucle usa paso fijo con acumulador: la simulacion avanza siempre en
 * incrementos de `TICK_DT` exactos, pase lo que pase con los FPS (regla 8).
 * `packages/sim` no sabe que existe una camara (regla 1), asi que mundo,
 * relieve, biomas, ecologia y reloj entran aqui intactos.
 */

import {
  AmbientLight,
  Fog,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
  DoubleSide,
  MeshBasicMaterial,
} from 'three';
import {
  BIOME_NAMES,
  CHUNK_SIZE,
  Feature,
  isStation,
  Resource,
  TERRAIN_NAMES,
  TICK_DT,
  emptyIntent,
  type Terrain,
} from '@verdant/shared';
import {
  actionReach,
  clockLabel,
  EYE_HEIGHT,
  hitboxAt,
  strikeOf,
  targetTile,
  skipTime,
  step,
  toChunkCoord,
  type GameState,
} from '@verdant/sim';
import { DevTools } from './devtools.js';
import { Effects, SLASH_FP_HALF_WIDTH, SLASH_HALF_WIDTH, slashEdge } from './effects.js';
import { cameraClearance } from './camera-collision.js';
import { debrisPalette } from './palette.js';
import { EffectsView } from './effects-view.js';
import { TERRAIN_RGB, shadeStepAt, SHADE_STEPS } from './art.js';
import { BillboardSet } from './billboards.js';
import { StationSet } from './stations-view.js';
import { buildShadows, type ShadowSpot } from './shadows.js';
import { HIDE_PLAYER_BELOW, OrbitCamera, type Projection } from './camera.js';
import { Controls } from './controls.js';
import { chunkMesh, cornerHeight } from './terrain-mesh.js';
import { FovPanel } from './fov-panel.js';
import { InventoryUi } from './inventory-ui.js';
import { MouseLook } from './pointer-lock.js';
import { Hud } from './hud.js';
import { Overlays } from './overlays.js';
import { inventoryDelta, opacityOf, PickupFeed, riseOf } from './pickup-feed.js';
import {
  berrySpot,
  cliffSpot,
  mineralSpot,
  peakSpot,
  reliefAround,
  stationTilesAround,
  stoneOreSpot,
} from './probes.js';
import { skyTint, tintCss } from './sky.js';
import { randomSeed, seedFromLocation, startGame, writeSeedToLocation } from './start.js';

/** Radio de chunks que se mallan alrededor del jugador. */
const RADIUS = 3;
/** Altura del plano de agua, justo bajo el nivel donde empieza la tierra. */
const WATER_Y = -0.18;

/** Techo de tiempo por frame. Sin esto, una pausa larga de la pestana dispara
 *  cientos de ticks de golpe y el juego se congela intentando ponerse al dia. */
const MAX_FRAME_SECONDS = 0.25;

const canvas = document.getElementById('view') as HTMLCanvasElement;
const projButton = document.getElementById('proj') as HTMLButtonElement;
const skyEl = document.getElementById('sky') as HTMLElement;

const renderer = new WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new Scene();
scene.background = new Color(0x9ad0f0);
// La niebla solo en perspectiva. En ortografica la camara se aleja 220 unidades
// para no recortar la montana mas alta, asi que una niebla por distancia lavaba
// la escena entera aunque el jugador estuviera delante. En perspectiva si vale,
// y disimula el corte donde se acaban los chunks mallados.
const haze = new Fog(0x9ad0f0, 40, 115);

scene.add(new AmbientLight(0xffffff, 0.62));
const sun = new DirectionalLight(0xfff2dd, 1.05);
sun.position.set(-0.6, 1, -0.45);
scene.add(sun);

let seed = seedFromLocation();
let state: GameState = startGame(seed, true, RADIUS);
const hud = new Hud(() => state);

const camera = new OrbitCamera();
const controls = new Controls(
  canvas,
  document.getElementById('stick'),
  document.getElementById('stickKnob'),
);

/**
 * El interruptor de proyeccion, con boton propio.
 *
 * La tecla P no existe en un telefono, y el telefono es justo donde hay que
 * juzgar esto: sin boton, la mitad del experimento —comparar ortografica contra
 * perspectiva— quedaba fuera de alcance en el unico sitio donde importa. Es
 * ademas el unico control que se ve tambien en PC, porque es el unico que no
 * tiene tecla anunciada en ninguna parte.
 *
 * Pintar y cambiar van separados **porque el boton tiene que arrancar
 * sincronizado**: la vista de salida es la perspectiva, y llamar al interruptor
 * para poner el icono en su sitio la voltearia al primer frame.
 */
/** Como se anuncia cada vista, y a cual lleva tocar el ojo. */
const VIEW_LABELS: Record<Projection, string> = {
  perspectiva: 'Vista en perspectiva; tocar para isométrica',
  orto: 'Vista isométrica; tocar para primera persona',
  primera: 'Vista en primera persona; tocar para perspectiva',
};

function renderProjButton(): void {
  // El ojo dice la vista con su forma: abierto en perspectiva, entrecerrado en
  // la isometrica —que lo aplana todo— y con punto de mira en primera persona.
  projButton.classList.toggle('flat', camera.projection === 'orto');
  projButton.classList.toggle('fp', camera.projection === 'primera');
  const label = VIEW_LABELS[camera.projection];
  projButton.setAttribute('aria-label', label);
  projButton.title = label;
}

/** La barra del angulo de vision de la primera persona, detras del ojo. */
const fovPanel = new FovPanel(
  document.getElementById('fovPanel') as HTMLElement,
  document.getElementById('fovRange') as HTMLInputElement,
  document.getElementById('fovValue') as HTMLElement,
  projButton,
  camera,
);

function toggleProjection(): void {
  camera.cycleProjection();
  // Cambiar de vista la cierra siempre: un toque corto en el ojo, aunque
  // estuviera abierta, cambia de vista como siempre (decision del autor).
  fovPanel.hide();
  renderProjButton();
}
renderProjButton();
projButton.addEventListener('click', () => {
  // El toque sostenido que abrio la barra no cambia de vista al soltar.
  if (fovPanel.takeSwallowedClick()) return;
  toggleProjection();
});
controls.onToggleProjection = toggleProjection;
controls.bindJumpButton(document.getElementById('jump'));
controls.bindRunButton(document.getElementById('run'));
controls.bindActionButton(document.getElementById('action'));
controls.bindUseButton(document.getElementById('use'));
controls.onRestart = restart;
controls.onToggleInventory = () => items.toggle();
controls.onHotbarStep = (delta) => items.step(delta);
document.getElementById('restart')?.addEventListener('click', restart);

// El barrido y los escombros. El movimiento sale de `effects.ts`, que es puro y
// ya existia; aqui solo se dibuja (`effects-view.ts`).
const effects = new Effects();
const effectsView = new EffectsView(scene);
const overlays = new Overlays(scene);

/**
 * El registro de objetos, «+5 Madera» y «-1 Bayas» (pedido del autor): sale de
 * comparar los totales del inventario frame a frame, y se pinta debajo del
 * boton INVENTARIO en el movil y abajo a la derecha en PC. La logica es pura
 * (`pickup-feed.ts`); aqui solo se pinta.
 */
const feed = new PickupFeed();
const feedEl = document.getElementById('pickupFeed') as HTMLElement;
const feedEls = new Map<number, HTMLElement>();
let feedBase = state.inventory.totals();

function drawFeed(): void {
  // En el movil cuelga del boton INVENTARIO y sube hacia el; en PC se apoya
  // en la franja de salud y hambre y sube desde ahi.
  const fromTop = document.body.classList.contains('touch-active');
  const alive = new Set<number>();
  for (const line of feed.lines) {
    alive.add(line.id);
    let el = feedEls.get(line.id);
    if (!el) {
      el = document.createElement('div');
      el.className = line.gain ? 'gain' : 'loss';
      el.textContent = line.text;
      feedEl.appendChild(el);
      feedEls.set(line.id, el);
    }
    const y = fromTop ? line.fromTop - riseOf(line) : -(line.fromBottom + riseOf(line));
    el.style.transform = `translateY(${y.toFixed(1)}px)`;
    el.style.opacity = opacityOf(line).toFixed(3);
  }
  for (const [id, el] of feedEls) {
    if (alive.has(id)) continue;
    el.remove();
    feedEls.delete(id);
  }
}

/**
 * El panel de desarrollo (F3 o `?dev=1`): pausa, velocidades, saltos de tiempo,
 * congelar la supervivencia, bordes y registro. Solo importa `shared`, y por eso
 * vino del isometrico sin tocar una linea.
 */
const dev = new DevTools({
  onSkip: (ticks) => {
    skipTime(state, ticks);
    // Tras un salto el estado observado cambia de golpe; no tiene sentido
    // registrarlo como si el jugador hubiera recolectado o comido.
    dev.observe(state.inventory.totals(), state.entities.hunger[state.playerId], 0);
  },
  // Lo justo para el hacha y el pico de piedra, o para toda la tanda 2: mesa,
  // horno, cinco lingotes de cobre, tres de hierro, un pico de cada metal, la
  // bolsa y la mochila (propuesta mia).
  onKit: (kit) => {
    const bundle: Array<[Resource, number]> =
      kit === 'metal'
        ? [
            [Resource.Wood, 12],
            [Resource.Stone, 10],
            [Resource.Coal, 13],
            [Resource.Copper, 10],
            [Resource.Iron, 6],
            [Resource.Branch, 4],
            [Resource.Fiber, 18],
          ]
        : [
            [Resource.Branch, 6],
            [Resource.Stone, 5],
            [Resource.Fiber, 4],
          ];
    for (const [item, n] of bundle) state.inventory.add(item, n);
  },
});

/**
 * El inventario con su recetario y la barra de la mano (`inventory-ui.ts`),
 * segun los bocetos del autor. Sus peticiones viajan en la `Intent` como todo
 * lo demas.
 */
const items = new InventoryUi(() => state);

/**
 * El raton de PC lleva la mirada y soltarlo pausa (`pointer-lock.ts`). El panel
 * de desarrollo suelta el cursor sin pausar; al cerrarlo se intenta capturar de
 * nuevo, porque la tecla cuenta como gesto del usuario. El inventario (E) hace
 * lo mismo: **abrirlo no pausa** (decision del autor), y sus casillas y
 * recetas piden cursor.
 */
const mouseLook = new MouseLook(canvas, () => dev.active || items.open);
controls.mouseLook = mouseLook;
window.addEventListener('keydown', (e) => {
  // Esc con el inventario abierto lo cierra, sin pausar (pedido del autor): al
  // cerrar se vuelve a capturar el cursor. Chrome lo deja sin gesto porque lo
  // solto el juego al abrir, no el jugador; si aun asi lo rechazara, queda la
  // pausa de siempre y basta un clic.
  if (e.code === 'Escape' && items.open) {
    items.toggle();
    return;
  }
  if (e.code !== 'F3') return;
  if (dev.active) mouseLook.release();
  else if (!items.open) mouseLook.capture();
});
items.onToggle = (open) => {
  if (open) mouseLook.release();
  else if (!dev.active) mouseLook.capture();
};
const pauseEl = document.getElementById('pause') as HTMLElement;
const pauseHint = document.getElementById('pauseHint') as HTMLElement;
let everLocked = false;

const billboards = new BillboardSet();
const stations = new StationSet();
const player = billboards.spawnPlayer();
if (player) scene.add(player);

// El agua, un plano translucido a la altura del nivel del mar. El fondo marino
// ya lo dibuja la malla, asi que se ve la profundidad por transparencia.
const water = new Mesh(
  new PlaneGeometry(1, 1),
  new MeshBasicMaterial({ color: 0x2f6ea8, transparent: true, opacity: 0.72, side: DoubleSide }),
);
water.rotation.x = -Math.PI / 2;
water.scale.set(CHUNK_SIZE * (RADIUS * 2 + 3), CHUNK_SIZE * (RADIUS * 2 + 3), 1);
scene.add(water);

/** El color de un tile: la paleta del juego con su misma franja de brillo. */
function colorOf(terrain: Terrain, wx: number, wy: number): readonly [number, number, number] {
  const rgb = TERRAIN_RGB[terrain] ?? TERRAIN_RGB[3 as Terrain];
  // La franja de brillo es la de `art.ts`, para que el mundo se vea el mismo.
  const k = 0.9 + (shadeStepAt(seed, wx, wy) / (SHADE_STEPS - 1)) * 0.2;
  return [(rgb[0] / 255) * k, (rgb[1] / 255) * k, (rgb[2] / 255) * k];
}

interface ChunkView {
  readonly mesh: Mesh;
  readonly props: import('three').Object3D[];
  /** Todas las sombras del chunk en una malla. Null si no hay ninguna. */
  readonly shadows: Mesh | null;
  readonly triangles: number;
  revision: number;
}

const views = new Map<string, ChunkView>();
let triangles = 0;

function buildChunk(cx: number, cy: number): ChunkView {
  const chunk = state.world.getChunk(cx, cy);
  const data = chunkMesh(state.world, chunk, colorOf);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
  geometry.setAttribute('color', new BufferAttribute(data.colors, 3));
  geometry.setIndex(new BufferAttribute(data.indices, 1));
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true }));
  scene.add(mesh);

  // Las features, leidas del mundo EFECTIVO y no del potencial del generador:
  // es la regla 4, y aqui vale igual que en el isometrico.
  const props: import('three').Object3D[] = [];
  const spots: ShadowSpot[] = [];
  const scratch = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  state.world.readFeatures(chunk, scratch);
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const feature = scratch[ly * CHUNK_SIZE + lx] as Feature;
      if (feature === Feature.None) continue;
      const wx = cx * CHUNK_SIZE + lx;
      const wy = cy * CHUNK_SIZE + ly;
      const x = wx + 0.5;
      const y = wy + 0.5;
      const ground = state.world.groundHeightAt(x, y);
      // Las estaciones son cajas, no aspas (decision del autor).
      if (isStation(feature)) {
        const box = stations.spawn(feature, wx, wy, ground, seed);
        if (box) {
          scene.add(box);
          props.push(box);
          spots.push({ x, z: y, width: stations.widthOf(feature) });
        }
        continue;
      }
      const prop = billboards.spawn(feature, x, ground, y, seed);
      if (prop) {
        scene.add(prop);
        props.push(prop);
        if (feature !== Feature.Pebbles) spots.push({ x, z: y, width: billboards.widthOf(feature) });
      }
    }
  }
  // Todas las sombras del chunk en una malla: una draw call en vez de una por
  // elemento. Cada una cae sobre la MISMA superficie que dibuja el terreno,
  // casilla por casilla, aunque asome a un chunk vecino. Ver `shadows.ts`.
  const shadows = buildShadows(spots, (tx, ty, fx, fy) =>
    cornerHeight(state.world, chunk, tx, ty, fx, fy),
  );
  if (shadows) scene.add(shadows);
  return { mesh, props, shadows, triangles: data.triangles, revision: chunk.revision };
}

function syncChunks(): void {
  const px = state.entities.x[state.playerId];
  const py = state.entities.y[state.playerId];
  const cx0 = Math.floor(px / CHUNK_SIZE);
  const cy0 = Math.floor(py / CHUNK_SIZE);
  const wanted = new Set<string>();

  for (let cy = cy0 - RADIUS; cy <= cy0 + RADIUS; cy++) {
    for (let cx = cx0 - RADIUS; cx <= cx0 + RADIUS; cx++) {
      const key = `${cx},${cy}`;
      wanted.add(key);
      const existing = views.get(key);
      if (existing && existing.revision === state.world.getChunk(cx, cy).revision) continue;
      if (existing) dispose(key, existing);
      views.set(key, buildChunk(cx, cy));
    }
  }
  for (const [key, view] of views) {
    if (!wanted.has(key)) dispose(key, view);
  }
  triangles = 0;
  for (const view of views.values()) triangles += view.triangles;
}

function dispose(key: string, view: ChunkView): void {
  scene.remove(view.mesh);
  view.mesh.geometry.dispose();
  (view.mesh.material as MeshLambertMaterial).dispose();
  // Los aspas comparten geometria y material con las demas de su especie, asi
  // que se quitan de la escena pero NO se liberan: siguen en uso. Las sombras
  // si, que son propias del chunk.
  for (const prop of view.props) scene.remove(prop);
  if (view.shadows) {
    scene.remove(view.shadows);
    view.shadows.geometry.dispose();
    (view.shadows.material as MeshBasicMaterial).dispose();
  }
  views.delete(key);
}

/**
 * Mundo nuevo, con semilla al azar: R o el boton del aviso de muerte.
 *
 * Se tira todo lo que era del mundo anterior —mallas, efectos, superposiciones—
 * y se conserva lo que no: el arte de cada especie, que es el mismo en todos.
 */
function restart(): void {
  seed = randomSeed();
  writeSeedToLocation(seed);
  for (const [key, view] of views) dispose(key, view);
  effects.clear();
  overlays.reset();
  state = startGame(seed, false, RADIUS);
  // Un mundo nuevo empieza sin nada: eso no es perder lo que se llevaba.
  feed.clear();
  feedBase = state.inventory.totals();
  gathered = 0;
  jumps = 0;
  airPeak = 0;
  // Se reinicia con un clic o con R, que son gestos: se aprovecha para volver a
  // capturar el cursor que la muerte solto.
  mouseLook.capture();
}

// --------------------------------------------------------------- bucle

let last = performance.now();
let accumulator = 0;
let fpsFrames = 0;
let fpsWindow = 0;
let fps = 0;
let worstFrame = 0;
let worstFrameMs = 0;
let hudTimer = 0;
/**
 * Saltos EFECTUADOS y separacion maxima de los pies respecto al suelo.
 *
 * Contadores y no «esta en el aire ahora», por lo mismo que los del barrido: un
 * vuelo dura 0.4 s y en una maquina lenta cabe entero entre dos sondeos.
 */
let jumps = 0;
let airPeak = 0;
/**
 * Intents ENVIADAS al nucleo con cada accion puesta, acumuladas.
 *
 * Es lo que permite a la prueba de humo afirmar que un boton llega a la Intent
 * sin depender del paisaje: que sembrar plante algo depende de tener semillas y
 * una casilla que lo admita, y eso ya lo miden los tests del nucleo. Aqui se
 * mide la otra mitad, que el toque llega.
 */
const sent = { harvest: 0, jump: 0, use: 0 };

/** Ticks desde la ultima accion, para repetir al mantener pulsado. */
let actionTicks = 0;
/** 15 ticks a 60 Hz son cuatro acciones por segundo, la cadencia de siempre. */
const ACTION_REPEAT_TICKS = 15;
/**
 * Lo recolectado y lo ultimo que se saco, para decirlo en el HUD.
 *
 * El barrido y los escombros ya se dibujan, pero son un destello de 0.22 s y no
 * dicen QUE ha salido. El 3D no lleva inventario en pantalla, asi que sin esto
 * talar un arbol se veria como que el arbol desaparece y ya.
 */
let gathered = 0;

function frame(now: number): void {
  const raw = (now - last) / 1000;
  last = now;
  // El peor frame se mide SIN recortar: recortarlo ocultaria justo el tiron.
  if (raw > worstFrame) worstFrame = raw;
  const dt = Math.min(MAX_FRAME_SECONDS, raw);
  fpsFrames++;
  fpsWindow += dt;
  if (fpsWindow >= 1) {
    fps = fpsFrames / fpsWindow;
    worstFrameMs = worstFrame * 1000;
    fpsWindow = 0;
    fpsFrames = 0;
    worstFrame = 0;
  }

  // El mando da un vector de PANTALLA; la camara lo pasa a mundo. Va aqui y no
  // en el nucleo: la Intent sigue siendo de mundo (regla 5).
  const move = controls.moveVector();
  const fwd = camera.forward();
  const rgt = camera.right();
  const intent = emptyIntent();
  intent.moveX = fwd.x * -move.y + rgt.x * move.x;
  intent.moveY = fwd.y * -move.y + rgt.y * move.x;
  intent.run = controls.running;
  // La mirada es la de la camara, decision del autor: se acciona hacia donde se
  // mira, con el rumbo real y su inclinacion, que inclinan el sector del golpe
  // (regla 12).
  intent.aimX = fwd.x;
  intent.aimY = fwd.y;
  intent.aimZ = Math.sin(camera.lookPitch);

  // Con escala cero el acumulador no avanza y la simulacion queda congelada; a
  // 64x corren los ticks que toquen, que con el techo de frame son a lo sumo
  // 0.25 s de mundo por frame y escala.
  // Sin cursor capturado el juego esta en pausa (`pointer-lock.ts`): como la
  // pausa del panel de desarrollo, escala cero.
  const paused = mouseLook.paused;
  const scaled = paused ? 0 : dt * dev.timeScale;
  accumulator += scaled;

  // Los pestillos (salto, accion, usar) se recogen SOLO si este frame
  // corre algun tick. La simulacion va a 60 Hz y la pantalla a lo que de: a mas
  // de 60 Hz muchos frames no llevan tick, y recogerlos ahi los tiraba en
  // silencio —medido en un modelo del bucle, un 32 % de las pulsaciones a 90 Hz,
  // un 50 % a 120 y un 58 % a 144; a 60, del 0,5 al 2,5 % segun el temblor—.
  // Asi esperan en el mando al primer frame con tick. Con el tiempo detenido
  // (pausa) si se recogen, y se pierden: lo pulsado en pausa no se dispara al
  // reanudar.
  const collect = accumulator >= TICK_DT || scaled === 0;
  // El salto se consume una vez y solo entra en el PRIMER tick del frame: con
  // un frame lento el bucle corre varios ticks seguidos, y repartir el mismo
  // salto entre todos encadenaria saltos en el aire.
  let jump = collect && controls.takeJump();
  let action = collect && controls.takeAction();
  let use = collect && controls.takeUse();
  // Las peticiones del inventario (mano, intercambiar, tirar, fabricar) no se
  // tiran en pausa: esperan al primer frame con tick.
  let asked = accumulator >= TICK_DT ? items.take() : null;
  // Se copia cada frame: asi reiniciar o abrir el panel se resuelve solo.
  state.survivalFrozen = dev.survivalFrozen;
  while (accumulator >= TICK_DT) {
    intent.jump = jump;
    jump = false;
    intent.use = use;
    use = false;
    if (asked) {
      intent.select = asked.select;
      intent.craft = asked.craft;
      intent.moveFrom = asked.moveFrom;
      intent.moveTo = asked.moveTo;
      intent.discard = asked.discard;
      asked = null;
    } else {
      intent.select = intent.craft = intent.moveFrom = intent.moveTo = intent.discard = -1;
    }

    // Mantener el boton repite cuatro veces por segundo, que es la cadencia de
    // siempre (`ACTION_REPEAT_TICKS`, 15 ticks a 60 Hz). Se cuenta en TICKS y
    // no en tiempo real para que sea la misma con cualquier ritmo de fotograma.
    intent.harvest = action;
    action = false;
    if (controls.actionHeld && ++actionTicks >= ACTION_REPEAT_TICKS) {
      intent.harvest = true;
      actionTicks = 0;
    }
    if (!controls.actionHeld) actionTicks = 0;

    // La Intent se guarda en vez de pasarse en linea: hace falta saber si se
    // acciono para lanzar el barrido, aunque no se derribara nada.
    const accionando = intent.harvest;
    if (intent.harvest) sent.harvest++;
    if (intent.jump) sent.jump++;
    if (intent.use) sent.use++;
    const pisabaAntes = state.entities.grounded[state.playerId];
    step(state, intent);
    // Usar una estacion abre su panel: sus recetas solo se ven asi (decision
    // del autor). Sale del nucleo, que es quien sabe que se miraba.
    if (state.lastOpened) items.openStation(state.lastOpened.station);
    // Cuenta el despegue de verdad, no la tecla: saltar contra el techo de un
    // salto imposible no suma.
    if (pisabaAntes && !state.entities.grounded[state.playerId] && intent.jump) jumps++;
    const gap =
      state.entities.z[state.playerId] -
      state.world.floorHeightAt(state.entities.x[state.playerId], state.entities.y[state.playerId]);
    if (gap > airPeak) airPeak = gap;
    if (accionando) {
      // El barrido recorre el BORDE CURVO DEL AREA REAL del golpe, pedido del
      // autor: el extremo de cada rayo del sector, ya cortado por el terreno,
      // que sale de los ojos en las tres vistas. Es el mismo golpe que acaba de
      // decidir la simulacion. Sale siempre, haya algo que golpear o no: es el
      // gesto, no el resultado.
      const e = state.entities;
      const id = state.playerId;
      const eye = { x: e.x[id], y: e.y[id], z: e.z[id] + EYE_HEIGHT };
      effects.spawnSlash(
        slashEdge(eye, strikeOf(state.world, e, id).rays),
        camera.projection === 'primera' ? SLASH_FP_HALF_WIDTH : SLASH_HALF_WIDTH,
      );
    }
    // Lo golpeado que siguio en pie suelta esquirlas: mas pequenas, apagadas y
    // semitransparentes que los escombros de romper (decision del autor).
    for (const hit of state.lastHits) {
      const box = hitboxAt(state.world, hit.x, hit.y);
      effects.spawnChips(
        hit.x,
        hit.y,
        debrisPalette(hit.feature),
        state.world.levelAt(hit.x, hit.y),
        box ? box.z1 - box.z0 : 1,
      );
    }
    for (const hit of state.lastHarvest) {
      // La rama de un arbol a mano no lo derriba: sus esquirlas ya salieron.
      if (!hit.felled) continue;
      gathered += hit.amount + hit.seeds;
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

  // Los efectos avanzan una sola vez por frame, y su propia regla les garantiza
  // un fotograma de vida por corto que sea: un barrido dura 0.22 s y en una
  // maquina lenta cabria entero entre dos fotogramas. Con el tiempo ESCALADO:
  // pausar los congela y a 64x no inundan la pantalla.
  effects.advance(scaled);
  // La receta mantenida se carga.
  items.frame();
  // Lo que entro o salio del inventario este frame, al registro. Con tiempo
  // real: es interfaz, y en pausa no cambia nada que registrar.
  const totals = state.inventory.totals();
  feed.pushDeltas(inventoryDelta(feedBase, totals));
  feedBase = totals;
  feed.advance(dt);
  drawFeed();
  // La camara va con ellos porque la cinta del barrido se orienta hacia el ojo:
  // tumbada en el suelo se veia de canto al bajar la elevacion. Se pasa la del
  // frame ANTERIOR —`camera.follow` es unas lineas mas abajo—, y eso no se nota:
  // un frame de desfase en el giro de una cinta de 3 px no tiene efecto visible,
  // y adelantar el `follow` obligaria a recolocarlo todo por nada.
  effectsView.update(effects, state.world, camera.active.position);

  const look = controls.takeLook();
  camera.orbit(look.dx, look.dy);
  const turn = mouseLook.takeTurn();
  camera.turn(turn.dx, turn.dy);
  camera.zoom(controls.takeZoom());
  // El catalejo de la primera persona vuelve solo al soltar la pinza.
  camera.relaxSpyglass(dt, controls.zoomHeld);

  syncChunks();
  overlays.updateReticle(state);
  overlays.syncDebug(
    state.world,
    [...views.keys()].map((k) => k.split(',').map(Number) as [number, number]),
    dev.showChunkBorders,
    dev.showBiomeBorders,
  );
  skyEl.style.background = tintCss(skyTint(state.tick));

  const px = state.entities.x[state.playerId];
  const py = state.entities.y[state.playerId];
  // La altura que LLEVA, no la del suelo: con gravedad dejan de ser lo mismo, y
  // leyendo el suelo el personaje seguiria pegado al terreno saltando.
  const ph = state.entities.z[state.playerId];
  water.position.set(px, WATER_Y, py);

  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  // La niebla solo con fuga: en la isometrica lavaba la escena entera.
  scene.fog = camera.projection === 'orto' ? null : haze;
  // La camara no atraviesa bloques ni objetos (pedido del autor): choca con el
  // mismo terreno y los mismos hitboxes que el golpe. Los ejes de three.js
  // (`y` arriba) pasan a los del nucleo (`z` arriba).
  const pivot = { x: px, y: py, z: ph + EYE_HEIGHT };
  camera.follow(px, ph, py, w, h, (back, want) =>
    cameraClearance(
      pivot,
      { x: back.x, y: back.z, z: back.y },
      want,
      (x, y) => state.world.groundHeightAt(x, y),
      (tx, ty) => hitboxAt(state.world, tx, ty),
    ),
  );
  if (player) {
    billboards.moveTo(player, px, ph, py);
    // Desde dentro no se dibuja el cuerpo: en primera persona, y cuando la
    // colision deja la camara pegada al personaje, que llenaria la pantalla.
    player.visible = camera.projection !== 'primera' && camera.camDistance >= HIDE_PLAYER_BELOW;
  }
  renderer.render(scene, camera.active);

  // Muerto, el cursor se suelta para poder pulsar «Reiniciar»; el aviso de
  // pausa no se pinta encima de esa pantalla.
  const dead = state.entities.alive[state.playerId] === 0;
  if (dead) mouseLook.release();
  if (mouseLook.locked) everLocked = true;
  pauseEl.classList.toggle('show', paused && !dead);
  document.body.classList.toggle('dead', dead);
  const hint = everLocked ? 'Haz clic para continuar' : 'Haz clic para jugar';
  if (pauseHint.textContent !== hint) pauseHint.textContent = hint;

  // El HUD a 10 Hz: basta para que las barras respondan y no reescribe el DOM
  // en cada frame.
  hudTimer += dt;
  if (hudTimer >= 0.1) {
    hudTimer = 0;
    const info = renderer.info.render;
    hud.update(state, fps, `${info.calls} · ${(triangles / 1000).toFixed(0)}k tri`);
    items.render(state);
    dev.observe(
      state.inventory.totals(),
      state.entities.hunger[state.playerId],
      state.world.biomeAt(Math.floor(px), Math.floor(py)),
    );
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

/**
 * Estado legible desde fuera, para la prueba de humo y las medidas: permite a
 * Playwright leer el estado real del juego en vez de adivinarlo por pixeles.
 *
 * Los sitios del mundo a los que ir a mirar algo (`spots()`) son una funcion y
 * no un campo porque recorren cientos de miles de casillas del generador: como
 * campo se pagarian en cada lectura.
 */
Object.defineProperty(window, '__verdant', {
  get: () => {
    const id = state.playerId;
    const e = state.entities;
    const tx = Math.floor(e.x[id]);
    const ty = Math.floor(e.y[id]);
    const biome = state.world.biomeAt(tx, ty);
    return {
      tick: state.tick,
      seed: state.world.seed,
      clock: clockLabel(state.tick),
      /** Opacidad de la vela de la noche. Cero a pleno dia. */
      night: skyTint(state.tick).alpha,
      distance: camera.distance,
      yaw: camera.yaw,
      pitch: camera.pitch,
      projection: camera.projection,
      /** Campo de vision en uso: el catalejo de la primera persona lo estrecha. */
      fov: camera.fov,
      /** El angulo elegido en la barra del ojo, y si la barra esta abierta. */
      fpFov: camera.fpFov,
      /** El raton capturado de PC y la pausa que trae soltarlo. */
      paused: mouseLook.paused,
      pointerLocked: mouseLook.locked,
      mouseMode: mouseLook.mouseMode,
      fovPanel: fovPanel.open,
      /** A que distancia del pivote ha quedado la camara tras la colision. */
      camDistance: camera.camDistance,
      /** Cuanto queda la camara por ENCIMA del suelo que tiene debajo. */
      camClearance:
        camera.active.position.y -
        state.world.groundHeightAt(camera.active.position.x, camera.active.position.z),
      playerVisible: player?.visible ?? false,
      running: controls.running,
      dev: dev.active,
      timeScale: dev.timeScale,
      survivalFrozen: dev.survivalFrozen,
      gridChunks: overlays.gridCount,
      borderSegments: overlays.borderSegmentCount,
      misplacedBorders: overlays.misplacedBorderCount,
      /** Casillas que marca la reticula: las que la accion alcanza. */
      reticleTiles: overlays.reticleTiles,
      /** Lo recolectado, para poder comprobar la accion desde fuera. */
      gathered,
      /** Barridos y escombros DIBUJADOS, acumulados. Ver `EffectsView`. */
      slashesDrawn: effectsView.slashesDrawn,
      debrisDrawn: effectsView.debrisDrawn,
      chipsDrawn: effectsView.chipsDrawn,
      effects: effects.tally,
      /** Lo que mide cada cosa en BLOQUES, medido del dibujo. Ver `BillboardSet`. */
      sizes: billboards.sizes,
      /** Tronco desnudo de los arboles colocados, medido del dibujo. */
      trunks: billboards.trunks,
      /** La copa de cada especie, medida del dibujo, junto a la de su especie real. */
      crowns: billboards.crowns,
      facing: [e.facingX[id], e.facingY[id]],
      /** Hacia donde mira la camara, que es de donde sale la mirada. */
      aim: [camera.forward().x, camera.forward().y],
      /** Inclinacion de la mirada del jugador, como la tiene la simulacion. */
      lookZ: e.lookZ[id],
      // Las casillas de los objetos cuyo hitbox toca el golpe (regla 12), del mas
      // cercano al mas lejano, y donde se sembraria.
      reach: actionReach(state.world, e, id).map((t) => [t.x, t.y]),
      plantTile: ((t) => (t ? [t.x, t.y] : null))(targetTile(state.world, e, id)),
      terrain: TERRAIN_NAMES[state.world.terrainAt(tx, ty)],
      level: state.world.levelAt(tx, ty),
      biome: BIOME_NAMES[biome],
      balanced: state.world.isBiomeBalanced(toChunkCoord(tx), toChunkCoord(ty), biome),
      x: e.x[id],
      y: e.y[id],
      z: e.z[id],
      grounded: !!e.grounded[id],
      jumps,
      airPeak,
      sent: { ...sent },
      /**
       * Velocidad que el nucleo le da al personaje, en casillas/s. `vx`/`vy` se
       * fijan antes de resolver la colision, asi que valen marcha o carrera
       * exactas aunque se este empujando contra un muro.
       */
      speed: Math.hypot(e.vx[id], e.vy[id]),
      health: e.health[id],
      hunger: e.hunger[id],
      alive: e.alive[id] === 1,
      deadShown: hud.deadShown,
      hudOpen: hud.hudOpen,
      inventoryOpen: items.open,
      inventory: state.inventory.totals(),
      /**
       * Las casillas: objeto (o -1), cuantos, usos que le quedan y si existen
       * ahora (las de una prenda que no se lleva, no).
       */
      slots: Array.from(state.inventory.items).map((item, i) => ({
        item,
        count: state.inventory.counts[i],
        wear: state.inventory.wear[i],
        open: state.inventory.isOpen(i),
      })),
      /** Casillas abiertas: 16, y mas con la ropa. */
      openSlots: state.inventory.openSlots(),
      /** La prenda de cada hueco (cintura, espalda), o null. */
      worn: [...state.inventory.worn],
      /** De donde son las recetas que ensena el panel: 0 a mano, 1 mesa, 2 horno. */
      panelStation: items.station,
      /** Estaciones mandadas a la escena. Acumulado. */
      stationsDrawn: stations.drawn,
      /** Las estaciones a 5 casillas o menos del jugador: casilla y feature. */
      stationTiles: stationTilesAround(state, 5),
      selectedSlot: state.inventory.selected,
      itemsSent: { ...items.sent },
      inventoryPage: items.currentPage,
      /** Lo que dice el registro de objetos, de la mas vieja a la mas nueva. */
      feed: feed.lines.map((l) => l.text),
      discardAsk: items.askingDiscard,
      lastUsed: state.lastUsed,
      chunks: state.world.loadedChunkCount,
      tracked: state.world.trackedChunkCount,
      fps,
      /** Frame mas lento del ultimo segundo: es lo que delata un tiron. */
      worstFrameMs,
      triangles,
      spots: () => ({
        relief: reliefAround(state),
        cliffSpot: cliffSpot(state),
        peakSpot: peakSpot(state),
        mineralSpot: mineralSpot(state),
        stoneOreSpot: stoneOreSpot(state),
        berrySpot: berrySpot(state),
      }),
    };
  },
});
