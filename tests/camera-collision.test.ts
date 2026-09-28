import { describe, expect, it } from 'vitest';
import type { Ground, Hitbox } from '@verdant/sim';
import { CAMERA_MARGIN, cameraClearance } from '../packages/client/src/camera-collision.js';

/**
 * La camara no atraviesa bloques ni objetos (pedido del autor): se para antes
 * del terreno y de los hitboxes, que en un arbol son solo su tronco.
 */
const PIVOT = { x: 0.5, y: 0.5, z: 1.75 };
/** Hacia atras y un poco arriba, hacia el oeste. */
const BACK = (() => {
  const d = { x: -1, y: 0, z: 0.3 };
  const n = Math.hypot(d.x, d.y, d.z);
  return { x: d.x / n, y: d.y / n, z: d.z / n };
})();
const flat: Ground = () => 0;
const none = () => null;

function box(cx: number, cy: number, half: number, z0: number, z1: number): Hitbox {
  return { x0: cx - half, x1: cx + half, y0: cy - half, y1: cy + half, z0, z1 };
}

describe('colision de la camara', () => {
  it('sin nada en medio, va a la distancia que se quiere', () => {
    expect(cameraClearance(PIVOT, BACK, 20, flat, none)).toBe(20);
  });

  it('se para antes de una pared', () => {
    // Un bloque de 5 de alto a partir de x = -3.
    const wall: Ground = (x) => (x < -3 ? 5 : 0);
    const d = cameraClearance(PIVOT, BACK, 20, wall, none);
    const hit = 3.5 / Math.abs(BACK.x); // distancia a lo largo del rayo hasta x = -3
    expect(d).toBeCloseTo(hit - CAMERA_MARGIN, 3);
  });

  it('no se mete bajo el suelo al mirar hacia arriba', () => {
    // Mirar arriba = la camara va hacia atras y ABAJO.
    const low = { x: BACK.x, y: 0, z: -0.5 };
    const n = Math.hypot(low.x, low.z);
    const dir = { x: low.x / n, y: 0, z: low.z / n };
    const d = cameraClearance(PIVOT, dir, 20, flat, none);
    // Con el suelo a 0 y los ojos a 1,75, el rayo toca el suelo a 1,75 / |dz|.
    expect(d).toBeCloseTo(1.75 / Math.abs(dir.z) - CAMERA_MARGIN, 3);
    expect(PIVOT.z + dir.z * d).toBeGreaterThan(0);
  });

  it('se para antes de un tronco', () => {
    const trunk = box(-2.5, 0.5, 0.15, 0, 3);
    const boxes = (tx: number, ty: number) => (tx === -3 && ty === 0 ? trunk : null);
    const d = cameraClearance(PIVOT, BACK, 20, flat, boxes);
    const hit = (0.5 - (-2.35)) / Math.abs(BACK.x);
    expect(d).toBeCloseTo(hit - CAMERA_MARGIN, 3);
  });

  it('pasa POR ENCIMA de un tronco bajo: las hojas no son hitbox', () => {
    // El tronco desnudo acaba a 2; a esa distancia el rayo ya va mas alto.
    const trunk = box(-2.5, 0.5, 0.15, 0, 2);
    const boxes = (tx: number, ty: number) => (tx === -3 && ty === 0 ? trunk : null);
    expect(cameraClearance(PIVOT, BACK, 20, flat, boxes)).toBe(20);
  });
});
