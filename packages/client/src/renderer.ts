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
import { daylight, targetTile } from '@verdant/sim';
import { depthOf, TILE_H, TILE_W, worldToScreen } from './projection.js';
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

  zoomBy(factor: number): void {
    this.tilesOnScreen = Math.min(60, Math.max(9, this.tilesOnScreen * factor));
  }

  /**
   * Dibuja un frame. `alpha` es la fraccion de tick transcurrida, y se usa para
   * interpolar la posicion del jugador: sin esto se veria a saltos de 60 Hz
   * aunque la pantalla vaya a 144.
   */
  render(state: GameState, prevX: number, prevY: number, alpha: number): void {
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

  private drawReticle(entities: GameState['entities'], playerId: number): void {
    const target = targetTile(entities, playerId);
    const p = worldToScreen(target.x, target.y);
    this.reticle.clear();
    this.reticle
      .moveTo(p.x, p.y)
      .lineTo(p.x + TILE_W / 2, p.y + TILE_H / 2)
      .lineTo(p.x, p.y + TILE_H)
      .lineTo(p.x - TILE_W / 2, p.y + TILE_H / 2)
      .closePath()
      .stroke({ width: 1.5, color: 0xffffff, alpha: 0.5 });
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
    });

    for (const [key, view] of this.views) {
      if (seen.has(key)) continue;
      this.clearFeatures(view);
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

    return { terrain, texture, features: this.buildFeatures(world, chunk), revision: chunk.revision };
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
