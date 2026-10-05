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
 * Ronda: los animales que no se quedan clavados —retroceder para girar,
 * saltar un bloque y bordear lo demas— (2026-10-05).
 */
export default [
  {
    nombre: 'el animal no retrocede para girar',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'store.backedUp[id] + back <= ANIMAL_BACKUP + 1e-9 &&',
    a: 'false &&',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'el animal no salta',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'if (!tryJump(world, store, id, speed, dt, keep)) stuck(',
    a: 'if (true) stuck(',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'el animal salta a su paso',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'Math.max(speed, edge / (share * (JUMP_SPEED / GRAVITY)))',
    a: 'speed',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  {
    nombre: 'el animal no bordea',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'if (rehearseDetour(world, store, id, ax, ay, speed, dt, keep)) {',
    a: 'if (false) {',
    prueba: 'test:tests/fauna-body.test.ts',
  },
];
