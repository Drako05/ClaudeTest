/**
 * La camara: orbita libre alrededor del jugador.
 *
 * Fue el motivo de pasar a 3D. La camara isometrica no podia describir lo que
 * hay detras de una montana —la informacion no estaba en la imagen—, y girarla
 * en cuatro pasos fijos fue un parche que no se sentia natural explorando
 * (`docs/isometrico.md`). Aqui el angulo es continuo.
 *
 * Lleva **tres vistas que recorre el ojo**: perspectiva, isometrica (la
 * ortografica, que conserva el aspecto plano del juego viejo) y **primera
 * persona**, que pidio el autor despues. Las dos primeras orbitan alrededor del
 * jugador; la tercera va en sus ojos.
 *
 * **Las tres comparten la MIRADA ENTERA** (decision del autor, 2026-09-28): el
 * mismo pivote —los ojos del jugador— y la misma direccion, rumbo e
 * inclinacion, que es la direccion en que mira el jugador. La primera persona
 * esta en el pivote; las otras dos, **detras de el sobre la linea de la
 * mirada**, mirandolo: el centro de la pantalla es siempre hacia donde se mira,
 * y cambiar de vista sigue mirando exactamente al mismo sitio. Mirar hacia
 * arriba en tercera persona es bajar la camara por detras; para eso la camara
 * choca con el terreno y los hitboxes (`camera-collision.ts`).
 */

import { EYE_HEIGHT } from '@verdant/sim';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';

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

/**
 * Altura de los ojos sobre los pies: el pivote de las tres vistas y el origen
 * del golpe, asi que vive en el nucleo (`EYE_HEIGHT`). Antes la orbital miraba a
 * 1,6 y la primera persona iba a 1,75; al compartir la mirada, 1,75 para todas.
 */
export const FP_EYE = EYE_HEIGHT;

/** Tope de la inclinacion, arriba y abajo: 83 grados. **Deduccion mia.** */
export const PITCH_LIMIT = 1.45;

/**
 * Inclinacion de arranque: los 35 grados desde arriba que tenia la perspectiva,
 * que es la vista con la que se entra. **Deduccion mia**: la primera persona
 * entraba mirando a -0,2 y, al compartir la mirada, entra asi.
 */
const START_PITCH = -0.62;

/**
 * Hasta donde se aleja la isometrica. En ortografica la distancia no cambia el
 * tamano de nada, asi que no hace falta ir lejos: basta con salir del relieve
 * cercano, y la colision se encarga del resto. Estuvo a 220 con el plano cercano
 * en -400 para no recortar montanas; empujada por la colision, lo que queda
 * detras de la camara no puede pintarse delante.
 */
const ORTHO_DISTANCE = 60;

/**
 * Radianes por pixel del raton capturado: unos 0,14 grados, del orden de la
 * sensibilidad por defecto de los shooters. **Deduccion mia.**
 */
export const MOUSE_TURN = 0.0025;

/** Por debajo de esta distancia, el jugador se oculta. **Deduccion mia.** */
export const HIDE_PLAYER_BELOW = 1;
/**
 * Campo de vision de la primera persona por defecto: el de Minecraft. El
 * jugador lo cambia con la barra del ojo (`fov-panel.ts`), entre `FP_FOV_MIN` y
 * `FP_FOV_MAX`: rango y defecto son del autor (50-100 el 2026-09-28, 70-120 el
 * 2026-09-29). Grados verticales.
 */
export const FP_FOV = 70;
export const FP_FOV_MIN = 70;
export const FP_FOV_MAX = 120;
/** Lo mas que estrecha el catalejo. **Deduccion mia.** */
export const FP_MIN_FOV = 15;
/** Lo que tarda el catalejo en volver, como constante de tiempo (segundos). */
const SPYGLASS_RELAX = 0.08;

/** Las tres vistas, en el orden en que las recorre el ojo. */
export const PROJECTIONS = ['perspectiva', 'orto', 'primera'] as const;
export type Projection = (typeof PROJECTIONS)[number];

export class OrbitCamera {
  /** Giro alrededor del eje vertical, en radianes. */
  yaw = Math.PI * 0.25;
  /**
   * Inclinacion de la mirada, positiva hacia ARRIBA, la misma en las tres
   * vistas. Acotada a `±PITCH_LIMIT` para no pasar por los polos.
   */
  pitch = START_PITCH;
  /** Distancia al jugador que se QUIERE en perspectiva, en casillas. */
  distance = 26;
  /**
   * Distancia a la que ha quedado de verdad la camara en el ultimo `follow`,
   * despues de la colision. Cero en primera persona.
   */
  camDistance = 0;
  /**
   * El catalejo: fraccion del campo de vision de la primera persona. Vale 1 sin
   * catalejo; la pinza o + y - lo bajan y `relaxSpyglass` lo devuelve.
   */
  fovZoom = 1;
  /** Campo de vision de la primera persona elegido en la barra, en grados. */
  fpFov = FP_FOV;

  /**
   * La vista de arranque.
   *
   * **Perspectiva**, y es decision del autor: probo las dos en su telefono, vio
   * los mismos 80+ FPS en ambas y eligio esta para el juego final. El
   * interruptor se queda porque la ortografica conserva el aspecto plano del
   * isometrico y sigue siendo util para comparar.
   */
  projection: Projection = 'perspectiva';

  /**
   * Plano cercano de 0,1 y no 0,5: con la colision la camara puede quedar a un
   * palmo del suelo o de un tronco, y a 0,5 se recortaria lo que tiene al lado.
   */
  readonly perspective = new PerspectiveCamera(FOV, 1, 0.1, 900);
  readonly orthographic = new OrthographicCamera(-1, 1, 1, -1, 0.05, 900);
  /**
   * La de primera persona, con plano cercano de 0,05 y no 0,5: pegado a un arbol
   * o a una pared, lo que queda a medio bloque no puede recortarse.
   */
  readonly firstPerson = new PerspectiveCamera(FP_FOV, 1, 0.05, 900);

  private readonly target = new Vector3();

  get active(): PerspectiveCamera | OrthographicCamera {
    if (this.projection === 'orto') return this.orthographic;
    return this.projection === 'primera' ? this.firstPerson : this.perspective;
  }

  /** Campo de vision vertical en uso, en grados. Cero en la isometrica. */
  get fov(): number {
    if (this.projection === 'orto') return 0;
    return this.projection === 'primera' ? this.fpFov * this.fovZoom : FOV;
  }

  /**
   * Fija el campo de vision de la primera persona, acotado y al grado. El
   * catalejo parte de el (decision del autor): lo que estrecha es una fraccion
   * de este, y al soltar vuelve aqui.
   */
  setFpFov(deg: number): void {
    if (!Number.isFinite(deg)) return;
    this.fpFov = clamp(Math.round(deg), FP_FOV_MIN, FP_FOV_MAX);
  }

  /** Perspectiva → isometrica → primera persona → perspectiva. */
  cycleProjection(): void {
    const next = (PROJECTIONS.indexOf(this.projection) + 1) % PROJECTIONS.length;
    this.projection = PROJECTIONS[next];
    // Se entra siempre con el catalejo guardado.
    this.fovZoom = 1;
  }

  /**
   * Arrastrar gira, igual en las tres vistas: dedo a la derecha, mirada a la
   * derecha; y **subir el dedo es mirar arriba**, como el raton en PC (`turn`).
   * El dedo lleva la mirada, como en los shooters de movil.
   *
   * En las orbitales el arrastre vertical «agarraba el mundo» —bajar el dedo
   * era mirar arriba— hasta el 2026-09-30, cuando el autor pidio dejarlo como
   * en PC.
   */
  orbit(dx: number, dy: number): void {
    this.yaw -= dx * 0.006;
    this.pitch = clamp(this.pitch - dy * 0.005, -PITCH_LIMIT, PITCH_LIMIT);
  }

  /**
   * El raton capturado de PC (`pointer-lock.ts`): hacia donde se mueve el
   * cursor, se mueve la mirada, en las TRES vistas (decision del autor). No es
   * `orbit` por la sensibilidad: el raton va en pixeles de raton y el dedo en
   * pixeles de pantalla. El sentido es el mismo: arriba es mirar arriba.
   */
  turn(dx: number, dy: number): void {
    this.yaw -= dx * MOUSE_TURN;
    this.pitch = clamp(this.pitch - dy * MOUSE_TURN, -PITCH_LIMIT, PITCH_LIMIT);
  }

  zoom(factor: number): void {
    if (factor === 1) return;
    if (this.projection === 'primera') {
      // En primera persona no hay distancia que acortar: el zoom es un
      // catalejo, que estrecha el campo de vision mientras dura el gesto.
      this.fovZoom = clamp(this.fovZoom * factor, FP_MIN_FOV / this.fpFov, 1);
      return;
    }
    // El minimo no es «lo mas cerca posible»: por debajo de unas diez casillas
    // la camara se mete dentro del relieve y deja de verse nada.
    this.distance = clamp(this.distance * factor, 10, 90);
  }

  /**
   * Devuelve el catalejo a su sitio cuando ya no se sostiene.
   *
   * Temporal por decision del autor: al soltar la pinza vuelve al campo de
   * vision de siempre. Con una transicion corta y no de golpe, para que no
   * parezca un corte. `held` lo decide el mando (pinza en curso, o + / -
   * pulsado hace un momento).
   */
  relaxSpyglass(dt: number, held: boolean): void {
    if (held || this.fovZoom === 1) return;
    this.fovZoom += (1 - this.fovZoom) * (1 - Math.exp(-dt / SPYGLASS_RELAX));
    if (1 - this.fovZoom < 1e-3) this.fovZoom = 1;
  }

  resize(width: number, height: number): void {
    const aspect = width / height;
    this.perspective.aspect = aspect;
    this.perspective.updateProjectionMatrix();
    this.firstPerson.aspect = aspect;
    this.firstPerson.fov = this.fpFov * this.fovZoom;
    this.firstPerson.updateProjectionMatrix();
    // En ortografica el «zoom» es el ancho del encuadre, no la distancia: la
    // distancia no cambia el tamano de nada porque no hay fuga.
    const half = this.distance * 0.5;
    this.orthographic.left = -half * aspect;
    this.orthographic.right = half * aspect;
    this.orthographic.top = half;
    this.orthographic.bottom = -half;
    this.orthographic.updateProjectionMatrix();
  }

  /** La direccion de la mirada en three.js (`y` es la altura), unitaria. */
  look(): Vector3 {
    const f = this.forward();
    const cos = Math.cos(this.pitch);
    return new Vector3(f.x * cos, Math.sin(this.pitch), f.y * cos);
  }

  /**
   * Recoloca la camara. `x`/`z` son las coordenadas del mundo y `y` la altura de
   * los pies; el pivote son los ojos, `EYE_HEIGHT` por encima.
   *
   * En primera persona la camara esta en el pivote. En las otras dos, detras de
   * el sobre la linea de la mirada y mirandolo, a la distancia que deje libre
   * `clearance` (la colision: recibe la direccion del pivote a la camara y la
   * distancia que se quiere, y devuelve la que cabe). Sin ella, a la que toque.
   */
  follow(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    clearance?: (back: Vector3, want: number) => number,
  ): void {
    this.target.set(x, y + FP_EYE, z);
    const look = this.look();
    // La de primera persona va SIEMPRE en los ojos, se dibuje con ella o no:
    // la estocada sale de un punto de su pantalla, y asi hace el mismo
    // recorrido en el mundo en las tres vistas (pedido del autor, 2026-10-01;
    // con la camara activa nacia lejos del jugador en tercera persona).
    this.firstPerson.position.copy(this.target);
    this.firstPerson.lookAt(this.target.clone().add(look));
    this.firstPerson.updateMatrixWorld();
    if (this.projection === 'primera') {
      this.camDistance = 0;
      this.resize(width, height);
      return;
    }
    // En perspectiva se acerca justo hasta encuadrar lo mismo que la
    // ortografica; en esta la distancia no cambia el tamano de nada.
    const want = this.projection === 'orto' ? ORTHO_DISTANCE : this.distance * PERSPECTIVE_PULL;
    const back = look.clone().negate();
    this.camDistance = clearance ? clearance(back, want) : want;

    const camera = this.active;
    camera.position.copy(this.target).addScaledVector(back, this.camDistance);
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

  /**
   * Inclinacion de la mirada en radianes, positiva hacia ARRIBA: la misma en
   * las tres vistas. Es la segunda mitad de la mirada de la accion, la que
   * inclina el sector del golpe (regla 12).
   */
  get lookPitch(): number {
    return this.pitch;
  }

  right(): { x: number; y: number } {
    return { x: Math.cos(this.yaw), y: -Math.sin(this.yaw) };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
