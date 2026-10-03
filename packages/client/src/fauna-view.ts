/**
 * La fauna en pantalla: un sprite por animal materializado del nucleo.
 *
 * Billboard, como el jugador: la lamina mira a camara. El dibujo es el de
 * **una de ocho direcciones** (decision del autor, 2026-10-03), elegido por el
 * angulo entre hacia donde mira el animal y la camara (`fauna-facing.ts`): de
 * frente, tres cuartos, perfil, tres cuartos de espaldas o de espaldas, los de
 * lado en espejo segun hacia que lado de la pantalla mire. Las texturas son
 * por (especie, etapa, vista), compartidas por todos los de su clase
 * (`fauna-art.ts`), y cada vista se escala para que **lo dibujado mida lo que
 * la caja de golpe del nucleo** (`animalHeight`): lo que se ve es lo que se
 * golpea.
 *
 * Cada pixel lleva la profundidad de **la caja de su cuerpo** (`sprite-depth.ts`):
 * su largo, el de la tinta de perfil desde el ancla; su ancho, `bodyWideOf`;
 * su alto, `animalHeight`; y orientada con su rumbo, por eso cada animal tiene
 * su material.
 *
 * Como el jugador, se dibuja en la posicion del ultimo tick, sin interpolar:
 * pasean a un bloque por segundo y el salto entre ticks no se ve.
 */

import { CanvasTexture, NearestFilter, Sprite, type Scene, type Texture } from 'three';
import { animalHeight, SPECIES_COUNT, STAGE_COUNT, type Species, type Stage } from '@verdant/shared';
import type { EntityStore } from '@verdant/sim';
import { bodySpriteMaterial, type BodySpriteMaterial } from './sprite-depth.js';
import { bodyWideOf, makeAnimalArt } from './fauna-art.js';
import { cameraAngle, sectorOf, View, VIEW_COUNT, viewOfSector } from './fauna-facing.js';

/** Densidad del lienzo, como la del resto del arte. */
const DETAIL = 2.6;

interface ViewLook {
  /** La textura y su espejo. */
  texture: Texture;
  mirrored: Texture;
  /** Tamano del sprite en el mundo. */
  w: number;
  h: number;
  /** El ancla (los pies, bajo el centro del cuerpo) en fraccion del sprite, desde abajo. */
  ax: number;
  ay: number;
  /** Lo que mide el dibujo con tinta, en bloques: tiene que ser su `animalHeight`. */
  visible: number;
}

interface AnimalLook {
  views: ViewLook[];
  /** La caja de su cuerpo: medio largo desde el ancla, y medio ancho. */
  halfLength: number;
  halfWidth: number;
}

/** Lo que lee de la tinta de un lienzo: su primera fila y sus columnas. */
function inkOf(canvas: HTMLCanvasElement): { top: number; min: number; max: number } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return null;
  }
  let top = -1;
  let min = canvas.width;
  let max = -1;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 100) {
        if (top < 0) top = y;
        if (x < min) min = x;
        if (x > max) max = x;
      }
    }
  }
  return top >= 0 ? { top, min, max: max + 1 } : null;
}

function textureOf(canvas: HTMLCanvasElement, mirror: boolean): Texture {
  const t = new CanvasTexture(canvas);
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  if (mirror) {
    t.repeat.set(-1, 1);
    t.offset.set(1, 0);
  }
  return t;
}

function lookOf(species: Species, stage: Stage): AnimalLook | null {
  const height = animalHeight(species, stage);
  const views: ViewLook[] = [];
  let halfLength = 0;
  for (let v = 0; v < VIEW_COUNT; v++) {
    const art = makeAnimalArt(species, stage, DETAIL, v as View);
    if (!art) return null;
    // Un pixel del lienzo mide en el mundo lo que el animal entre lo que mide SU
    // TINTA: no la figura que se pidio, que unas cuernas o una oreja desbordan.
    // Asi lo dibujado mide justo `animalHeight` en cada vista.
    const foot = art.anchorY * art.canvas.height;
    const ink = inkOf(art.canvas);
    const rows = ink ? foot - ink.top : art.figure * DETAIL;
    const perPx = height / rows;
    if (v === View.Side && ink) {
      const anchorCol = art.anchorX * art.canvas.width;
      halfLength = Math.max(anchorCol - ink.min, ink.max - anchorCol) * perPx;
    }
    views.push({
      texture: textureOf(art.canvas, false),
      mirrored: textureOf(art.canvas, true),
      w: art.canvas.width * perPx,
      h: art.canvas.height * perPx,
      ax: art.anchorX,
      ay: 1 - art.anchorY,
      visible: rows * perPx,
    });
  }
  return { views, halfLength, halfWidth: (bodyWideOf(species, stage) * height) / 2 };
}

export class FaunaView {
  private readonly looks: (AnimalLook | null)[] = [];
  private readonly sprites = new Map<string, Sprite>();
  /** Los sectores (de -3 a 4) que se han dibujado alguna vez: el humo los cuenta. */
  private readonly sectors = new Set<number>();
  /** Sprites que se han colocado alguna vez: el humo lo mira crecer. */
  drawnTotal = 0;

  constructor(private readonly scene: Scene) {
    for (let s = 0; s < SPECIES_COUNT; s++) {
      for (let st = 0; st < STAGE_COUNT; st++) this.looks.push(lookOf(s as Species, st as Stage));
    }
  }

  private look(species: Species, stage: Stage): AnimalLook | null {
    return this.looks[species * STAGE_COUNT + stage];
  }

  /** Lo que mide de verdad cada dibujo, en cada vista, y lo que deberia, en bloques. */
  get sizes(): Array<{ species: number; stage: number; view: number; dibujo: number; caja: number }> {
    const out: Array<{ species: number; stage: number; view: number; dibujo: number; caja: number }> = [];
    for (let s = 0; s < SPECIES_COUNT; s++) {
      for (let st = 0; st < STAGE_COUNT; st++) {
        const look = this.look(s as Species, st as Stage);
        if (!look) continue;
        const caja = animalHeight(s as Species, st as Stage);
        look.views.forEach((v, view) => out.push({ species: s, stage: st, view, dibujo: v.visible, caja }));
      }
    }
    return out;
  }

  /** Cuantas direcciones distintas, de las ocho, se han dibujado. */
  get directionsSeen(): number {
    return this.sectors.size;
  }

  /** La caja del cuerpo de un animal de una etapa: medio largo, medio ancho y alto. */
  boxOf(species: Species, stage: Stage): { halfLength: number; halfWidth: number; height: number } | null {
    const look = this.look(species, stage);
    if (!look) return null;
    return { halfLength: look.halfLength, halfWidth: look.halfWidth, height: animalHeight(species, stage) };
  }

  /**
   * Cuantos animales cuelgan ahora de la escena. Se cuenta en la escena y no
   * en el mapa de sprites: un sprite creado y no anadido estaria en el mapa y
   * no se veria (la leccion del contador de «dibujados» de los efectos).
   */
  get count(): number {
    let n = 0;
    for (const sprite of this.sprites.values()) if (sprite.parent === this.scene && sprite.visible) n++;
    return n;
  }

  /**
   * Pone al dia los sprites con la fauna materializada: crea los que faltan,
   * retira los que ya no estan (muertos o lejos) y coloca cada uno en sus pies,
   * con el dibujo de la direccion desde la que lo mira la camara, que esta en
   * (`cameraX`, `cameraZ`) del suelo de three.js.
   */
  update(fauna: ReadonlyMap<string, number>, store: EntityStore, cameraX: number, cameraZ: number): void {
    for (const [key, sprite] of this.sprites) {
      if (!fauna.has(key)) this.remove(key, sprite);
    }
    for (const [key, id] of fauna) {
      const animal = store.animal[id];
      if (!animal) continue;
      const look = this.look(animal.species, animal.stage);
      if (!look) continue;
      let sprite = this.sprites.get(key);
      if (!sprite) {
        const height = animalHeight(animal.species, animal.stage);
        sprite = new Sprite(
          bodySpriteMaterial(
            { map: look.views[View.Side].texture, transparent: true, alphaTest: 0.4 },
            { lift: height / 2, halfLength: look.halfLength, halfHeight: height / 2, halfWidth: look.halfWidth },
          ),
        );
        sprite.userData.sector = null;
        this.scene.add(sprite);
        this.sprites.set(key, sprite);
        this.drawnTotal++;
      }
      const x = store.x[id];
      const y = store.y[id];
      const fx = store.facingX[id];
      const fy = store.facingY[id];
      const sector = sectorOf(cameraAngle(fx, fy, cameraX - x, cameraZ - y), sprite.userData.sector);
      sprite.userData.sector = sector;
      this.sectors.add(sector);
      const { view, mirror } = viewOfSector(sector);
      const v = look.views[view];
      const material = sprite.material as BodySpriteMaterial;
      material.map = mirror ? v.mirrored : v.texture;
      material.facing.set(fx, fy);
      sprite.scale.set(v.w, v.h, 1);
      // El ancla del sprite es la de sus pies; en espejo, al otro lado.
      sprite.center.set(mirror ? 1 - v.ax : v.ax, v.ay);
      sprite.position.set(x, store.z[id], y);
    }
  }

  private remove(key: string, sprite: Sprite): void {
    this.scene.remove(sprite);
    // Las texturas son de la clase y se quedan; el material es suyo.
    (sprite.material as BodySpriteMaterial).dispose();
    this.sprites.delete(key);
  }

  /** Quita todos los sprites: un mundo nuevo empieza sin la fauna del anterior. */
  clear(): void {
    for (const [key, sprite] of this.sprites) this.remove(key, sprite);
  }
}
