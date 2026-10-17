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
 * Ronda: los ajustes despues de jugar en el movil (2026-10-17): + y -
 * mantenidos, la vuelta a 1 al cerrar, MODO y ENTRADA, y el relieve por dentro
 * con el icono que baja.
 */
export default [
  // Mantener + no repite: un paso y nada mas.
  {
    nombre: 'ajustes: mantener + no repite',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: '    const due = qtySteps(now() - q.since);',
    a: '    const due = 1;',
    prueba: 'smoke:stations',
  },
  // El ritmo sin crecer: 3 por segundo siempre.
  {
    nombre: 'ajustes: el ritmo sin crecer',
    fichero: 'packages/client/src/qty-hold.ts',
    de: '  const rate = QTY_FIRST_RATE + s;',
    a: '  const rate = QTY_FIRST_RATE;',
    prueba: 'test:tests/qty-hold.test.ts',
  },
  // Un toque da dos: el del puntero y el del `click`.
  {
    nombre: 'ajustes: un toque da dos',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: '          if (e.detail === 0) this.stepTimes(i, step);',
    a: '          this.stepTimes(i, step);',
    prueba: 'smoke:stations',
  },
  // Al cerrar, cada receta se queda con lo que tenia.
  {
    nombre: 'ajustes: no vuelve a 1 al cerrar',
    fichero: 'packages/client/src/inventory-ui.ts',
    de: '      this.times.clear();',
    a: '',
    prueba: 'smoke:stations',
  },
  // Pulsado, el boton entero baja otra vez.
  {
    nombre: 'ajustes: el boton entero baja',
    fichero: 'packages/client/index.html',
    de: '        box-shadow: var(--hundido); transform: none;',
    a: '        box-shadow: var(--hundido); transform: translateY(2px);',
    prueba: 'smoke:desktop',
  },
  // Pulsado o encendido, el icono se queda arriba.
  {
    nombre: 'ajustes: el icono no baja',
    fichero: 'packages/client/index.html',
    de: '        transform: translateY(2px);\n',
    a: '        transform: none;\n',
    prueba: 'smoke:desktop',
  },
  // La sombra de fuera, la que sobresalia del boton.
  {
    nombre: 'ajustes: la sombra de fuera',
    fichero: 'packages/client/index.html',
    de: '--relieve: inset 2px 2px 0 rgba(255, 255, 255, .16), inset -3px -3px 0 rgba(0, 0, 0, .45);',
    a: '--relieve: inset 2px 2px 0 rgba(255, 255, 255, .16), inset -3px -3px 0 rgba(0, 0, 0, .45), 0 3px 0 rgba(0, 0, 0, .5);',
    prueba: 'smoke:mobile',
  },
  // Auditoria: el texto del + y el - pulsados, con el relleno de antes, que
  // en un boton de alto fijo solo lo bajaba 1 px.
  {
    nombre: 'auditoria: el texto del + baja 1 px',
    fichero: 'packages/client/index.html',
    de: '.recipe .qty button:enabled:active { padding-top: 4px; }',
    a: '.recipe .qty button:enabled:active { padding-top: 2px; }',
    prueba: 'smoke:stations',
  },
  // MODO y ENTRADA sin correrse: alineados al borde de USAR y SALTAR.
  {
    nombre: 'ajustes: MODO y ENTRADA sin correrse',
    fichero: 'packages/client/index.html',
    de: '--modeshift: 4px',
    a: '--modeshift: 0px',
    prueba: 'smoke:mobile',
  },
];
