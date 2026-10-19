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
 * Ronda: el mundo en pixelart, ronda 3 (2026-10-19): al juego.
 */
export default [
  // La hoja del mundo sin pintar sus rejillas: lienzos en blanco.
  {
    nombre: 'pixelart3: hoja sin pintar',
    fichero: 'packages/client/src/world-sprites.ts',
    de: '      ctx.fillStyle = color;\n      ctx.fillRect(x, y, 1, 1);',
    a: '      ctx.fillStyle = color;',
    prueba: 'smoke:devTools',
  },
  // La pared de un desnivel alto, en una cara estirada en vez de una por voxel.
  {
    nombre: 'pixelart3: pared estirada',
    fichero: 'packages/client/src/terrain-mesh.ts',
    de: '                [x0 + side.b[0] * VOXEL, z - VOXEL, y0 + side.b[1] * VOXEL],',
    a: '                [x0 + side.b[0] * VOXEL, below, y0 + side.b[1] * VOXEL],',
    prueba: 'test:tests/terrain-mesh.test.ts',
  },
  // Todas las casillas con la misma variante de suelo.
  {
    nombre: 'pixelart3: variante fija',
    fichero: 'packages/client/src/terrain-mesh.ts',
    de: '  return Math.min(count - 1, Math.floor(hash2DFloat(seed ^ 0x5eed7e11, wx, wy) * count));',
    a: '  return 0;',
    prueba: 'test:tests/terrain-mesh.test.ts',
  },
  // La roca con las caras que quedan entre dos voxeles.
  {
    nombre: 'pixelart3: roca con caras escondidas',
    fichero: 'packages/client/src/rock-mesh.ts',
    de: '      if (has(e + face.d[0], s + face.d[1], z + face.d[2])) continue;\n',
    a: '',
    prueba: 'test:tests/world-art.test.ts',
  },
  // La cara oeste de la roca, en sombra.
  {
    nombre: 'pixelart3: luz de la roca',
    fichero: 'packages/client/src/rock-mesh.ts',
    de: '  { d: [-1, 0, 0], light: LIGHT.lit,',
    a: '  { d: [-1, 0, 0], light: LIGHT.shade,',
    prueba: 'test:tests/world-art.test.ts',
  },
  // La copa apoyada en el borde de su dibujo: el roble enseña tallo de mas.
  {
    nombre: 'pixelart3: copa sin asiento',
    fichero: 'packages/client/src/world-sprites.ts',
    de: '  const top = crown.rows.length - crownGap(crown.rows, crown.trunkX);',
    a: '  const top = crown.rows.length;',
    prueba: 'test:tests/world-art.test.ts',
  },
  // La copa del roble sin uno de sus tonos de corteza.
  {
    nombre: 'pixelart3: corteza recortada',
    fichero: 'packages/client/src/world-art.ts',
    de: ',"h":"#3b2216"},',
    a: '},',
    prueba: 'test:tests/world-art.test.ts',
  },
  // Los escombros de una roca, sacados de otro dibujo (ninguno).
  {
    nombre: 'pixelart3: escombros de otro dibujo',
    fichero: 'packages/client/src/palette.ts',
    de: '  const art = STONES[feature] ?? CROWNS[feature] ?? BUSHES[feature];',
    a: '  const art = CROWNS[feature] ?? BUSHES[feature];',
    prueba: 'test:tests/effects.test.ts',
  },
  // Las rocas sin dibujar.
  {
    nombre: 'pixelart3: rocas sin dibujar',
    fichero: 'packages/client/src/billboards.ts',
    de: '      this.rocks++;\n      return mesh;',
    a: '      return null;',
    prueba: 'smoke:resources',
  },
  // El canto que asoma, contado tambien en las ramas: las que se ven contra el
  // cielo a proposito lo harian caer.
  {
    nombre: 'pixelart3: asoma cuenta las ramas',
    fichero: 'packages/client/src/billboards.ts',
    de: '    for (let x = Math.floor(cx - stemHalf); x < Math.ceil(cx + stemHalf); x++) {',
    a: '    for (let x = 0; x < px.width; x++) {',
    prueba: 'smoke:desktop',
  },
];
