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
    expect(readStoredFov('103.6')).toBe(104);
    // Lo guardado con el rango de antes (50-100) cae dentro del nuevo.
    expect(readStoredFov('55')).toBe(70);
    expect(readStoredFov('150')).toBe(120);
  });
});
