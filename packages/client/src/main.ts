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
  TERRAIN_NAMES,
  TICK_DT,
  emptyIntent,
  type Terrain,
} from '@verdant/shared';
import {
  actionArea,
  actionReach,
  clockLabel,
  skipTime,
  step,
  toChunkCoord,
  type GameState,
} from '@verdant/sim';
import { DevTools } from './devtools.js';
import { Effects } from './effects.js';
import { debrisPalette } from './palette.js';
import { EffectsView } from './effects-view.js';
import { TERRAIN_RGB, shadeStepAt, SHADE_STEPS } from './art.js';
import { BillboardSet } from './billboards.js';
import { buildShadows, type ShadowSpot } from './shadows.js';
import { OrbitCamera } from './camera.js';
import { Controls } from './controls.js';
import { chunkMesh } from './terrain-mesh.js';
import { Hud } from './hud.js';
import { Overlays } from './overlays.js';
import { berrySpot, cliffSpot, mineralSpot, peakSpot, reliefAround } from './probes.js';
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
function renderProjButton(): void {
  const orto = camera.projection === 'orto';
  // El ojo se entrecierra en ortografica, que es la vista que lo aplana todo.
  projButton.classList.toggle('flat', orto);
  const label = orto
    ? 'Vista ortográfica; tocar para perspectiva'
    : 'Vista en perspectiva; tocar para ortográfica';
  projButton.setAttribute('aria-label', label);
  projButton.title = label;
}

function toggleProjection(): void {
  camera.toggleProjection();
  renderProjButton();
}
renderProjButton();
projButton.addEventListener('click', toggleProjection);
controls.onToggleProjection = toggleProjection;
controls.bindJumpButton(document.getElementById('jump'));
controls.bindRunButton(document.getElementById('run'));
controls.bindActionButton(document.getElementById('action'));
controls.bindEatButton(document.getElementById('eat'));
controls.bindPlantButton(document.getElementById('plant'));
controls.onRestart = restart;
controls.onToggleInventory = () => hud.toggleInventory();
document.getElementById('restart')?.addEventListener('click', restart);

// El barrido y los escombros. El movimiento sale de `effects.ts`, que es puro y
// ya existia; aqui solo se dibuja (`effects-view.ts`).
const effects = new Effects();
const effectsView = new EffectsView(scene);
const overlays = new Overlays(scene);

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
    dev.observe(Array.from(state.inventory), state.entities.hunger[state.playerId], 0);
  },
});

const billboards = new BillboardSet();
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
  readonly shadows: import('three').InstancedMesh | null;
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
      const prop = billboards.spawn(feature, x, ground, y, seed);
      if (prop) {
        scene.add(prop);
        props.push(prop);
        spots.push({ x, y: ground, z: y, width: billboards.widthOf(feature) });
      }
    }
  }
  // Todas las sombras del chunk en una malla: una draw call en vez de una por
  // elemento. Ver `shadows.ts`.
  const shadows = buildShadows(spots);
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
  gathered = 0;
  jumps = 0;
  airPeak = 0;
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
const sent = { harvest: 0, jump: 0, eat: 0, plant: 0 };

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
  // El salto se consume una vez y solo entra en el PRIMER tick del frame: con
  // un frame lento el bucle corre varios ticks seguidos, y repartir el mismo
  // salto entre todos encadenaria saltos en el aire.
  let jump = controls.takeJump();
  intent.run = controls.running;
  let action = controls.takeAction();
  let eat = controls.takeEat();
  let plant = controls.takePlant();
  // La mirada es la de la camara, decision del autor: se acciona hacia donde se
  // mira. El nucleo la encaja en sus ocho direcciones (regla 12).
  intent.aimX = fwd.x;
  intent.aimY = fwd.y;

  // Con escala cero el acumulador no avanza y la simulacion queda congelada; a
  // 64x corren los ticks que toquen, que con el techo de frame son a lo sumo
  // 0.25 s de mundo por frame y escala.
  const scaled = dt * dev.timeScale;
  accumulator += scaled;
  // Se copia cada frame: asi reiniciar o abrir el panel se resuelve solo.
  state.survivalFrozen = dev.survivalFrozen;
  while (accumulator >= TICK_DT) {
    intent.jump = jump;
    jump = false;
    intent.eat = eat;
    eat = false;
    intent.plant = plant;
    plant = false;

    // Mantener el boton repite cuatro veces por segundo, que es la cadencia de
    // siempre (`HARVEST_REPEAT_TICKS`, 15 ticks a 60 Hz). Se cuenta en TICKS y
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
    if (intent.eat) sent.eat++;
    if (intent.plant) sent.plant++;
    const pisabaAntes = state.entities.grounded[state.playerId];
    step(state, intent);
    // Cuenta el despegue de verdad, no la tecla: saltar contra el techo de un
    // salto imposible no suma.
    if (pisabaAntes && !state.entities.grounded[state.playerId] && intent.jump) jumps++;
    const gap =
      state.entities.z[state.playerId] -
      state.world.groundHeightAt(state.entities.x[state.playerId], state.entities.y[state.playerId]);
    if (gap > airPeak) airPeak = gap;
    if (accionando) {
      effects.spawnSlash(actionReach(state.world, state.entities, state.playerId));
    }
    for (const hit of state.lastHarvest) {
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
  // La camara va con ellos porque la cinta del barrido se orienta hacia el ojo:
  // tumbada en el suelo se veia de canto al bajar la elevacion. Se pasa la del
  // frame ANTERIOR —`camera.follow` es unas lineas mas abajo—, y eso no se nota:
  // un frame de desfase en el giro de una cinta de 3 px no tiene efecto visible,
  // y adelantar el `follow` obligaria a recolocarlo todo por nada.
  effectsView.update(effects, state.world, camera.active.position);

  const look = controls.takeLook();
  camera.orbit(look.dx, look.dy);
  camera.zoom(controls.takeZoom());

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
  if (player) billboards.moveTo(player, px, ph, py);
  water.position.set(px, WATER_Y, py);

  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  scene.fog = camera.projection === 'perspectiva' ? haze : null;
  camera.follow(px, ph, py, w, h);
  renderer.render(scene, camera.active);

  // El HUD a 10 Hz: basta para que las barras respondan y no reescribe el DOM
  // en cada frame.
  hudTimer += dt;
  if (hudTimer >= 0.1) {
    hudTimer = 0;
    const info = renderer.info.render;
    hud.update(state, fps, `${info.calls} · ${(triangles / 1000).toFixed(0)}k tri`);
    dev.observe(
      Array.from(state.inventory),
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
      effects: effects.tally,
      /** Lo que mide cada cosa en BLOQUES, medido del dibujo. Ver `BillboardSet`. */
      sizes: billboards.sizes,
      facing: [e.facingX[id], e.facingY[id]],
      /** Hacia donde mira la camara, que es de donde sale la mirada. */
      aim: [camera.forward().x, camera.forward().y],
      // Las dos cosas y por separado: `area` es la GEOMETRIA del apuntado
      // —siempre tres casillas del anillo— y `reach` las que estan a la altura
      // propia y se pueden accionar. En terreno escalonado difieren.
      area: actionArea(e, id).map((t) => [t.x, t.y]),
      reach: actionReach(state.world, e, id).map((t) => [t.x, t.y]),
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
      inventoryOpen: hud.inventoryOpen,
      inventory: Array.from(state.inventory),
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
        berrySpot: berrySpot(state),
      }),
    };
  },
});
