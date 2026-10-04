/**
 * Las diez especies en sus tres etapas, de bloques, para mirarlas de una vez
 * (`window.__verdant.faunaGallery()`): una rejilla vista en tres cuartos desde
 * arriba, cada fila una especie y cada columna una etapa, a escala entre
 * ellas. Se renderiza fuera de pantalla con su propio lienzo y la misma luz
 * que la escena, y devuelve la imagen como `data:` URL.
 */

import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { SPECIES_COUNT, STAGE_COUNT, type Species, type Stage } from '@verdant/shared';
import { animalGeometry } from './fauna-model.js';

/** Bloques entre un animal y el siguiente de la rejilla. */
const CELL = 3.4;

export function faunaGallery(pixelsPerBlock = 40): string {
  const width = STAGE_COUNT * CELL;
  const height = SPECIES_COUNT * CELL;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * pixelsPerBlock);
  canvas.height = Math.round(height * pixelsPerBlock * 0.8);
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  } catch {
    return '';
  }
  renderer.setSize(canvas.width, canvas.height, false);
  const scene = new Scene();
  scene.background = new Color(0x6a9a48);
  // La luz de `main.ts`.
  scene.add(new AmbientLight(0xffffff, 0.62));
  const sun = new DirectionalLight(0xfff2dd, 1.05);
  sun.position.set(-0.6, 1, -0.45);
  scene.add(sun);
  const material = new MeshLambertMaterial({ vertexColors: true });
  const meshes: Mesh[] = [];
  for (let s = 0; s < SPECIES_COUNT; s++) {
    for (let st = 0; st < STAGE_COUNT; st++) {
      const mesh = new Mesh(animalGeometry(s as Species, st as Stage), material);
      // Mirando a la derecha y un poco hacia la camara: tres cuartos.
      mesh.rotation.y = -0.5;
      mesh.position.set((st + 0.5) * CELL, 0, (s + 0.5) * CELL);
      scene.add(mesh);
      meshes.push(mesh);
    }
  }
  // Ortografica desde el sur y desde arriba, para que la rejilla salga entera.
  const camera = new OrthographicCamera(-width / 2, width / 2, (height * 0.8) / 2, (-height * 0.8) / 2, 0.1, 200);
  camera.position.set(width / 2, 40, height / 2 + 40 * 0.8);
  camera.lookAt(width / 2, 0, height / 2);
  renderer.render(scene, camera);
  const url = canvas.toDataURL('image/png');
  for (const mesh of meshes) mesh.geometry.dispose();
  material.dispose();
  renderer.dispose();
  return url;
}
