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
 * Ronda: los catorce equipables, el Bolso, la casilla del Arma y las primeras
 * armas (2026-10-04).
 */
export default [
  {
    nombre: 'el arma equipada no manda sobre la mano',
    fichero: 'packages/sim/src/systems/gathering.ts',
    de: 'const beastStats = weapon === null ? stats : toolStats(weapon);',
    a: 'const beastStats = stats;',
    prueba: 'test:tests/fauna.test.ts',
  },
  {
    nombre: 'el arma equipada no se gasta',
    fichero: 'packages/sim/src/systems/gathering.ts',
    de: 'if (touchedBeast && weapon !== null) broke = inventory.wearWeapon();',
    a: 'if (false) broke = inventory.wearWeapon();',
    prueba: 'test:tests/fauna.test.ts',
  },
  {
    nombre: 'golpear lo inerte no gasta',
    fichero: 'packages/sim/src/systems/gathering.ts',
    de: '    touchedTile = true;',
    a: '    touchedTile = power > 0;',
    prueba: 'test:tests/crafting.test.ts',
  },
  {
    nombre: 'cualquier cosa entra en cualquier hueco',
    fichero: 'packages/sim/src/inventory.ts',
    de: 'if (loose !== null && equipOf(loose) !== e) return;',
    a: 'if (loose !== null && equipOf(loose) === null) return;',
    prueba: 'test:tests/stations.test.ts',
  },
  {
    nombre: 'el arma equipada pierde su desgaste',
    fichero: 'packages/sim/src/inventory.ts',
    de: 'this.wornWear[e] = loose === null ? 0 : looseWear;',
    a: 'this.wornWear[e] = loose === null ? 0 : (toolStats(loose)?.uses ?? 0);',
    prueba: 'test:tests/stations.test.ts',
  },
  {
    nombre: 'el icono no se oculta al equipar',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: '      if (item === null) {\n        worn.el.appendChild(worn.icon);',
    a: '      if (item === null || true) {\n        worn.el.appendChild(worn.icon);',
    prueba: 'smoke:stations',
  },
  {
    nombre: 'los equipables en cuatro columnas',
    fichero: 'packages/client/index.html',
    de: 'grid-template-columns: repeat(5, var(--eq))',
    a: 'grid-template-columns: repeat(4, var(--eq))',
    prueba: 'smoke:desktop',
  },
];
