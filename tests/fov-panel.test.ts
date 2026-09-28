import { describe, expect, it } from 'vitest';
import { FP_FOV } from '../packages/client/src/camera.js';
import { readStoredFov } from '../packages/client/src/fov-panel.js';

describe('La barra del angulo de vision', () => {
  it('sin nada guardado, o con algo que no se entiende, arranca en 70', () => {
    expect(readStoredFov(null)).toBe(FP_FOV);
    expect(readStoredFov('')).toBe(FP_FOV);
    expect(readStoredFov('ancho')).toBe(FP_FOV);
    expect(readStoredFov('Infinity')).toBe(FP_FOV);
  });

  it('lo guardado se lee acotado y al grado', () => {
    expect(readStoredFov('90')).toBe(90);
    expect(readStoredFov('63.6')).toBe(64);
    expect(readStoredFov('20')).toBe(50);
    expect(readStoredFov('150')).toBe(100);
  });
});
