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
 * Ronda: fisicas, fase A (2026-10-10): el jugador pisa el terreno con la huella
 * entera, baja cayendo, choca la cabeza y anda con inercia.
 */
export default [
  {
    nombre: 'el terreno se mide en el centro',
    fichero: 'packages/sim/src/boxes.ts',
    de: 'if (half <= 0) return [voxelOf(c), voxelOf(c)];',
    a: 'if (half <= 99) return [voxelOf(c), voxelOf(c)];',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'una pared bajo la huella sube el cuerpo de golpe',
    fichero: 'packages/sim/src/boxes.ts',
    de: 'if (column <= upTo) top = Math.max(top, column);',
    a: 'if (column <= Infinity) top = Math.max(top, column);',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'bajar medio bloque vuelve a ser de golpe',
    fichero: 'packages/sim/src/systems/jump.ts',
    de: 'if (store.z[id] <= ground + 1e-9) {',
    a: 'if (store.z[id] <= ground + 0.5) {',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'sin inercia: la velocidad cambia de golpe',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'if (gap <= reach + 1e-9) {',
    a: 'if (gap <= reach + 99) {',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'contra una pared se acumula velocidad',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'else store.vx[id] = 0;',
    a: 'else void 0;',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'la cabeza atraviesa el techo',
    fichero: 'packages/sim/src/systems/jump.ts',
    de: 'if (top > ceiling) {',
    a: 'if (top > ceiling + 99) {',
    prueba: 'test:tests/body-physics.test.ts',
  },
  {
    nombre: 'lo que queda sobre la cabeza estorba de lado',
    fichero: 'packages/sim/src/boxes.ts',
    de: 'b.z0 < head &&',
    a: 'b.z0 < Infinity &&',
    prueba: 'test:tests/body-physics.test.ts',
  },
];
