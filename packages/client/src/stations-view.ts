/**
 * El dibujo de las estaciones: la mesa de trabajo y el horno (tanda 2).
 *
 * **Son cajas, no aspas** (decision del autor, 2026-09-29): un objeto macizo y
 * quieto que ocupa su casilla se lee bien desde cualquier lado como volumen, y
 * visto desde arriba un aspa seria dos cartas cruzadas. La caja mide lo mismo
 * que su hitbox (`STATION_BOXES` del nucleo), asi que lo que se ve es lo que
 * estorba y lo que se golpea, como el tronco de los arboles.
 *
 * Las caras son pixelart a 24 pixeles por bloque, como todo el mundo (el
 * autor, 2026-10-19: «Esto implica rehacer las estaciones»): las de
 * `STATION_ART` en `world-art.ts`. Van en `MeshBasicMaterial` como las aspas:
 * la luz no la pone la escena sino el dibujo, que la lleva horneada desde el
 * noroeste —las caras oeste y norte mas claras que las otras dos—.
 *
 * El frente —la boca del horno, las herramientas de la mesa— mira **hacia quien
 * la puso** (pedido del autor, 2026-10-02). Lo guarda el nucleo al colocarla
 * (`World.stationFacingAt`), porque el chunk se descarta y se redibuja
 * constantemente y el dibujo no puede recordarlo (regla 4). Una estacion sin
 * frente guardado —ninguna, hoy— cae a un lado elegido con `hash2DFloat` de la
 * casilla, como el giro de las aspas.
 */

import { BoxGeometry, Mesh, MeshBasicMaterial, type Material, type Texture } from 'three';
import { now } from './clock.js';
import { Feature, Station, stationOfFeature } from '@verdant/shared';
import { GRAVITY, hash2DFloat, STATION_BOXES, type Placed, type World } from '@verdant/sim';
import { STATION_ART } from './world-art.js';
import { artCanvas, pixelTexture } from './world-sprites.js';

/** Brillo de cada cara horneado en el dibujo: arriba, oeste y norte, este y sur. */
const LIGHT = { top: 1, lit: 0.95, shade: 0.74, bottom: 0.5 };
/**
 * Las caras de `BoxGeometry`, en su orden: +X (este), -X (oeste), +Y (arriba),
 * -Y (abajo), +Z (sur) y -Z (norte). El nucleo es `x, y`; three.js, `x, z`.
 */
const FACE_LIGHT = [LIGHT.shade, LIGHT.lit, LIGHT.top, LIGHT.bottom, LIGHT.shade, LIGHT.lit];
/** Las cuatro caras de los lados, por giro: a cual va el frente. Giro 0 = +y del
 * nucleo (+z de three.js), 1 = +x, 2 = -y, 3 = -x, como `facingToward`. */
const SIDES = [4, 0, 5, 1];

// ------------------------------------------------------------------ el conjunto

interface Kind {
  readonly geometry: BoxGeometry;
  readonly height: number;
  /** Los seis materiales de la caja para cada giro del frente. */
  readonly byTurn: Material[][];
}

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
  /** El giro del frente con que se dibujo cada casilla, para el humo. */
  readonly turns = new Map<string, number>();
  /** Caidas empezadas, para el humo. Acumulado. */
  drops = 0;

  constructor() {
    for (const feature of [Feature.Workbench, Feature.Furnace]) {
      const station = stationOfFeature(feature) as Station.Workbench | Station.Furnace;
      const art = STATION_ART[feature];
      if (!art) continue;
      const { height } = STATION_BOXES[station];
      const [top, side, front] = [art.top, art.side, art.front].map((face) => pixelTexture(artCanvas(face), true)) as [Texture, Texture, Texture];
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

  /**
   * Una caja para la estacion de la casilla `(tx, ty)`, apoyada en su suelo,
   * con el frente hacia `facing` (el del nucleo, mismo convenio que `SIDES`).
   */
  spawn(feature: Feature, tx: number, ty: number, ground: number, seed: number, facing: number | null): Mesh | null {
    const kind = this.kinds.get(feature);
    if (!kind) return null;
    const turn = facing ?? Math.floor(hash2DFloat(seed ^ 0x51a7, tx, ty) * 4) % 4;
    this.turns.set(`${tx},${ty}`, turn);
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
    this.falling.set(`${placed.x},${placed.y}`, { from: placed.z, ground, since: now(), mesh: null });
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
