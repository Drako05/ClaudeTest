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
 * Ronda: la fisica de los animales al estilo Minecraft (el autor,
 * 2026-10-14): la caja cuadrada que choca siempre, el escalon tick a tick, el
 * salto con la fuerza justa.
 */
export default [
  // El escalon de golpe, como hasta el 2026-10-14.
  {
    nombre: 'fisica: el escalon de golpe',
    fichero: 'packages/sim/src/systems/jump.ts',
    de: 'store.z[id] = Math.min(ground, store.z[id] + CLIMB_SPEED * dt);',
    a: 'store.z[id] = ground;',
    prueba: 'test:tests/jump.test.ts',
  },
  {
    nombre: 'fisica: el escalon de golpe, en el humo',
    fichero: 'packages/sim/src/systems/jump.ts',
    de: 'store.z[id] = Math.min(ground, store.z[id] + CLIMB_SPEED * dt);',
    a: 'store.z[id] = ground;',
    prueba: 'smoke:relief',
  },
  {
    nombre: 'fisica: el escalon de golpe, en las leyes',
    fichero: 'packages/sim/src/systems/jump.ts',
    de: 'store.z[id] = Math.min(ground, store.z[id] + CLIMB_SPEED * dt);',
    a: 'store.z[id] = ground;',
    prueba: 'test:tests/world-laws.test.ts',
  },
  // El salto de altura fija, el del jugador: el apice a 1,16.
  {
    nombre: 'fisica: el salto de un animal, de altura fija',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'const speed = jumpSpeedFor(rise + ANIMAL_JUMP_MARGIN);',
    a: 'const speed = jumpSpeedFor(1.16);',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  // La caja del ancho justo, no 1,2 veces.
  {
    nombre: 'fisica: la caja del ancho justo',
    fichero: 'packages/shared/src/fauna-body.ts',
    de: 'export const COLLISION_WIDTH_FACTOR = 1.2;',
    a: 'export const COLLISION_WIDTH_FACTOR = 1;',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  // En el aire, sin chocar de lado: lo que habia cayendo hasta el 2026-10-14.
  {
    nombre: 'fisica: el jugador en el aire sin chocar de lado',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: '  walk(world, store, id, moveX, moveY, dt, running, 0);',
    a: '  walk(world, store, id, moveX, moveY, dt, running, Infinity);',
    prueba: 'test:tests/jump.test.ts',
  },
  // Metido en algo, sin poder salir.
  {
    nombre: 'fisica: metido en algo, clavado',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'const half = blocked(world, store, id, x, y, feet, STEP_UP, keep) ? 0 : undefined;',
    a: 'const half = undefined;',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  // El auto salto midiendo desde los pies a mitad de subida: salta en la escalera.
  {
    nombre: 'fisica: el auto salto desde los pies a medio subir',
    fichero: 'packages/sim/src/systems/autojump.ts',
    de: 'const feet = Math.max(store.z[id], footing(world, store, id, store.z[id] + STEP_UP));',
    a: 'const feet = store.z[id];',
    prueba: 'test:tests/jump.test.ts',
  },
  // Sin la caja de los animales en el panel.
  {
    nombre: 'devtools: sin la caja de los animales',
    fichero: 'packages/client/src/debug-boxes.ts',
    de: '    bodyEdges(out, state, id);',
    a: '',
    prueba: 'test:tests/debug-boxes.test.ts',
  },
];
