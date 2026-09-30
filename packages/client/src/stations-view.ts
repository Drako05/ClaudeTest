/**
 * El dibujo de las estaciones: la mesa de trabajo y el horno (tanda 2).
 *
 * **Son cajas, no aspas** (decision del autor, 2026-09-29): un objeto macizo y
 * quieto que ocupa su casilla se lee bien desde cualquier lado como volumen, y
 * visto desde arriba un aspa seria dos cartas cruzadas. La caja mide lo mismo
 * que su hitbox (`STATION_BOXES` del nucleo), asi que lo que se ve es lo que
 * estorba y lo que se golpea, como el tronco de los arboles.
 *
 * Las caras se pintan en un lienzo con los colores de `palette.ts`, los mismos
 * de sus escombros, y van en `MeshBasicMaterial` como las aspas: la luz no la
 * pone la escena sino el dibujo, que la lleva horneada desde el noroeste —las
 * caras oeste y norte mas claras que las otras dos—.
 *
 * El frente —la boca del horno, las herramientas de la mesa— mira a un lado de
 * los cuatro, elegido con `hash2DFloat` de la casilla, como el giro de las
 * aspas: con azar vivo cambiaria cada vez que el chunk se regenera (regla 3).
 * Que mire al jugador que la puso pediria guardarlo en el nucleo, y es
 * propuesta mia no hacerlo.
 */

import {
  BoxGeometry,
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  type Material,
  type Texture,
} from 'three';
import { Feature, Station, stationOfFeature } from '@verdant/shared';
import { GRAVITY, hash2DFloat, STATION_BOXES, type Placed, type World } from '@verdant/sim';
import { STATION_FACES } from './palette.js';

/** Pixeles por bloque de las caras. El arte es de pixeles, como el resto. */
const PX = 32;
/** Brillo de cada cara horneado en el dibujo: arriba, oeste y norte, este y sur. */
const LIGHT = { top: 1, lit: 0.95, shade: 0.74, bottom: 0.5 };
/**
 * Las caras de `BoxGeometry`, en su orden: +X (este), -X (oeste), +Y (arriba),
 * -Y (abajo), +Z (sur) y -Z (norte). El nucleo es `x, y`; three.js, `x, z`.
 */
const FACE_LIGHT = [LIGHT.shade, LIGHT.lit, LIGHT.top, LIGHT.bottom, LIGHT.shade, LIGHT.lit];
/** Las cuatro caras de los lados, por giro: a cual va el frente. */
const SIDES = [4, 0, 5, 1];

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, faces: readonly string[]) => void;

function texture(w: number, h: number, faces: readonly string[], paint: Painter): Texture | null {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paint(ctx, w, h, faces);
  const t = new CanvasTexture(canvas);
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ------------------------------------------------------------------ la mesa

/** Tablas de madera: vetas horizontales cada 8 px. */
const planks: Painter = (ctx, w, h, [dark, mid, light]) => {
  rect(ctx, mid, 0, 0, w, h);
  for (let y = 0; y < h; y += 8) {
    rect(ctx, dark, 0, y + 7, w, 1);
    rect(ctx, light, 0, y, w, 1);
  }
};

/** El tablero visto desde arriba: tablas, un marco y la cuadricula de trabajo. */
const benchTop: Painter = (ctx, w, h, faces) => {
  planks(ctx, w, h, faces);
  const [dark, , light] = faces;
  rect(ctx, dark, 0, 0, w, 2);
  rect(ctx, dark, 0, h - 2, w, 2);
  rect(ctx, dark, 0, 0, 2, h);
  rect(ctx, dark, w - 2, 0, 2, h);
  for (let i = 0; i <= 3; i++) {
    rect(ctx, dark, 7 + i * 6, 7, 1, 19);
    rect(ctx, dark, 7, 7 + i * 6, 19, 1);
  }
  rect(ctx, light, 8, 8, 5, 5);
};

/** Un costado: el canto del tablero arriba y dos patas con un travesano. */
const benchSide: Painter = (ctx, w, h, [dark, mid, light]) => {
  rect(ctx, '#2a1c10', 0, 0, w, h);
  rect(ctx, mid, 0, 0, w, 7);
  rect(ctx, light, 0, 0, w, 2);
  rect(ctx, dark, 0, 6, w, 1);
  rect(ctx, mid, 2, 7, 5, h - 7);
  rect(ctx, mid, w - 7, 7, 5, h - 7);
  rect(ctx, light, 2, 7, 1, h - 7);
  rect(ctx, light, w - 7, 7, 1, h - 7);
  rect(ctx, dark, 7, h - 9, w - 14, 3);
};

/** El frente: el costado con una sierra y un martillo colgados. */
const benchFront: Painter = (ctx, w, h, faces) => {
  benchSide(ctx, w, h, faces);
  const [dark, , light, metal] = faces;
  // La sierra: hoja con dientes y mango.
  rect(ctx, metal, 9, 10, 9, 4);
  for (let x = 9; x < 18; x += 2) rect(ctx, '#8d9299', x, 14, 1, 1);
  rect(ctx, dark, 18, 9, 3, 6);
  // El martillo: cabeza y mango.
  rect(ctx, light, 23, 11, 2, 9);
  rect(ctx, metal, 21, 9, 6, 3);
};

// ------------------------------------------------------------------ el horno

/** Piedra en hiladas de ladrillos, de 8 px de alto y desplazadas cada fila. */
const bricks: Painter = (ctx, w, h, [dark, mid, light]) => {
  rect(ctx, dark, 0, 0, w, h);
  for (let row = 0, y = 0; y < h; row++, y += 8) {
    for (let x = row % 2 ? -8 : 0; x < w; x += 16) {
      rect(ctx, mid, x + 1, y + 1, 14, 6);
      rect(ctx, light, x + 1, y + 1, 14, 1);
    }
  }
};

/** Arriba: piedra y el hueco del tiro en medio. */
const furnaceTop: Painter = (ctx, w, h, faces) => {
  bricks(ctx, w, h, faces);
  rect(ctx, '#1d1d22', 11, 11, 10, 10);
  rect(ctx, faces[3], 13, 13, 6, 6);
};

/** El frente: la boca, con la brasa dentro. */
const furnaceFront: Painter = (ctx, w, h, faces) => {
  bricks(ctx, w, h, faces);
  const [dark, , light, ember] = faces;
  const top = h - 26;
  rect(ctx, light, 7, top - 2, w - 14, 2);
  rect(ctx, '#18181c', 8, top, w - 16, 20);
  rect(ctx, dark, 8, top, w - 16, 3);
  rect(ctx, ember, 10, top + 14, w - 20, 4);
  rect(ctx, '#ffd36a', 13, top + 15, 6, 2);
};

// ------------------------------------------------------------------ el conjunto

interface Kind {
  readonly geometry: BoxGeometry;
  readonly height: number;
  /** Los seis materiales de la caja para cada giro del frente. */
  readonly byTurn: Material[][];
}

const PAINTERS: Record<Station.Workbench | Station.Furnace, { top: Painter; side: Painter; front: Painter }> = {
  [Station.Workbench]: { top: benchTop, side: benchSide, front: benchFront },
  [Station.Furnace]: { top: furnaceTop, side: bricks, front: furnaceFront },
};

/** Las estaciones dibujadas una vez; cada casilla lleva una malla que las comparte. */
export class StationSet {
  private readonly kinds = new Map<Feature, Kind>();
  /**
   * Las que estan cayendo: puestas contra una pared, aparecen donde la tocaba
   * la mirada y caen hasta su suelo con la gravedad del nucleo (pedido del
   * autor: todo tiene gravedad). Solo se ve; el nucleo ya la tiene en su sitio.
   */
  private readonly falling = new Map<string, { from: number; ground: number; since: number; mesh: Mesh | null }>();
  /** Estaciones mandadas a la escena, para el humo. Acumulado. */
  drawn = 0;
  /** Caidas empezadas, para el humo. Acumulado. */
  drops = 0;

  constructor() {
    for (const feature of [Feature.Workbench, Feature.Furnace]) {
      const station = stationOfFeature(feature) as Station.Workbench | Station.Furnace;
      const faces = STATION_FACES[feature];
      if (!faces) continue;
      const { height } = STATION_BOXES[station];
      const paint = PAINTERS[station];
      const top = texture(PX, PX, faces, paint.top);
      const side = texture(PX, Math.round(PX * height), faces, paint.side);
      const front = texture(PX, Math.round(PX * height), faces, paint.front);
      if (!top || !side || !front) continue;
      const material = (map: Texture, k: number) => {
        const m = new MeshBasicMaterial({ map });
        m.color.setScalar(k);
        return m;
      };
      // Las caras de lado y de frente con cada una de sus dos luces, y
      // compartidas entre los cuatro giros.
      const sideLit = material(side, LIGHT.lit);
      const sideShade = material(side, LIGHT.shade);
      const frontLit = material(front, LIGHT.lit);
      const frontShade = material(front, LIGHT.shade);
      const topM = material(top, LIGHT.top);
      const bottomM = material(side, LIGHT.bottom);
      const byTurn = SIDES.map((frontFace) =>
        FACE_LIGHT.map((light, face) => {
          if (face === 2) return topM;
          if (face === 3) return bottomM;
          const lit = light === LIGHT.lit;
          if (face === frontFace) return lit ? frontLit : frontShade;
          return lit ? sideLit : sideShade;
        }),
      );
      this.kinds.set(feature, { geometry: new BoxGeometry(1, height, 1), height, byTurn });
    }
  }

  /** Una caja para la estacion de la casilla `(tx, ty)`, apoyada en su suelo. */
  spawn(feature: Feature, tx: number, ty: number, ground: number, seed: number): Mesh | null {
    const kind = this.kinds.get(feature);
    if (!kind) return null;
    const turn = Math.floor(hash2DFloat(seed ^ 0x51a7, tx, ty) * 4) % 4;
    const mesh = new Mesh(kind.geometry, kind.byTurn[turn]);
    mesh.position.set(tx + 0.5, ground + kind.height / 2, ty + 0.5);
    mesh.userData.half = kind.height / 2;
    // Si esta cayendo, el chunk que se redibuja la entrega a la caida.
    const fall = this.falling.get(`${tx},${ty}`);
    if (fall) fall.mesh = mesh;
    this.drawn++;
    return mesh;
  }

  /** La estacion recien puesta empieza a caer desde la altura de la mirada. */
  drop(placed: Placed, world: World): void {
    const ground = world.groundHeightAt(placed.x + 0.5, placed.y + 0.5);
    if (placed.z <= ground + 0.01) return;
    this.falling.set(`${placed.x},${placed.y}`, { from: placed.z, ground, since: performance.now(), mesh: null });
    this.drops++;
  }

  /** Cada frame: baja las que caen, `z = z0 - g t^2 / 2`, hasta posarse. */
  animate(now: number): void {
    for (const [key, f] of this.falling) {
      const t = (now - f.since) / 1000;
      const z = Math.max(f.ground, f.from - (GRAVITY * t * t) / 2);
      if (f.mesh) f.mesh.position.y = z + f.mesh.userData.half;
      if (z <= f.ground) this.falling.delete(key);
    }
  }

  /** Lo que mide de ancho, para su sombra: algo mas que su casilla. */
  widthOf(feature: Feature): number {
    return this.kinds.has(feature) ? 1.3 : 0;
  }
}
