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
import { makeFeatureArt, makePlayerArt, type FeatureArt } from '../tiles.js';

/** Pixeles de arte por unidad de mundo: un tile de 32 px es una casilla. */
const PX_PER_TILE = 32;

interface Billboard {
  readonly texture: Texture;
  /** Tamano en unidades de mundo. */
  readonly w: number;
  readonly h: number;
  /** Cuanto hay que subir el centro para que el sprite se apoye en el suelo. */
  readonly lift: number;
}

function fromArt(art: FeatureArt | null): Billboard | null {
  if (!art) return null;
  const texture = new CanvasTexture(art.canvas);
  // Sin filtrado: el arte es de pixeles y suavizarlo lo emborrona, que es
  // justo lo que separa un 2D-HD de un 3D con texturas pobres.
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  const w = art.canvas.width / PX_PER_TILE;
  const h = art.canvas.height / PX_PER_TILE;
  // Un sprite de three.js se centra en su caja, pero el arte se apoya en su
  // ancla. `anchorY` va de arriba abajo del lienzo, asi que desde el BORDE DE
  // ABAJO el punto de apoyo esta a `(1 - anchorY) * h`. Para que ese punto caiga
  // en el suelo hay que subir el centro `h / 2 - eso`.
  return { texture, w, h, lift: (1 - art.anchorY) * h };
}

/** Todas las especies dibujadas una vez, listas para instanciarse. */
export class BillboardSet {
  private readonly byFeature = new Map<Feature, Billboard>();
  private readonly player: Billboard | null;

  constructor() {
    for (const feature of Object.values(Feature)) {
      if (typeof feature !== 'number' || feature === Feature.None) continue;
      const art = fromArt(makeFeatureArt(feature));
      if (art) this.byFeature.set(feature, art);
    }
    this.player = fromArt(makePlayerArt());
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
