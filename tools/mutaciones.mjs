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
 * Ronda: los ajustes al suelo tras jugar (2026-10-18): el iman a 1, el botin
 * desde media altura y a 0-0,5, tirar sin preguntar, tirar desde la barra y
 * guardar en la mochila.
 */
const DROPS = 'packages/sim/src/systems/drops.ts';
const UI = 'packages/client/src/inventory-ui.ts';

export default [
  // El iman otra vez a 1,5.
  {
    nombre: 'suelo2: iman a 1,5',
    fichero: DROPS,
    de: 'export const PICKUP_RADIUS = 1;',
    a: 'export const PICKUP_RADIUS = 1.5;',
    prueba: 'test:tests/drops.test.ts',
  },
  // El botin cae hasta a 1,5 de su origen.
  {
    nombre: 'suelo2: dispersar de mas',
    fichero: DROPS,
    de: 'export const SCATTER_REACH = 0.5;',
    a: 'export const SCATTER_REACH = 1.5;',
    prueba: 'test:tests/drops.test.ts',
  },
  // El botin sale desde la base de lo roto, no de su media altura.
  {
    nombre: 'suelo2: salir desde la base',
    fichero: 'packages/sim/src/systems/gathering.ts',
    de: '  const z = box ? (box.z0 + box.z1) / 2 : objectBase(world, x, y, feature);',
    a: '  const z = objectBase(world, x, y, feature);',
    prueba: 'test:tests/drops.test.ts',
  },
  // Guardar no apila: va derecho a la primera vacia.
  {
    nombre: 'suelo2: guardar sin apilar',
    fichero: 'packages/sim/src/inventory.ts',
    de: '      if (!this.isOpen(i) || this.items[i] !== item || this.counts[i] >= max) continue;',
    a: '      continue;',
    prueba: 'test:tests/stow.test.ts',
  },
  // Soltar la barra al vacio con el inventario cerrado no hace nada, como antes.
  {
    nombre: 'suelo2: la barra no tira',
    fichero: UI,
    de: '      if (!d.bar && !this.open) return;',
    a: '      if (!this.open) return;',
    prueba: 'gestures',
  },
  // Soltar la barra sobre INVENTARIO no la guarda.
  {
    nombre: 'suelo2: INVENTARIO no guarda',
    fichero: UI,
    de: '        this.pending.stow = slot;',
    a: '',
    prueba: 'gestures',
  },
];
