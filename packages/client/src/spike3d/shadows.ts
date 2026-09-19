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
 * **Todas las sombras de un chunk van en UN `InstancedMesh`.** Una malla por
 * elemento duplicaria las cerca de 600 draw calls que ya cuesta el mundo; asi
 * cuestan una por chunk. Comparten textura, geometria y material, que es
 * exactamente para lo que sirve instanciar.
 */

import {
  CanvasTexture,
  DoubleSide,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  type Texture,
} from 'three';

/** Lado del lienzo de la mancha. Pequeno: es un degradado, no un dibujo. */
const BLOB_PX = 64;

/**
 * Cuanto se levanta del suelo.
 *
 * Lo justo para no pelear en profundidad con el terreno. En una ladera muy
 * inclinada el cuadrado se mete un poco en la cuesta, y se acepta: es una
 * mancha, no una proyeccion de verdad.
 */
const LIFT = 0.03;

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
  x: number;
  y: number;
  z: number;
  /** Ancho de lo que la proyecta, en casillas. */
  width: number;
}

/**
 * Todas las sombras de un chunk en una sola malla instanciada.
 *
 * Devuelve `null` si no hay ninguna, para no meter mallas vacias en la escena.
 */
export function buildShadows(spots: readonly ShadowSpot[]): InstancedMesh | null {
  if (spots.length === 0) return null;
  const texture = blobTexture();
  if (!texture) return null;

  const geometry = new PlaneGeometry(1, 1);
  // El plano nace de pie: se tumba una vez en la geometria y asi las instancias
  // no tienen que llevar rotacion ninguna.
  geometry.rotateX(-Math.PI / 2);

  const mesh = new InstancedMesh(
    geometry,
    new MeshBasicMaterial({
      map: texture,
      transparent: true,
      // No escribe profundidad: es una mancha sobre el suelo, no un objeto, y
      // escribiendola recortaria lo que pase por encima.
      depthWrite: false,
      side: DoubleSide,
    }),
    spots.length,
  );
  // Se dibuja antes que los elementos, que van encima.
  mesh.renderOrder = -1;

  const scratch = new Object3D();
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    const side = spot.width * SPREAD;
    scratch.position.set(spot.x, spot.y + LIFT, spot.z);
    scratch.scale.set(side, 1, side);
    scratch.rotation.set(0, 0, 0);
    scratch.updateMatrix();
    mesh.setMatrixAt(i, scratch.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
