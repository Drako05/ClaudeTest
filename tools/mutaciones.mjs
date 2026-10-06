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
 * - `test:<fichero>`: un fichero de vitest.
 *
 * Ronda: el terreno de voxeles de 0,5, fase 1 (2026-10-06): columnas de medio
 * bloque sin rampas, su dibujo, y lo que se apoya en ellas.
 */
export default [
  {
    nombre: 'la columna no interpola: toma la casilla entera',
    fichero: 'packages/sim/src/worldgen.ts',
    de: '    const fx = sx / VOXELS_PER_TILE;',
    a: '    const fx = 0;',
    prueba: 'test:tests/relief.test.ts',
  },
  {
    nombre: 'lo generado se apoya en lo mas alto',
    fichero: 'packages/sim/src/boxes.ts',
    de: '  const highest = isStation(feature);',
    a: '  const highest = true;',
    prueba: 'test:tests/stations.test.ts',
  },
  {
    nombre: 'la casilla con escalon sale sin tapas',
    fichero: 'packages/client/src/terrain-mesh.ts',
    de: '        if (!flat) lid(x0, y0, x0 + VOXEL, y0 + VOXEL, top, rgb);',
    a: '        void lid;',
    prueba: 'test:tests/terrain-mesh.test.ts',
  },
  {
    nombre: 'el auto salto no sigue la escalera',
    fichero: 'packages/sim/src/systems/autojump.ts',
    de: '      walked = floor;',
    a: '      void floor;',
    prueba: 'test:tests/jump.test.ts',
  },
  {
    nombre: 'el chunk y el generador discrepan en el borde',
    fichero: 'packages/sim/src/worldgen.ts',
    de: '            : gen.columnFrom(sx, sy, corners[at], corners[at + 1], corners[at + side], corners[at + side + 1]);',
    a: '            : gen.columnFrom(sx, sy, corners[at], corners[at], corners[at + side], corners[at + side + 1]);',
    prueba: 'test:tests/relief.test.ts',
  },
  {
    nombre: 'la sonda del humo no ve escalones de medio bloque',
    fichero: 'packages/client/src/probes.ts',
    de: '      if (rise === 1) halfSteps++;',
    a: '      if (rise === 99) halfSteps++;',
    prueba: 'smoke:relief',
  },
  {
    // La vista normal se queda ahora con el MEJOR de cuatro rumbos: tiene que
    // seguir cayendo si el barrido de tercera persona no se ve en ninguno.
    nombre: 'el barrido de tercera persona no tiene ancho',
    fichero: 'packages/client/src/effects.ts',
    de: 'export const SLASH_HALF_WIDTH = 0.06;',
    a: 'export const SLASH_HALF_WIDTH = 0;',
    prueba: 'slash',
  },
];
