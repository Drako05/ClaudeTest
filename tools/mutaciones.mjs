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
 * Ronda: los ajustes tras jugar el inventario de 5 (2026-10-19): esquinas,
 * cerrar los avisos tocando fuera y el centro de 48 de las casillas del movil.
 */
const UI = 'packages/client/src/inventory-ui.ts';
const HTML = 'packages/client/index.html';

export default [
  // Los botones del menu y de los avisos, sin esquinas.
  {
    nombre: 'tanda5b: sin esquinas',
    fichero: HTML,
    de: '      #itemMenu .btn, .invAsk .btn { border-radius: 8px; }',
    a: '',
    prueba: 'smoke:desktop',
  },
  // Tocar fuera no cierra los avisos.
  {
    nombre: 'tanda5b: avisos sin cerrar fuera',
    fichero: UI,
    de: '        if (t && (this.splitAsk.contains(t) || this.destroyAsk.contains(t))) return;\n        this.closeAsk();',
    a: '        if (t && (this.splitAsk.contains(t) || this.destroyAsk.contains(t))) return;',
    prueba: 'smoke:desktop',
  },
  // Toda la casilla responde al dedo: el anillo ya no desliza.
  {
    nombre: 'tanda5b: area de toque entera',
    fichero: 'packages/client/src/item-menu.ts',
    de: 'export const TOUCH_CORE = 48;',
    a: 'export const TOUCH_CORE = 60;',
    prueba: 'gestures',
  },
  // La barra, pegada a la rejilla como antes.
  {
    nombre: 'tanda5b: barra pegada',
    fichero: HTML,
    de: '        left: calc(100% + var(--gridgap) / 2 - var(--railw) / 2);',
    a: '',
    prueba: 'smoke:mobile',
  },
  // Las casillas de la rejilla del movil, encogidas como antes.
  {
    nombre: 'tanda5b: casillas encogidas',
    fichero: HTML,
    de: '      body.touch-active #invGrid .slot { width: var(--eq); height: var(--eq); }',
    a: '      body.touch-active #invGrid .slot { width: 54px; height: 54px; }',
    prueba: 'smoke:mobile',
  },
];
