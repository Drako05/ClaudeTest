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
 * Ronda: objetos que caducan, el inventario de 5 columnas y el menu de una
 * casilla (2026-10-19).
 */
const DROPS = 'packages/sim/src/systems/drops.ts';
const INV = 'packages/sim/src/inventory.ts';
const MENU = 'packages/client/src/item-menu.ts';
const UI = 'packages/client/src/inventory-ui.ts';

export default [
  // Los objetos no caducan.
  {
    nombre: 'tanda5: no caducar',
    fichero: DROPS,
    de: '    if (tick - d.born >= DROP_LIFE_TICKS) {',
    a: '    if (false) {',
    prueba: 'test:tests/drops.test.ts',
  },
  // Al fundirse se queda el reloj del viejo.
  {
    nombre: 'tanda5: fundir con el reloj viejo',
    fichero: DROPS,
    de: '    o.born = Math.max(o.born, d.born);',
    a: '',
    prueba: 'test:tests/drops.test.ts',
  },
  // Dividir deja separar la pila entera, o mas.
  {
    nombre: 'tanda5: dividir sin cenir',
    fichero: INV,
    de: '    if (!Number.isInteger(n) || n < 1 || n >= count) return;',
    a: '    if (n < 1) return;',
    prueba: 'test:tests/inventory-actions.test.ts',
  },
  // Usar come de la ultima casilla con el objeto, no de la elegida.
  {
    nombre: 'tanda5: comer de la ultima',
    fichero: 'packages/sim/src/systems/gathering.ts',
    de: '  if (!inventory.takeFrom(slot, BERRIES_PER_MEAL)) return false;',
    a: '  inventory.remove(item, BERRIES_PER_MEAL);',
    prueba: 'test:tests/inventory-actions.test.ts',
  },
  // El menu sale siempre a la derecha.
  {
    nombre: 'tanda5: menu siempre a la derecha',
    fichero: MENU,
    de: "  const side = slot % GRID_COLUMNS < 2 ? 'right' : 'left';",
    a: "  const side = 'right';",
    prueba: 'test:tests/item-menu.test.ts',
  },
  // En la primera fila visible no se alinea con el borde de arriba.
  {
    nombre: 'tanda5: sin alinear arriba',
    fichero: MENU,
    de: "  if (firstRow) align = 'top';",
    a: "  if (false) align = 'top';",
    prueba: 'test:tests/item-menu.test.ts',
  },
  // Mantener la casilla no abre el menu (a efectos de la prueba, nunca).
  {
    nombre: 'tanda5: mantener sin abrir',
    fichero: UI,
    de: '        }, MENU_HOLD_MS);',
    a: '        }, MENU_HOLD_MS * 100);',
    prueba: 'gestures',
  },
  // El toque que cierra el menu se lo traga: no elige la otra casilla.
  {
    nombre: 'tanda5: tragar el toque de fuera',
    fichero: UI,
    de: '        if (t && this.menu.contains(t)) return;\n        this.closeMenu();',
    a: '        if (t && this.menu.contains(t)) return;\n        this.closeMenu();\n        e.stopImmediatePropagation();',
    prueba: 'gestures',
  },
  // Elegir una casilla cortada no desliza la rejilla.
  {
    nombre: 'tanda5: no desplazar',
    fichero: UI,
    de: '      this.grid.scrollTop += scrollToShow(cell.getBoundingClientRect(), this.gridView());',
    a: '',
    prueba: 'gestures',
  },
  // Destruir no pide confirmacion: destruye en el acto.
  {
    nombre: 'tanda5: destruir sin confirmar',
    fichero: UI,
    de: '      this.destroyAsk.hidden = false;',
    a: '      this.pending.destroy = m.slot;',
    prueba: 'smoke:desktop',
  },
  // OTROS vuelve arriba a la izquierda.
  {
    nombre: 'tanda5: OTROS donde estaba',
    fichero: 'packages/client/index.html',
    de: '      #others { right: calc(12px + env(safe-area-inset-right)); top: calc(74px + env(safe-area-inset-top)); }',
    a: '      #others { left: calc(12px + env(safe-area-inset-left)); }',
    prueba: 'smoke:mobile',
  },
];
