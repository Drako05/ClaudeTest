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
 * - `test:<fichero>`: un fichero de vitest.
 *
 * Ronda: auditoria de la tanda 2 (2026-10-02).
 */
export default [
  {
    // El hueco entre rayos se compara con el tronco mas fino de verdad, sacado
    // de las especies. Con el 0,22 suelto de antes, esto no caia.
    nombre: 'tronco mas fino que el hueco',
    fichero: 'packages/sim/src/trunk.ts',
    de: '{ bareMean: 2.1, bareSd: 0.1, trunkW: 0.22 }',
    a: '{ bareMean: 2.1, bareSd: 0.1, trunkW: 0.15 }',
    prueba: 'test:tests/strike.test.ts',
  },
];
