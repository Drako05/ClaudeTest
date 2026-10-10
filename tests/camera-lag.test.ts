import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  AIM_FAR,
  AIM_NEAR,
  aimPoint,
  CAMERA_LAG,
  CAMERA_SNAP,
  chase,
} from '../packages/client/src/camera-lag.js';
import { FP_EYE, OrbitCamera, PROJECTIONS } from '../packages/client/src/camera.js';

/**
 * La camara con retraso (pedido del autor, 2026-10-10): persigue los ojos con
 * 0,1 s de retraso en las tres vistas y mira al punto que mira el personaje.
 */

const FRAME = 1 / 60;

describe('La persecucion de los ojos', () => {
  it('andando a ritmo constante va ~0,1 s por detras (0,092 a 60 Hz)', () => {
    const eyes = { x: 0, y: 0, z: 0 };
    const target = { x: 0, y: 0, z: 0 };
    const speed = 5.2;
    for (let i = 0; i < 120; i++) {
      target.x += speed * FRAME;
      chase(eyes, target, CAMERA_LAG, FRAME);
    }
    // La exponencial discreta se queda un pelo mas cerca que la continua.
    expect(target.x - eyes.x).toBeGreaterThan(speed * CAMERA_LAG * 0.9);
    expect(target.x - eyes.x).toBeLessThan(speed * CAMERA_LAG * 1.01);
  });

  it('un escalon de medio bloque lo sube en una curva, no de golpe', () => {
    const eyes = { x: 0, y: 0, z: 0 };
    const target = { x: 0, y: 0, z: 0.5 };
    const heights: number[] = [];
    for (let i = 0; i < 60; i++) {
      chase(eyes, target, CAMERA_LAG, FRAME);
      heights.push(eyes.z);
    }
    // Sube siempre y sin pasarse; el primer fotograma, un sexto de lo que
    // subiria sin retraso.
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1]);
    expect(heights[0]).toBeLessThan(0.5 / 6);
    expect(Math.max(...heights)).toBeLessThanOrEqual(0.5);
    // A los 0,1 s lleva el 63 %, y a los 0,5 s esta arriba.
    expect(heights[5]).toBeCloseTo(0.5 * (1 - Math.exp(-1)), 2);
    expect(heights[29]).toBeGreaterThan(0.5 * 0.99);
  });

  it('el retraso es el mismo en todas las direcciones', () => {
    const run = (dx: number, dy: number, dz: number): number => {
      const eyes = { x: 0, y: 0, z: 0 };
      chase(eyes, { x: dx, y: dy, z: dz }, CAMERA_LAG, FRAME);
      return Math.hypot(eyes.x, eyes.y, eyes.z);
    };
    const up = run(0, 0, 1);
    expect(run(1, 0, 0)).toBeCloseTo(up, 12);
    expect(run(0, -1, 0)).toBeCloseTo(up, 12);
    expect(run(0, 0, -1)).toBeCloseTo(up, 12);
  });

  it('sin retraso, o lejos de verdad (nacer, reaparecer), salta', () => {
    const eyes = { x: 0, y: 0, z: 0 };
    chase(eyes, { x: 1, y: 2, z: 3 }, 0, FRAME);
    expect(eyes).toEqual({ x: 1, y: 2, z: 3 });
    chase(eyes, { x: 1 + CAMERA_SNAP + 0.1, y: 2, z: 3 }, CAMERA_LAG, FRAME);
    expect(eyes.x).toBe(1 + CAMERA_SNAP + 0.1);
  });
});

describe('El punto de mira', () => {
  it('es el primer choque del rayo de la mirada', () => {
    const p = aimPoint({ x: 1, y: 2, z: 3 }, { x: 0, y: 0.6, z: -0.8 }, () => 5);
    expect(p.x).toBeCloseTo(1, 12);
    expect(p.y).toBeCloseTo(5, 12);
    expect(p.z).toBeCloseTo(-1, 12);
  });

  it('sin choque, el final del rayo; pegado a una pared, a un pelo de los ojos', () => {
    const far = aimPoint({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, (f) => f);
    expect(far.x).toBe(AIM_FAR);
    const near = aimPoint({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, () => 0);
    expect(near.x).toBe(AIM_NEAR);
  });
});

describe('La camara rezagada mira donde apunta el personaje', () => {
  /** Donde cae en la pantalla el punto de mira: el centro es 0, 0. */
  function onScreen(cam: OrbitCamera): Vector3 {
    // Lo que hace el render antes de dibujar.
    cam.active.updateMatrixWorld();
    return cam.aim.clone().project(cam.active);
  }

  for (const projection of PROJECTIONS) {
    it(`en ${projection}: tras subir un escalon, el punto de mira sigue en el centro`, () => {
      const cam = new OrbitCamera();
      while (cam.projection !== projection) cam.cycleProjection();
      // Un suelo a 4 casillas por delante de los ojos.
      const hit = () => 4;
      cam.follow(0, 0, 0, 800, 600, undefined, hit, FRAME);
      cam.follow(0, 0.5, 0, 800, 600, undefined, hit, FRAME);
      // La camara se ha quedado abajo...
      expect(cam.eyes.y).toBeLessThan(FP_EYE + 0.5 / 6);
      expect(cam.eyes.y).toBeGreaterThan(FP_EYE);
      // ...pero el punto de mira es el de los ojos de verdad, y esta en el centro.
      const look = cam.look();
      const truth = new Vector3(0, 0.5 + FP_EYE, 0).addScaledVector(look, 4);
      expect(cam.aim.distanceTo(truth)).toBeLessThan(1e-9);
      const p = onScreen(cam);
      expect(Math.abs(p.x)).toBeLessThan(1e-6);
      expect(Math.abs(p.y)).toBeLessThan(1e-6);
    });
  }

  it('la mirada que viaja en la Intent no lleva retraso: es la del raton', () => {
    const cam = new OrbitCamera();
    const before = { ...cam.forward(), pitch: cam.lookPitch };
    cam.follow(0, 0, 0, 800, 600, undefined, () => 4, FRAME);
    cam.follow(0, 0.5, 0, 800, 600, undefined, () => 4, FRAME);
    expect({ ...cam.forward(), pitch: cam.lookPitch }).toEqual(before);
  });

  it('sin `dt` va en los ojos, como antes del retraso', () => {
    const cam = new OrbitCamera();
    cam.follow(0, 0, 0, 800, 600);
    cam.follow(3, 2, -7, 800, 600);
    expect(cam.eyes.distanceTo(new Vector3(3, 2 + FP_EYE, -7))).toBe(0);
  });
});
