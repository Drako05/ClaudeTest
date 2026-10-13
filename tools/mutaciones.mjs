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
 * Ronda: la fisica por fases del autor (2026-10-13). Andando, solo la base
 * sube medio bloque; el animal salta antes de tocar, con el impulso minimo;
 * cayendo, solo choca la base, y lo demas lo saca la repulsion, que gana al
 * mando.
 */
export default [
  // El fallo de partida: la cabeza con el margen de las patas sube al animal.
  {
    nombre: 'fisica: la cabeza sube medio bloque andando',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: '  margin = 0,\n  baseMargin = STEP_UP,',
    a: '  margin = STEP_UP,\n  baseMargin = STEP_UP,',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  // Sin impulso, las patas del bisonte no llegan a lo alto de un escalon de 1.
  {
    nombre: 'fisica: el salto sin impulso',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: '  store.impulse[id] = hi;',
    a: '  store.impulse[id] = 0;',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  // Sin repulsion, lo que se mete cayendo se queda dentro.
  {
    nombre: 'fisica: sin repulsion',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'export const REPEL_SPEED = 4;',
    a: 'export const REPEL_SPEED = 0;',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  // Si el mando gana a la repulsion, el jugador se hunde en la pared al caer.
  {
    nombre: 'fisica: el mando gana a la repulsion',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: 'return into < 0 ? [vx - into * rx, vy - into * ry] : [vx, vy];',
    a: 'return [vx, vy];',
    prueba: 'test:tests/jump.test.ts',
  },
  // Sin saltar para girar, en las laderas no se ve ni un salto de giro.
  {
    nombre: 'fisica: sin salto de giro',
    fichero: 'packages/sim/src/systems/movement.ts',
    de: '      if (tryTurnJump(world, store, id, goal, dt, keep)) return;',
    a: '      if (goal !== goal) return;',
    prueba: 'test:tests/fauna.test.ts',
  },
  // Si al caer aterriza con todo, y no solo con la base, sube a lo que tiene metido.
  {
    nombre: 'fisica: al caer aterriza con todo',
    fichero: 'packages/sim/src/systems/jump.ts',
    de: '    : landingFloor(world, store, id);',
    a: '    : footing(world, store, id, store.z[id] + STEP_UP);',
    prueba: 'test:tests/jump.test.ts',
  },
];
