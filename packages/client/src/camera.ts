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
 * Las tres comparten el RUMBO (`yaw`): cambiar de vista sigue mirando al mismo
 * sitio, y `forward()` —de donde salen el movimiento y la mirada de la accion,
 * regla 5— vale igual en todas. La inclinacion, en cambio, es de cada una:
 * volver a tercera persona recupera el angulo que tenia.
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

/**
 * Altura de los ojos en primera persona, sobre los pies. El personaje mide 1,93
 * bloques y en Minecraft los ojos van al 90 % de la altura. **Deduccion mia.**
 */
export const FP_EYE = 1.75;
/** Campo de vision de la primera persona: el de Minecraft. **Deduccion mia.** */
export const FP_FOV = 70;
/** Lo mas que estrecha el catalejo. **Deduccion mia.** */
export const FP_MIN_FOV = 15;
/** Inclinacion con la que se entra en primera persona: un poco hacia el suelo. */
const FP_START_PITCH = -0.2;
/** Lo que tarda el catalejo en volver, como constante de tiempo (segundos). */
const SPYGLASS_RELAX = 0.08;

/** Las tres vistas, en el orden en que las recorre el ojo. */
export const PROJECTIONS = ['perspectiva', 'orto', 'primera'] as const;
export type Projection = (typeof PROJECTIONS)[number];

export class OrbitCamera {
  /** Giro alrededor del eje vertical, en radianes. */
  yaw = Math.PI * 0.25;
  /** Elevacion sobre el horizonte. Acotada para no pasar por los polos. */
  pitch = 0.62;
  /** Distancia al jugador, en casillas. */
  distance = 26;
  /**
   * Inclinacion de la mirada en primera persona: positiva hacia arriba. Propia,
   * para no pisar la elevacion de la orbita.
   */
  fpPitch = FP_START_PITCH;
  /**
   * El catalejo: fraccion del campo de vision de la primera persona. Vale 1 sin
   * catalejo; la pinza o la rueda lo bajan y `relaxSpyglass` lo devuelve.
   */
  fovZoom = 1;

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
    return this.projection === 'primera' ? FP_FOV * this.fovZoom : FOV;
  }

  /** Perspectiva → isometrica → primera persona → perspectiva. */
  cycleProjection(): void {
    const next = (PROJECTIONS.indexOf(this.projection) + 1) % PROJECTIONS.length;
    this.projection = PROJECTIONS[next];
    // Se entra siempre con el catalejo guardado.
    this.fovZoom = 1;
  }

  /**
   * Arrastrar gira. El giro horizontal es el mismo en las tres vistas —dedo a
   * la derecha, mirada a la derecha—; el vertical no:
   *
   * - en las orbitales el arrastre «agarra el mundo»: bajar el dedo baja la
   *   camara, y el limite de elevacion evita quedarse mirando el cenit;
   * - en primera persona el dedo **lleva la mirada**, como en los shooters de
   *   movil: subir el dedo es mirar arriba. Decision del autor.
   */
  orbit(dx: number, dy: number): void {
    this.yaw -= dx * 0.006;
    if (this.projection === 'primera') {
      this.fpPitch = clamp(this.fpPitch - dy * 0.005, -1.4, 1.4);
    } else {
      this.pitch = clamp(this.pitch - dy * 0.005, 0.08, 1.45);
    }
  }

  zoom(factor: number): void {
    if (factor === 1) return;
    if (this.projection === 'primera') {
      // En primera persona no hay distancia que acortar: el zoom es un
      // catalejo, que estrecha el campo de vision mientras dura el gesto.
      this.fovZoom = clamp(this.fovZoom * factor, FP_MIN_FOV / FP_FOV, 1);
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
   * parezca un corte. `held` lo decide el mando (pinza en curso, o rueda
   * girada hace un momento).
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
    this.firstPerson.fov = FP_FOV * this.fovZoom;
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

  /**
   * Recoloca la camara: mirando al jugador en las orbitales, o en sus ojos.
   * `x`/`z` son las coordenadas del mundo y `y` la altura de sus pies.
   */
  follow(x: number, y: number, z: number, width: number, height: number): void {
    if (this.projection === 'primera') {
      const f = this.forward();
      const cos = Math.cos(this.fpPitch);
      this.firstPerson.position.set(x, y + FP_EYE, z);
      this.target.set(x + f.x * cos, y + FP_EYE + Math.sin(this.fpPitch), z + f.y * cos);
      this.firstPerson.lookAt(this.target);
      this.resize(width, height);
      return;
    }
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
