/**
 * Renderizador. Es la unica parte del proyecto que sabe que existe un navegador.
 *
 * Estrategia: un sprite por chunk. Cada chunk se pinta una vez en un canvas 2D,
 * se sube como textura y solo se repinta si su revision cambia (por ejemplo al
 * talar un arbol). Dibujar el mundo cuesta entonces ~25 sprites por frame en vez
 * de decenas de miles, que es lo que permite que esto vaya fluido en el navegador.
 */

import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { CHUNK_SIZE } from '@verdant/shared';
import type { Chunk, GameState } from '@verdant/sim';
import { targetTile } from '@verdant/sim';
import { CHUNK_PX, paintChunk, TILE_PX } from './tiles.js';

interface ChunkView {
  sprite: Sprite;
  texture: Texture;
  canvas: HTMLCanvasElement;
  revision: number;
}

export class Renderer {
  readonly app: Application;
  private readonly camera = new Container();
  private readonly terrainLayer = new Container();
  private readonly overlayLayer = new Container();
  private readonly views = new Map<string, ChunkView>();
  private readonly player = new Graphics();
  private readonly reticle = new Graphics();
  /**
   * Tiles visibles a lo largo del EJE MENOR de la pantalla. Controla el zoom.
   *
   * Medir contra el eje menor y no contra la altura es lo que hace que el
   * encuadre funcione en vertical: en apaisado el eje menor sigue siendo la
   * altura, asi que el encuadre de escritorio no cambia, pero en un movil en
   * vertical deja de quedar cerradisimo.
   */
  private tilesOnScreen = 26;

  private constructor(app: Application) {
    this.app = app;
    this.camera.addChild(this.terrainLayer);
    this.camera.addChild(this.overlayLayer);
    this.app.stage.addChild(this.camera);
    this.overlayLayer.addChild(this.reticle);
    this.overlayLayer.addChild(this.player);
    this.drawPlayerSprite();
  }

  static async create(): Promise<Renderer> {
    const app = new Application();
    await app.init({
      background: 0x0b1020,
      resizeTo: window,
      antialias: false,
      // Con resolution 1 el canvas se dibuja en pixeles CSS y el navegador lo
      // reescala suavizado: en un movil de densidad 3x el arte pixelado se ve
      // borroso. Se sigue la densidad real, con tope de 2 para no pagar 9x de
      // relleno en pantallas 3x a cambio de una nitidez que ya no se aprecia.
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: 'webgl',
    });
    document.body.appendChild(app.canvas);
    return new Renderer(app);
  }

  zoomBy(factor: number): void {
    this.tilesOnScreen = Math.min(70, Math.max(12, this.tilesOnScreen * factor));
  }

  private drawPlayerSprite(): void {
    this.player.clear();
    this.player
      .ellipse(1, 6, 6, 2.6)
      .fill({ color: 0x000000, alpha: 0.28 })
      .circle(0, 0, 6.2)
      .fill(0x1a2740)
      .circle(0, 0, 5)
      .fill(0xf2d7b0)
      .circle(0, -1.4, 2.2)
      .fill(0x2b3d5e);
  }

  /**
   * Dibuja un frame. `alpha` es la fraccion de tick transcurrida, y se usa para
   * interpolar la posicion del jugador: sin esto se veria a saltos de 60 Hz
   * aunque la pantalla vaya a 144.
   */
  render(state: GameState, prevX: number, prevY: number, alpha: number): void {
    const { entities, playerId } = state;
    const px = prevX + (entities.x[playerId] - prevX) * alpha;
    const py = prevY + (entities.y[playerId] - prevY) * alpha;

    // app.screen son pixeles logicos (CSS). renderer.width/height pueden venir
    // en pixeles de dispositivo cuando autoDensity esta activo, y usarlos aqui
    // descentraria la camara en pantallas de densidad alta.
    const view = this.app.screen;
    const minAxis = Math.min(view.width, view.height);
    const scale = minAxis / (this.tilesOnScreen * TILE_PX);
    this.camera.scale.set(scale);
    this.camera.position.set(
      view.width / 2 - px * TILE_PX * scale,
      view.height / 2 - py * TILE_PX * scale,
    );

    this.syncChunks(state);

    this.player.position.set(px * TILE_PX, py * TILE_PX);

    const target = targetTile(entities, playerId);
    this.reticle.clear();
    this.reticle
      .rect(target.x * TILE_PX, target.y * TILE_PX, TILE_PX, TILE_PX)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.42 });
  }

  /** Crea sprites para los chunks cargados, repinta los sucios y descarta el resto. */
  private syncChunks(state: GameState): void {
    const seen = new Set<string>();

    state.world.eachLoadedChunk((chunk: Chunk) => {
      const key = `${chunk.cx},${chunk.cy}`;
      seen.add(key);
      let view = this.views.get(key);

      if (!view) {
        const canvas = document.createElement('canvas');
        canvas.width = CHUNK_PX;
        canvas.height = CHUNK_PX;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No se pudo obtener el contexto 2D del chunk');
        paintChunk(chunk, ctx, state.world.seed);

        const texture = Texture.from(canvas);
        texture.source.scaleMode = 'nearest';
        const sprite = new Sprite(texture);
        sprite.position.set(chunk.cx * CHUNK_SIZE * TILE_PX, chunk.cy * CHUNK_SIZE * TILE_PX);
        this.terrainLayer.addChild(sprite);

        view = { sprite, texture, canvas, revision: chunk.revision };
        this.views.set(key, view);
        return;
      }

      if (view.revision !== chunk.revision) {
        const ctx = view.canvas.getContext('2d');
        if (ctx) {
          paintChunk(chunk, ctx, state.world.seed);
          view.texture.source.update();
        }
        view.revision = chunk.revision;
      }
    });

    for (const [key, view] of this.views) {
      if (seen.has(key)) continue;
      view.sprite.destroy();
      view.texture.destroy(true);
      this.views.delete(key);
    }
  }

  /** Tira todos los sprites de chunk. Se usa al empezar un mundo nuevo. */
  reset(): void {
    for (const view of this.views.values()) {
      view.sprite.destroy();
      view.texture.destroy(true);
    }
    this.views.clear();
  }
}
