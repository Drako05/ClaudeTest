/**
 * Renderizador isometrico. Es la unica parte del proyecto que sabe que existe
 * un navegador.
 *
 * Tres capas, y el reparto entre ellas es lo que hace que la vista funcione:
 *
 *  1. Terreno: un sprite por chunk visible, pre-pintado en rombos. Es plano y no
 *     cambia nunca, asi que su textura se genera una vez.
 *  2. Marcador: el reticulo del tile apuntado, siempre sobre el suelo.
 *  3. Objetos: features, personaje y todo lo que tenga altura, ORDENADO POR
 *     PROFUNDIDAD. Sin ese orden el personaje apareceria por delante de un arbol
 *     que tiene detras, que es exactamente lo que destruye la ilusion de volumen.
 */

import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { CHUNK_SIZE, Feature } from '@verdant/shared';
import type { Chunk, GameState, World } from '@verdant/sim';
import { actionArea, daylight } from '@verdant/sim';
import { collectBiomeEdges } from './biome-edges.js';
import { progressOf, type Effects } from './effects.js';
import { depthOf, screenToWorld, TILE_DIAMOND, TILE_H, TILE_W, worldToScreen } from './projection.js';
import {
  CHUNK_TEX_H,
  CHUNK_TEX_OFFSET_X,
  CHUNK_TEX_W,
  makeFeatureArt,
  makePlayerArt,
  paintChunkTerrain,
} from './tiles.js';

interface ChunkView {
  terrain: Sprite;
  texture: Texture;
  /** Sprites de las features de este chunk, para poder retirarlos en bloque. */
  features: Sprite[];
  /** Contorno de los biomas del chunk. Solo existe con la vista activada. */
  biomeBorders: Graphics | null;
  /** Segmentos de ese contorno. Solo para verificacion. */
  borderSegments: number;
  revision: number;
}

/** Todo lo que puede haber sobre un tile y necesita sprite propio. */
const FEATURE_KINDS: readonly Feature[] = [
  Feature.RockNode,
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

/** Buffer reutilizado al leer las features efectivas de un chunk. */
const featureScratch = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);

export class Renderer {
  readonly app: Application;
  private readonly camera = new Container();
  private readonly terrainLayer = new Container();
  private readonly markerLayer = new Container();
  private readonly objectLayer = new Container();
  private readonly views = new Map<string, ChunkView>();
  private readonly featureTextures = new Map<
    Feature,
    { texture: Texture; ax: number; ay: number; rise: number; halfWidth: number }
  >();
  /** Indice de features por tile, para resolver oclusion sin recorrerlas todas. */
  private readonly featureByTile = new Map<string, Sprite>();
  /** Camino inverso del indice, para poder limpiarlo al destruir un chunk. */
  private readonly featureKeys = new Map<Sprite, string>();
  /** Features atenuadas este frame, para poder restaurarlas en el siguiente. */
  private readonly faded: Sprite[] = [];
  private player!: Sprite;
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
   * Filas de tiles visibles a lo largo del eje menor de la pantalla.
   * Medir contra el eje menor hace que el encuadre funcione igual en vertical
   * que en apaisado.
   */
  private tilesOnScreen = 22;

  private constructor(app: Application) {
    this.app = app;
    this.objectLayer.sortableChildren = true;
    this.camera.addChild(this.terrainLayer, this.markerLayer, this.objectLayer);
    this.app.stage.addChild(this.camera);
    this.markerLayer.addChild(this.reticle);
    this.markerLayer.addChild(this.chunkGrid);
    this.camera.addChild(this.effectLayer);
    // Fuera de la camara: cubre la pantalla, no el mundo.
    this.app.stage.addChild(this.skyTint);
    this.buildTextures();
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
    this.objectLayer.addChild(this.player);
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
    for (const view of this.views.values()) total += view.borderSegments;
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
    for (const [key, view] of this.views) {
      if (!view.biomeBorders || view.borderSegments === 0) continue;
      const comma = key.indexOf(',');
      const origin = worldToScreen(
        Number(key.slice(0, comma)) * CHUNK_SIZE,
        Number(key.slice(comma + 1)) * CHUNK_SIZE,
      );
      // Con la posicion del propio Graphics sumada, que es donde estaba el
      // fallo. Sin ella el error quedaria justo fuera de la medida.
      const b = view.biomeBorders.getLocalBounds();
      const x0 = view.biomeBorders.position.x + b.minX;
      const x1 = view.biomeBorders.position.x + b.maxX;
      const y0 = view.biomeBorders.position.y + b.minY;
      const y1 = view.biomeBorders.position.y + b.maxY;
      const inside =
        x0 >= origin.x - CHUNK_TEX_OFFSET_X - 1 &&
        x1 <= origin.x + CHUNK_TEX_OFFSET_X + 1 &&
        y0 >= origin.y - 1 &&
        y1 <= origin.y + CHUNK_TEX_H + 1;
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
      for (const view of this.views.values()) {
        view.biomeBorders?.destroy();
        view.biomeBorders = null;
        view.borderSegments = 0;
      }
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

    const focus = worldToScreen(wx, wy);
    this.camera.position.set(
      view.width / 2 - focus.x * scale,
      view.height / 2 - focus.y * scale,
    );

    this.syncChunks(state, view.width, view.height, scale);

    const playerScreen = worldToScreen(wx, wy);
    this.player.position.set(playerScreen.x, playerScreen.y);
    this.player.zIndex = depthOf(wx, wy);

    this.fadeOccluders(wx, wy, playerScreen);
    this.drawReticle(entities, playerId);
    this.drawEffects(effects);
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
  private fadeOccluders(wx: number, wy: number, playerScreen: { x: number; y: number }): void {
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
  private buildBiomeBorders(world: World, chunk: Chunk, view: ChunkView): Graphics {
    const g = new Graphics();
    const segments = collectBiomeEdges(world, chunk);
    for (let i = 0; i < segments.length; i += 4) {
      g.moveTo(segments[i], segments[i + 1]).lineTo(segments[i + 2], segments[i + 3]);
    }
    g.stroke({ width: 1, color: 0xffe08a, alpha: 0.9 });
    view.borderSegments = segments.length / 4;
    return g;
  }

  /**
   * Marca las tres casillas del area. La apuntada va mas marcada que las dos
   * flanqueantes: sigue siendo la que importa para sembrar.
   */
  private drawReticle(entities: GameState['entities'], playerId: number): void {
    this.reticle.clear();
    const area = actionArea(entities, playerId);
    for (let i = 0; i < area.length; i++) {
      const p = worldToScreen(area[i].x, area[i].y);
      for (let c = 0; c < TILE_DIAMOND.length; c++) {
        const corner = TILE_DIAMOND[c];
        if (c === 0) this.reticle.moveTo(p.x + corner.x, p.y + corner.y);
        else this.reticle.lineTo(p.x + corner.x, p.y + corner.y);
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
      (clientY - rect.top - this.camera.y) / scale,
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
  private drawEffects(effects: Effects | undefined): void {
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
        return { x: p.x, y: p.y + TILE_H / 2 - TILE_H * 0.9 };
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
      const y = screen.y + TILE_H / 2 - p.z * TILE_H * 2 - half;
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
  private chunkVisible(cx: number, cy: number, w: number, h: number, scale: number): boolean {
    const origin = worldToScreen(cx * CHUNK_SIZE, cy * CHUNK_SIZE);
    const left = this.camera.x + (origin.x - CHUNK_TEX_OFFSET_X) * scale;
    const top = this.camera.y + origin.y * scale;
    const margin = TILE_W * scale; // holgura para objetos altos que sobresalen
    return (
      left + CHUNK_TEX_W * scale > -margin &&
      left < w + margin &&
      top + CHUNK_TEX_H * scale > -margin * 4 &&
      top < h + margin
    );
  }

  /**
   * Materializa solo los chunks que se ven.
   *
   * Antes se creaba una textura para cada chunk CARGADO (49) aunque solo se
   * vieran unos pocos. En isometrica la caja de un chunk pasa de 512x512 a
   * 1024x512, asi que hacerlo asi rondaria los 100 MB de texturas: inviable en
   * un movil.
   */
  private syncChunks(state: GameState, w: number, h: number, scale: number): void {
    const seen = new Set<string>();

    state.world.eachLoadedChunk((chunk: Chunk) => {
      if (!this.chunkVisible(chunk.cx, chunk.cy, w, h, scale)) return;

      const key = `${chunk.cx},${chunk.cy}`;
      seen.add(key);
      const view = this.views.get(key);

      if (!view) {
        this.views.set(key, this.buildChunkView(state.world, chunk));
        return;
      }

      // El terreno no cambia nunca; solo las features pueden desaparecer al
      // recolectarlas, asi que basta con rehacer los sprites de este chunk.
      if (view.revision !== chunk.revision) {
        this.clearFeatures(view);
        view.features = this.buildFeatures(state.world, chunk);
        view.revision = chunk.revision;
      }

      this.ensureBiomeBorders(state.world, chunk, view);
    });

    for (const [key, view] of this.views) {
      if (seen.has(key)) continue;
      this.clearFeatures(view);
      view.biomeBorders?.destroy();
      view.terrain.destroy();
      view.texture.destroy(true);
      this.views.delete(key);
    }
  }

  private buildChunkView(world: World, chunk: Chunk): ChunkView {
    const canvas = document.createElement('canvas');
    canvas.width = CHUNK_TEX_W;
    canvas.height = CHUNK_TEX_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener el contexto 2D del chunk');
    paintChunkTerrain(chunk, ctx, world.seed);

    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'nearest';
    const terrain = new Sprite(texture);
    const origin = worldToScreen(chunk.cx * CHUNK_SIZE, chunk.cy * CHUNK_SIZE);
    terrain.position.set(origin.x - CHUNK_TEX_OFFSET_X, origin.y);
    this.terrainLayer.addChild(terrain);

    const view: ChunkView = {
      terrain,
      texture,
      features: this.buildFeatures(world, chunk),
      biomeBorders: null,
      borderSegments: 0,
      revision: chunk.revision,
    };
    // Tambien al nacer la vista: si no, el contorno tardaria un frame de mas en
    // aparecer cada vez que un chunk entra en pantalla.
    this.ensureBiomeBorders(world, chunk, view);
    return view;
  }

  /** Crea el contorno del chunk si toca y todavia no existe. */
  private ensureBiomeBorders(world: World, chunk: Chunk, view: ChunkView): void {
    if (!this.debugBiomes || view.biomeBorders) return;
    view.biomeBorders = this.buildBiomeBorders(world, chunk, view);
    this.markerLayer.addChild(view.biomeBorders);
  }

  /**
   * Un sprite por feature del chunk, con su profundidad ya fijada.
   *
   * Lee lo que hay REALMENTE en cada tile, no el potencial del generador. Antes
   * leia el potencial mientras la colision consultaba la version efectiva, y por
   * eso una planta recolectada seguia dibujada aunque ya no existiera para el
   * juego. Una sola fuente de verdad cierra ese fallo por construccion.
   */
  private buildFeatures(world: World, chunk: Chunk): Sprite[] {
    const sprites: Sprite[] = [];
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseY = chunk.cy * CHUNK_SIZE;
    world.readFeatures(chunk, featureScratch);

    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const feature = featureScratch[ly * CHUNK_SIZE + lx] as Feature;
        if (feature === Feature.None) continue;
        const art = this.featureTextures.get(feature);
        if (!art) continue;

        const wx = baseX + lx;
        const wy = baseY + ly;
        // El objeto se apoya en el CENTRO del tile, no en su esquina norte.
        const p = worldToScreen(wx + 0.5, wy + 0.5);
        const sprite = new Sprite(art.texture);
        sprite.anchor.set(art.ax, art.ay);
        sprite.position.set(p.x, p.y);
        sprite.zIndex = depthOf(wx + 0.5, wy + 0.5);
        this.objectLayer.addChild(sprite);
        const tileKey = `${wx},${wy}`;
        this.featureByTile.set(tileKey, sprite);
        this.featureKeys.set(sprite, tileKey);
        sprites.push(sprite);
      }
    }
    return sprites;
  }

  private clearFeatures(view: ChunkView): void {
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
      view.biomeBorders?.destroy();
      view.terrain.destroy();
      view.texture.destroy(true);
    }
    this.views.clear();
    this.featureByTile.clear();
    this.featureKeys.clear();
    this.faded.length = 0;
  }

  /** Numero de objetos dibujados. Util para vigilar el coste del ordenado. */
  get objectCount(): number {
    return this.objectLayer.children.length;
  }
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
