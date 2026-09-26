/**
 * La camara: orbita libre alrededor del jugador.
 *
 * Fue el motivo de pasar a 3D. La camara isometrica no podia describir lo que
 * hay detras de una montana —la informacion no estaba en la imagen—, y girarla
 * en cuatro pasos fijos fue un parche que no se sentia natural explorando
 * (`docs/isometrico.md`). Aqui el angulo es continuo.
 *
 * Lleva **las dos proyecciones con un interruptor**, y no es indecision: es la
 * bifurcacion estetica que tiene que juzgar el autor. La ortografica conserva el
 * aspecto plano y limpio del juego de hoy; la perspectiva se siente mas 3D y es
 * la que usan los HD-2D. Con las dos en el mismo build las compara en el sitio
 * en vez de que yo elija por el.
 */

import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';

/**
 * Altura del punto al que mira la orbita, sobre los pies del jugador.
 *
 * Sube de 1.2 a 1.6 al crecer el personaje: 1.2 le quedaba por encima de la
 * cabeza cuando medía 0,78 bloques y le quedaría por las rodillas midiendo 1,8.
 * 1.6 es su cabeza, y de paso la altura de ojos de Minecraft.
 *
 * **Es deduccion mia**, corregible: conservar la proporcion exacta de antes
 * daria 2,8, que deja la camara mirando muy por encima del personaje.
 */
const EYE = 1.6;

/** Apertura vertical de la perspectiva, en grados. */
const FOV = 45;

/**
 * Distancia a la que la perspectiva encuadra lo mismo que la ortografica.
 *
 * Sin esto el interruptor no compara peras con peras: la ortografica encuadraba
 * el doble de mundo y la comparacion estetica se convertia en una comparacion de
 * zoom. `mitad = D * tan(fov/2)`, asi que para la misma mitad hace falta
 * `D = mitad / tan(fov/2)`.
 */
const PERSPECTIVE_PULL = 0.5 / Math.tan((FOV / 2) * (Math.PI / 180));

export type Projection = 'orto' | 'perspectiva';

export class OrbitCamera {
  /** Giro alrededor del eje vertical, en radianes. */
  yaw = Math.PI * 0.25;
  /** Elevacion sobre el horizonte. Acotada para no pasar por los polos. */
  pitch = 0.62;
  /** Distancia al jugador, en casillas. */
  distance = 26;

  /**
   * La vista de arranque.
   *
   * **Perspectiva**, y es decision del autor: probo las dos en su telefono, vio
   * los mismos 80+ FPS en ambas y eligio esta para el juego final. El
   * interruptor se queda porque la ortografica conserva el aspecto plano del
   * isometrico y sigue siendo util para comparar.
   */
  projection: Projection = 'perspectiva';

  readonly perspective = new PerspectiveCamera(FOV, 1, 0.5, 900);
  readonly orthographic = new OrthographicCamera(-1, 1, 1, -1, -400, 900);

  private readonly target = new Vector3();

  get active(): PerspectiveCamera | OrthographicCamera {
    return this.projection === 'orto' ? this.orthographic : this.perspective;
  }

  toggleProjection(): void {
    this.projection = this.projection === 'orto' ? 'perspectiva' : 'orto';
  }

  /** Arrastrar gira; el limite de elevacion evita quedarse mirando el cenit. */
  orbit(dx: number, dy: number): void {
    this.yaw -= dx * 0.006;
    this.pitch = clamp(this.pitch - dy * 0.005, 0.08, 1.45);
  }

  zoom(factor: number): void {
    // El minimo no es «lo mas cerca posible»: por debajo de unas diez casillas
    // la camara se mete dentro del relieve y deja de verse nada.
    this.distance = clamp(this.distance * factor, 10, 90);
  }

  resize(width: number, height: number): void {
    const aspect = width / height;
    this.perspective.aspect = aspect;
    this.perspective.updateProjectionMatrix();
    // En ortografica el «zoom» es el ancho del encuadre, no la distancia: la
    // distancia no cambia el tamano de nada porque no hay fuga.
    const half = this.distance * 0.5;
    this.orthographic.left = -half * aspect;
    this.orthographic.right = half * aspect;
    this.orthographic.top = half;
    this.orthographic.bottom = -half;
    this.orthographic.updateProjectionMatrix();
  }

  /** Recoloca la camara mirando al jugador. */
  follow(x: number, y: number, z: number, width: number, height: number): void {
    this.target.set(x, y + EYE, z);
    const cos = Math.cos(this.pitch);
    const offset = new Vector3(
      Math.sin(this.yaw) * cos,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cos,
      // En ortografica la distancia no cambia el tamano de nada —no hay fuga—,
      // asi que la camara se aleja lo bastante para no recortar la montana mas
      // alta. En perspectiva se acerca justo hasta encuadrar lo mismo.
    ).multiplyScalar(this.projection === 'orto' ? 220 : this.distance * PERSPECTIVE_PULL);

    const camera = this.active;
    camera.position.copy(this.target).add(offset);
    camera.lookAt(this.target);
    this.resize(width, height);
  }

  /**
   * El vector «hacia donde mira la camara» proyectado al suelo.
   *
   * Con la camara libre, «arriba» en el mando tiene que ser «lejos de la camara»
   * en el mundo. Es el mismo problema que resolvia la rotacion del vector de
   * movimiento en el isometrico, y va aqui por la misma razon: la Intent que
   * sale de esto sigue siendo de mundo y puede viajar por red.
   */
  forward(): { x: number; y: number } {
    return { x: -Math.sin(this.yaw), y: -Math.cos(this.yaw) };
  }

  right(): { x: number; y: number } {
    return { x: Math.cos(this.yaw), y: -Math.sin(this.yaw) };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
