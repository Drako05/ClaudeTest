/**
 * Renderizador isometrico. Es la unica parte del proyecto que sabe que existe
 * un navegador.
 *
 * **Un solo orden para todo lo que es mundo.** Suelo, paredes, arboles y
 * personaje van juntos en la misma capa, ordenados por profundidad. Antes el
 * suelo se horneaba en una textura por chunk y las paredes vivian en la capa de
 * objetos, que estaba entera por encima: asi una pared se pintaba sobre
 * cualquier suelo, lo tuviera delante o detras. Con relieve plano casi no se
 * notaba; con montanas de verdad hacia el dibujo incomprensible.
 *
 * Ordenar por `zIndex` unos miles de sprites en cada frame seria caro, y ademas
 * es innecesario: los tiles de una misma **antidiagonal** (`wx + wy` constante)
 * no se solapan nunca entre si. Asi que cada antidiagonal es un contenedor
 * propio —dentro, primero el suelo y luego lo que se apoya en el—, y lo unico
 * que se ordena es la lista corta de contenedores. Un tile nunca cambia de fila;
 * solo el personaje lo hace, y es uno.
 *
 * Por encima quedan dos capas que no son mundo: el reticulo y las
 * superposiciones de depuracion, y los efectos.
 */

import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { CHUNK_SIZE, Feature } from '@verdant/shared';
import type { Chunk, GameState, World } from '@verdant/sim';
import { actionArea, daylight, groundHeight, MAX_LEVEL } from '@verdant/sim';
import { collectBiomeEdges } from './biome-edges.js';
import { progressOf, type Effects } from './effects.js';
import { groundPieces } from './terrain-draw.js';
import type { TileBounds } from './relief-faces.js';
import {
  depthOf,
  heightOffset,
  LEVEL_PX,
  screenToWorld,
  TILE_DIAMOND,
  TILE_H,
  TILE_W,
  worldToScreen,
} from './projection.js';
import {
  CHUNK_BOX_H,
  CHUNK_BOX_OFFSET_X,
  CHUNK_BOX_W,
  blockReliefMargin,
  makeFaceArt,
  makeFeatureArt,
  makePlayerArt,
  makeTopArt,
  shadeStepAt,
} from './tiles.js';

/**
 * Lado, en tiles, del bloque que se recorta contra la pantalla.
 *
 * El recorte era por chunk entero, y con montanas de cuarenta niveles eso dejo
 * de servir: un chunk mide mas que la pantalla, asi que darlo por visible
 * significa dibujar mil tiles para ver ciento cincuenta. Medido, por chunk se
 * dibujaban 10.200 piezas donde hacen falta unas 1.500.
 */
const VIEW_BLOCK = 8;
const BLOCKS_PER_CHUNK = CHUNK_SIZE / VIEW_BLOCK;

interface BlockView {
  readonly cx: number;
  readonly cy: number;
  readonly bounds: TileBounds;
  /** Cimas, paredes y costados de talud. Se calculan una vez: el relieve no cambia. */
  ground: Sprite[];
  /** Sprites de las features del bloque, para poder retirarlos de golpe. */
  features: Sprite[];
  /** Cuanto sobresale el relieve del bloque por arriba y por abajo, para recortar. */
  margin: { top: number; bottom: number };
  revision: number;
}

/** Contorno de biomas de un chunk. Va aparte: es vista de depuracion, no mundo. */
interface BorderView {
  graphics: Graphics;
  segments: number;
}

/**
 * Una antidiagonal del mundo: todo lo que comparte `wx + wy`.
 *
 * `ground` lleva el terreno y `props` lo que se apoya en el, en ese orden. No
 * hace falta ordenar dentro de ninguno de los dos: dos tiles de la misma
 * antidiagonal caen en columnas distintas de la pantalla y no llegan a tocarse.
 */
interface DepthRow {
  readonly node: Container;
  readonly ground: Container;
  readonly props: Container;
}

/** Todo lo que puede haber sobre un tile y necesita sprite propio. */
const FEATURE_KINDS: readonly Feature[] = [
  Feature.RockNode,
  Feature.CoalNode,
  Feature.IronNode,
  Feature.CopperNode,
  Feature.TundraTree,
  Feature.TundraTreeRare,
  Feature.TundraPlant,
  Feature.TundraPlantRare,
  Feature.TundraTreeSapling,
  Feature.TundraPlantSapling,
  Feature.ForestTree,
  Feature.ForestTreeRare,
  Feature.ForestPlant,
  Feature.ForestPlantRare,
  Feature.MeadowTree,
  Feature.MeadowTreeRare,
  Feature.MeadowPlant,
  Feature.MeadowPlantRare,
  Feature.ForestTreeSapling,
  Feature.ForestPlantSapling,
  Feature.MeadowTreeSapling,
  Feature.MeadowPlantSapling,
];

/**
 * Cuantas filas por delante del personaje se miran al buscar lo que le tapa.
 *
 * Una pared de treinta niveles mide casi quinientos pixeles y llega a tapar
 * desde muy lejos, pero mas alla de esto ya no hay nada que quepa en pantalla
 * entre ella y el jugador.
 */
const OCCLUSION_ROWS = 24;

/** Buffer reutilizado al leer las features efectivas de un chunk. */
const featureScratch = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);

export class Renderer {
  readonly app: Application;
  private readonly camera = new Container();
  /** Todo lo que es mundo, repartido en antidiagonales ordenadas. */
  private readonly worldLayer = new Container();
  private readonly rows = new Map<number, DepthRow>();
  private readonly markerLayer = new Container();
  private readonly views = new Map<string, BlockView>();
  /** Contornos de bioma, por chunk. Solo existen con la vista de depuracion. */
  private readonly borders = new Map<string, BorderView>();
  /** Cimas de terreno, por (terreno, nivel del talud, franja de brillo). */
  private readonly topTextures = new Map<
    string,
    { texture: Texture; ax: number; ay: number } | null
  >();
  private readonly featureTextures = new Map<
    Feature,
    { texture: Texture; ax: number; ay: number; rise: number; halfWidth: number }
  >();
  /**
   * Texturas de cara, por forma.
   *
   * Una cara queda definida por su terreno, su lado y las cuatro alturas de sus
   * bordes, y esas combinaciones se repiten muchisimo: un acantilado largo son
   * decenas de caras identicas. Cachearlas deja el coste en unas pocas docenas
   * de lienzos para todo el mundo.
   */
  private readonly faceTextures = new Map<
    string,
    { texture: Texture; ax: number; ay: number } | null
  >();
  /** Indice de features por tile, para resolver oclusion sin recorrerlas todas. */
  private readonly featureByTile = new Map<string, Sprite>();
  /** Camino inverso del indice, para poder limpiarlo al destruir un chunk. */
  private readonly featureKeys = new Map<Sprite, string>();
  /**
   * Piezas de suelo por tile.
   *
   * Ahora que el terreno esta en el mismo orden que todo lo demas, un acantilado
   * por delante tapa al personaje. Eso es lo correcto y es lo que se buscaba,
   * pero deja al jugador invisible metido en un rincon, asi que el terreno
   * necesita el mismo atenuado que ya tenian los arboles. Sin este indice habria
   * que recorrer miles de sprites para encontrar los pocos que estorban.
   */
  private readonly groundByTile = new Map<string, Sprite[]>();
  /** Features atenuadas este frame, para poder restaurarlas en el siguiente. */
  private readonly faded: Sprite[] = [];
  private player!: Sprite;
  /** Silueta del personaje, para no perderlo detras de un acantilado. */
  private playerGhost!: Sprite;
  private playerRise = 0;
  private readonly reticle = new Graphics();
  /** Slash y escombros. Van por encima de todo: son adorno, no mundo. */
  private readonly effectLayer = new Graphics();
  /** Superposiciones de depuracion: rejilla de chunks y contorno de biomas. */
  private readonly chunkGrid = new Graphics();
  private debugChunks = false;
  private debugBiomes = false;
  /** Vela de color sobre toda la escena: es el ciclo dia/noche. */
  private readonly skyTint = new Graphics();
  /**
   * Cuanto sube en pantalla el plano en el que esta el jugador.
   *
   * Lo usan la camara y el apuntado, y tienen que usar el MISMO: si el cursor se
   * tradujera al plano cero mientras la camara mira al plano del jugador, sobre
   * una meseta la mirada apuntaria a un sitio distinto del que senala el raton.
   */
  private aimLift = 0;

  /**
   * Filas de tiles visibles a lo largo del eje menor de la pantalla.
   * Medir contra el eje menor hace que el encuadre funcione igual en vertical
   * que en apaisado.
   */
  private tilesOnScreen = 22;

  private constructor(app: Application) {
    this.app = app;
    // Lo unico que se ordena es la lista de antidiagonales, que son unos cientos.
    this.worldLayer.sortableChildren = true;
    this.camera.addChild(this.worldLayer, this.markerLayer);
    this.app.stage.addChild(this.camera);
    this.markerLayer.addChild(this.reticle);
    this.markerLayer.addChild(this.chunkGrid);
    this.camera.addChild(this.effectLayer);
    // Fuera de la camara: cubre la pantalla, no el mundo.
    this.app.stage.addChild(this.skyTint);
    this.buildTextures();
  }

  /** La antidiagonal `k`, creandola si es la primera vez que se pide. */
  private rowAt(k: number): DepthRow {
    const existing = this.rows.get(k);
    if (existing) return existing;

    const node = new Container();
    node.zIndex = k;
    const ground = new Container();
    const props = new Container();
    node.addChild(ground, props);
    this.worldLayer.addChild(node);
    const row = { node, ground, props };
    this.rows.set(k, row);
    return row;
  }

  static async create(): Promise<Renderer> {
    const app = new Application();
    await app.init({
      background: 0x0b1020,
      resizeTo: window,
      antialias: false,
      // Con resolution 1 el canvas se dibuja en pixeles CSS y el navegador lo
      // reescala suavizado: en un movil de densidad 3x se ve borroso. El tope de
      // 2 evita pagar 9x de relleno en pantallas 3x.
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: 'webgl',
    });
    document.body.appendChild(app.canvas);
    return new Renderer(app);
  }

  /** Cada tipo de objeto se dibuja una vez y su textura se reutiliza en todos. */
  private buildTextures(): void {
    for (const kind of FEATURE_KINDS) {
      const art = makeFeatureArt(kind);
      if (!art) continue;
      const texture = Texture.from(art.canvas);
      texture.source.scaleMode = 'nearest';
      this.featureTextures.set(kind, {
        texture,
        ax: art.anchorX,
        ay: art.anchorY,
        rise: art.riseAbove,
        halfWidth: art.canvas.width / 2,
      });
    }

    const playerArt = makePlayerArt();
    if (!playerArt) throw new Error('No se pudo dibujar el personaje');
    const playerTexture = Texture.from(playerArt.canvas);
    playerTexture.source.scaleMode = 'nearest';
    this.player = new Sprite(playerTexture);
    this.player.anchor.set(playerArt.anchorX, playerArt.anchorY);
    this.playerRise = playerArt.riseAbove;

    // La silueta: el mismo dibujo, tenido y translucido, por encima de todo.
    // Solo aparece cuando algo del terreno tapa al personaje.
    this.playerGhost = new Sprite(playerTexture);
    this.playerGhost.anchor.set(playerArt.anchorX, playerArt.anchorY);
    this.playerGhost.tint = 0x9fd0ff;
    this.playerGhost.alpha = 0.85;
    this.playerGhost.visible = false;
    this.markerLayer.addChild(this.playerGhost);
    // El personaje no tiene sitio fijo: cada frame entra en la antidiagonal que
    // pisa, que es lo que le hace pasar por detras de lo que tiene delante.
  }

  get tilesVisible(): number {
    return this.tilesOnScreen;
  }

  /**
   * Segmentos de contorno de bioma dibujados ahora mismo.
   *
   * Solo existe para que la prueba de humo pueda afirmar que el contorno sigue
   * ahi despues de caminar a otro chunk o de cambiar el zoom, que es justo lo
   * que se veia fallar.
   */
  get borderSegmentCount(): number {
    let total = 0;
    for (const view of this.borders.values()) total += view.segments;
    return total;
  }

  /**
   * Contornos que se salen del rombo de su propio chunk.
   *
   * Tiene que ser siempre cero. Existe porque el fallo que hubo aqui era
   * exactamente ese: al contorno se le sumaba el origen del chunk dos veces y
   * acababa dibujado un chunk mas alla, tapando el del vecino. A ojo no se
   * distingue de un contorno correcto; midiendolo, si.
   */
  get misplacedBorderCount(): number {
    let bad = 0;
    for (const [key, view] of this.borders) {
      if (view.segments === 0) continue;
      const comma = key.indexOf(',');
      const origin = worldToScreen(
        Number(key.slice(0, comma)) * CHUNK_SIZE,
        Number(key.slice(comma + 1)) * CHUNK_SIZE,
      );
      // Con la posicion del propio Graphics sumada, que es donde estaba el
      // fallo. Sin ella el error quedaria justo fuera de la medida.
      const b = view.graphics.getLocalBounds();
      const x0 = view.graphics.position.x + b.minX;
      const x1 = view.graphics.position.x + b.maxX;
      const y0 = view.graphics.position.y + b.minY;
      const y1 = view.graphics.position.y + b.maxY;
      // El margen vertical es el del relieve REAL del chunk: el contorno se pega
      // a la cima de cada tile, asi que sobre una meseta sube por encima del
      // rombo plano, pero solo lo que ese chunk suba de verdad.
      const inside =
        x0 >= origin.x - CHUNK_BOX_OFFSET_X - 1 &&
        x1 <= origin.x + CHUNK_BOX_OFFSET_X + 1 &&
        y0 >= origin.y - MAX_LEVEL * LEVEL_PX - 1 &&
        y1 <= origin.y + CHUNK_BOX_H + LEVEL_PX + 1;
      if (!inside) bad++;
    }
    return bad;
  }

  /** Activa o desactiva las superposiciones de depuracion. */
  setDebugOverlays(chunks: boolean, biomes: boolean): void {
    this.debugChunks = chunks;
    if (this.debugBiomes !== biomes) {
      this.debugBiomes = biomes;
      // Los contornos se construyen una vez por chunk y se guardan; al apagar la
      // vista se destruyen para no pagar memoria por algo invisible.
      for (const view of this.borders.values()) view.graphics.destroy();
      this.borders.clear();
    }
  }

  zoomBy(factor: number): void {
    this.tilesOnScreen = Math.min(60, Math.max(9, this.tilesOnScreen * factor));
  }

  /**
   * Dibuja un frame. `alpha` es la fraccion de tick transcurrida, y se usa para
   * interpolar la posicion del jugador: sin esto se veria a saltos de 60 Hz
   * aunque la pantalla vaya a 144.
   */
  render(state: GameState, prevX: number, prevY: number, alpha: number, effects?: Effects): void {
    const { entities, playerId } = state;
    const wx = prevX + (entities.x[playerId] - prevX) * alpha;
    const wy = prevY + (entities.y[playerId] - prevY) * alpha;

    // app.screen son pixeles logicos. renderer.width/height vienen en pixeles de
    // dispositivo con autoDensity activo, y descentrarian la camara.
    const view = this.app.screen;
    const minAxis = Math.min(view.width, view.height);
    const scale = minAxis / (this.tilesOnScreen * TILE_H);
    this.camera.scale.set(scale);

    // El personaje se apoya en la altura REAL del suelo bajo sus pies, con
    // decimales: sobre un talud sube poco a poco en vez de dar un tiron al
    // cambiar de casilla. Y la camara le sigue tambien en altura: sin esto,
    // subir a una meseta le empujaria hacia el borde de arriba de la pantalla.
    const playerHeight = state.world.groundHeightAt(wx, wy);
    this.aimLift = heightOffset(playerHeight);

    const focus = worldToScreen(wx, wy);
    this.camera.position.set(
      view.width / 2 - focus.x * scale,
      view.height / 2 - (focus.y + this.aimLift) * scale,
    );

    this.syncChunks(state, view.width, view.height, scale);

    const playerScreen = worldToScreen(wx, wy);
    playerScreen.y += this.aimLift;
    this.player.position.set(playerScreen.x, playerScreen.y);
    this.rowAt(Math.round(depthOf(wx, wy))).props.addChild(this.player);

    this.fadeOccluders(state.world, wx, wy, playerScreen);
    this.drawReticle(state.world, entities, playerId);
    this.drawEffects(state.world, effects);
    this.drawChunkGrid(state);
    this.drawSky(state.tick, view.width, view.height);
  }

  /**
   * Atenua los objetos que tapan al personaje.
   *
   * Es el problema clasico de la isometrica: un arbol una casilla por delante
   * oculta al jugador por completo, y el juego se vuelve injugable. La solucion
   * habitual, y la que usa la referencia que pidio el usuario, es volver
   * translucido lo que estorba en vez de moverlo o recortarlo.
   *
   * Solo se examinan las pocas casillas que geometricamente PUEDEN tapar: las
   * que estan por delante en profundidad y a un par de filas de distancia.
   */
  private fadeOccluders(
    world: World,
    wx: number,
    wy: number,
    playerScreen: { x: number; y: number },
  ): void {
    for (const sprite of this.faded) sprite.alpha = 1;
    this.faded.length = 0;

    const playerDepth = depthOf(wx, wy);
    const playerTop = playerScreen.y - this.playerRise;
    const tileX = Math.floor(wx);
    const tileY = Math.floor(wy);

    for (let dy = 0; dy <= 3; dy++) {
      for (let dx = 0; dx <= 3; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;
        const sprite = this.featureByTile.get(`${tx},${ty}`);
        if (!sprite || sprite.zIndex <= playerDepth) continue;

        const foot = worldToScreen(tx + 0.5, ty + 0.5);
        foot.y += heightOffset(world.groundHeightAt(tx + 0.5, ty + 0.5));
        const rise = sprite.texture.height * sprite.anchor.y;
        const halfWidth = sprite.texture.width / 2;

        // Solapa horizontalmente con el cuerpo del jugador, y su copa llega lo
        // bastante arriba como para cubrirlo.
        if (Math.abs(foot.x - playerScreen.x) > halfWidth + TILE_W / 2) continue;
        if (foot.y - rise > playerScreen.y) continue;
        if (foot.y < playerTop) continue;

        sprite.alpha = 0.34;
        this.faded.push(sprite);
      }
    }

    // El terreno es otra historia. Ahora que el suelo va en el mismo orden que
    // todo lo demas, un acantilado por delante tapa al personaje: correcto, y es
    // lo que se buscaba, pero deja al jugador invisible metido en un rincon.
    //
    // Atenuarlo como a un arbol NO vale: por detras de un arbol se ve el suelo,
    // pero por detras del suelo no hay nada, asi que se abre un agujero al vacio
    // en mitad del mundo. Se probo y quedaba peor que el problema.
    //
    // La solucion es la de siempre en isometrica: el terreno se queda opaco y el
    // personaje se dibuja ademas en SILUETA por encima. Se ve donde estas sin
    // mentir sobre lo que tienes delante.
    //
    // Que casillas estorban no se puede adivinar: una pared alta a diez filas
    // tapa tanto como la de al lado. Como las piezas ya estan indexadas por
    // profundidad, se recorren las filas de delante y se compara caja contra
    // caja; son unos cientos de rectangulos.
    // Se miran dos puntos —el pecho y la cabeza—, no la caja entera. La casilla
    // de justo delante siempre roza los PIES del personaje, asi que comparando
    // cajas la silueta saldria practicamente siempre y dejaria de significar
    // nada. Lo que de verdad estorba es lo que le tapa el cuerpo.
    const chest = { x: playerScreen.x, y: playerScreen.y - this.playerRise * 0.5 };
    const head = { x: playerScreen.x, y: playerScreen.y - this.playerRise * 0.85 };
    const from = Math.round(depthOf(wx, wy)) + 1;
    let hidden = false;
    for (let k = from; k <= from + OCCLUSION_ROWS && !hidden; k++) {
      const row = this.rows.get(k);
      if (!row) continue;
      for (const child of row.ground.children) {
        const box = spriteBox(child as Sprite);
        if (!contains(box, chest) && !contains(box, head)) continue;
        hidden = true;
        break;
      }
    }

    this.playerGhost.visible = hidden;
    if (hidden) this.playerGhost.position.copyFrom(this.player.position);
  }

  /**
   * Tinte del cielo segun la hora del mundo.
   *
   * Una sola vela de color sobre la escena, mas barata y mas estable que
   * retintar cada sprite. La noche entra en azul frio y el amanecer y el ocaso
   * pasan por un ambar calido, que es lo que hace legible el paso del tiempo
   * sin necesidad de mirar el reloj.
   */
  private drawSky(tick: number, width: number, height: number): void {
    const light = daylight(tick);
    this.skyTint.clear();
    if (light >= 0.999) return; // pleno dia: nada que tintar

    // Cerca de las transiciones el tinte vira a ambar; en plena noche, a azul.
    const warmth = 1 - Math.abs(light - 0.5) * 2;
    const nightAlpha = (1 - light) * 0.52;
    const color = mixColor(0x0a1a3c, 0x6b3a12, warmth * 0.55);

    this.skyTint.rect(0, 0, width, height).fill({ color, alpha: nightAlpha });
  }

  /** Rejilla sobre los limites de cada chunk visible. */
  private drawChunkGrid(state: GameState): void {
    this.chunkGrid.clear();
    if (!this.debugChunks) return;

    state.world.eachLoadedChunk((chunk) => {
      const key = `${chunk.cx},${chunk.cy}`;
      if (!this.views.has(key)) return;
      const north = worldToScreen(chunk.cx * CHUNK_SIZE, chunk.cy * CHUNK_SIZE);
      const east = worldToScreen((chunk.cx + 1) * CHUNK_SIZE, chunk.cy * CHUNK_SIZE);
      const south = worldToScreen((chunk.cx + 1) * CHUNK_SIZE, (chunk.cy + 1) * CHUNK_SIZE);
      const west = worldToScreen(chunk.cx * CHUNK_SIZE, (chunk.cy + 1) * CHUNK_SIZE);
      this.chunkGrid
        .moveTo(north.x, north.y)
        .lineTo(east.x, east.y)
        .lineTo(south.x, south.y)
        .lineTo(west.x, west.y)
        .closePath()
        .stroke({ width: 1.5, color: 0x8fc4ff, alpha: 0.7 });
    });
  }

  /**
   * Contorno de las manchas de bioma, dibujado sobre los tiles reales.
   *
   * Es la comprobacion visual de que el bioma que anuncia el panel es el del
   * suelo que se pisa: si el contorno no coincide con lo que se ve, algo falla.
   *
   * La geometria viene en coordenadas ABSOLUTAS de `collectBiomeEdges`, asi que
   * el `Graphics` se queda en (0,0) dentro de `markerLayer`, igual que
   * `chunkGrid`. Asignarle ademas la posicion del chunk sumaba el origen dos
   * veces y sacaba todo el contorno un chunk en diagonal.
   */
  private buildBiomeBorders(world: World, chunk: Chunk): BorderView {
    const graphics = new Graphics();
    const segments = collectBiomeEdges(world, chunk);
    for (let i = 0; i < segments.length; i += 4) {
      graphics.moveTo(segments[i], segments[i + 1]).lineTo(segments[i + 2], segments[i + 3]);
    }
    graphics.stroke({ width: 1, color: 0xffe08a, alpha: 0.9 });
    this.markerLayer.addChild(graphics);
    return { graphics, segments: segments.length / 4 };
  }

  /**
   * Marca las tres casillas del area. La apuntada va mas marcada que las dos
   * flanqueantes: sigue siendo la que importa para sembrar.
   */
  private drawReticle(world: World, entities: GameState['entities'], playerId: number): void {
    this.reticle.clear();
    const area = actionArea(entities, playerId);
    for (let i = 0; i < area.length; i++) {
      const p = worldToScreen(area[i].x, area[i].y);
      // Cada casilla se marca a SU altura, que es lo que hace ver de un vistazo
      // que la de arriba de una pared no esta al alcance.
      const lift = heightOffset(world.levelAt(area[i].x, area[i].y));
      for (let c = 0; c < TILE_DIAMOND.length; c++) {
        const corner = TILE_DIAMOND[c];
        if (c === 0) this.reticle.moveTo(p.x + corner.x, p.y + corner.y + lift);
        else this.reticle.lineTo(p.x + corner.x, p.y + corner.y + lift);
      }
      this.reticle
        .closePath()
        .stroke({ width: 1.5, color: 0xffffff, alpha: i === 0 ? 0.55 : 0.22 });
    }
  }

  /**
   * Pixel de pantalla a coordenadas del mundo.
   *
   * Es la inversa de la camara, y vive aqui porque el renderizador es la unica
   * parte que sabe donde esta y a que escala. Con ella el input traduce el raton
   * a una direccion de mirada sin enterarse de como se proyecta el mundo.
   */
  pointerToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    const scale = this.camera.scale.x;
    return screenToWorld(
      (clientX - rect.left - this.camera.x) / scale,
      (clientY - rect.top - this.camera.y) / scale - this.aimLift,
    );
  }

  /**
   * Slash y escombros.
   *
   * El slash es un arco que barre los centros de las tres casillas: son
   * contiguas en el anillo de direcciones, asi que un solo trazo las recorre y
   * se lee como un golpe y no como tres marcas sueltas. Crece y se desvanece.
   *
   * Los escombros son cuadraditos con la altura restada en Y, que es como se
   * dibuja en isometrica todo lo que se levanta del suelo.
   */
  private drawEffects(world: World, effects: Effects | undefined): void {
    this.effectLayer.clear();
    if (!effects) return;

    for (const slash of effects.slashes) {
      const t = progressOf(slash);
      // Barre de una punta a la otra y se apaga por detras.
      const swept = Math.min(1, t * 1.6);
      const alpha = (1 - t) * 0.85;
      if (alpha <= 0) continue;

      // Las flanqueantes van a los extremos del arco y la apuntada al centro.
      const [aimed, left, right] = slash.tiles;
      const path = [left, aimed, right].filter(Boolean);
      const points = path.map((tile) => {
        const p = worldToScreen(tile.x, tile.y);
        const lift = heightOffset(world.levelAt(tile.x, tile.y));
        return { x: p.x, y: p.y + lift + TILE_H / 2 - TILE_H * 0.9 };
      });
      if (points.length < 2) continue;

      const last = Math.max(1, Math.ceil(swept * (points.length - 1)));
      this.effectLayer.moveTo(points[0].x, points[0].y);
      for (let i = 1; i <= last && i < points.length; i++) {
        this.effectLayer.lineTo(points[i].x, points[i].y);
      }
      this.effectLayer.stroke({ width: 3 - t * 1.5, color: 0xffffff, alpha });
    }

    for (const p of effects.particles) {
      const t = progressOf(p);
      const screen = worldToScreen(p.x, p.y);
      const half = p.size / 2;
      const x = screen.x - half;
      // La altura del escombro es la del mundo, asi que se mide con la misma
      // vara que el relieve: si no, los escombros de una meseta caerian al mar.
      const y = screen.y + TILE_H / 2 - p.z * LEVEL_PX - half;
      // Se apaga al final, no de golpe.
      const alpha = Math.min(1, (1 - t) * 2.2);

      // Un contorno oscuro por debajo: los verdes de un arbol sobre hierba verde
      // desaparecen sin el, y cambiar el color seria traicionar el encargo —los
      // escombros son los colores del objeto, no unos que se vean mejor.
      this.effectLayer
        .rect(x - 1, y - 1, p.size + 2, p.size + 2)
        .fill({ color: 0x101820, alpha: alpha * 0.55 });
      this.effectLayer.rect(x, y, p.size, p.size).fill({ color: p.color, alpha });
    }
  }

  /** True si el rombo de un chunk toca la pantalla. */
  private blockVisible(
    chunk: Chunk,
    bounds: TileBounds,
    w: number,
    h: number,
    scale: number,
    relief: { top: number; bottom: number },
  ): boolean {
    const baseX = chunk.cx * CHUNK_SIZE + bounds.x0;
    const baseY = chunk.cy * CHUNK_SIZE + bounds.y0;
    const side = bounds.x1 - bounds.x0;
    const origin = worldToScreen(baseX, baseY);
    const boxW = side * TILE_W;
    const boxH = side * TILE_H + relief.top + relief.bottom;
    const left = this.camera.x + (origin.x - boxW / 2) * scale;
    const top = this.camera.y + (origin.y - relief.top) * scale;
    const margin = TILE_W * scale; // holgura para objetos altos que sobresalen
    return (
      left + boxW * scale > -margin &&
      left < w + margin &&
      top + boxH * scale > -margin * 4 &&
      top < h + margin
    );
  }

  /**
   * Materializa solo los chunks que se ven.
   *
   * Antes se creaba una textura para cada chunk CARGADO (49) aunque solo se
   * vieran unos pocos. Sigue valiendo con los sprites por tile: mil por chunk
   * cargado serian cincuenta mil, y visibles hay una decima parte.
   */
  private syncChunks(state: GameState, w: number, h: number, scale: number): void {
    const seen = new Set<string>();
    const chunksSeen = new Set<string>();

    state.world.eachLoadedChunk((chunk: Chunk) => {
      for (let by = 0; by < BLOCKS_PER_CHUNK; by++) {
        for (let bx = 0; bx < BLOCKS_PER_CHUNK; bx++) {
          const key = `${chunk.cx},${chunk.cy},${bx},${by}`;
          const bounds = {
            x0: bx * VIEW_BLOCK,
            y0: by * VIEW_BLOCK,
            x1: (bx + 1) * VIEW_BLOCK,
            y1: (by + 1) * VIEW_BLOCK,
          };
          const view = this.views.get(key);
          // Un bloque que ya tiene vista sabe cuanto sobresale su relieve; uno
          // que no, se mide al vuelo. Son sesenta y cuatro enteros, mucho mas
          // barato que construirle los sprites por si acaso.
          const margin = view ? view.margin : blockReliefMargin(chunk, bounds);
          if (!this.blockVisible(chunk, bounds, w, h, scale, margin)) continue;

          seen.add(key);
          chunksSeen.add(`${chunk.cx},${chunk.cy}`);
          if (!view) {
            this.views.set(key, this.buildBlockView(state.world, chunk, bounds, margin));
            continue;
          }

          // El terreno no cambia nunca; solo las features pueden desaparecer al
          // recolectarlas, asi que basta con rehacer los sprites del bloque.
          if (view.revision !== chunk.revision) {
            this.clearFeatures(view);
            view.features = this.buildFeatures(state.world, chunk, bounds);
            view.revision = chunk.revision;
          }
        }
      }
      if (chunksSeen.has(`${chunk.cx},${chunk.cy}`)) this.ensureBiomeBorders(state.world, chunk);
    });

    for (const [key, view] of this.views) {
      if (seen.has(key)) continue;
      this.clearFeatures(view);
      this.clearGround(view);
      this.views.delete(key);
    }
    for (const [key, view] of this.borders) {
      if (chunksSeen.has(key)) continue;
      view.graphics.destroy();
      this.borders.delete(key);
    }

    this.pruneRows();
  }

  /**
   * Tira las antidiagonales que se han quedado vacias.
   *
   * Sin esto la lista crece con cada paso que da el jugador y nunca encoge, y es
   * justo la lista que se ordena en cada frame: seria una fuga lenta que acabaria
   * costando mas que todo lo que dibuja.
   */
  private pruneRows(): void {
    for (const [k, row] of this.rows) {
      if (row.ground.children.length > 0 || row.props.children.length > 0) continue;
      row.node.destroy({ children: true });
      this.rows.delete(k);
    }
  }

  private buildBlockView(
    world: World,
    chunk: Chunk,
    bounds: TileBounds,
    margin: { top: number; bottom: number },
  ): BlockView {
    return {
      cx: chunk.cx,
      cy: chunk.cy,
      bounds,
      ground: this.buildGround(world, chunk, bounds),
      features: this.buildFeatures(world, chunk, bounds),
      margin,
      revision: chunk.revision,
    };
  }

  /**
   * El terreno de un chunk: una cima por tile y las caras que cuelguen de ella.
   *
   * Cada pieza entra en la antidiagonal de su propio tile, y dentro de ella en
   * `ground`. La cima va antes que sus caras porque las caras cuelgan por
   * delante; y como la cara este se comparte con el tile de `x + 1`, que esta una
   * antidiagonal mas adelante, ese vecino se dibuja despues y la tapa si le toca.
   */
  private buildGround(world: World, chunk: Chunk, bounds: TileBounds): Sprite[] {
    const sprites: Sprite[] = [];

    // La geometria y el ORDEN salen de `terrain-draw.ts`, que es puro. Aqui solo
    // se convierten en sprites: asi la regla de quien tapa a quien se puede
    // afirmar en un test de Node, que es lo que faltaba cuando se rompio.
    for (const piece of groundPieces(world, chunk, bounds)) {
      const art =
        piece.kind === 'top'
          ? this.topTexture(
              piece.terrain,
              piece.rampDir,
              shadeStepAt(world.seed, piece.wx, piece.wy),
            )
          : this.faceTexture(piece.face!);
      if (!art) continue;

      const o = worldToScreen(piece.wx, piece.wy);
      // La cima se ancla en la esquina norte; una cara, en la esquina cercana de
      // su borde: la E para la del este y la O para la del sur.
      const anchor =
        piece.kind === 'top'
          ? { x: 0, y: 0 }
          : piece.kind === 'east'
            ? { x: TILE_W / 2, y: TILE_H / 2 }
            : { x: -TILE_W / 2, y: TILE_H / 2 };

      const sprite = new Sprite(art.texture);
      sprite.anchor.set(art.ax, art.ay);
      sprite.position.set(o.x + anchor.x, o.y + anchor.y + heightOffset(piece.anchorHeight));
      this.rowAt(piece.wx + piece.wy).ground.addChild(sprite);
      const tileKey = `${piece.wx},${piece.wy}`;
      const atTile = this.groundByTile.get(tileKey);
      if (atTile) atTile.push(sprite);
      else this.groundByTile.set(tileKey, [sprite]);
      sprites.push(sprite);
    }

    return sprites;
  }

  private topTexture(
    terrain: number,
    rampDir: number,
    shadeStep: number,
  ): { texture: Texture; ax: number; ay: number } | null {
    // El nivel NO entra en la clave: la forma de una cima solo depende de su
    // talud, y la altura la pone la posicion del sprite. Sin eso habria una
    // textura por altitud y el cache no serviria de nada.
    const key = `${terrain}|${rampDir}|${shadeStep}`;
    const cached = this.topTextures.get(key);
    if (cached !== undefined) return cached;

    const art = makeTopArt(terrain, 0, rampDir, shadeStep);
    if (!art) {
      this.topTextures.set(key, null);
      return null;
    }
    const texture = Texture.from(art.canvas);
    texture.source.scaleMode = 'nearest';
    const made = { texture, ax: art.anchorX, ay: art.anchorY };
    this.topTextures.set(key, made);
    return made;
  }

  /** Crea el contorno del chunk si toca y todavia no existe. */
  private ensureBiomeBorders(world: World, chunk: Chunk): void {
    if (!this.debugBiomes) return;
    const key = `${chunk.cx},${chunk.cy}`;
    if (this.borders.has(key)) return;
    this.borders.set(key, this.buildBiomeBorders(world, chunk));
  }

  /**
   * Un sprite por feature del chunk, con su profundidad ya fijada.
   *
   * Lee lo que hay REALMENTE en cada tile, no el potencial del generador. Antes
   * leia el potencial mientras la colision consultaba la version efectiva, y por
   * eso una planta recolectada seguia dibujada aunque ya no existiera para el
   * juego. Una sola fuente de verdad cierra ese fallo por construccion.
   */
  private buildFeatures(world: World, chunk: Chunk, bounds: TileBounds): Sprite[] {
    const sprites: Sprite[] = [];
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseY = chunk.cy * CHUNK_SIZE;
    world.readFeatures(chunk, featureScratch);

    for (let ly = bounds.y0; ly < bounds.y1; ly++) {
      for (let lx = bounds.x0; lx < bounds.x1; lx++) {
        const feature = featureScratch[ly * CHUNK_SIZE + lx] as Feature;
        if (feature === Feature.None) continue;
        const art = this.featureTextures.get(feature);
        if (!art) continue;

        const wx = baseX + lx;
        const wy = baseY + ly;
        // El objeto se apoya en el CENTRO del tile, no en su esquina norte, y a
        // la altura que tenga ese centro: un arbol sobre una meseta va arriba.
        const p = worldToScreen(wx + 0.5, wy + 0.5);
        const idx = ly * CHUNK_SIZE + lx;
        const height = groundHeight(chunk.level[idx], chunk.rampDir[idx], 0.5, 0.5);
        const sprite = new Sprite(art.texture);
        sprite.anchor.set(art.ax, art.ay);
        sprite.position.set(p.x, p.y + heightOffset(height));
        this.rowAt(wx + wy).props.addChild(sprite);
        const tileKey = `${wx},${wy}`;
        this.featureByTile.set(tileKey, sprite);
        this.featureKeys.set(sprite, tileKey);
        sprites.push(sprite);
      }
    }
    return sprites;
  }

  private faceTexture(face: {
    terrain: number;
    side: 'east' | 'south';
    top0: number;
    top1: number;
    bottom0: number;
    bottom1: number;
  }): { texture: Texture; ax: number; ay: number } | null {
    // Las alturas entran en la clave RELATIVAS a la cima cercana: dos paredes
    // con la misma forma a distinta altitud comparten dibujo.
    const key = [
      face.terrain,
      face.side,
      0,
      face.top1 - face.top0,
      face.bottom0 - face.top0,
      face.bottom1 - face.top0,
    ].join('|');
    const cached = this.faceTextures.get(key);
    if (cached !== undefined) return cached;

    const art = makeFaceArt(
      face.terrain,
      face.side,
      0,
      face.top1 - face.top0,
      face.bottom0 - face.top0,
      face.bottom1 - face.top0,
    );
    if (!art) {
      this.faceTextures.set(key, null);
      return null;
    }
    const texture = Texture.from(art.canvas);
    texture.source.scaleMode = 'nearest';
    const made = { texture, ax: art.anchorX, ay: art.anchorY };
    this.faceTextures.set(key, made);
    return made;
  }

  private clearGround(view: BlockView): void {
    const baseX = view.cx * CHUNK_SIZE;
    const baseY = view.cy * CHUNK_SIZE;
    for (let ly = view.bounds.y0; ly < view.bounds.y1; ly++) {
      for (let lx = view.bounds.x0; lx < view.bounds.x1; lx++) {
        this.groundByTile.delete(`${baseX + lx},${baseY + ly}`);
      }
    }
    for (const sprite of view.ground) sprite.destroy();
    view.ground.length = 0;
    // Un suelo atenuado que acaba de destruirse no debe quedar en la lista.
    this.faded.length = 0;
  }

  private clearFeatures(view: BlockView): void {
    for (const sprite of view.features) {
      const key = this.featureKeys.get(sprite);
      if (key) {
        this.featureByTile.delete(key);
        this.featureKeys.delete(sprite);
      }
      sprite.destroy();
    }
    view.features.length = 0;
    // Una feature atenuada que acaba de destruirse no debe quedar en la lista.
    this.faded.length = 0;
  }

  /** Tira todo lo dibujado. Se usa al empezar un mundo nuevo. */
  reset(): void {
    for (const view of this.views.values()) {
      this.clearFeatures(view);
      this.clearGround(view);
    }
    for (const view of this.borders.values()) view.graphics.destroy();
    this.views.clear();
    this.borders.clear();
    this.groundByTile.clear();
    this.featureByTile.clear();
    this.featureKeys.clear();
    this.faded.length = 0;
    // El personaje sale de su fila antes de tirarlas: si no, se destruiria con
    // ella y el mundo nuevo nacería sin nadie dentro.
    this.player.removeFromParent();
    for (const row of this.rows.values()) row.node.destroy({ children: true });
    this.rows.clear();
  }

  /**
   * Si el terreno esta tapando al personaje ahora mismo.
   *
   * Lo expone para que la prueba de humo pueda comprobar las dos mitades de la
   * regla: al descubierto no hay silueta, y detras de un acantilado si.
   */
  get playerHidden(): boolean {
    return this.playerGhost.visible;
  }

  /** Piezas de mundo dibujadas: suelo, relieve, features y personaje. */
  get objectCount(): number {
    let total = 0;
    for (const view of this.views.values()) total += view.ground.length + view.features.length;
    return total;
  }

  /**
   * Caras de relieve dibujadas y formas distintas cacheadas.
   *
   * La primera dice que el relieve se esta viendo; la segunda vigila que el
   * cache haga su trabajo: si creciera con cada chunk seria que la clave no
   * agrupa nada y estariamos pagando un lienzo por pared.
   */
  get faceCount(): { drawn: number; shapes: number } {
    let drawn = 0;
    for (const view of this.views.values()) drawn += view.ground.length;
    return { drawn, shapes: this.faceTextures.size + this.topTextures.size };
  }
}

/** Caja que ocupa un sprite, en el espacio del mundo dibujado. */
function spriteBox(sprite: Sprite): { x0: number; y0: number; x1: number; y1: number } {
  const w = sprite.texture.width;
  const h = sprite.texture.height;
  const x0 = sprite.position.x - w * sprite.anchor.x;
  const y0 = sprite.position.y - h * sprite.anchor.y;
  return { x0, y0, x1: x0 + w, y1: y0 + h };
}

function contains(
  box: { x0: number; y0: number; x1: number; y1: number },
  p: { x: number; y: number },
): boolean {
  return p.x >= box.x0 && p.x <= box.x1 && p.y >= box.y0 && p.y <= box.y1;
}

/** Mezcla dos colores empaquetados en 0xRRGGBB. */
function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
