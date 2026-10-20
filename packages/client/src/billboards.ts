/**
 * Los objetos del mundo: las features como **aspas de dos laminas**, el jugador
 * como sprite que mira a la camara.
 *
 * **El arte es pixelart** (el autor, 2026-10-19; guia de arte, directriz 7):
 * los dibujos de `world-art.ts`, pasados a lienzo por `world-sprites.ts` y
 * subidos como textura, a 24 pixeles por bloque. Las rocas y los minerales no
 * son aspas sino voxeles (`rock-mesh.ts`), por decision del autor; los
 * minerales, ademas, con sus cristales, una mena distinta por casilla
 * (`ore-mesh.ts`).
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

import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Sprite, type Object3D, type Texture } from 'three';
import { Feature } from '@verdant/shared';
import {
  BODY_RADIUS,
  bucketBlocks,
  hash2DFloat,
  treeTrunkAt,
  treeTrunkOf,
  trunkBucket,
  trunkRange,
  trunkWidthFor,
  TRUNK_BUCKETS,
} from '@verdant/sim';
import { oreModel } from './ore-mesh.js';
import { ORE_TONES } from './palette.js';
import { rockMesh, type RockMesh } from './rock-mesh.js';
import { TREE_SHAPES, treeShapeOf } from './tree-shapes.js';
import { bodySpriteMaterial } from './sprite-depth.js';
import { CROWNS, ROCK_SHAPE, STONES, WORLD_PX } from './world-art.js';
import { artCanvas, BARK, featureSprite, pixelTexture, playerArt, treeSprite, type SpriteArt } from './world-sprites.js';

/** Las especies de arbol adulto, las que tienen forma propia. */
const TREES = Object.keys(TREE_SHAPES).map(Number) as Feature[];

/** El escalon de arte del tronco medio de esa especie. */
function meanBucket(feature: Feature): number {
  return trunkBucket(treeTrunkOf(feature)?.bareMean ?? 2);
}

/** Los escalones de los dos extremos del tronco de esa especie. */
function rangeBuckets(feature: Feature): number[] {
  const trunk = treeTrunkOf(feature);
  return trunk ? trunkRange(trunk).map(trunkBucket) : [];
}

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

/**
 * Un quad TUMBADO en el suelo, centrado en el pie y un pelo por encima para
 * no pelearse con el terreno. Para lo que se ve desde arriba y en aspa se
 * leeria como una helice: los guijarros.
 */
export function flatGeometry(w: number): BufferGeometry {
  const half = w / 2;
  const lift = 0.03;
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([-half, lift, half, half, lift, half, -half, lift, -half, half, lift, -half]),
      3,
    ),
  );
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  return geometry;
}

/**
 * Cuanto mide un pixel de arte en el mundo: **24 pixeles por bloque, en todo**
 * (el autor, 2026-10-19: «caras de 24x24 en bloques (voxeles 12x12). Esa debe
 * ser la medida para todo elemento del juego»). Sustituye a la escala de antes
 * (`docs/arte.md`, «Proporciones»), que crecia lo vivo frente al bloque y daba
 * a cada objeto un pixel de otro tamano.
 *
 * Los tamanos en el mundo **casi no cambian**: los dibujos de `world-art.ts`
 * se hicieron a la medida de lo que ya median. Medidos (`npm run shots`): el
 * jugador 1,88 (era 1,93), una mata 1,04 (1,17), un brote 0,79 (0,88), la roca
 * 1,0 (1,09), y la copa de cada especie, la de su tabla. **Nada de esto
 * llega a `packages/sim`**: el salto, `STEP_UP` y la colision van en unidades
 * de mundo y no saben lo que mide un dibujo. Es arte, no fisica.
 */
const UNITS = 1 / WORLD_PX;

/** Arbol adulto: tiene copa dibujada. */
const isTree = (feature: Feature): boolean => CROWNS[feature] !== undefined;

/** Roca o mineral: van en voxeles, no en aspa. */
const isRock = (feature: Feature): boolean => STONES[feature] !== undefined || ORE_TONES[feature] !== undefined;

/** Una malla de voxeles (`rock-mesh.ts`, `ore-mesh.ts`), subida a la GPU. */
function upload(mesh: RockMesh): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('uv', new BufferAttribute(mesh.uvs, 2));
  geometry.setAttribute('color', new BufferAttribute(mesh.colors, 3));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  return geometry;
}

/** Lo que mide de alto la roca de voxeles, en bloques. */
const ROCK_HEIGHT = (Math.max(...ROCK_SHAPE.map((v) => v[2])) + 1) * 0.5;

interface Billboard {
  readonly texture: Texture;
  /** Tamano en unidades de mundo. */
  readonly w: number;
  readonly h: number;
  /** Cuanto hay que subir el centro para que el sprite se apoye en el suelo. */
  readonly lift: number;
  /** Lo que el DIBUJO levanta del suelo, en bloques. Ver `inkHeight`. */
  readonly visible: number;
  /** Tronco DESNUDO que deja ver el dibujo, en bloques. 0 si no es arbol. */
  readonly bare: number;
  /** Ancho de la copa que deja ver el dibujo, en bloques. 0 si no es arbol. */
  readonly crownW: number;
  /** Grosor del tronco a media altura del tramo desnudo, en bloques. */
  readonly trunkW: number;
  /** Pixeles de tronco por dentro de la copa con aire justo encima. Ver `trunkPeek`. */
  readonly peek: number;
  /**
   * Geometria y material del aspa, UNO por especie y compartidos por todas sus
   * instancias.
   *
   * Nulos para el jugador, que sigue siendo un billboard.
   */
  readonly geometry: BufferGeometry | null;
  readonly material: MeshBasicMaterial | null;
}

/** Los pixeles de un lienzo, o null si no se pueden leer. */
function pixels(art: SpriteArt): Uint8ClampedArray | null {
  const ctx = art.canvas.getContext('2d');
  if (!ctx) return null;
  try {
    return ctx.getImageData(0, 0, art.canvas.width, art.canvas.height).data;
  } catch {
    // Lienzo contaminado o sin contexto legible: mejor 0 que un numero inventado.
    return null;
  }
}

/**
 * Cuanto se eleva el dibujo sobre su punto de apoyo, en unidades de mundo.
 *
 * Se mide buscando el pixel con tinta mas alto, no por el lienzo ni por el
 * ancla. Es lo unico que permite afirmar «el jugador mide 1,9 bloques» con un
 * numero en vez de con una captura.
 */
function inkHeight(art: SpriteArt): number {
  const data = pixels(art);
  if (!data) return 0;
  const { width, height } = art.canvas;
  const foot = art.anchorY * height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 8) return Math.max(0, (foot - y) * UNITS);
    }
  }
  return 0;
}

/** Un comprobador de «es corteza»: cualquiera de sus cuatro tonos (`BARK`), o null. */
function barkPixels(
  art: SpriteArt,
  bark: readonly string[],
): { data: Uint8ClampedArray; width: number; height: number; isBark: (x: number, y: number) => boolean } | null {
  const data = pixels(art);
  if (!data) return null;
  const { width, height } = art.canvas;
  const want = bark.map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
  const isBark = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const i = (y * width + x) * 4;
    return data[i + 3]! > 200 && want.some((w) => w.every((c, k) => Math.abs(data[i + k]! - c) <= 3));
  };
  return { data, width, height, isBark };
}

/**
 * Cuanto tronco se ve desnudo, en unidades de mundo: la tirada de corteza en
 * la columna del pie, desde el suelo hacia arriba.
 *
 * La copa se pinta encima del tronco, asi que la tirada termina justo donde
 * empieza el follaje. Es la medida que dice si el jugador ve por debajo, sacada
 * del dibujo y no de la cuenta que lo produjo.
 */
function bareHeight(art: SpriteArt, bark: readonly string[]): number {
  const px = barkPixels(art, bark);
  if (!px) return 0;
  const x = Math.floor(art.anchorX * px.width);
  const foot = art.anchorY * px.height;
  let y = Math.ceil(foot) - 1;
  if (!px.isBark(x, y)) return 0;
  while (y > 0 && px.isBark(x, y - 1)) y--;
  return (foot - y) * UNITS;
}

/**
 * Ancho de la copa en unidades de mundo: la caja de tinta de las filas que
 * quedan por encima del tronco desnudo (`bareRows` filas sobre el pie).
 */
function crownWidth(art: SpriteArt, bareRows: number): number {
  const data = pixels(art);
  if (!data) return 0;
  const { width, height } = art.canvas;
  const bottom = Math.floor(art.anchorY * height - bareRows);
  let left = width;
  let right = -1;
  for (let y = 0; y < bottom; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! <= 8) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  return right < left ? 0 : (right - left + 1) * UNITS;
}

/**
 * Grosor del tronco a `rowsUp` filas sobre el pie: la tirada de corteza que
 * cruza la columna del centro, en unidades de mundo.
 */
function trunkWidth(art: SpriteArt, bark: readonly string[], rowsUp: number): number {
  const px = barkPixels(art, bark);
  if (!px) return 0;
  const y = Math.round(art.anchorY * px.height - rowsUp);
  const cx = Math.floor(art.anchorX * px.width);
  if (!px.isBark(cx, y)) return 0;
  let left = cx;
  let right = cx;
  while (px.isBark(left - 1, y)) left--;
  while (px.isBark(right + 1, y)) right++;
  return (right - left + 1) * UNITS;
}

/**
 * Cuanto asoma el canto del tronco: pixeles de corteza POR DENTRO de la copa
 * (por encima de su borde bajo) con aire justo encima. Un tronco que acaba en
 * punta tapada da cero; el rectangulo de antes, cuyo canto de arriba salia por
 * los lados del cono, no. Los huecos del alerce no cuentan: por ellos se ve el
 * tronco de lado, pero encima de cada pixel sigue habiendo tronco o follaje.
 * Las ramas del roble y del cerezo, que se ven entre las masas de su copa,
 * tampoco: suben hasta el follaje.
 */
function trunkPeek(art: SpriteArt, bark: readonly string[], bareRows: number): number {
  const px = barkPixels(art, bark);
  if (!px) return 0;
  const bottom = Math.floor(art.anchorY * px.height - bareRows);
  let count = 0;
  for (let y = 1; y < bottom; y++) {
    for (let x = 0; x < px.width; x++) {
      if (px.isBark(x, y) && px.data[((y - 1) * px.width + x) * 4 + 3]! <= 8) count++;
    }
  }
  return count;
}

function fromArt(art: SpriteArt | null, cross: boolean, tree?: { bark: readonly string[] }): Billboard | null {
  if (!art) return null;
  const texture = pixelTexture(art.canvas, true);
  const w = art.canvas.width * UNITS;
  const h = art.canvas.height * UNITS;
  // Un sprite de three.js se centra en su caja, pero el arte se apoya en su
  // ancla. `anchorY` va de arriba abajo del lienzo, asi que desde el BORDE DE
  // ABAJO el punto de apoyo esta a `(1 - anchorY) * h`. Para que ese punto caiga
  // en el suelo hay que subir el centro `h / 2 - eso`.
  const above = art.anchorY * h;
  const below = h - above;
  const bare = tree ? bareHeight(art, tree.bark) : 0;
  return {
    texture,
    w,
    h,
    lift: below,
    visible: inkHeight(art),
    bare,
    crownW: tree ? crownWidth(art, bare / UNITS) : 0,
    trunkW: tree ? trunkWidth(art, tree.bark, bare / UNITS / 2) : 0,
    peek: tree ? trunkPeek(art, tree.bark, bare / UNITS) : 0,
    geometry: cross ? crossGeometry(w, above, below) : null,
    // Basic y no Lambert: el arte ya lleva su luz horneada desde el noroeste.
    // Con Lambert, las dos laminas de una misma aspa se iluminarian distinto y
    // el dibujo se ensuciaria.
    //
    // Y se recorta por alfa en vez de mezclar: dos laminas que se cruzan se
    // atraviesan, y con `transparent` a secas el orden entre ellas es una
    // loteria. Recortando, cada fragmento se pinta o se descarta, escribe
    // profundidad y el orden deja de importar. El pixelart no tiene pixeles a
    // medias: o hay tinta o no.
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
  /**
   * Los arboles, UNO por (especie, altura de tronco) y compartido por todas sus
   * instancias: sigue siendo un Mesh por arbol, sin una draw call de mas. Se
   * dibujan la primera vez que hacen falta; como mucho 6 especies x 13 alturas.
   */
  private readonly trees = new Map<number, Billboard | null>();
  /** Las rocas de voxeles: una geometria por giro, un material por piedra. */
  private readonly rockShapes: BufferGeometry[] = [0, 1, 2, 3].map((turn) => upload(rockMesh(ROCK_SHAPE, turn)));
  private readonly rockMaterials = new Map<Feature, MeshBasicMaterial>();
  private readonly player: Billboard | null;
  /** Tronco desnudo de los arboles colocados, MEDIDO del dibujo. */
  private readonly placed = { n: 0, min: Infinity, max: 0, sum: 0 };
  /** Rocas y minerales puestos en voxeles, para el humo. Acumulado. */
  rocks = 0;
  /** Menas puestas, con sus cristales, y las que se liberaron al descartar su chunk. Acumulado. */
  ores = 0;
  oresReleased = 0;

  constructor() {
    for (const feature of Object.values(Feature)) {
      if (typeof feature !== 'number' || feature === Feature.None) continue;
      if (isRock(feature)) {
        // Las menas se hacen una a una, cada una con lo suyo (`spawn`).
        const stone = STONES[feature];
        if (!stone) continue;
        // Su piedra, con la luz de cada cara horneada en los vertices.
        this.rockMaterials.set(feature, new MeshBasicMaterial({ map: pixelTexture(artCanvas(stone), true), vertexColors: true }));
        continue;
      }
      // Un arbol se dibuja siempre con su tronco; el de referencia, con el del
      // centro de la normal.
      let art = isTree(feature) ? this.tree(feature, meanBucket(feature)) : fromArt(featureSprite(feature), true);
      // Los guijarros van tumbados, y sin sombra: ya estan en el suelo.
      if (art && feature === Feature.Pebbles) art = { ...art, geometry: flatGeometry(art.w) };
      if (art) this.byFeature.set(feature, art);
    }
    this.player = fromArt(playerArt(), false);
  }

  /** El arte de ese arbol con ese escalon de tronco (ver `trunk.ts`). */
  private tree(feature: Feature, bucket: number): Billboard | null {
    const key = feature * TRUNK_BUCKETS + bucket;
    let art = this.trees.get(key);
    if (art === undefined) {
      const trunk = treeTrunkOf(feature);
      const crown = CROWNS[feature];
      const bareBlocks = bucketBlocks(bucket);
      const width = trunk ? trunkWidthFor(trunk, bareBlocks) : 0;
      art =
        crown &&
        fromArt(treeSprite(feature, bareBlocks, width), true, {
          bark: [...BARK].map((ch) => crown.palette[ch]!).filter(Boolean),
        });
      this.trees.set(key, art ?? null);
    }
    return art ?? null;
  }

  /**
   * Cuanto tronco desnudo llevan los arboles que se han colocado, en bloques y
   * medido del dibujo: minimo, maximo, media y cuantos. Acumulado, asi que un
   * chunk que se redibuja cuenta otra vez; para la forma de la cuenta da igual.
   */
  get trunks(): { n: number; min: number; max: number; mean: number } {
    const { n, min, max, sum } = this.placed;
    return { n, min: n ? min : 0, max, mean: n ? sum / n : 0 };
  }

  /**
   * Lo que mide cada cosa en BLOQUES, medido del dibujo y no del lienzo (la
   * roca, de sus voxeles).
   *
   * Se expone para poder afirmar las proporciones con numeros en vez de con una
   * captura, que es lo unico que distingue «mide 1,8» de «parece que mide 1,8».
   */
  get sizes(): Record<string, number> {
    const out: Record<string, number> = {};
    if (this.player) out.jugador = this.player.visible;
    const sample: Array<[string, Feature]> = [
      ['arbusto', Feature.ForestPlant],
      ['brote', Feature.ForestTreeSapling],
    ];
    for (const [name, feature] of sample) {
      const art = this.byFeature.get(feature);
      if (art) out[name] = art.visible;
    }
    out.roca = ROCK_HEIGHT;
    // El arbol, con el tronco del centro de su normal; y los extremos del tronco
    // desnudo de todas las especies, medidos.
    const middle = this.tree(Feature.ForestTree, meanBucket(Feature.ForestTree));
    if (middle) out.arbol = middle.visible;
    const bares: number[] = [];
    for (const feature of TREES) {
      for (const bucket of rangeBuckets(feature)) {
        const art = this.tree(feature, bucket);
        if (art) bares.push(art.bare);
      }
    }
    if (bares.length) {
      out.troncoMin = Math.min(...bares);
      out.troncoMax = Math.max(...bares);
    }
    return out;
  }

  /**
   * La copa de cada especie de arbol, MEDIDA del dibujo, junto a la que pide su
   * especie real (`tree-shapes.ts`): alto, ancho y la relacion ancho:alto.
   */
  get crowns(): Array<{
    especie: string;
    alto: number;
    ancho: number;
    ratio: number;
    esperado: number;
    /** Tronco desnudo medido en los dos extremos de su normal, y los de la tabla. */
    troncoMin: number;
    troncoMax: number;
    rango: [number, number];
    /** Grosor del tronco medido a media altura del tramo desnudo. */
    grosor: number;
    /** Pixeles de tronco con aire encima por dentro de la copa: su canto asomando. */
    asoma: number;
  }> {
    const out = [];
    for (const feature of TREES) {
      const shape = treeShapeOf(feature);
      const art = this.tree(feature, meanBucket(feature));
      if (!shape || !art) continue;
      const ends = rangeBuckets(feature).map((b) => this.tree(feature, b));
      const alto = art.visible - art.bare;
      out.push({
        especie: shape.species,
        alto,
        ancho: art.crownW,
        ratio: alto > 0 ? art.crownW / alto : 0,
        esperado: shape.crownW / shape.crownH,
        troncoMin: ends[0]?.bare ?? 0,
        troncoMax: ends[1]?.bare ?? 0,
        rango: trunkRange(treeTrunkOf(feature)!),
        grosor: art.trunkW,
        asoma: Math.max(art.peek, ...ends.map((e) => e?.peek ?? 0)),
      });
    }
    return out;
  }

  /**
   * Un objeto nuevo para esa feature, ya apoyado en el suelo: un aspa, o la
   * roca de voxeles.
   *
   * Cada uno lleva **su propio giro**, para que el bosque no se vea alineado a
   * la rejilla. Sale de `hash2DFloat` y no de `Math.random`, y eso no es
   * purismo: los chunks se descartan y se regeneran constantemente, asi que con
   * azar vivo los arboles girarian solos al alejarte y volver. Un cuarto de
   * vuelta basta, porque el aspa se repite cada 90 grados; la roca gira en
   * cuartos de vuelta enteros, para seguir en la rejilla.
   */
  spawn(feature: Feature, wx: number, height: number, wy: number, seed: number): Mesh | null {
    const tx = Math.floor(wx);
    const ty = Math.floor(wy);
    const turn = hash2DFloat(seed, tx, ty);
    // Una mena: su propia malla y su propia textura, que se liberan con su
    // chunk (`release`). Una llamada de dibujo, como la roca.
    if (ORE_TONES[feature]) {
      const ore = oreModel(feature, seed, tx, ty, Math.min(3, Math.floor(turn * 4)));
      const material = new MeshBasicMaterial({ map: pixelTexture(artCanvas(ore.art), true), vertexColors: true, alphaTest: 0.4 });
      const mesh = new Mesh(upload(ore.mesh), material);
      mesh.position.set(wx, height, wy);
      mesh.userData.ore = true;
      this.rocks++;
      this.ores++;
      return mesh;
    }
    const rock = this.rockMaterials.get(feature);
    if (rock) {
      const mesh = new Mesh(this.rockShapes[Math.min(3, Math.floor(turn * 4))]!, rock);
      mesh.position.set(wx, height, wy);
      this.rocks++;
      return mesh;
    }
    // Los arboles, ademas, llevan su propia altura de tronco, que tambien es de
    // la casilla por la misma razon que el giro. Sale del nucleo, que la usa de
    // hitbox: el tronco que se ve es el que se golpea.
    const trunk = treeTrunkAt(seed, tx, ty, feature);
    const art = trunk ? this.tree(feature, trunk.bucket) : this.byFeature.get(feature);
    if (!art || !art.geometry || !art.material) return null;
    if (art.bare > 0) {
      const p = this.placed;
      p.n++;
      p.sum += art.bare;
      p.min = Math.min(p.min, art.bare);
      p.max = Math.max(p.max, art.bare);
    }
    const mesh = new Mesh(art.geometry, art.material);
    mesh.position.set(wx, height, wy);
    mesh.rotation.y = turn * (Math.PI / 2);
    return mesh;
  }

  /**
   * Libera lo que es solo de ese objeto, al descartar su chunk: la malla y la
   * textura de una mena. Lo demas (las aspas, la roca) se comparte entre todas
   * sus instancias y sigue en uso.
   */
  release(prop: Object3D): void {
    if (!prop.userData.ore) return;
    const mesh = prop as Mesh<BufferGeometry, MeshBasicMaterial>;
    mesh.geometry.dispose();
    mesh.material.map?.dispose();
    mesh.material.dispose();
    this.oresReleased++;
  }

  /** Cuanto mide de ancho lo que se apoya en un tile, para su sombra. La roca ocupa su casilla. */
  widthOf(feature: Feature): number {
    if (isRock(feature)) return 1;
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

/**
 * El sprite del jugador, suelto: lo que usa la sonda de profundidad
 * (`sprite-depth-probe.ts`) sin montar todos los billboards. En
 * `userData.visible` lleva lo que mide su dibujo, el alto de su caja.
 */
export function playerSprite(): Sprite | null {
  const art = fromArt(playerArt(), false);
  if (!art) return null;
  const sprite = place(art, 0, 0, 0);
  sprite.userData.visible = art.visible;
  return sprite;
}

/**
 * El sprite de algo que se apoya en el suelo, con la profundidad de su cuerpo
 * (`sprite-depth.ts`): el terreno le tapa lo que taparia a un cuerpo, ni mas
 * ni menos. El sprite se coloca por su centro, que esta a `h/2 - lift` de los
 * pies; el centro del cuerpo, a la mitad de lo que mide su dibujo. La caja es
 * la de colision, con medio lado `BODY_RADIUS` en los dos ejes: al ser
 * cuadrada, el rumbo no la cambia y se queda en el de partida.
 */
function place(art: Billboard, wx: number, height: number, wy: number): Sprite {
  const toCore = art.visible / 2 - (art.h / 2 - art.lift);
  const sprite = new Sprite(
    bodySpriteMaterial(
      { map: art.texture, transparent: true },
      { lift: toCore, halfLength: BODY_RADIUS, halfHeight: art.visible / 2, halfWidth: BODY_RADIUS },
    ),
  );
  sprite.scale.set(art.w, art.h, 1);
  sprite.userData.lift = art.lift;
  sprite.position.set(wx, height + art.h / 2 - art.lift, wy);
  return sprite;
}
