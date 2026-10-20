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
 * Ronda: la auditoria al cerrar la tanda de la pala y las menas (2026-10-20).
 */
export default [
  // La camara solo mira la caja de su propia casilla: atraviesa media estacion corrida.
  { nombre: 'camara: sin las vecinas', fichero: 'packages/client/src/camera-collision.ts', de: '= [[0, 0], [1, 0], [0, 1], [1, 1]];', a: '= [[0, 0]];', prueba: 'test:tests/camera-collision.test.ts' },
  // El golpe no cuenta sus rayos: el cliente vuelve a medir el barrido despues del paso.
  { nombre: 'barrido: sin los rayos del golpe', fichero: 'packages/sim/src/systems/gathering.ts', de: '    swing.rays = swept.rays;\n', a: '', prueba: 'test:tests/voxel-edit.test.ts' },
  // Se pone una estacion sobre una casilla que cubre otra.
  { nombre: 'colocar: sobre lo cubierto', fichero: 'packages/sim/src/systems/gathering.ts', de: '    if (world.featureAt(tx, ty) !== Feature.None || world.isCovered(tx, ty)) return null;', a: '    if (world.featureAt(tx, ty) !== Feature.None) return null;', prueba: 'test:tests/stations.test.ts' },
  // Picar una mena con pico no suelta su mineral.
  { nombre: 'leyes: la mena sin botin', fichero: 'packages/sim/src/systems/gathering.ts', de: '    if (count > 0) scatterLoot(', a: '    if (count < 0) scatterLoot(', prueba: 'test:tests/world-laws.test.ts' },
  // Los cristales salen tambien de las caras que tapa el terreno.
  { nombre: 'menas: cristales bajo tierra', fichero: 'packages/client/src/ore-mesh.ts', de: 'voxels.some(([a, b, c]) => a === x && b === y && c === z) || covered(x, y, z);', a: 'voxels.some(([a, b, c]) => a === x && b === y && c === z);', prueba: 'test:tests/ore-mesh.test.ts' },
];
