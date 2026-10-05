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
 * Ronda: las cajas de golpe y de choque del panel de desarrollo, y el boton que
 * abre el panel en el movil (2026-10-05).
 */
export default [
  {
    nombre: 'las cajas sin golpe',
    fichero: 'packages/client/src/debug-boxes.ts',
    de: 'boxEdges(out.hit, box);',
    a: 'void box;',
    prueba: 'test:tests/debug-boxes.test.ts',
  },
  {
    nombre: 'la estacion no va en amarillo',
    fichero: 'packages/client/src/debug-boxes.ts',
    de: 'if (box && isStation(feature)) {',
    a: 'if (box && false) {',
    prueba: 'test:tests/debug-boxes.test.ts',
  },
  {
    nombre: 'las cajas no dibujan en el juego',
    fichero: 'packages/client/src/main.ts',
    de: '  debugBoxes.update(state, dev.showBoxes);',
    a: '  debugBoxes.update(state, false);',
    prueba: 'smoke:devTools',
  },
  {
    nombre: 'apagar las cajas no las quita',
    fichero: 'packages/client/src/debug-boxes.ts',
    de: '    if (!show) {\n      this.clear();',
    a: '    if (!show) {\n      void this.clear;',
    prueba: 'smoke:devTools',
  },
  {
    nombre: 'el boton del movil no abre el panel',
    fichero: 'packages/client/src/main.ts',
    de: "devToggle.addEventListener('click', () => dev.toggle());",
    a: "devToggle.addEventListener('click', () => {});",
    prueba: 'smoke:mobile',
  },
  {
    nombre: 'el panel del movil abajo, sobre los mandos',
    fichero: 'packages/client/index.html',
    de: 'top: calc(74px + env(safe-area-inset-top)); bottom: auto;',
    a: 'top: auto; bottom: 10px;',
    prueba: 'smoke:mobile',
  },
];
