import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  FP_EYE,
  FP_FOV,
  FP_FOV_MAX,
  FP_FOV_MIN,
  FP_MIN_FOV,
  MOUSE_TURN,
  OrbitCamera,
  PITCH_LIMIT,
} from '../packages/client/src/camera.js';

/**
 * Las tres vistas del ojo: perspectiva, isometrica y primera persona.
 *
 * three.js corre en Node sin lienzo, asi que la camara se mide de verdad: donde
 * queda el ojo y hacia donde mira, no lo que dice una variable.
 */

/** Hacia donde mira una camara, como vector unitario del mundo. */
function looking(cam: OrbitCamera): Vector3 {
  return cam.active.getWorldDirection(new Vector3());
}

/**
 * Una camara en perspectiva: estos tests se escribieron para ella. La de
 * arranque es la primera persona (decision del autor, 2026-10-02), y la afirma
 * su propio test.
 */
function orbit(): OrbitCamera {
  const cam = new OrbitCamera();
  cam.projection = 'perspectiva';
  return cam;
}

describe('La vista de arranque', () => {
  it('es la primera persona', () => {
    expect(new OrbitCamera().projection).toBe('primera');
  });
});

describe('El ojo recorre las tres vistas', () => {
  it('perspectiva → isometrica → primera persona → perspectiva', () => {
    const cam = orbit();
    const seen = [cam.projection];
    for (let i = 0; i < 3; i++) {
      cam.cycleProjection();
      seen.push(cam.projection);
    }
    expect(seen).toEqual(['perspectiva', 'orto', 'primera', 'perspectiva']);
  });
});

describe('La primera persona', () => {
  function fp(): OrbitCamera {
    const cam = orbit();
    cam.cycleProjection();
    cam.cycleProjection();
    return cam;
  }

  it('va en los ojos: los pies mas FP_EYE, sobre el personaje', () => {
    const cam = fp();
    cam.follow(10.5, 4, -3.5, 800, 600);
    expect(cam.active.position.x).toBeCloseTo(10.5, 9);
    expect(cam.active.position.y).toBeCloseTo(4 + FP_EYE, 9);
    expect(cam.active.position.z).toBeCloseTo(-3.5, 9);
  });

  it('mira hacia el mismo rumbo que da forward(), que es el de la accion', () => {
    const cam = fp();
    cam.pitch = 0;
    for (const yaw of [0, 0.7, 2.1, -1.3]) {
      cam.yaw = yaw;
      cam.follow(0, 0, 0, 800, 600);
      const dir = looking(cam);
      const f = cam.forward();
      expect(dir.x).toBeCloseTo(f.x, 6);
      expect(dir.z).toBeCloseTo(f.y, 6);
      expect(dir.y).toBeCloseTo(0, 6);
    }
  });

  it('arrastrar hacia arriba sube la mirada (el dedo lleva la mirada)', () => {
    const cam = fp();
    cam.follow(0, 0, 0, 800, 600);
    const before = looking(cam).y;
    cam.orbit(0, -80); // dedo hacia arriba
    cam.follow(0, 0, 0, 800, 600);
    expect(looking(cam).y).toBeGreaterThan(before);
  });

  it('y en las orbitales tambien, como el raton en PC (pedido del autor, 2026-09-30)', () => {
    // Hasta ese dia la orbital «agarraba el mundo» y este mismo gesto bajaba
    // la mirada. En las dos, perspectiva e isometrica; y bajando el dedo, al
    // reves.
    for (const n of [0, 1]) {
      const cam = orbit();
      for (let i = 0; i < n; i++) cam.cycleProjection();
      cam.follow(0, 0, 0, 800, 600);
      const before = looking(cam).y;
      cam.orbit(0, -80);
      cam.follow(0, 0, 0, 800, 600);
      expect(looking(cam).y).toBeGreaterThan(before);
      cam.orbit(0, 160);
      cam.follow(0, 0, 0, 800, 600);
      expect(looking(cam).y).toBeLessThan(before);
    }
  });

  it('el giro horizontal va en el mismo sentido en las tres vistas', () => {
    const orbital = orbit();
    const first = fp();
    orbital.orbit(50, 0);
    first.orbit(50, 0);
    expect(first.yaw).toBeCloseTo(orbital.yaw, 12);
  });


  it('no se puede mirar mas alla de la vertical', () => {
    const cam = fp();
    cam.orbit(0, -100_000);
    expect(cam.pitch).toBeLessThan(Math.PI / 2);
    cam.orbit(0, 100_000);
    expect(cam.pitch).toBeGreaterThan(-Math.PI / 2);
  });
});

describe('Una sola mirada para las tres vistas', () => {
  /** La camara en la vista `n` del ciclo (0 perspectiva, 1 isometrica, 2 primera). */
  function view(n: number): OrbitCamera {
    const cam = orbit();
    for (let i = 0; i < n; i++) cam.cycleProjection();
    return cam;
  }

  it('las tres miran en la direccion de la mirada, y cambiar de vista no la mueve', () => {
    for (const pitch of [-0.62, 0, 0.9]) {
      const dirs = [0, 1, 2].map((n) => {
        const cam = view(n);
        cam.yaw = 0.8;
        cam.pitch = pitch;
        cam.follow(3, 2, -7, 800, 600);
        return looking(cam);
      });
      const want = view(0);
      want.yaw = 0.8;
      want.pitch = pitch;
      const look = want.look();
      for (const d of dirs) {
        expect(d.x).toBeCloseTo(look.x, 6);
        expect(d.y).toBeCloseTo(look.y, 6);
        expect(d.z).toBeCloseTo(look.z, 6);
      }
    }
  });

  it('en tercera persona el centro de la pantalla son los ojos del jugador', () => {
    for (const n of [0, 1]) {
      const cam = view(n);
      cam.pitch = 0.4;
      cam.follow(3, 2, -7, 800, 600);
      // Sin render no se refrescan las matrices del mundo: se hace a mano.
      cam.active.updateMatrixWorld();
      // El pivote, proyectado, cae en el centro exacto de la imagen.
      const eye = new Vector3(3, 2 + FP_EYE, -7).project(cam.active);
      expect(eye.x).toBeCloseTo(0, 6);
      expect(eye.y).toBeCloseTo(0, 6);
    }
  });

  it('en tercera persona se puede mirar hacia arriba: la camara baja por detras', () => {
    const cam = view(0);
    cam.orbit(0, -100_000); // dedo arriba: mirar arriba
    expect(cam.pitch).toBeGreaterThan(1);
    cam.follow(0, 0, 0, 800, 600);
    expect(looking(cam).y).toBeGreaterThan(0.8);
    expect(cam.active.position.y).toBeLessThan(FP_EYE);
  });

  it('la colision acerca la camara, y sin obstaculos va a su distancia', () => {
    const cam = view(0);
    cam.follow(0, 0, 0, 800, 600);
    const free = cam.camDistance;
    cam.follow(0, 0, 0, 800, 600, () => 2.5);
    expect(cam.camDistance).toBe(2.5);
    expect(cam.active.position.distanceTo(new Vector3(0, FP_EYE, 0))).toBeCloseTo(2.5, 6);
    expect(free).toBeGreaterThan(2.5);
  });
});

describe('El catalejo de la primera persona', () => {
  function fp(): OrbitCamera {
    const cam = orbit();
    cam.cycleProjection();
    cam.cycleProjection();
    return cam;
  }

  it('la pinza estrecha el campo de vision sin mover el ojo ni la distancia', () => {
    const cam = fp();
    const distance = cam.distance;
    cam.zoom(0.5);
    expect(cam.fov).toBeCloseTo(FP_FOV * 0.5, 9);
    expect(cam.distance).toBe(distance);
  });

  it('no estrecha mas alla del minimo ni ensancha mas alla del normal', () => {
    const cam = fp();
    cam.zoom(0.001);
    expect(cam.fov).toBeCloseTo(FP_MIN_FOV, 9);
    cam.zoom(1000);
    expect(cam.fov).toBeCloseTo(FP_FOV, 9);
  });

  it('mientras se sostiene no vuelve; al soltar, vuelve al campo normal', () => {
    const cam = fp();
    cam.zoom(0.4);
    for (let i = 0; i < 60; i++) cam.relaxSpyglass(1 / 60, true);
    expect(cam.fov).toBeCloseTo(FP_FOV * 0.4, 9);
    for (let i = 0; i < 60; i++) cam.relaxSpyglass(1 / 60, false);
    expect(cam.fov).toBe(FP_FOV);
  });

  it('el angulo de la barra va de 70 a 120, al grado, y arranca en 70', () => {
    const cam = fp();
    expect(cam.fov).toBe(70);
    expect([FP_FOV_MIN, FP_FOV_MAX]).toEqual([70, 120]);
    cam.setFpFov(107.4);
    expect(cam.fov).toBe(107);
    cam.setFpFov(10);
    expect(cam.fpFov).toBe(FP_FOV_MIN);
    cam.setFpFov(400);
    expect(cam.fpFov).toBe(FP_FOV_MAX);
    cam.setFpFov(NaN);
    expect(cam.fpFov).toBe(FP_FOV_MAX);
  });

  it('el catalejo parte del angulo elegido, llega a 15 y vuelve a el', () => {
    const cam = fp();
    cam.setFpFov(110);
    cam.zoom(0.5);
    expect(cam.fov).toBeCloseTo(55, 9);
    cam.zoom(0.001);
    expect(cam.fov).toBeCloseTo(FP_MIN_FOV, 9);
    for (let i = 0; i < 60; i++) cam.relaxSpyglass(1 / 60, false);
    expect(cam.fov).toBe(110);
    cam.resize(800, 600);
    expect(cam.firstPerson.fov).toBe(110);
  });

  it('el angulo de la primera persona no toca la perspectiva', () => {
    const cam = orbit();
    const fov = cam.fov;
    cam.setFpFov(120);
    expect(cam.fov).toBe(fov);
  });

  it('en las otras vistas la pinza sigue siendo el zoom de siempre', () => {
    const cam = orbit();
    const d = cam.distance;
    cam.zoom(0.5);
    expect(cam.distance).toBeLessThan(d);
    expect(cam.fovZoom).toBe(1);
  });
});

describe('El raton capturado de PC', () => {
  it('raton arriba es mirar arriba en las tres vistas', () => {
    for (let views = 0; views < 3; views++) {
      const cam = orbit();
      for (let i = 0; i < views; i++) cam.cycleProjection();
      const pitch = cam.pitch;
      cam.turn(0, -40);
      expect(cam.pitch).toBeCloseTo(pitch + 40 * MOUSE_TURN, 9);
    }
  });

  it('raton a la derecha gira el rumbo como arrastrar a la derecha', () => {
    const start = orbit().yaw;
    const mouse = orbit();
    const drag = orbit();
    mouse.turn(50, 0);
    drag.orbit(50, 0);
    expect(mouse.yaw).toBeCloseTo(start - 50 * MOUSE_TURN, 9);
    expect(Math.sign(mouse.yaw - start)).toBe(Math.sign(drag.yaw - start));
  });

  it('la inclinacion se acota arriba y abajo', () => {
    const cam = orbit();
    cam.turn(0, -1e6);
    expect(cam.pitch).toBe(PITCH_LIMIT);
    cam.turn(0, 1e6);
    expect(cam.pitch).toBe(-PITCH_LIMIT);
  });
});
