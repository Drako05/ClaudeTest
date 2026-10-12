import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { FP_EYE, OrbitCamera, PROJECTIONS } from '../packages/client/src/camera.js';
import {
  INTERP_SNAP,
  STEP_SMOOTH,
  StepSmoother,
  TickInterpolation,
} from '../packages/client/src/smooth.js';

/**
 * Lo que suaviza el dibujo (2026-10-12; `smooth.ts`): interpolar entre ticks y
 * subir el escalon en una curva. Sustituye a la camara con retraso.
 */

const FRAME = 1 / 60;

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

describe('El escalon', () => {
  it('subir de golpe con los pies en el suelo deja la camara abajo', () => {
    const step = new StepSmoother();
    expect(step.tick(0, 0.5, true, true)).toBe(0.5);
    expect(step.offset).toBe(-0.5);
    expect(step.peak).toBe(0.5);
  });

  it('saltar, caer o andar en llano no es un escalon', () => {
    const step = new StepSmoother();
    expect(step.tick(0, 0.1, true, false)).toBe(0); // despega
    expect(step.tick(0.1, 0.3, false, false)).toBe(0); // en el aire
    expect(step.tick(0.5, 0, false, true)).toBe(0); // aterriza
    expect(step.tick(0.5, 0, true, true)).toBe(0); // baja
    expect(step.tick(0, 0, true, true)).toBe(0); // llano
    expect(step.tick(0, 3, true, true)).toBe(0); // aparece en otro sitio
    expect(step.offset).toBe(0);
  });

  it(`se apaga en ${STEP_SMOOTH} s: queda menos de un 5 %, y sin saltos`, () => {
    const step = new StepSmoother();
    step.tick(0, 0.5, true, true);
    let previous = step.offset;
    const rises: number[] = [];
    for (let i = 0; i < 6; i++) {
      step.advance(FRAME);
      // Siempre hacia arriba, sin pasarse.
      expect(step.offset).toBeGreaterThan(previous);
      expect(step.offset).toBeLessThan(0);
      rises.push(step.offset - previous);
      previous = step.offset;
    }
    // Arranca suave: el primer fotograma sube menos que el segundo, y menos de
    // una quinta parte del escalon (la exponencial simple subia el 40 %).
    expect(rises[0]).toBeLessThan(rises[1]);
    expect(rises[0]).toBeLessThan(0.5 / 5);
    expect(-step.offset).toBeLessThan(0.5 * 0.05);
  });

  it('da lo mismo en fotogramas pequenos que en uno grande', () => {
    const fine = new StepSmoother();
    const coarse = new StepSmoother();
    fine.tick(0, 0.5, true, true);
    coarse.tick(0, 0.5, true, true);
    for (let i = 0; i < 36; i++) fine.advance(0.25 / 36);
    coarse.advance(0.25);
    expect(fine.offset).toBeCloseTo(coarse.offset, 9);
  });

  it('una escalera seguida se suma, y con tiempo cero no hay suavizado', () => {
    const step = new StepSmoother();
    step.tick(0, 0.5, true, true);
    step.advance(FRAME);
    const first = step.offset;
    step.tick(0.5, 1, true, true);
    expect(step.offset).toBeCloseTo(first - 0.5, 12);
    step.advance(FRAME, 0);
    expect(step.offset).toBe(0);
  });

  it('con la interpolacion, la camara sube del escalon sin hundirse antes', () => {
    // Lo que hace el bucle: guardar, paso del nucleo (sube 0,5 de golpe),
    // escalon (`lift` para no interpolar la subida), y dibujar varias veces
    // por tick, a 144 Hz.
    const interp = new TickInterpolation();
    const step = new StepSmoother();
    let z = 0;
    let acc = 0;
    let seen = -Infinity;
    let ticks = 0;
    for (let frame = 0; frame < 60; frame++) {
      const dt = 1 / 144;
      acc += dt;
      while (acc >= FRAME) {
        interp.capture([0], [0], [0], [z]);
        const before = z;
        if (++ticks === 5) z = 0.5;
        const lifted = step.tick(before, z, true, true);
        if (lifted) interp.lift(0, lifted);
        acc -= FRAME;
      }
      step.advance(dt);
      const camera = interp.at(0, { x: 0, y: 0, z }, acc / FRAME).z + step.offset;
      expect(camera).toBeGreaterThanOrEqual(seen - 1e-12);
      expect(camera).toBeGreaterThanOrEqual(-1e-12);
      seen = camera;
    }
    expect(seen).toBeGreaterThan(0.5 - 0.5 * 0.05);
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
