import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { FP_EYE, FP_FOV, FP_MIN_FOV, OrbitCamera } from '../packages/client/src/camera.js';

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

describe('El ojo recorre las tres vistas', () => {
  it('perspectiva → isometrica → primera persona → perspectiva', () => {
    const cam = new OrbitCamera();
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
    const cam = new OrbitCamera();
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
    cam.fpPitch = 0;
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

  it('y en las orbitales es al reves: arrastrar hacia arriba sube la camara', () => {
    // Contraste: el mismo gesto baja la mirada en la orbital, que «agarra el
    // mundo». Si las dos fueran iguales, el test de arriba no diria nada.
    const cam = new OrbitCamera();
    cam.follow(0, 0, 0, 800, 600);
    const before = looking(cam).y;
    cam.orbit(0, -80);
    cam.follow(0, 0, 0, 800, 600);
    expect(looking(cam).y).toBeLessThan(before);
  });

  it('el giro horizontal va en el mismo sentido en las tres vistas', () => {
    const orbital = new OrbitCamera();
    const first = fp();
    orbital.orbit(50, 0);
    first.orbit(50, 0);
    expect(first.yaw).toBeCloseTo(orbital.yaw, 12);
  });

  it('su inclinacion no toca la de la orbita: al volver, la orbita sigue igual', () => {
    const cam = fp();
    const orbitPitch = cam.pitch;
    cam.orbit(0, -200);
    cam.cycleProjection(); // vuelta a la perspectiva
    expect(cam.pitch).toBe(orbitPitch);
  });

  it('no se puede mirar mas alla de la vertical', () => {
    const cam = fp();
    cam.orbit(0, -100_000);
    expect(cam.fpPitch).toBeLessThan(Math.PI / 2);
    cam.orbit(0, 100_000);
    expect(cam.fpPitch).toBeGreaterThan(-Math.PI / 2);
  });
});

describe('El catalejo de la primera persona', () => {
  function fp(): OrbitCamera {
    const cam = new OrbitCamera();
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

  it('en las otras vistas la pinza sigue siendo el zoom de siempre', () => {
    const cam = new OrbitCamera();
    const d = cam.distance;
    cam.zoom(0.5);
    expect(cam.distance).toBeLessThan(d);
    expect(cam.fovZoom).toBe(1);
  });
});
