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
 * Ronda: los modelos con las patas en el cuadrado de su caja (el autor,
 * 2026-10-14, fase 4; guia de arte, directriz 4).
 */
export default [
  // Las patas del bisonte donde estaban: a lo largo de su tronco de antes.
  {
    nombre: 'modelos: las patas del bisonte fuera del cuadrado',
    fichero: 'packages/shared/src/fauna-body.ts',
    de: '        ...legs(0.7, 0.22, 0.52, 0.32),',
    a: '        ...legs(0.7, 0.22, 0.75, 0.32),',
    prueba: 'test:tests/fauna-body.test.ts',
  },
  // Una especie pequeña, un pelo fuera.
  {
    nombre: 'modelos: las patas de la marmota un pelo fuera',
    fichero: 'packages/shared/src/fauna-body.ts',
    de: '        ...legs(0.08, 0.07, 0.145, 0.1),',
    a: '        ...legs(0.08, 0.07, 0.15, 0.1),',
    prueba: 'test:tests/fauna-body.test.ts',
  },
];
