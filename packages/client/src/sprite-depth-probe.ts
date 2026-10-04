/**
 * La medida de `sprite-depth.ts`: cuanto del dibujo del jugador tapa el
 * terreno sin que su cuerpo hubiera quedado tapado, y al reves.
 *
 * Los animales son de bloques desde el 2026-10-03 y su profundidad es la de su
 * modelo; el jugador sigue siendo un sprite, con la profundidad de la caja de
 * su cuerpo pixel a pixel. Esta sonda lo mide: una escena fuera de pantalla,
 * con su propio lienzo y el sprite real del jugador (`playerSprite`), sobre un
 * suelo de bloques unitarios. Cinco casos, con el jugador siempre a la
 * distancia de colision (`BODY_RADIUS`) de lo que tiene al lado:
 * - **lado**: un escalon de 1 a su costado, con la camara mirando casi a lo
 *   largo de la pared;
 * - **esquina**: pasada justo la arista vertical de una meseta;
 * - **cornisa**: la camara en lo alto de un escalon y el cuerpo al pie (las
 *   capturas del autor del 2026-10-03, con una liebre);
 * - **detras**: un escalon a su espalda, con la camara en el lado bajo;
 * - **delante**: un pilar entre la camara y el cuerpo.
 * Cada caso, con 3 alturas de camara.
 *
 * La verdad es el cuerpo: la caja de `body-ray.ts`. Por cada pixel con tinta
 * se lanza en JS el rayo de la camara, y se cuenta:
 * - **mal tapado**: lo tapa el terreno, pero el rayo toca la caja antes;
 * - **mal visto**: se ve, pero el terreno esta antes que la caja;
 * - **fuera**: la tinta cuyo rayo no toca la caja.
 *
 * Se mide pixeles y no un contador, por la leccion de `docs/efectos.md`: lo
 * que se manda dibujar no es lo que se ve.
 */

import {
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { BODY_RADIUS } from '@verdant/sim';
import { depthPatchMisses } from './sprite-depth.js';
import { playerSprite } from './billboards.js';
import { rayAabb, rayBodyBox, type BodyBox, type V3 } from './body-ray.js';

const SIZE = 200;
const FOV = 45;
/** A que distancia del centro del animal va la camara. */
const DISTANCE = 6;
/** Alturas de camara, en grados sobre la horizontal: a ras, media y alta. */
const ELEVATIONS = [5, 35, 65];

/** Un bloque: la casilla (`x`, `z`) y cuantos niveles sube sobre el suelo. */
type Block = readonly [number, number, number];

interface ProbeCase {
  name: string;
  blocks: Block[];
  /** Los pies del animal. */
  foot: readonly [number, number];
  /** Desde donde mira la camara, en grados: 0 es desde +z, 90 desde +x. */
  azimuth: number;
  /** Alturas de camara y distancia, si no son las de siempre. */
  elevations?: number[];
  distance?: number;
}

const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Los casos, con los bloques que suben sobre el suelo. */
function cases(): ProbeCase[] {
  const r = BODY_RADIUS;
  return [
    // Un escalon a la izquierda (x < 0), a lo largo de z; la camara, casi a lo
    // largo de la pared, que es cuando su cara se mete en la lamina.
    { name: 'lado', blocks: range(-4, 4).map((z) => [-1, z, 1] as Block), foot: [r, 0.5], azimuth: 25 },
    // La arista vertical de una meseta (x < 0, z < 0) entre la camara y el
    // animal, que esta justo pasada la esquina.
    {
      name: 'esquina',
      blocks: range(-4, -1).flatMap((x) => range(-4, -1).map((z) => [x, z, 1] as Block)),
      foot: [r, 0.3],
      azimuth: 200,
    },
    // Las capturas del autor: el jugador encima de un escalon, mirando a un
    // animal que esta al pie. La camara va en la meseta, a la altura de sus
    // ojos o algo mas arriba.
    {
      name: 'cornisa',
      blocks: range(-4, 4).flatMap((x) => range(-5, -1).map((z) => [x, z, 1] as Block)),
      foot: [0.5, r],
      azimuth: 200,
      elevations: [38, 50, 62],
      distance: 4,
    },
    // Un escalon a su espalda (z < 0), con la camara en el lado bajo.
    { name: 'detras', blocks: range(-4, 4).map((x) => [x, -1, 1] as Block), foot: [0.5, r], azimuth: 0 },
    // Un pilar de dos niveles entre la camara y el animal.
    { name: 'delante', blocks: [[0, 2, 2]], foot: [0.5, -0.5], azimuth: 0 },
  ];
}

export interface ProbeCaseResult {
  /** El caso: `cornisa`. */
  name: string;
  /** Pixeles con tinta, sumados en las tres alturas. */
  ink: number;
  /** Mal tapados, en fraccion de la tinta. */
  wrongHidden: number;
  /** Mal vistos, en fraccion de lo que el cuerpo tendria tapado. */
  wrongShown: number;
  /** Lo que el cuerpo tendria tapado, en fraccion de la tinta. */
  truthHidden: number;
  /** Tinta fuera de la caja del cuerpo, en fraccion de la tinta. */
  outside: number;
  /** La peor vista en mal tapados: su fraccion y cual es. */
  worst: number;
  worstView: string;
}

export interface DepthProbe {
  cases: ProbeCaseResult[];
  /** Materiales a los que no se les pudo reescribir el shader. */
  misses: number;
  /** La vista pedida en `snap`, como `data:` URL, para mirarla. */
  snapshot?: string;
}

/**
 * Una vista de la sonda para sacarla como imagen: el caso y la altura. Con
 * `box`, en lugar del sprite se dibuja una caja maciza del tamano del cuerpo.
 */
export interface ProbeView {
  caso: string;
  elevation: number;
  box?: boolean;
}

const BACKGROUND = 0x00ff00;
const TERRAIN = 0x0000ff;

export function spriteDepthProbe(snap?: ProbeView): DepthProbe | null {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  } catch {
    return null;
  }
  const sprite = playerSprite();
  if (!sprite) return null;
  renderer.setSize(SIZE, SIZE, false);
  const target = new WebGLRenderTarget(SIZE, SIZE);
  const scene = new Scene();
  scene.background = new Color(BACKGROUND);
  scene.add(sprite);
  const height: number = sprite.userData.visible;
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const cube = new BoxGeometry(1, 1, 1);
  // El suelo y lo que sube, en dos azules para poder mirar la captura; la
  // cuenta solo mira que el rojo sea 0 y el azul 255.
  const groundMaterial = new MeshBasicMaterial({ color: TERRAIN });
  const terrainMaterial = new MeshBasicMaterial({ color: 0x0070ff });
  const bodyMesh = new Mesh(cube, new MeshBasicMaterial({ color: 0x9c7650 }));
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  const alone = new Uint8Array(SIZE * SIZE * 4);

  const render = (into: Uint8Array): void => {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, into);
    renderer.setRenderTarget(null);
  };
  const isBackground = (p: Uint8Array, i: number) => p[i] === 0 && p[i + 1] === 255 && p[i + 2] === 0;
  const isTerrain = (p: Uint8Array, i: number) => p[i] === 0 && p[i + 2] === 255;

  const results: ProbeCaseResult[] = [];
  let snapshot: string | undefined;
  for (const c of cases()) {
    // El suelo, un nivel por debajo de los pies, y los bloques encima.
    const solids: Array<[V3, V3]> = [];
    const meshes: Mesh[] = [];
    const addBlock = (x: number, z: number, y0: number, y1: number) => {
      const mesh = new Mesh(cube, y0 < 0 ? groundMaterial : terrainMaterial);
      mesh.scale.set(1, y1 - y0, 1);
      mesh.position.set(x + 0.5, (y0 + y1) / 2, z + 0.5);
      scene.add(mesh);
      meshes.push(mesh);
      solids.push([
        [x, y0, z],
        [x + 1, y1, z + 1],
      ]);
    };
    for (const x of range(-5, 5)) for (const z of range(-5, 5)) addBlock(x, z, -1, 0);
    for (const [x, z, h] of c.blocks) addBlock(x, z, 0, h);

    // Los pies en su sitio, como `Billboards.moveTo`.
    sprite.position.set(c.foot[0], sprite.scale.y / 2 - sprite.userData.lift, c.foot[1]);
    const box: BodyBox = {
      center: [c.foot[0], height / 2, c.foot[1]],
      facingX: 1,
      facingZ: 0,
      halfLength: BODY_RADIUS,
      halfHeight: height / 2,
      halfWidth: BODY_RADIUS,
    };
    const total = { ink: 0, wrongHidden: 0, wrongShown: 0, truthHidden: 0, outside: 0 };
    let worst = 0;
    let worstView = '';
    for (const elevation of c.elevations ?? ELEVATIONS) {
      const az = (c.azimuth * Math.PI) / 180;
      const el = (elevation * Math.PI) / 180;
      const distance = c.distance ?? DISTANCE;
      camera.position.set(
        box.center[0] + Math.sin(az) * Math.cos(el) * distance,
        box.center[1] + Math.sin(el) * distance,
        box.center[2] + Math.cos(az) * Math.cos(el) * distance,
      );
      camera.lookAt(box.center[0], box.center[1], box.center[2]);
      camera.updateMatrixWorld();

      for (const m of meshes) m.visible = false;
      render(alone);
      for (const m of meshes) m.visible = true;
      render(pixels);
      if (snap && snap.caso === c.name && snap.elevation === elevation) {
        if (snap.box) {
          sprite.visible = false;
          bodyMesh.scale.set(BODY_RADIUS * 2, height, BODY_RADIUS * 2);
          bodyMesh.position.set(...box.center);
          scene.add(bodyMesh);
        }
        renderer.render(scene, camera);
        snapshot = canvas.toDataURL('image/png');
        scene.remove(bodyMesh);
        sprite.visible = true;
      }

      const counts = { ink: 0, wrongHidden: 0, wrongShown: 0, truthHidden: 0, outside: 0 };
      const o: V3 = [camera.position.x, camera.position.y, camera.position.z];
      const dir = new Vector3();
      for (let py = 0; py < SIZE; py++) {
        for (let px = 0; px < SIZE; px++) {
          const i = (py * SIZE + px) * 4;
          if (isBackground(alone, i)) continue;
          counts.ink++;
          dir
            .set(((px + 0.5) / SIZE) * 2 - 1, ((py + 0.5) / SIZE) * 2 - 1, 0.5)
            .unproject(camera)
            .sub(camera.position)
            .normalize();
          const d: V3 = [dir.x, dir.y, dir.z];
          const hidden = isTerrain(pixels, i);
          const tBody = rayBodyBox(o, d, box);
          if (tBody === null) {
            counts.outside++;
            continue;
          }
          let tSolid = Infinity;
          for (const [min, max] of solids) {
            const t = rayAabb(o, d, min, max);
            if (t !== null && t < tSolid) tSolid = t;
          }
          if (tSolid < tBody) {
            counts.truthHidden++;
            if (!hidden) counts.wrongShown++;
          } else if (hidden) {
            counts.wrongHidden++;
          }
        }
      }
      total.ink += counts.ink;
      total.wrongHidden += counts.wrongHidden;
      total.wrongShown += counts.wrongShown;
      total.truthHidden += counts.truthHidden;
      total.outside += counts.outside;
      const share = counts.ink > 0 ? counts.wrongHidden / counts.ink : 0;
      if (share > worst) {
        worst = share;
        worstView = `a ${elevation}°`;
      }
    }
    results.push({
      name: c.name,
      ink: total.ink,
      wrongHidden: total.ink > 0 ? total.wrongHidden / total.ink : 0,
      wrongShown: total.truthHidden > 0 ? total.wrongShown / total.truthHidden : 0,
      truthHidden: total.ink > 0 ? total.truthHidden / total.ink : 0,
      outside: total.ink > 0 ? total.outside / total.ink : 0,
      worst,
      worstView,
    });
    for (const m of meshes) scene.remove(m);
  }

  cube.dispose();
  terrainMaterial.dispose();
  groundMaterial.dispose();
  (bodyMesh.material as MeshBasicMaterial).dispose();
  sprite.material.dispose();
  target.dispose();
  renderer.dispose();
  return { cases: results, misses: depthPatchMisses.length, snapshot };
}
