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
 * Ronda: el mundo en pixelart, ronda 2 (2026-10-19): la hoja `?mundo=1`, entera.
 */
export default [
  // La hoja del mundo sin pintar sus rejillas: lienzos en blanco.
  {
    nombre: 'pixelart2: hoja sin pintar',
    fichero: 'packages/client/src/world-sprites.ts',
    de: '      ctx.fillStyle = color;\n      ctx.fillRect(x, y, 1, 1);',
    a: '      ctx.fillStyle = color;',
    prueba: 'smoke:devTools',
  },
];
