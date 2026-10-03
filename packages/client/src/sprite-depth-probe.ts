/**
 * La medida de `sprite-depth.ts`: cuanto del dibujo de un animal tapa el
 * terreno sin que su cuerpo hubiera quedado tapado, y al reves.
 *
 * Una escena fuera de pantalla, con su propio lienzo, y la `FaunaView` real
 * —sus materiales, su eleccion de dibujo y su ancla—, sobre un suelo de bloques
 * unitarios. Cinco casos, con el animal siempre a la distancia de colision
 * (`BODY_RADIUS`) de lo que tiene al lado:
 * - **lado**: un escalon de 1 a su costado, con la camara mirando casi a lo
 *   largo de la pared;
 * - **esquina**: pasada justo la arista vertical de una meseta;
 * - **cornisa**: las capturas del autor (2026-10-03), la camara en lo alto de
 *   un escalon y el animal al pie;
 * - **detras**: un escalon a su espalda, con la camara en el lado bajo;
 * - **delante**: un pilar entre la camara y el animal.
 * Cada caso, con 8 rumbos del animal, 3 alturas de camara y dos animales —la
 * liebre, pequena, y el bisonte, largo—.
 *
 * La verdad es el cuerpo: la caja de `body-ray.ts`. Por cada pixel con tinta
 * se lanza en JS el rayo de la camara, y se cuenta:
 * - **mal tapado**: lo tapa el terreno, pero el rayo toca la caja antes;
 * - **mal visto**: se ve, pero el terreno esta antes que la caja;
 * - **fuera**: la tinta cuyo rayo no toca la caja, que es dibujo que no es
 *   cuerpo (un perfil visto de frente, por ejemplo), y **fuera tapado**, la
 *   parte de esa que tapa el terreno.
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
import { Species, Stage } from '@verdant/shared';
import { BODY_RADIUS, EntityKind, EntityStore, type Animal } from '@verdant/sim';
import { depthPatchMisses } from './sprite-depth.js';
import { FaunaView } from './fauna-view.js';
import { rayAabb, rayBodyBox, type BodyBox, type V3 } from './body-ray.js';

const SIZE = 200;
const FOV = 45;
/** A que distancia del centro del animal va la camara. */
const DISTANCE = 6;
/** Alturas de camara, en grados sobre la horizontal: a ras, media y alta. */
const ELEVATIONS = [5, 35, 65];
const HEADINGS = 8;
const ANIMALS: Array<[Species, Stage]> = [
  [Species.Hare, Stage.Adult],
  [Species.Bison, Stage.Adult],
];

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
  /** El caso y el animal: `cornisa/Hare`. */
  name: string;
  /** Pixeles con tinta, sumados en todas las vistas. */
  ink: number;
  /** Mal tapados, en fraccion de la tinta. */
  wrongHidden: number;
  /** Mal vistos, en fraccion de lo que el cuerpo tendria tapado. */
  wrongShown: number;
  /** Lo que el cuerpo tendria tapado, en fraccion de la tinta. */
  truthHidden: number;
  /** Tinta fuera de la caja del cuerpo, en fraccion de la tinta. */
  outside: number;
  /** De esa tinta de fuera, la que tapa el terreno, en fraccion de la tinta. */
  outsideHidden: number;
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
 * Una vista de la sonda para sacarla como imagen: el caso, la especie, el
 * rumbo en grados y la altura. Con `box`, en lugar del sprite se dibuja una
 * caja maciza del tamano del cuerpo: lo que haria un animal de bloques.
 */
export interface ProbeView {
  caso: string;
  species: number;
  heading: number;
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
  renderer.setSize(SIZE, SIZE, false);
  const target = new WebGLRenderTarget(SIZE, SIZE);
  const scene = new Scene();
  scene.background = new Color(BACKGROUND);
  const view = new FaunaView(scene);
  const store = new EntityStore(4);
  const id = store.spawn(EntityKind.Critter, 0, 0);
  const fauna = new Map<string, number>();
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

    for (const [species, stage] of ANIMALS) {
      // Una clave por animal: en el juego una clave nunca cambia de especie, y
      // la vista no rehace el sprite de una que ya tiene.
      store.animal[id] = { species, stage } as Animal;
      view.clear();
      fauna.clear();
      fauna.set(`sonda-${species}-${stage}`, id);
      const size = view.boxOf(species, stage);
      if (!size) continue;
      const total = { ink: 0, wrongHidden: 0, wrongShown: 0, truthHidden: 0, outside: 0, outsideHidden: 0 };
      let worst = 0;
      let worstView = '';
      for (let k = 0; k < HEADINGS; k++) {
        const a = (k / HEADINGS) * Math.PI * 2;
        const fx = Math.cos(a);
        const fz = Math.sin(a);
        // El nucleo va en (x, y) del suelo y z de altura; three, en (x, z) y y.
        store.x[id] = c.foot[0];
        store.y[id] = c.foot[1];
        store.z[id] = 0;
        store.facingX[id] = fx;
        store.facingY[id] = fz;
        const box: BodyBox = {
          center: [c.foot[0], size.height / 2, c.foot[1]],
          facingX: fx,
          facingZ: fz,
          halfLength: size.halfLength,
          halfHeight: size.height / 2,
          halfWidth: size.halfWidth,
        };
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
          view.update(fauna, store, camera.position.x, camera.position.z);

          for (const m of meshes) m.visible = false;
          render(alone);
          for (const m of meshes) m.visible = true;
          render(pixels);
          if (
            snap &&
            snap.caso === c.name &&
            snap.species === species &&
            snap.heading === k * 45 &&
            snap.elevation === elevation
          ) {
            if (snap.box) {
              // El animal de bloques: la caja de su cuerpo, maciza, en su sitio.
              view.clear();
              bodyMesh.scale.set(size.halfLength * 2, size.height, size.halfWidth * 2);
              bodyMesh.position.set(...box.center);
              bodyMesh.rotation.set(0, -a, 0);
              scene.add(bodyMesh);
            }
            renderer.render(scene, camera);
            snapshot = canvas.toDataURL('image/png');
            scene.remove(bodyMesh);
            view.update(fauna, store, camera.position.x, camera.position.z);
          }

          const counts = { ink: 0, wrongHidden: 0, wrongShown: 0, truthHidden: 0, outside: 0, outsideHidden: 0 };
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
                if (hidden) counts.outsideHidden++;
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
          total.outsideHidden += counts.outsideHidden;
          const share = counts.ink > 0 ? counts.wrongHidden / counts.ink : 0;
          if (share > worst) {
            worst = share;
            worstView = `${Species[species]} rumbo ${k * 45}° a ${elevation}°`;
          }
        }
      }
      results.push({
        name: `${c.name}/${Species[species]}`,
        ink: total.ink,
        wrongHidden: total.ink > 0 ? total.wrongHidden / total.ink : 0,
        wrongShown: total.truthHidden > 0 ? total.wrongShown / total.truthHidden : 0,
        truthHidden: total.ink > 0 ? total.truthHidden / total.ink : 0,
        outside: total.ink > 0 ? total.outside / total.ink : 0,
        outsideHidden: total.ink > 0 ? total.outsideHidden / total.ink : 0,
        worst,
        worstView,
      });
    }
    for (const m of meshes) scene.remove(m);
  }

  view.clear();
  cube.dispose();
  terrainMaterial.dispose();
  groundMaterial.dispose();
  (bodyMesh.material as MeshBasicMaterial).dispose();
  target.dispose();
  renderer.dispose();
  return { cases: results, misses: depthPatchMisses.length, snapshot };
}
