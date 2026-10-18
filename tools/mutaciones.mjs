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
 * Ronda: el botin sale expulsado de lo que lo suelta (2026-10-18): por fuera
 * de su caja, a media altura, y cae a 0-0,5 de esa cara.
 */
const DROPS = 'packages/sim/src/systems/drops.ts';
const GATHERING = 'packages/sim/src/systems/gathering.ts';

export default [
  // Nace en el centro, como antes: dentro del tronco, y se posa encima.
  {
    nombre: 'expulsado: nacer en el centro',
    fichero: DROPS,
    de: '    const out = (from.half + DROP_HALF) / Math.max(Math.abs(cos), Math.abs(sin));',
    a: '    const out = 0;',
    prueba: 'test:tests/drops.test.ts',
  },
  // Cae hasta a 1,5 de la cara.
  {
    nombre: 'expulsado: dispersar de mas',
    fichero: DROPS,
    de: 'export const SCATTER_REACH = 0.5;',
    a: 'export const SCATTER_REACH = 1.5;',
    prueba: 'test:tests/drops.test.ts',
  },
  // Sale desde la base de lo roto, no de su media altura.
  {
    nombre: 'expulsado: salir desde la base',
    fichero: GATHERING,
    de: '  return { x: x + 0.5, y: y + 0.5, z: (box.z0 + box.z1) / 2, half: (box.x1 - box.x0) / 2 };',
    a: '  return { x: x + 0.5, y: y + 0.5, z: box.z0, half: (box.x1 - box.x0) / 2 };',
    prueba: 'test:tests/drops.test.ts',
  },
  // El animal suelta su botin desde su centro, dentro de su caja.
  {
    nombre: 'expulsado: el animal desde el centro',
    fichero: GATHERING,
    de: 'z: store.z[a] + box.height / 2, half: box.half };',
    a: 'z: store.z[a] + box.height / 2, half: 0 };',
    prueba: 'test:tests/fauna.test.ts',
  },
];
