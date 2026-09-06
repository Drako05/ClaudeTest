/**
 * Spike de 3D con estetica de sprites. **De usar y tirar.**
 *
 * Existe para decidir una cosa con una medida en vez de discutiendola: si un
 * mundo con relieve de verdad se entiende con la camara libre, y a cuantos FPS
 * va en el telefono del autor. El isometrico no se toca; si esto no convence, se
 * borra la carpeta y no se ha perdido nada.
 *
 * Lo importante: lee el **mismo `World`** con la **misma semilla** que el juego.
 * `packages/sim` no sabe que existe una camara —regla 1 y regla 6—, asi que
 * mundo, relieve, biomas, ecologia y reloj entran aqui intactos. De hecho el
 * bucle es el de `main.ts` recortado.
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
import { CHUNK_SIZE, Feature, TICK_DT, emptyIntent, type Terrain } from '@verdant/shared';
import { createGame, step, type GameState } from '@verdant/sim';
import { TERRAIN_RGB, shadeStepAt, SHADE_STEPS } from '../tiles.js';
import { BillboardSet } from './billboards.js';
import { OrbitCamera } from './camera.js';
import { Controls } from './controls.js';
import { chunkMesh } from './terrain-mesh.js';

/** Radio de chunks que se mallan alrededor del jugador. */
const RADIUS = 3;
/** Altura del plano de agua, justo bajo el nivel donde empieza la tierra. */
const WATER_Y = -0.18;

const canvas = document.getElementById('view') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLElement;
const projButton = document.getElementById('proj') as HTMLButtonElement;

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

const seed = seedFromLocation();
let state: GameState = createGame(seed);
const spawn = state.world.findSpawn(0, 0);
state.entities.x[state.playerId] = spawn.x;
state.entities.y[state.playerId] = spawn.y;
state.world.ensureAround(spawn.x, spawn.y, RADIUS);

const camera = new OrbitCamera();
const controls = new Controls(canvas);

/**
 * El interruptor de proyeccion, con boton propio.
 *
 * La tecla P no existe en un telefono, y el telefono es justo donde hay que
 * juzgar esto: sin boton, la mitad del experimento —comparar ortografica contra
 * perspectiva— quedaba fuera de alcance en el unico sitio donde importa.
 */
function toggleProjection(): void {
  camera.toggleProjection();
  const orto = camera.projection === 'orto';
  projButton.firstChild!.textContent = orto ? 'Ortográfica' : 'Perspectiva';
  projButton.querySelector('small')!.textContent = orto
    ? 'tocar para perspectiva'
    : 'tocar para ortográfica';
}
projButton.addEventListener('click', toggleProjection);
controls.onToggleProjection = toggleProjection;

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
  // La franja de brillo es la de `tiles.ts`, para que el mundo se vea el mismo.
  const k = 0.9 + (shadeStepAt(seed, wx, wy) / (SHADE_STEPS - 1)) * 0.2;
  return [(rgb[0] / 255) * k, (rgb[1] / 255) * k, (rgb[2] / 255) * k];
}

interface ChunkView {
  readonly mesh: Mesh;
  readonly props: import('three').Sprite[];
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
  const props: import('three').Sprite[] = [];
  const scratch = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  state.world.readFeatures(chunk, scratch);
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const feature = scratch[ly * CHUNK_SIZE + lx] as Feature;
      if (feature === Feature.None) continue;
      const wx = cx * CHUNK_SIZE + lx;
      const wy = cy * CHUNK_SIZE + ly;
      const sprite = billboards.spawn(feature, wx + 0.5, state.world.groundHeightAt(wx + 0.5, wy + 0.5), wy + 0.5);
      if (sprite) {
        scene.add(sprite);
        props.push(sprite);
      }
    }
  }
  return { mesh, props, triangles: data.triangles, revision: chunk.revision };
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
  for (const sprite of view.props) scene.remove(sprite);
  views.delete(key);
}

// --------------------------------------------------------------- bucle

let last = performance.now();
let accumulator = 0;
let fpsFrames = 0;
let fpsWindow = 0;
let fps = 0;
let worstFrame = 0;

function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  fpsFrames++;
  fpsWindow += dt;
  if (dt > worstFrame) worstFrame = dt;
  if (fpsWindow >= 1) {
    fps = fpsFrames / fpsWindow;
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

  accumulator += dt;
  let guard = 8;
  while (accumulator >= TICK_DT && guard-- > 0) {
    step(state, intent);
    accumulator -= TICK_DT;
  }
  accumulator = Math.min(accumulator, TICK_DT);

  const look = controls.takeLook();
  camera.orbit(look.dx, look.dy);
  camera.zoom(controls.takeZoom());

  syncChunks();

  const px = state.entities.x[state.playerId];
  const py = state.entities.y[state.playerId];
  const ph = state.world.groundHeightAt(px, py);
  if (player) billboards.moveTo(player, px, ph, py);
  water.position.set(px, WATER_Y, py);

  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  scene.fog = camera.projection === 'perspectiva' ? haze : null;
  camera.follow(px, ph, py, w, h);
  renderer.render(scene, camera.active);

  const info = renderer.info.render;
  hud.textContent =
    `${fps.toFixed(0)} FPS · ${camera.projection}\n` +
    `${(triangles / 1000).toFixed(1)}k triangulos · ${info.calls} draw calls\n` +
    `pos ${px.toFixed(0)}, ${py.toFixed(0)} · altura ${ph.toFixed(1)} · semilla ${seed}\n` +
    `arrastra a la derecha para girar`;

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

function seedFromLocation(): number {
  try {
    const raw = new URLSearchParams(window.location.search).get('seed');
    if (raw !== null && raw !== '') return Number(raw) >>> 0;
  } catch {
    // Ignorado a proposito: sin URL legible se juega la semilla de siempre.
  }
  return 12345;
}
