import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { FP_EYE, OrbitCamera, PROJECTIONS } from '../packages/client/src/camera.js';
import { INTERP_SNAP, TickInterpolation } from '../packages/client/src/smooth.js';

/**
 * Lo que suaviza el dibujo (2026-10-12; `smooth.ts`): interpolar entre ticks.
 * Sustituye a la camara con retraso. El suavizado del escalon se quito el
 * 2026-10-14: el cuerpo sube el escalon tick a tick (`tests/jump.test.ts`).
 */

describe('Interpolar entre ticks', () => {
  /** Un almacen de un solo cuerpo, el 0, en `p`. */
  const store = (p: { x: number; y: number; z: number }) => ({ x: [p.x], y: [p.y], z: [p.z] });

  it('dibuja entre el tick anterior y el ultimo, en la fraccion que toque', () => {
    const interp = new TickInterpolation();
    const s = store({ x: 0, y: 0, z: 0 });
    interp.capture([0], s.x, s.y, s.z);
    const now = { x: 1, y: 2, z: 0.4 };
    expect(interp.at(0, now, 0)).toEqual({ x: 0, y: 0, z: 0 });
    expect(interp.at(0, now, 0.5)).toEqual({ x: 0.5, y: 1, z: 0.2 });
    expect(interp.at(0, now, 1)).toEqual(now);
    // El acumulador nunca pasa de un tick, pero si pasara, no se extrapola.
    expect(interp.at(0, now, 3)).toEqual(now);
  });

  it('sin tick anterior, o mas lejos que el salto (nacer, reaparecer), donde esta', () => {
    const interp = new TickInterpolation();
    expect(interp.at(0, { x: 5, y: 5, z: 5 }, 0)).toEqual({ x: 5, y: 5, z: 5 });
    const s = store({ x: 0, y: 0, z: 0 });
    interp.capture([0], s.x, s.y, s.z);
    const far = { x: INTERP_SNAP + 0.1, y: 0, z: 0 };
    expect(interp.at(0, far, 0)).toEqual(far);
    // Y cada tick olvida lo que no se le pasa.
    interp.capture([], s.x, s.y, s.z);
    expect(interp.at(0, { x: 1, y: 0, z: 0 }, 0)).toEqual({ x: 1, y: 0, z: 0 });
  });
});


describe('La camara mira por la linea de la mirada', () => {
  for (const projection of PROJECTIONS) {
    it(`en ${projection}: el centro de la pantalla es hacia donde se mira desde los ojos`, () => {
      const cam = new OrbitCamera();
      while (cam.projection !== projection) cam.cycleProjection();
      cam.follow(3, 0.5, -7, 800, 600);
      expect(cam.eyes.distanceTo(new Vector3(3, 0.5 + FP_EYE, -7))).toBe(0);
      cam.active.updateMatrixWorld();
      const ahead = cam.eyes.clone().addScaledVector(cam.look(), 4).project(cam.active);
      expect(Math.abs(ahead.x)).toBeLessThan(1e-6);
      expect(Math.abs(ahead.y)).toBeLessThan(1e-6);
    });
  }

  it('la mirada que viaja en la Intent no depende de donde se dibuje la camara', () => {
    const cam = new OrbitCamera();
    const before = { ...cam.forward(), pitch: cam.lookPitch };
    cam.follow(0, 0, 0, 800, 600);
    cam.follow(0, -0.4, 0, 800, 600);
    expect({ ...cam.forward(), pitch: cam.lookPitch }).toEqual(before);
  });
});
