/**
 * Los objetos del mundo como sprites que siempre miran a la camara.
 *
 * **El arte no se rehace.** `makeFeatureArt` y `makePlayerArt` (`tiles.ts`) ya
 * dibujan cada especie a un canvas, asi que ese mismo canvas se sube como
 * textura. Lo que en un HD-2D suele ser el gasto grande —el pipeline de arte—
 * aqui ya estaba escrito, porque el arte de este proyecto es codigo y no
 * ficheros de un artista.
 *
 * Un billboard plano se lee bien en un arbol o una roca, que son simetricos. En
 * un humanoide se lee regular, y si la estetica convence habra que decidir entre
 * sprites de cuatro u ocho direcciones o un modelo simple. Eso queda fuera del
 * spike a proposito: lo que se esta midiendo es si se entiende la geografia.
 */

import { CanvasTexture, NearestFilter, Sprite, SpriteMaterial, type Texture } from 'three';
import { Feature } from '@verdant/shared';
import { LOOKS } from '../palette.js';
import { makeFeatureArt, makePlayerArt, type FeatureArt } from '../tiles.js';

/** Pixeles de arte por unidad de mundo: un tile de 32 px es una casilla. */
const PX_PER_TILE = 32;

/**
 * Cuanto mide lo vivo frente a un bloque.
 *
 * El arte nacio para el isometrico con el jugador midiendo **0,78 bloques** y un
 * arbol 1,22, y el autor lo comparo con Minecraft: alli mides poco menos de dos
 * bloques y un arbol pasa de tres. Los dos factores que hacen falta para llegar
 * ahi salen **casi iguales**, 2,3 y 2,6, y eso es el diagnostico entero: la
 * relacion entre jugador y arbol ya era la buena y lo que sobraba era el bloque.
 *
 * Por eso sube TODO lo que se apoya en el suelo con el mismo `BASE`, que
 * conserva intactas las proporciones que el autor ya dio por buenas —una roca
 * sigue siendo vez y media el jugador, un arbusto le llega al pecho— y cambia
 * solo su tamano frente al terreno. Los arboles llevan su pizca de mas.
 *
 *   jugador 0,78 -> 1,79   arbusto 0,47 -> 1,08
 *   arbol   1,22 -> 3,17   roca    1,25 -> 2,88   brote 0,66 -> 1,52
 *
 * **Nada de esto llega a `packages/sim`.** El salto, `STEP_UP` y la colision van
 * en unidades de mundo y no saben lo que mide un sprite. Es arte, no fisica.
 */
const BASE = 2.3;
const ARBOL = 2.6;

/**
 * Densidad a la que se redibuja el arte.
 *
 * Igualada al factor mas grande: asi el sprite se agranda pero **su pixel sigue
 * midiendo lo mismo en pantalla**, que es la diferencia entre un 2D-HD y un
 * estirado. El jugador pasa de 24 pixeles de alto a unos 62. Cuesta lienzos mas
 * grandes una sola vez, al arrancar.
 */
const DETAIL = ARBOL;

/** Cuanto crece esta especie. Solo los arboles se salen de `BASE`. */
function scaleOf(feature: Feature): number {
  const look = LOOKS[feature];
  // `form` distingue arbol de arbusto; roca, minerales y brotes no tienen look y
  // se quedan en la base, que es justo lo que conserva su tamano relativo.
  return look && look.form !== 'bush' ? ARBOL : BASE;
}

interface Billboard {
  readonly texture: Texture;
  /** Tamano en unidades de mundo. */
  readonly w: number;
  readonly h: number;
  /** Cuanto hay que subir el centro para que el sprite se apoye en el suelo. */
  readonly lift: number;
  /** Lo que el DIBUJO levanta del suelo, en bloques. Ver `inkHeight`. */
  readonly visible: number;
}

/**
 * Cuanto se eleva el dibujo sobre su punto de apoyo, en unidades de mundo.
 *
 * Se mide buscando el pixel con tinta mas alto, no por el lienzo ni por
 * `riseAbove`: un arbol ocupa 39 px de un lienzo de 58 y `riseAbove` da la cota
 * superior, no la altura. Es lo unico que permite afirmar «el jugador mide 1,8
 * bloques» con un numero en vez de con una captura.
 */
function inkHeight(art: FeatureArt, unitsPerPixel: number): number {
  const ctx = art.canvas.getContext('2d');
  if (!ctx) return 0;
  const { width, height } = art.canvas;
  const foot = art.anchorY * height;
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, width, height).data;
  } catch {
    // Lienzo contaminado o sin contexto legible: mejor 0 que un numero inventado.
    return 0;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) return Math.max(0, (foot - y) * unitsPerPixel);
    }
  }
  return 0;
}

function fromArt(art: FeatureArt | null, scale: number): Billboard | null {
  if (!art) return null;
  const texture = new CanvasTexture(art.canvas);
  // Sin filtrado: el arte es de pixeles y suavizarlo lo emborrona, que es
  // justo lo que separa un 2D-HD de un 3D con texturas pobres.
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  // Se divide tambien por `DETAIL` porque el lienzo viene con esa densidad de
  // mas: sin eso el sprite crecería dos veces, una por resolucion y otra por
  // escala. Lo que manda el tamano de mundo es `scale`, y solo `scale`.
  const w = (art.canvas.width / (PX_PER_TILE * DETAIL)) * scale;
  const h = (art.canvas.height / (PX_PER_TILE * DETAIL)) * scale;
  // Un sprite de three.js se centra en su caja, pero el arte se apoya en su
  // ancla. `anchorY` va de arriba abajo del lienzo, asi que desde el BORDE DE
  // ABAJO el punto de apoyo esta a `(1 - anchorY) * h`. Para que ese punto caiga
  // en el suelo hay que subir el centro `h / 2 - eso`.
  return {
    texture,
    w,
    h,
    lift: (1 - art.anchorY) * h,
    visible: inkHeight(art, scale / (PX_PER_TILE * DETAIL)),
  };
}

/** Todas las especies dibujadas una vez, listas para instanciarse. */
export class BillboardSet {
  private readonly byFeature = new Map<Feature, Billboard>();
  private readonly player: Billboard | null;

  constructor() {
    for (const feature of Object.values(Feature)) {
      if (typeof feature !== 'number' || feature === Feature.None) continue;
      const art = fromArt(makeFeatureArt(feature, DETAIL), scaleOf(feature));
      if (art) this.byFeature.set(feature, art);
    }
    this.player = fromArt(makePlayerArt(DETAIL), BASE);
  }

  /**
   * Lo que mide cada cosa en BLOQUES, medido del dibujo y no del lienzo.
   *
   * Se expone para poder afirmar las proporciones con numeros en vez de con una
   * captura, que es lo unico que distingue «mide 1,8» de «parece que mide 1,8».
   */
  get sizes(): Record<string, number> {
    const out: Record<string, number> = {};
    if (this.player) out.jugador = this.player.visible;
    const sample: Array<[string, Feature]> = [
      ['arbol', Feature.ForestTree],
      ['arbusto', Feature.ForestPlant],
      ['brote', Feature.ForestTreeSapling],
      ['roca', Feature.RockNode],
    ];
    for (const [name, feature] of sample) {
      const art = this.byFeature.get(feature);
      if (art) out[name] = art.visible;
    }
    return out;
  }

  /** Un sprite nuevo para esa feature, ya colocado sobre el suelo. */
  spawn(feature: Feature, wx: number, height: number, wy: number): Sprite | null {
    const art = this.byFeature.get(feature);
    return art ? place(art, wx, height, wy) : null;
  }

  spawnPlayer(): Sprite | null {
    if (!this.player) return null;
    return place(this.player, 0, 0, 0);
  }

  /** Sube un sprite ya creado a su sitio, respetando su punto de apoyo. */
  moveTo(sprite: Sprite, wx: number, height: number, wy: number): void {
    sprite.position.set(wx, height + sprite.scale.y / 2 - sprite.userData.lift, wy);
  }
}

function place(art: Billboard, wx: number, height: number, wy: number): Sprite {
  const sprite = new Sprite(new SpriteMaterial({ map: art.texture, transparent: true }));
  sprite.scale.set(art.w, art.h, 1);
  sprite.userData.lift = art.lift;
  sprite.position.set(wx, height + art.h / 2 - art.lift, wy);
  return sprite;
}
