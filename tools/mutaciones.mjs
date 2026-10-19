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
 * Ronda: la auditoria al cerrar el inventario de 5 y el menu (2026-10-19):
 * las comprobaciones que la tanda no veia caer, y el toque atendido tarde.
 */
export default [
  // Cerrar el panel deja el menu de la casilla abierto.
  {
    nombre: 'auditoria5: cerrar sin el menu',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: '      this.closeMenu();\n      this.closeAsk();\n      this.cancelHold();',
    a: '      this.cancelHold();',
    prueba: 'smoke:desktop',
  },
  // Sacar de una casilla mas de lo que tiene.
  {
    nombre: 'auditoria5: sacar sin tope',
    fichero: 'packages/sim/src/inventory.ts',
    de: '    if (!this.isOpen(slot) || this.items[slot] === EMPTY || this.counts[slot] < count) return false;',
    a: '    if (!this.isOpen(slot) || this.items[slot] === EMPTY) return false;',
    prueba: 'test:tests/inventory-actions.test.ts',
  },
  // Mantener por el plazo y no por la hora de los eventos: un toque atendido
  // tarde abre el menu.
  {
    nombre: 'auditoria5: mantener por el plazo',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: 'if (d.held && !d.moving && !cancelled && e.timeStamp - d.since < MENU_HOLD_MS) {',
    a: 'if (false) {',
    prueba: 'gestures',
  },
];
