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
 * Ronda: la auditoria al cerrar la fisica al estilo Minecraft (2026-10-14).
 */
export default [
  // El panel sin la caja de los animales: la pasada de desarrollo lo ve ahora
  // junto a uno (en el nacimiento no hay ninguno a mano).
  {
    nombre: 'auditoria: el panel sin la caja de los animales, en el humo',
    fichero: 'packages/client/src/debug-boxes.ts',
    de: '    bodyEdges(out, state, id);',
    a: '',
    prueba: 'smoke:devTools',
  },
  // Las partes de los animales pintadas como lo que choca.
  {
    nombre: 'auditoria: las partes de los animales en cian, en el humo',
    fichero: 'packages/client/src/debug-boxes.ts',
    de: '      boxEdges(out.hit, part);\n      out.counts.hit++;',
    a: '      boxEdges(out.solid, part);\n      out.counts.solid++;',
    prueba: 'smoke:devTools',
  },
  // Los empujes con la masa ya no de `massOf`, sino igual para todos.
  {
    nombre: 'auditoria: empujes con la misma masa',
    fichero: 'packages/sim/src/systems/push.ts',
    de: '    mass[i] = massOf(store, ids[i]!);',
    a: '    mass[i] = 1;',
    prueba: 'test:tests/push.test.ts',
  },
];
