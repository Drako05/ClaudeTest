/**
 * La medida de `sprite-depth.ts`: cuanto se ve de un sprite pegado de lado a
 * un bloque, y cuanto de uno con un bloque delante.
 *
 * Una escena minima fuera de pantalla, con su propio lienzo: un bloque, un
 * sprite magenta macizo con el MISMO material que los animales y el jugador
 * (`depthSafeSpriteMaterial`), y una camara de frente. Se cuentan los pixeles
 * magenta en tres montajes:
 * - **sin bloque**: la referencia;
 * - **al lado**: el bloque pegado a un costado del cuerpo (a 0,34, el radio del
 *   cuerpo), con la lamina sobresaliendo por delante de su cara. Sin el arreglo
 *   se ve un tercio menos; con el, todo;
 * - **delante**: el bloque entre la camara y el sprite, tapandolo. Con el
 *   arreglo bien medido sigue tapado; adelantado de mas, se veria a traves.
 *
 * Se mide pixeles y no un contador, por la leccion de `docs/efectos.md`: lo
 * que se manda dibujar no es lo que se ve.
 */

import {
  BoxGeometry,
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PerspectiveCamera,
  Scene,
  Sprite,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { depthNearOf, depthPatchMisses, depthSafeSpriteMaterial } from './sprite-depth.js';

const SIZE = 160;
/** Lo que mide el sprite de prueba: el largo y el alto de un ciervo, mas o menos. */
const SPRITE_W = 2;
const SPRITE_H = 1;
/** Donde estan los pies: a un radio de cuerpo de la cara del bloque de al lado. */
const FOOT_X = 0.5;
const BODY = 0.34;

export interface DepthProbe {
  /** Pixeles del sprite sin bloque, al lado y delante. */
  alone: number;
  beside: number;
  front: number;
  /** Lo que se ve al lado y delante, en fraccion de lo que se ve solo. */
  besideShare: number;
  frontShare: number;
  /** Materiales a los que no se les pudo reescribir el shader. */
  misses: number;
}

export function spriteDepthProbe(): DepthProbe | null {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false });
  } catch {
    return null;
  }
  renderer.setSize(SIZE, SIZE, false);
  const target = new WebGLRenderTarget(SIZE, SIZE);

  const paint = document.createElement('canvas');
  paint.width = 8;
  paint.height = 8;
  const ctx = paint.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(0, 0, 8, 8);
  const texture = new CanvasTexture(paint);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;

  const scene = new Scene();
  scene.background = new Color(0x000000);
  const sprite = new Sprite(
    depthSafeSpriteMaterial(
      { map: texture, transparent: true, alphaTest: 0.4 },
      SPRITE_H / 2,
      depthNearOf(SPRITE_W / 2, BODY),
    ),
  );
  sprite.center.set(0.5, 0);
  sprite.scale.set(SPRITE_W, SPRITE_H, 1);
  sprite.position.set(FOOT_X, 0, 0);
  scene.add(sprite);

  const wall = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 0x808080 }));
  scene.add(wall);

  const camera = new PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(FOOT_X, SPRITE_H / 2, 5);
  camera.lookAt(FOOT_X, SPRITE_H / 2, 0);

  const count = (): number => {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const pixels = new Uint8Array(SIZE * SIZE * 4);
    renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels);
    renderer.setRenderTarget(null);
    let n = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 200 && pixels[i + 1] < 60 && pixels[i + 2] > 200) n++;
    }
    return n;
  };

  wall.visible = false;
  const alone = count();
  // Al lado: el bloque a la izquierda, con su cara derecha a un radio de
  // cuerpo de los pies, a la misma profundidad que el animal.
  wall.visible = true;
  wall.position.set(FOOT_X - BODY - 0.5, 0.5, 0);
  const beside = count();
  // Delante: un bloque grande a 2,5 del animal, entre el y la camara.
  wall.scale.set(3, 3, 1);
  wall.position.set(FOOT_X, 0.5, 2.5);
  const front = count();

  target.dispose();
  renderer.dispose();
  return {
    alone,
    beside,
    front,
    besideShare: alone > 0 ? beside / alone : 0,
    frontShare: alone > 0 ? front / alone : 0,
    misses: depthPatchMisses.length,
  };
}
