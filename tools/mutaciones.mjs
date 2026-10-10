/**
 * Las mutaciones de la ronda en curso: cada comprobacion nueva, rota a
 * proposito para verla CAER (`tools/mutar.mjs`). Se reescribe en cada ronda;
 * la de antes queda en la historia de git.
 *
 * Cada una: `nombre` (unico; es el nombre del trabajo en la CI), `fichero`,
 * `de` (texto que tiene que aparecer EXACTAMENTE una vez), `a` (lo que lo
 * rompe) y `prueba`:
 * - `smoke:<pasada>`: una pasada de `tools/smoke.mjs`, por su prefijo;
 * - `gestures` o `slash`: esas herramientas;
 * - `slash:<parte>`: una parte del barrido (`tools/slash-partes.mjs`);
 * - `test:<fichero>`: un fichero de vitest.
 *
 * Ronda: pruebas mas rapidas, fase 1 (2026-10-10): `slash` va partido, una
 * casilla por parte. Lo que hay que ver es que cada fallo del barrido lo sigue
 * cazando la parte que lo vigila, ahora que esa parte corre sola y llega a su
 * vista sin medir las de antes.
 */
export default [
  // El recorte por frustum lo cazan la camara baja, la primera persona y la
  // estocada, no la vista normal: con `slash` entero cayeron esas tres a 0 y
  // la normal paso (CI, 2026-10-10, 6f55459), y con `slash:normal` NO CAE
  // (d096e92).
  {
    nombre: 'barrido recortado por el frustum',
    fichero: 'packages/client/src/effects-view.ts',
    de: 'Ocho mallas no valen un recorte.\n      mesh.frustumCulled = false;',
    a: 'Ocho mallas no valen un recorte.\n      mesh.frustumCulled = true;',
    prueba: 'slash:baja',
  },
  // La camara baja vigila la cinta de tercera persona: sin ancho, de canto.
  {
    nombre: 'el barrido de tercera persona no tiene ancho',
    fichero: 'packages/client/src/effects.ts',
    de: 'export const SLASH_HALF_WIDTH = 0.06;',
    a: 'export const SLASH_HALF_WIDTH = 0;',
    prueba: 'slash:baja',
  },
];
