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
 * Ronda: tanda movil 1, los tirones al cruzar de chunk (2026-10-24).
 */
export default [
  // Todo lo que entra al cruzar un borde se construye en el mismo frame, como antes.
  { nombre: 'chunks: sin presupuesto', fichero: 'packages/client/src/main.ts', de: '    if (far > 0 && performance.now() - start >= BUILD_BUDGET_MS) {', a: '    if (false) {', prueba: 'smoke:devTools' },
  // Lo que sale se tira en el acto: volver a la frontera lo rehace.
  { nombre: 'chunks: sin histeresis', fichero: 'packages/client/src/main.ts', de: 'const KEEP_RADIUS = RADIUS + 1;', a: 'const KEEP_RADIUS = RADIUS;', prueba: 'smoke:devTools' },
  // Un chunk lejano se construye entero en un frame, sin partir en dos.
  { nombre: 'chunks: de una vez', fichero: 'packages/client/src/main.ts', de: '      const view = buildTerrain(s.cx, s.cy);', a: '      const view = buildChunk(s.cx, s.cy);', prueba: 'smoke:devTools' },
  // El selector de resolucion no cambia nada.
  { nombre: 'resolucion: no se aplica', fichero: 'packages/client/src/main.ts', de: '  onResolution: (ratio) => renderer.setPixelRatio(Math.min(window.devicePixelRatio, ratio)),', a: '  onResolution: () => {},', prueba: 'smoke:mobile' },
  // Cada objeto va solo a la escena, como antes de agruparlos.
  { nombre: 'objetos: sin agrupar', fichero: 'packages/client/src/main.ts', de: '  for (const batch of batchProps(loose)) {', a: '  for (const batch of loose.flatMap((m) => batchProps([m]))) {', prueba: 'smoke:devTools' },
  // Las instancias no llevan la posicion ni el giro de su objeto.
  { nombre: 'objetos: giro perdido', fichero: 'packages/client/src/prop-batch.ts', de: '        mesh.updateMatrix();\n', a: '', prueba: 'test:tests/prop-batch.test.ts' },
  // La cara de abajo mira hacia arriba.
  { nombre: 'malla: normal de abajo', fichero: 'packages/client/src/terrain-mesh.ts', de: '[Face.Bottom]: [0, -1, 0],', a: '[Face.Bottom]: [0, 1, 0],', prueba: 'test:tests/terrain-mesh.test.ts' },
  // La malla no mira lo roto de la vecina del oeste: el hoyo del borde se queda sin pared.
  { nombre: 'malla: lo roto de la vecina', fichero: 'packages/client/src/terrain-mesh.ts', de: '    world.hasBroken(chunk.cx - 1, chunk.cy) ||\n', a: '', prueba: 'test:tests/terrain-mesh.test.ts' },
];
