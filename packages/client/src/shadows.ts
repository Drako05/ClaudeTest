/**
 * La sombra que asienta a cada elemento en el suelo.
 *
 * Existe porque el aspa se llevo por delante la que el arte traia pintada, y no
 * por gusto: dos laminas cruzadas obligan a recortar por alfa (ver
 * `billboards.ts`), y la sombra del arte esta pintada al 26 %, asi que con el
 * material opaco o se descarta o sale **negra maciza**. Se descarta, y la buena
 * se pone aqui: **tumbada en el suelo**, que ademas es donde debia estar. La
 * pintada era una elipse VERTICAL pegada al pie, herencia de que el arte nacio
 * para una camara isometrica fija.
 *
 * Sin ella unos arboles de tres bloques parecen pegatinas flotando.
 *
 * **Todas las sombras de un chunk van en UNA malla.** Una malla por elemento
 * duplicaria las cerca de 600 draw calls que ya cuesta el mundo; asi cuestan una
 * por chunk. Fue un `InstancedMesh` de cuadrados planos a la altura del pie
 * hasta que el autor vio sombras flotando al borde de los desniveles: ahora cada
 * sombra se parte por casillas y cae al suelo de cada una (`shadow-patches.ts`),
 * y eso ya no es la misma geometria repetida, asi que se fusiona en una.
 */

import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Texture,
} from 'three';
import { VOXEL } from '@verdant/sim';
import { addShadowPatches, type PatchBuffers, type Surface } from './shadow-patches.js';

/** Lado del lienzo de la mancha. Pequeno: es un degradado, no un dibujo. */
const BLOB_PX = 64;

/**
 * Cuanto se levanta del suelo: lo justo para no pelear en profundidad con el
 * terreno. Como cada trozo sigue a su casilla, tambien sobre un talud.
 */
export const LIFT = 0.03;

/** Cuanto mide la mancha respecto al ancho de lo que la proyecta. */
const SPREAD = 0.62;

let blob: Texture | null = null;

/** La mancha, generada una sola vez y compartida por todo el mundo. */
function blobTexture(): Texture | null {
  if (blob) return blob;
  const canvas = document.createElement('canvas');
  canvas.width = BLOB_PX;
  canvas.height = BLOB_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const r = BLOB_PX / 2;
  // Opaca en el centro y desvanecida al borde: sin el desvanecido se ve el
  // cuadrado de la geometria, que es lo que delata una sombra falsa.
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(0,0,0,0.42)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.26)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BLOB_PX, BLOB_PX);
  blob = new CanvasTexture(canvas);
  return blob;
}

/** Donde y de que tamano va cada sombra de un chunk. */
export interface ShadowSpot {
  /** Centro en el plano del mundo: `x` y `z` de three.js. */
  x: number;
  z: number;
  /** Ancho de lo que la proyecta, en casillas. */
  width: number;
}

/**
 * Todas las sombras de un chunk en una sola malla, cada una pegada al suelo de
 * las columnas de 0,5 que pisa (`surface`, la misma que dibuja el terreno).
 *
 * Devuelve `null` si no hay ninguna, para no meter mallas vacias en la escena.
 */
export function buildShadows(spots: readonly ShadowSpot[], surface: Surface): Mesh | null {
  if (spots.length === 0) return null;
  const texture = blobTexture();
  if (!texture) return null;

  const buffers: PatchBuffers = { positions: [], uvs: [], indices: [] };
  for (const spot of spots) {
    addShadowPatches(spot.x, spot.z, spot.width * SPREAD, surface, LIFT, buffers, VOXEL);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(buffers.positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(buffers.uvs), 2));
  geometry.setIndex(buffers.indices);

  const mesh = new Mesh(
    geometry,
    new MeshBasicMaterial({
      map: texture,
      transparent: true,
      // No escribe profundidad: es una mancha sobre el suelo, no un objeto, y
      // escribiendola recortaria lo que pase por encima.
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  // Se dibuja antes que los elementos, que van encima.
  mesh.renderOrder = -1;
  return mesh;
}
