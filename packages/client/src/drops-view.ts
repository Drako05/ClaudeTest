/**
 * Los objetos sueltos en el mundo, dibujados (el autor, 2026-10-18: «miraran
 * siempre al jugador (billboard). no diran su nombre, solo sera el items»).
 *
 * Un `Sprite` por monton —mira siempre a la camara— con el icono del objeto,
 * el mismo pixelart de 24 × 24 del inventario (`item-icons.ts`), sin nombre ni
 * numero. Flota a 0,2 de su suelo, que lo pone el nucleo, y **sube y baja
 * suave** alrededor de esa altura (el autor); el vaiven es solo dibujo.
 *
 * Los montones no son entidades: su posicion entre dos ticks la interpola esta
 * vista, con la que tenian antes del ultimo (`capture`).
 */

import {
  CanvasTexture,
  NearestFilter,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  type Scene,
} from 'three';
import type { Resource } from '@verdant/shared';
import type { DropStore } from '@verdant/sim';
import { itemArt } from './item-icons.js';
import { CLEAR, PIXEL_GRID } from './pixel-art.js';

/** El lado del icono en el mundo, en bloques. **Deduccion mia.** */
export const DROP_SIZE = 0.4;
/** El vaiven: lo que sube y baja, en bloques, y lo que tarda una vuelta, en s. **Deduccion mia.** */
export const BOB_HEIGHT = 0.05;
export const BOB_SECONDS = 2;

/**
 * Lo que sube o baja un monton en el instante `t` (s): una vuelta cada
 * `BOB_SECONDS`, desfasada por su id para que no se muevan todos a la vez.
 */
export function bobOf(t: number, id: number): number {
  return BOB_HEIGHT * Math.sin(((t / BOB_SECONDS) * 2 + id * 0.37) * Math.PI);
}

export class DropsView {
  private readonly sprites = new Map<number, Sprite>();
  private readonly materials = new Map<Resource, SpriteMaterial>();
  /** Donde estaba cada monton antes del ultimo tick, para interpolar. */
  private readonly before = new Map<number, { x: number; y: number; z: number }>();
  /** Montones que se han colocado alguna vez: el humo lo mira crecer. */
  drawnTotal = 0;

  constructor(private readonly scene: Scene) {}

  /** El icono de un objeto como textura: sus pixeles, nitidos y en sRGB, como en el HUD. */
  private materialOf(item: Resource): SpriteMaterial {
    let material = this.materials.get(item);
    if (material) return material;
    const art = itemArt(item);
    const canvas = document.createElement('canvas');
    canvas.width = PIXEL_GRID;
    canvas.height = PIXEL_GRID;
    const ctx = canvas.getContext('2d')!;
    art.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === CLEAR) continue;
        ctx.fillStyle = art.palette[ch];
        ctx.fillRect(x, y, 1, 1);
      }
    });
    const map = new CanvasTexture(canvas);
    map.magFilter = NearestFilter;
    map.minFilter = NearestFilter;
    map.generateMipmaps = false;
    map.colorSpace = SRGBColorSpace;
    // Recortado y no translucido: cada pixel escribe su profundidad.
    material = new SpriteMaterial({ map, alphaTest: 0.5, transparent: false });
    this.materials.set(item, material);
    return material;
  }

  /** Antes de cada tick: donde esta cada monton ahora. */
  capture(drops: DropStore): void {
    this.before.clear();
    for (const d of drops.values()) this.before.set(d.id, { x: d.x, y: d.y, z: d.z });
  }

  /**
   * Pone al dia los sprites: crea los que faltan, retira los recogidos y
   * coloca cada uno entre su posicion de antes del tick y la de ahora
   * (`alpha`), con su vaiven en el instante `t` (s).
   */
  update(drops: DropStore, alpha: number, t: number): void {
    for (const [id, sprite] of this.sprites) {
      if (drops.get(id)) continue;
      this.scene.remove(sprite);
      this.sprites.delete(id);
    }
    for (const d of drops.values()) {
      let sprite = this.sprites.get(d.id);
      if (!sprite) {
        sprite = new Sprite(this.materialOf(d.item));
        sprite.scale.set(DROP_SIZE, DROP_SIZE, 1);
        this.sprites.set(d.id, sprite);
        this.scene.add(sprite);
        this.drawnTotal++;
      }
      const from = this.before.get(d.id) ?? d;
      const x = from.x + (d.x - from.x) * alpha;
      const y = from.y + (d.y - from.y) * alpha;
      const z = from.z + (d.z - from.z) * alpha;
      // El nucleo es y-arriba al reves: (x, y, z) del mundo a (x, z, y) de three.
      // El sprite va centrado: su parte de abajo, en la altura del monton.
      sprite.position.set(x, z + DROP_SIZE / 2 + bobOf(t, d.id), y);
    }
  }

  /** Cuantos cuelgan ahora de la escena (como `FaunaView.count`). */
  get count(): number {
    let n = 0;
    for (const sprite of this.sprites.values()) if (sprite.parent === this.scene && sprite.visible) n++;
    return n;
  }

  /** Donde se dibuja cada uno, por su id: el humo lo compara con el nucleo. */
  get placed(): Array<{ id: number; x: number; y: number; z: number; size: number }> {
    return [...this.sprites].map(([id, s]) => ({ id, x: s.position.x, y: s.position.z, z: s.position.y - s.scale.y / 2, size: s.scale.x }));
  }

  clear(): void {
    for (const sprite of this.sprites.values()) this.scene.remove(sprite);
    this.sprites.clear();
    this.before.clear();
  }
}
