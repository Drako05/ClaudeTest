/**
 * Los objetos del mundo: las features como **aspas de dos laminas**, el jugador
 * como sprite que mira a la camara.
 *
 * **El arte no se rehace.** `makeFeatureArt` y `makePlayerArt` (`art.ts`) ya
 * dibujan cada especie a un canvas, asi que ese mismo canvas se sube como
 * textura. Lo que en un HD-2D suele ser el gasto grande —el pipeline de arte—
 * aqui ya estaba escrito, porque el arte de este proyecto es codigo y no
 * ficheros de un artista.
 *
 * **Por que las features dejaron de ser billboards.** Un sprite se reorienta a
 * la camara en cada frame, y con la camara libre eso delata que son cromos: los
 * arboles giran contigo y el bosque no tiene lados. Dos laminas cruzadas a 90
 * grados les dan un frente que no depende de donde mires, y la segunda lamina es
 * justo lo que impide que una sola desaparezca vista de canto: la silueta del
 * aspa nunca baja de `cos 45º` de su ancho. `tests/cross.test.ts` lo afirma.
 *
 * **El jugador no.** Un aspa en un humanoide es verlo de frente y de perfil a la
 * vez, dos figuras atravesadas. Para el personaje la solucion son sprites de
 * cuatro u ocho direcciones, que siguen pendientes; mientras tanto sigue siendo
 * un billboard, que es lo que menos miente.
 */

import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Sprite,
  SpriteMaterial,
  type Texture,
} from 'three';
import { Feature } from '@verdant/shared';
import { hash2DFloat } from '@verdant/sim';
import { LOOKS } from '../palette.js';
import { makeFeatureArt, makePlayerArt, type FeatureArt } from './art.js';

/**
 * Dos quads cruzados a 90 grados, con el PIE EN `y = 0`.
 *
 * Que el pie sea el origen es lo que deja colocar un elemento con
 * `position.set(wx, sueloY, wy)` y nada mas. Un `Sprite` se centra en su caja y
 * por eso hacia falta la aritmetica de `lift`; aqui esa cuenta vive una sola vez
 * en la geometria, que ademas se comparte entre todas las instancias de la
 * especie.
 *
 * Se exporta para poder afirmar en Node lo que el aspa promete: que la silueta
 * no se adelgaza mas alla de `cos 45º` por mucho que gire la camara.
 */
export function crossGeometry(w: number, above: number, below: number): BufferGeometry {
  const half = w / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Una lamina en el plano XY y otra en el ZY. El orden de vertices es el mismo
  // en las dos —abajo-izquierda, abajo-derecha, arriba-izquierda,
  // arriba-derecha—, asi que comparten el mismo par de triangulos.
  for (const alongZ of [false, true]) {
    const base = positions.length / 3;
    for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      const off = (u - 0.5) * 2 * half;
      positions.push(alongZ ? 0 : off, v === 0 ? -below : above, alongZ ? off : 0);
      // La V de la textura va al reves que la Y del mundo: el lienzo crece hacia
      // abajo y el mundo hacia arriba.
      uvs.push(u, v);
    }
    indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  return geometry;
}

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
  /**
   * Geometria y material del aspa, UNO por especie y compartidos por todas sus
   * instancias. Antes cada sprite se creaba su propio material.
   *
   * Nulos para el jugador, que sigue siendo un billboard.
   */
  readonly geometry: BufferGeometry | null;
  readonly material: MeshBasicMaterial | null;
}

/**
 * Cuanto se eleva el dibujo sobre su punto de apoyo, en unidades de mundo.
 *
 * Se mide buscando el pixel con tinta mas alto, no por el lienzo ni por el
 * ancla: un arbol ocupa 39 px de un lienzo de 58 y lo que queda por encima del
 * ancla es la cota superior, no la altura. Es lo unico que permite afirmar «el jugador mide 1,8
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

function fromArt(art: FeatureArt | null, scale: number, cross: boolean): Billboard | null {
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
  const above = art.anchorY * h;
  const below = h - above;
  return {
    texture,
    w,
    h,
    lift: below,
    visible: inkHeight(art, scale / (PX_PER_TILE * DETAIL)),
    geometry: cross ? crossGeometry(w, above, below) : null,
    // Basic y no Lambert: el arte ya lleva su luz horneada desde el noroeste y
    // el sprite tampoco se iluminaba, asi que asi el ASPECTO no cambia y solo
    // cambia la orientacion. Con Lambert, las dos laminas de una misma aspa se
    // iluminarian distinto y el dibujo se ensuciaria.
    //
    // Y se recorta por alfa en vez de mezclar: dos laminas que se cruzan se
    // atraviesan, y con `transparent` a secas el orden entre ellas es una
    // loteria. Recortando, cada fragmento se pinta o se descarta, escribe
    // profundidad y el orden deja de importar. El umbral va por ENCIMA del 26 %
    // con que el arte pinta su sombra, a proposito: conservarla con el material
    // opaco la pintaria negra maciza. La sombra buena va aparte y tumbada.
    material: cross
      ? new MeshBasicMaterial({
          map: texture,
          alphaTest: 0.4,
          side: DoubleSide,
          transparent: false,
        })
      : null,
  };
}

/** Todas las especies dibujadas una vez, listas para instanciarse. */
export class BillboardSet {
  private readonly byFeature = new Map<Feature, Billboard>();
  private readonly player: Billboard | null;

  constructor() {
    for (const feature of Object.values(Feature)) {
      if (typeof feature !== 'number' || feature === Feature.None) continue;
      const art = fromArt(makeFeatureArt(feature, DETAIL), scaleOf(feature), true);
      if (art) this.byFeature.set(feature, art);
    }
    this.player = fromArt(makePlayerArt(DETAIL), BASE, false);
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

  /**
   * Un aspa nueva para esa feature, ya apoyada en el suelo.
   *
   * Cada una lleva **su propio giro**, para que el bosque no se vea alineado a
   * la rejilla. Sale de `hash2DFloat` y no de `Math.random`, y eso no es
   * purismo: los chunks se descartan y se regeneran constantemente, asi que con
   * azar vivo los arboles girarian solos al alejarte y volver. Un cuarto de
   * vuelta basta, porque el aspa se repite cada 90 grados.
   */
  spawn(feature: Feature, wx: number, height: number, wy: number, seed: number): Mesh | null {
    const art = this.byFeature.get(feature);
    if (!art || !art.geometry || !art.material) return null;
    const mesh = new Mesh(art.geometry, art.material);
    mesh.position.set(wx, height, wy);
    mesh.rotation.y = hash2DFloat(seed, Math.floor(wx), Math.floor(wy)) * (Math.PI / 2);
    return mesh;
  }

  /** Cuanto mide de ancho lo que se apoya en un tile, para su sombra. */
  widthOf(feature: Feature): number {
    return this.byFeature.get(feature)?.w ?? 0;
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
