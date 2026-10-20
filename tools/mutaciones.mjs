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
 * Ronda: cristales ligados a su sitio e iman que acelera (2026-10-20).
 */
export default [
  // Los cristales vuelven a depender de lo que se puso antes: cambian al romper.
  { nombre: 'menas: cristales sin sitio', fichero: 'packages/client/src/ore-mesh.ts', de: 'Math.imul((z + 64) * 8 + face, 0x9e3779b1), tx * 2 + e, ty * 2 + s));', a: 'Math.imul(crystals.length + 0 * (z + face + e + s), 0x9e3779b1), tx, ty));', prueba: 'test:tests/ore-mesh.test.ts' },
  // El iman no acelera: corriendo nunca llega.
  { nombre: 'iman: sin aceleracion', fichero: 'packages/sim/src/systems/drops.ts', de: '    d.speed += HOMING_ACCEL * dt;\n', a: '', prueba: 'test:tests/drops.test.ts' },
  // El iman lo suelta si el jugador se aleja: con un empuje no llega.
  { nombre: 'iman: lo suelta lejos', fichero: 'packages/sim/src/systems/drops.ts', de: '    if (inventory.room(d.item) === 0) {\n      d.homing = false;', a: '    if (far > PICKUP_RADIUS * 2 || inventory.room(d.item) === 0) {\n      d.homing = false;', prueba: 'test:tests/drops.test.ts' },
];
