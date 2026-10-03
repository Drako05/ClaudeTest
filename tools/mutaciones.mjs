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
 * Ronda: los animales con ocho direcciones y la profundidad de su cuerpo
 * (2026-10-03).
 */
export default [
  {
    nombre: 'sprite con la profundidad de la lamina',
    fichero: 'packages/client/src/sprite-depth.ts',
    de: 'gl_FragDepth = clamp( bodyClip.z / bodyClip.w * 0.5 + 0.5, 0.0, 1.0 );',
    a: 'gl_FragDepth = gl_FragCoord.z;',
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'caja adelantada de mas',
    fichero: 'packages/client/src/sprite-depth.ts',
    de: '  bodyHit = bodyO + bodyD * bodyNear;',
    a: '  bodyHit = bodyO + bodyD * max( bodyNear - 1.5, 0.0 );',
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'caja sin el rumbo del animal',
    fichero: 'packages/client/src/fauna-view.ts',
    de: '      material.facing.set(fx, fy);',
    a: '      material.facing.set(1, 0);',
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'siempre de perfil',
    fichero: 'packages/client/src/fauna-view.ts',
    de: '      const { view, mirror } = viewOfSector(sector);',
    a: '      const { view, mirror } = viewOfSector(2);',
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'una vista que no mide su caja',
    fichero: 'packages/client/src/fauna-view.ts',
    de: '    const perPx = height / rows;',
    a: '    const perPx = ((v === View.Front ? 1.2 : 1) * height) / rows;',
    prueba: 'smoke:fauna',
  },
  {
    nombre: 'vista sin histeresis',
    fichero: 'packages/client/src/fauna-facing.ts',
    de: '<= 22.5 + VIEW_HYSTERESIS_DEG) return previous;',
    a: '<= 22.5) return previous;',
    prueba: 'test:tests/fauna-facing.test.ts',
  },
  {
    nombre: 'espejo al reves',
    fichero: 'packages/client/src/fauna-facing.ts',
    de: 'mirror: sector < 0 };',
    a: 'mirror: sector > 0 };',
    prueba: 'test:tests/fauna-facing.test.ts',
  },
];
