import { describe, expect, it } from 'vitest';
import { nearestOnBox, rayAabb, rayBodyBox, type BodyBox } from '../packages/client/src/body-ray.js';

describe('la caja del cuerpo', () => {
  const box: BodyBox = {
    center: [0, 0.5, 0],
    facingX: 1,
    facingZ: 0,
    halfLength: 1,
    halfHeight: 0.5,
    halfWidth: 0.25,
  };

  it('el rayo entra por la cara de su lado, girada con el rumbo', () => {
    // De frente por el costado (+z): entra a medio ancho.
    expect(rayBodyBox([0, 0.5, 5], [0, 0, -1], box)).toBeCloseTo(4.75);
    // A lo largo: entra a medio largo.
    expect(rayBodyBox([5, 0.5, 0], [-1, 0, 0], box)).toBeCloseTo(4);
    // Girada 90°, lo largo pasa al costado.
    const turned = { ...box, facingX: 0, facingZ: 1 };
    expect(rayBodyBox([0, 0.5, 5], [0, 0, -1], turned)).toBeCloseTo(4);
    expect(rayBodyBox([5, 0.5, 0], [-1, 0, 0], turned)).toBeCloseTo(4.75);
  });

  it('un rayo que no la toca no da nada, y su punto mas cercano es del cuerpo', () => {
    const o: [number, number, number] = [0, 3, 5];
    const d: [number, number, number] = [0, 0, -1];
    expect(rayBodyBox(o, d, box)).toBeNull();
    const q = nearestOnBox(o, d, box);
    expect(q[1]).toBeCloseTo(1);
    expect(Math.abs(q[2])).toBeLessThanOrEqual(0.25 + 1e-9);
  });

  it('las cajas del terreno', () => {
    expect(rayAabb([0.5, 5, 0.5], [0, -1, 0], [0, 0, 0], [1, 1, 1])).toBeCloseTo(4);
    expect(rayAabb([2, 5, 0.5], [0, -1, 0], [0, 0, 0], [1, 1, 1])).toBeNull();
  });
});
