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
 * Ronda: los animales de bloques, con la caja de golpe y el choque de sus
 * partes (2026-10-03).
 */
export default [
  {
    nombre: 'la cola golpea',
    fichero: 'packages/shared/src/fauna-body.ts',
    de: "part('cola', 'dark', false, [0.06, 0.5, 0.06], [-1.13, 0.95, 0])",
    a: "part('cola', 'dark', true, [0.06, 0.5, 0.06], [-1.13, 0.95, 0])",
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'la cabeza no golpea',
    fichero: 'packages/shared/src/fauna-body.ts',
    de: "part('cabeza', 'mane', true, [0.55, 0.6, 0.55], [1.25, 1.0, 0], true)",
    a: "part('cabeza', 'mane', false, [0.55, 0.6, 0.55], [1.25, 1.0, 0], true)",
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'gira sin mirar su postura',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: '    const there = clashes(x, y, nfx, nfy);\n    if (here > 0 || there === 0) {',
    a: '    const there = clashes(x, y, nfx, nfy);\n    if (true) {',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'el escalon no estorba a las partes',
    fichero: 'packages/sim/src/body.ts',
    de: '  return low - highOf(world, nx, ny) > STEP_UP ? low : -Infinity;',
    a: '  return -Infinity;',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'sin indulgencia al avanzar',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: '    if (here > 0 || there === 0) x += stepX;',
    a: '    if (there === 0) x += stepX;',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'sin indulgencia al girar',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: '    const there = clashes(x, y, nfx, nfy);\n    if (here > 0 || there === 0) {',
    a: '    const there = clashes(x, y, nfx, nfy);\n    if (there === 0) {',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'el modelo no gira',
    fichero: 'packages/client/src/fauna-view.ts',
    de: '      mesh.rotation.y = yawOf(store.facingX[id], store.facingY[id]);',
    a: '      mesh.rotation.y = 0;',
    prueba: 'smoke:fauna',
  },
];
