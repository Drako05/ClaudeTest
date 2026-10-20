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
 * Ronda: las menas al juego (2026-10-20).
 */
const ORE = 'packages/client/src/ore-mesh.ts';
const TEST = 'test:tests/ore-mesh.test.ts';
export default [
  // Cristales tambien en las caras que tocan otro voxel de la mena.
  { nombre: 'menas: cristales en caras tapadas', fichero: ORE, de: '      if (has(e + d[0], s + d[1], z + d[2])) continue;\n', a: '', prueba: TEST },
  // La corona sin tope: las bases se montan unas en otras.
  { nombre: 'menas: corona sin tope', fichero: ORE, de: '      if (o > CROWN_OVERLAP) return null;\n', a: '', prueba: TEST },
  // Los petalos finos de la corona que no gusto.
  { nombre: 'menas: petalos finos', fichero: ORE, de: '    const w = Math.max(3, h - 1);', a: '    const w = 3;', prueba: TEST },
  // El centro de la flor, fino.
  { nombre: 'menas: centro fino', fichero: ORE, de: '  put(fx, fz, 5, 6,', a: '  put(fx, fz, 3, 6,', prueba: TEST },
  // El arco de los costados, el doble.
  { nombre: 'menas: arco sin acotar', fichero: ORE, de: '* r() * 20 * DEG;', a: '* r() * 40 * DEG;', prueba: TEST },
  // Los costados, mas inclinados de lo aprobado.
  { nombre: 'menas: costados de mas', fichero: ORE, de: '(30 + r() * 26) * DEG', a: '(30 + r() * 40) * DEG', prueba: TEST },
  // Los dos de una cara, sin el margen entre sus bases.
  { nombre: 'menas: costados que se tocan', fichero: ORE, de: '- ph - half - 0.08)', a: '- ph - half + 0.08)', prueba: TEST },
  // La misma mena en todas las casillas.
  { nombre: 'menas: todas iguales', fichero: ORE, de: 'hash2D(seed ^ 0x0e5ca1, tx, ty)', a: 'hash2D(seed ^ 0x0e5ca1, 0, 0)', prueba: TEST },
  // La piedra sin vetas.
  { nombre: 'menas: sin vetas', fichero: ORE, de: 'for (let q = 0; q < 4; q++) veins(', a: 'for (let q = 0; q < 0; q++) veins(', prueba: TEST },
  // Los escombros de una mena, sin su mineral.
  { nombre: 'menas: escombros sin mineral', fichero: 'packages/client/src/palette.ts', de: '  if (ore) {\n', a: '  if (ore && feature < 0) {\n', prueba: TEST },
  // El juego, sin menas: la roca de antes para los minerales.
  { nombre: 'menas: sin cristales en el juego', fichero: 'packages/client/src/billboards.ts', de: '    if (ORE_TONES[feature]) {\n', a: '    if (ORE_TONES[feature] && feature < 0) {\n', prueba: 'smoke:resources' },
  // Al descartar un chunk, sus menas no se liberan.
  { nombre: 'menas: sin liberar', fichero: 'packages/client/src/main.ts', de: '    billboards.release(prop);\n', a: '', prueba: 'smoke:resources' },
];
