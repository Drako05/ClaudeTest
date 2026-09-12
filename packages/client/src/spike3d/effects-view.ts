/**
 * Dibuja los efectos en 3D: el barrido del golpe y los escombros de lo
 * derribado.
 *
 * **Aqui solo se DIBUJA.** El movimiento —donde esta cada escombro, cuanto le
 * queda de vida, con que colores— sale entero de `client/effects.ts`, que es
 * puro, no sabe que existe un navegador y ya estaba escrito para el isometrico.
 * Es el mismo reparto que alli: la fisica se mide en Node y el renderizador solo
 * la pinta. Por eso esto no duplica nada del isometrico congelado: lo que se
 * reutiliza es la parte que nunca fue suya.
 *
 * Dos adaptaciones al pasar de dos dimensiones a tres, y conviene saber por que:
 *
 * 1. **En el 3D un nivel mide lo mismo que una casilla** —`terrain-mesh.ts` usa
 *    la altura tal cual como coordenada Y—, mientras que en el isometrico un
 *    nivel son 16 px y una casilla 32. Asi que la altura de un escombro entra
 *    directa y su TAMANO, que `effects.ts` da en pixeles del arte isometrico, se
 *    divide por los 32 px que mide una casilla ahi.
 * 2. **Los escombros se apagan encogiendo, no desvaneciendose.** Cada uno tiene
 *    su propia edad y un `InstancedMesh` comparte material, asi que no hay
 *    transparencia por instancia; se aplica la misma curva de apagado a la
 *    escala. El barrido si se desvanece, porque son pocos y cada uno lleva su
 *    material.
 */

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  type Scene,
} from 'three';
import type { Effects, Particle, Slash } from '../effects.js';
import { MAX_PARTICLES, progressOf } from '../effects.js';
import type { World } from '@verdant/sim';

/** Pixeles por casilla del arte isometrico, de donde vienen los tamanos. */
const PX_PER_TILE = 32;

/** Cuanto se levanta el barrido sobre el suelo, en casillas. */
const SLASH_LIFT = 0.55;

/** Medio ancho de la cinta del barrido, en casillas. */
const SLASH_HALF_WIDTH = 0.16;

/**
 * Cuantos barridos pueden verse a la vez.
 *
 * Manteniendo el boton se acciona cuatro veces por segundo y cada barrido dura
 * 0.22 s, asi que rara vez hay mas de uno; ocho es holgura de sobra y cuesta
 * ocho materiales.
 */
const SLASH_POOL = 8;

export class EffectsView {
  private readonly slashes: Mesh[] = [];
  private readonly debris: InstancedMesh;
  private readonly scratch = new Object3D();
  private readonly color = new Color();

  /**
   * Barridos y escombros que se han llegado a DIBUJAR, acumulados.
   *
   * Contadores y no «hay uno vivo ahora» por la leccion que costo meses en el
   * isometrico: un barrido dura 0.22 s y en una maquina lenta cabe entero entre
   * dos sondeos, asi que preguntar por el instante se acierta a suertes. Y se
   * cuentan aqui, dentro del dibujado, para que distingan «no se lanza» de «se
   * lanza y no se ve».
   */
  slashesDrawn = 0;
  debrisDrawn = 0;

  constructor(scene: Scene) {
    for (let i = 0; i < SLASH_POOL; i++) {
      const mesh = new Mesh(
        new BufferGeometry(),
        // Sin escribir en el buffer de profundidad y sin luz: es un destello,
        // no un objeto. Escribiendo profundidad taparia el terreno de detras.
        new MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          depthWrite: false,
          side: DoubleSide,
        }),
      );
      mesh.visible = false;
      // Se dibuja al final, para que el destello quede por encima del mundo.
      mesh.renderOrder = 10;
      scene.add(mesh);
      this.slashes.push(mesh);
    }

    // Un cubo de lado 1 que se escala por instancia: los escombros son
    // cuadraditos de los colores del objeto, como en el isometrico.
    this.debris = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshLambertMaterial(),
      MAX_PARTICLES,
    );
    this.debris.count = 0;
    // Se recolocan cada frame; sin esto three.js los daria por inmoviles.
    this.debris.frustumCulled = false;
    scene.add(this.debris);
  }

  /** Vuelca el estado de `Effects` en la escena. Se llama una vez por frame. */
  update(effects: Effects, world: World): void {
    this.drawSlashes(effects.slashes, world);
    this.drawDebris(effects.particles);
  }

  private drawSlashes(slashes: readonly Slash[], world: World): void {
    for (let i = 0; i < this.slashes.length; i++) {
      const mesh = this.slashes[i];
      const slash = slashes[i];
      if (!slash) {
        mesh.visible = false;
        continue;
      }

      const t = progressOf(slash);
      const alpha = (1 - t) * 0.85;
      if (alpha <= 0) {
        mesh.visible = false;
        continue;
      }

      // Las flanqueantes a los extremos y la apuntada en el centro, igual que en
      // el isometrico: un solo trazo que recorre las tres casillas y se lee como
      // un golpe, no como tres marcas sueltas.
      const [aimed, left, right] = slash.tiles;
      const path = [left, aimed, right].filter(Boolean);
      if (path.length < 2) {
        mesh.visible = false;
        continue;
      }

      // Barre de una punta a la otra: al principio solo se ve el arranque.
      const swept = Math.min(1, t * 1.6);
      const points = path.map((tile) => ({
        x: tile.x + 0.5,
        y: world.groundHeightAt(tile.x + 0.5, tile.y + 0.5) + SLASH_LIFT,
        z: tile.y + 0.5,
      }));
      const last = Math.max(1, Math.ceil(swept * (points.length - 1)));

      ribbon(mesh.geometry as BufferGeometry, points.slice(0, last + 1));
      (mesh.material as MeshBasicMaterial).opacity = alpha;
      mesh.visible = true;
      this.slashesDrawn++;
    }
  }

  private drawDebris(particles: readonly Particle[]): void {
    const count = Math.min(particles.length, MAX_PARTICLES);
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      // La misma curva con la que el isometrico los desvanece, aplicada al
      // tamano: se apagan encogiendo. Ver la nota de cabecera.
      const fade = Math.min(1, (1 - progressOf(p)) * 2.2);
      const side = (p.size / PX_PER_TILE) * fade;
      this.scratch.position.set(p.x, p.z + side / 2, p.y);
      this.scratch.scale.set(side, side, side);
      this.scratch.rotation.set(0, 0, 0);
      this.scratch.updateMatrix();
      this.debris.setMatrixAt(i, this.scratch.matrix);
      this.debris.setColorAt(i, this.color.setHex(p.color));
    }
    this.debris.count = count;
    if (count > this.debrisDrawn) this.debrisDrawn = count;
    this.debris.instanceMatrix.needsUpdate = true;
    // `setColorAt` no crea el atributo hasta la primera llamada, de ahi la
    // comprobacion: sin ningun escombro todavia no existe.
    if (this.debris.instanceColor) this.debris.instanceColor.needsUpdate = true;
  }
}

/**
 * Convierte una polilinea en una cinta plana de ancho constante.
 *
 * Se ensancha en el plano del suelo —perpendicular al avance, no a la camara—
 * para que el barrido se lea como un tajo sobre las casillas que afecta y no
 * como un cartel mirando al jugador.
 */
function ribbon(geometry: BufferGeometry, points: ReadonlyArray<{ x: number; y: number; z: number }>): void {
  const positions = new Float32Array(points.length * 6);
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    // Perpendicular en el plano XZ a la direccion del trazo.
    let dx = next.x - prev.x;
    let dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const nx = -dz * SLASH_HALF_WIDTH;
    const nz = dx * SLASH_HALF_WIDTH;

    const p = points[i];
    positions.set([p.x + nx, p.y, p.z + nz], i * 6);
    positions.set([p.x - nx, p.y, p.z - nz], i * 6 + 3);
  }

  const indices: number[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
}
