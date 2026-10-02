/**
 * La fauna en pantalla: un sprite por animal materializado del nucleo.
 *
 * Billboard, como el jugador: mira a camara, y se voltea segun ande hacia la
 * derecha o la izquierda de la pantalla. El dibujo es uno por (especie, etapa),
 * con su textura y la volteada compartidas por todos los de su clase
 * (`fauna-art.ts`), y se escala para que **lo dibujado mida lo que la caja de
 * golpe del nucleo** (`animalHeight`): lo que se ve es lo que se golpea.
 *
 * Como el jugador, se dibuja en la posicion del ultimo tick, sin interpolar:
 * pasean a un bloque por segundo y el salto entre ticks no se ve.
 */

import { CanvasTexture, NearestFilter, Sprite, SpriteMaterial, type Scene } from 'three';
import { animalHeight, SPECIES_COUNT, STAGE_COUNT, type Species, type Stage } from '@verdant/shared';
import type { EntityStore } from '@verdant/sim';
import { makeAnimalArt } from './fauna-art.js';

/** Densidad del lienzo, como la del resto del arte. */
const DETAIL = 2.6;

interface AnimalLook {
  /** Mirando a la derecha y a la izquierda. */
  right: SpriteMaterial;
  left: SpriteMaterial;
  /** Tamano del sprite en el mundo. */
  w: number;
  h: number;
  /** El ancla (los pies, bajo el centro del cuerpo) en fraccion del sprite, desde abajo. */
  ax: number;
  ay: number;
  /** Lo que mide el dibujo con tinta, en bloques: tiene que ser su `animalHeight`. */
  visible: number;
}

/** Cuanto mide de alto, en pixeles del lienzo, la tinta por encima del ancla. */
function inkRows(canvas: HTMLCanvasElement, footRow: number): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return 0;
  }
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 100) return footRow - y;
    }
  }
  return 0;
}

function lookOf(species: Species, stage: Stage): AnimalLook | null {
  const art = makeAnimalArt(species, stage, DETAIL);
  if (!art) return null;
  const tex = (mirror: boolean) => {
    const t = new CanvasTexture(art.canvas);
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
    t.generateMipmaps = false;
    if (mirror) {
      t.repeat.set(-1, 1);
      t.offset.set(1, 0);
    }
    return t;
  };
  // Un pixel del lienzo mide en el mundo lo que el animal entre lo que mide SU
  // TINTA: no la figura que se pidio, que unas cuernas o una oreja desbordan.
  // Asi lo dibujado mide justo `animalHeight`, el alto de su caja de golpe.
  const foot = art.anchorY * art.canvas.height;
  const ink = inkRows(art.canvas, foot) || art.figure * DETAIL;
  const perPx = animalHeight(species, stage) / ink;
  return {
    right: new SpriteMaterial({ map: tex(false), transparent: true, alphaTest: 0.4 }),
    left: new SpriteMaterial({ map: tex(true), transparent: true, alphaTest: 0.4 }),
    w: art.canvas.width * perPx,
    h: art.canvas.height * perPx,
    ax: art.anchorX,
    ay: 1 - art.anchorY,
    visible: ink * perPx,
  };
}

export class FaunaView {
  private readonly looks: (AnimalLook | null)[] = [];
  private readonly sprites = new Map<string, Sprite>();
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

  /** Lo que mide de verdad cada dibujo y lo que deberia, en bloques. */
  get sizes(): Array<{ species: number; stage: number; dibujo: number; caja: number }> {
    const out = [];
    for (let s = 0; s < SPECIES_COUNT; s++) {
      for (let st = 0; st < STAGE_COUNT; st++) {
        const look = this.look(s as Species, st as Stage);
        if (look) out.push({ species: s, stage: st, dibujo: look.visible, caja: animalHeight(s as Species, st as Stage) });
      }
    }
    return out;
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
   * retira los que ya no estan (muertos o lejos) y coloca cada uno en sus pies.
   * `rightX`/`rightZ` es la derecha de la camara en el suelo, para voltearlos.
   */
  update(fauna: ReadonlyMap<string, number>, store: EntityStore, rightX: number, rightZ: number): void {
    for (const [key, sprite] of this.sprites) {
      if (!fauna.has(key)) {
        this.scene.remove(sprite);
        this.sprites.delete(key);
      }
    }
    for (const [key, id] of fauna) {
      const animal = store.animal[id];
      if (!animal) continue;
      const look = this.look(animal.species, animal.stage);
      if (!look) continue;
      let sprite = this.sprites.get(key);
      if (!sprite) {
        sprite = new Sprite(look.right);
        sprite.scale.set(look.w, look.h, 1);
        sprite.userData.left = false;
        this.scene.add(sprite);
        this.sprites.set(key, sprite);
        this.drawnTotal++;
      }
      // Hacia donde anda, en la pantalla; parado, como iba.
      const side = store.vx[id] * rightX + store.vy[id] * rightZ;
      if (Math.abs(side) > 0.05) sprite.userData.left = side < 0;
      sprite.material = sprite.userData.left ? look.left : look.right;
      // El ancla del sprite es la de sus pies; volteado, al otro lado.
      sprite.center.set(sprite.userData.left ? 1 - look.ax : look.ax, look.ay);
      sprite.position.set(store.x[id], store.z[id], store.y[id]);
    }
  }

  /** Quita todos los sprites: un mundo nuevo empieza sin la fauna del anterior. */
  clear(): void {
    for (const sprite of this.sprites.values()) this.scene.remove(sprite);
    this.sprites.clear();
  }
}
