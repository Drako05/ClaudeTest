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
  Vector3,
  type Scene,
} from 'three';
import type { Effects, Particle, Slash } from '../effects.js';
import { MAX_PARTICLES, progressOf } from '../effects.js';
import type { World } from '@verdant/sim';

/** Pixeles por casilla del arte isometrico, de donde vienen los tamanos. */
const PX_PER_TILE = 32;

/**
 * Lo que crecieron los objetos del mundo (`billboards.ts`, `BASE`).
 *
 * Los escombros van con ellos: son astillas de lo que se derriba, asi que junto
 * a un personaje 2,3 veces mas grande y sin este factor pasarian de chinas a
 * polvo. No es un numero nuevo, es el mismo.
 */
const OBJECT_SCALE = 2.3;

/**
 * Cuanto se levanta el barrido sobre el suelo, en casillas.
 *
 * Es la **altura del pecho**, el mismo sitio que en el isometrico: alli el trazo
 * sube `TILE_H * 0.9`, o sea 0.9 NIVELES. A media altura el barrido se lee como
 * un tropiezo, no como un golpe.
 *
 * Va atado al PERSONAJE, no al tile, asi que sube con el: 0.9 era el pecho de
 * uno de 0,78 bloques y es la cintura de uno de 1,8. El ANCHO de la cinta, en
 * cambio, se queda donde estaba —marca las casillas que la accion afecta, o sea
 * que es del tile—.
 */
const SLASH_LIFT = 1.3;

/**
 * Medio ancho de la cinta del barrido, en casillas.
 *
 * El isometrico traza 3 px con la casilla midiendo 32, y su capa cuelga de la
 * camara, asi que ese grosor escala con el zoom: es un ancho de MUNDO de 0.094
 * casillas. Aqui se redondea a 0.12 —medio ancho 0.06— por una diferencia real
 * entre los dos renderizadores: PixiJS suaviza el trazo y este lienzo va sin
 * antialias, asi que un quad de dos pixeles y pico se deshilacha por cobertura
 * parcial justo donde el isometrico daba una linea limpia.
 */
const SLASH_HALF_WIDTH = 0.06;

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
   * dos sondeos, asi que preguntar por el instante se acierta a suertes.
   *
   * **Pero no confundir con «se ve».** Esto cuenta lo que se MANDA a la escena,
   * y mandar no es llegar a pixel: un barrido recortado por el frustum o tapado
   * por una pared lo incrementaba igual, que es como los tres fallos que arreglo
   * esta tanda pasaron por delante de la prueba de humo sin despeinarla. Quien
   * quiera afirmar que se ve, que cuente pixeles blancos del lienzo:
   * `tools/spike-slash.mjs`.
   */
  slashesDrawn = 0;
  debrisDrawn = 0;

  constructor(scene: Scene) {
    for (let i = 0; i < SLASH_POOL; i++) {
      const mesh = new Mesh(
        new BufferGeometry(),
        // Sin luz y sin profundidad ninguna: es un destello, no un objeto.
        //
        // `depthTest: false` es la traduccion exacta de lo que hace el
        // isometrico, y no una licencia: alli el trazo va a `effectLayer`, una
        // capa POR ENCIMA del mundo entero, y por eso nada puede taparlo.
        //
        // Lo que lo tapa aqui **no** es la pared de la casilla golpeada —el area
        // solo alcanza casillas de la altura propia, asi que el arco nunca cruza
        // un desnivel— sino lo que se interponga entre la camara y el arco, que
        // con camara libre es constante: un bloque, un arbol, el propio
        // personaje. Medido con la prueba de profundidad puesta, agachando la
        // camara a 0.08 rad el barrido pasa de 104 pixeles aclarados a **2**: el
        // suelo de delante se lo come entero.
        new MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          side: DoubleSide,
        }),
      );
      mesh.visible = false;
      // Se dibuja al final, para que el destello quede por encima del mundo.
      mesh.renderOrder = 10;
      // Igual que los escombros, y por lo mismo: la geometria se reescribe
      // entera cada frame y three.js calcula la esfera envolvente UNA sola vez,
      // cuando la encuentra a null. Sin esto la esfera se queda clavada donde se
      // dio el primer golpe de la partida, y en cuanto el jugador se aleja del
      // encuadre —trece casillas en ortografica— se recortan TODOS los barridos
      // siguientes y no se dibuja ni uno. Ocho mallas no valen un recorte.
      mesh.frustumCulled = false;
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

  /**
   * Vuelca el estado de `Effects` en la escena. Se llama una vez por frame.
   *
   * Necesita **donde esta la camara** porque la cinta del barrido se orienta
   * hacia ella; ver `ribbon`.
   */
  update(effects: Effects, world: World, eye: Vector3): void {
    this.drawSlashes(effects.slashes, world, eye);
    this.drawDebris(effects.particles);
  }

  private drawSlashes(slashes: readonly Slash[], world: World, eye: Vector3): void {
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

      // El trazo se AFILA al apagarse, igual que el isometrico, que pasa de 3 px
      // a 1.5 (`width: 3 - t * 1.5`).
      ribbon(mesh.geometry as BufferGeometry, points.slice(0, last + 1), eye, SLASH_HALF_WIDTH * (1 - t * 0.5));
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
      const side = (p.size / PX_PER_TILE) * OBJECT_SCALE * fade;
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
 * Convierte una polilinea en una cinta de ancho constante ORIENTADA A LA CAMARA.
 *
 * Se ensancha perpendicular a la linea de vision, no en el plano del suelo, y
 * eso es lo que la hace equivalente al trazo isometrico. Alli la camara no se
 * mueve y un trazo de 3 px mide 3 px siempre; aqui la camara la lleva el jugador.
 *
 * Una cinta tumbada en el suelo se ve **de canto** cuando su ancho cae a lo largo
 * del rumbo desde el que se mira: ahi se multiplica por `sin(elevacion)`, y con la
 * elevacion bajando hasta 0.08 rad eso es desaparecer. Ojo, que depende del rumbo
 * y no solo de la elevacion —desde el rumbo perpendicular conserva el ancho
 * entero—, asi que el defecto va y viene segun se gire, que es lo peor que puede
 * hacer. Medido: 13 pixeles aclarados contra 104. Mirando a la camara el ancho es
 * el mismo desde cualquier sitio, que es la propiedad que habia que portar.
 *
 * La normal sale de `avance x vision`: perpendicular a las dos, o sea el ancho
 * de la cinta tal y como lo ve el ojo.
 */
export function ribbon(
  geometry: BufferGeometry,
  points: ReadonlyArray<{ x: number; y: number; z: number }>,
  eye: Vector3,
  halfWidth: number,
): void {
  const positions = new Float32Array(points.length * 6);
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const p = points[i];

    // Avance del trazo, en tres dimensiones: el barrido cruza casillas a
    // distinta altura y su parte vertical cuenta.
    const ax = next.x - prev.x;
    const ay = next.y - prev.y;
    const az = next.z - prev.z;
    // Hacia el ojo.
    const vx = eye.x - p.x;
    const vy = eye.y - p.y;
    const vz = eye.z - p.z;

    let nx = ay * vz - az * vy;
    let ny = az * vx - ax * vz;
    let nz = ax * vy - ay * vx;
    let len = Math.hypot(nx, ny, nz);
    if (len < 1e-6) {
      // Trazo mirando justo a la camara: el producto vectorial se anula y no hay
      // ancho que orientar. Se cae a la perpendicular en el suelo, que ahi da lo
      // mismo y nunca es cero.
      const hx = -az;
      const hz = ax;
      len = Math.hypot(hx, hz) || 1;
      nx = hx;
      ny = 0;
      nz = hz;
    }
    const k = halfWidth / len;
    nx *= k;
    ny *= k;
    nz *= k;

    positions.set([p.x + nx, p.y + ny, p.z + nz], i * 6);
    positions.set([p.x - nx, p.y - ny, p.z - nz], i * 6 + 3);
  }

  const indices: number[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  // Sin normales: el material es `MeshBasicMaterial` y no las mira. Calcularlas
  // cada frame para nada era trabajo puro.
}
